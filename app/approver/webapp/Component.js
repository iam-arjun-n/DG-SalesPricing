sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/model/json/JSONModel",
    "com/deloitte/mdg/salepricing/approver/approver/model/models"
], function (UIComponent, JSONModel, models) {
    "use strict";

    return UIComponent.extend("com.deloitte.mdg.salepricing.approver.approver.Component", {
        metadata: {
            manifest: "json",
            interfaces: ["sap.ui.core.IAsyncContentCreation"]
        },

        init: function () {
            UIComponent.prototype.init.apply(this, arguments);
            this.setModel(models.createDeviceModel(), "device");
            this.setModel(new JSONModel({ reqId: "" }), "request");
            this.setModel(new JSONModel({ rows: [] }), "submissionModel");
            this.setModel(new JSONModel([]), "initiatorModel");
            this.setModel(new JSONModel([]), "approverModel");
            this.setModel(new JSONModel([]), "commentModel");
            this.getRouter().initialize();
            this._setupInboxActions();
            this._loadWorkflowContext();
        },

        createContent: function () {
            if (!this._mainView) {
                this._mainView = sap.ui.view({
                    id: "taskView",
                    viewName: "com.deloitte.mdg.salepricing.approver.approver.view.Overview",
                    type: "XML"
                });
            }
            return this._mainView;
        },

        _setupInboxActions: function () {
            const compData = this.getComponentData();
            const startup = compData && compData.startupParameters;

            if (!startup || !startup.inboxAPI) {
                console.info("Not running inside Inbox");
                return;
            }

            const inboxAPI = startup.inboxAPI;

            inboxAPI.addAction(
                { action: "APPROVE", label: "Approve", type: "accept" },
                () => this._onApprove && this._onApprove()
            );

            inboxAPI.addAction(
                { action: "REJECT", label: "Reject", type: "reject" },
                () => this._onReject && this._onReject()
            );
        },
        _getWorkflowBaseURL: function () {
            const appId = this.getManifestEntry("/sap.app/id");
            const appPath = appId.replaceAll(".", "/");
            return jQuery.sap.getModulePath(appPath) + "/bpmworkflowruntime/v1";
        },

        _loadWorkflowContext: function () {
            const compData = this.getComponentData();
            const startup = compData && compData.startupParameters;

            if (!startup || !startup.taskModel) {
                console.info("Not launched from My Inbox");
                return;
            }

            const taskModel = startup.taskModel;
            this.setModel(taskModel, "task");

            const instanceId = taskModel.getData()?.InstanceID;
            if (!instanceId) {
                console.error("InstanceID missing in task model", taskModel.getData());
                return;
            }

            const contextUrl =
                this._getWorkflowBaseURL() +
                "/task-instances/" +
                instanceId +
                "/context";

            const contextModel = new JSONModel(contextUrl);

            contextModel.attachRequestCompleted(() => {
                const ctx = contextModel.getData();

                if (!ctx || typeof ctx === "string") {
                    console.error("Workflow context load failed:", ctx);
                    return;
                }

                const reqId = ctx.ReqId || ctx.requestId;
                if (!reqId) {
                    console.error("ReqId missing in workflow context", ctx);
                    return;
                }

                console.log("Workflow context loaded:", ctx);

                this.getModel("request").setProperty("/reqId", reqId);
                this._loadRequestFromCAP(reqId);
            });
        },


        _loadRequestFromCAP: function (reqId) {
            const getDisplayValue = (fieldValue, columns, key) => {
                if (fieldValue !== undefined && fieldValue !== null && fieldValue !== "") {
                    return fieldValue;
                }
                if (Array.isArray(columns) && columns.length > 0) {
                    return columns[0]?.[key] || "";
                }
                return "";
            };

            const oModel = this.getModel("ServiceModel");

            const oContext = oModel.bindContext(
                `/SalesPricingRequests(requestId='${reqId}')`,
                null,
                { $expand: "conditionRecords,comments" }
            );

            oContext.requestObject().then(oData => {
                console.log(oData);
                const rows = (oData.conditionRecords || []).map(r => {

                    const oFields = JSON.parse(r.fields || "{}");
                    const oColumns = JSON.parse(r.columns || "[]");

                    return {
                        Display: {
                            ConditionType: r.conditionType,
                            SalesOrganization: getDisplayValue(
                                oFields.Sales_Organization,
                                oColumns,
                                "Sales_Organization"
                            ),
                            DistributionChannel: getDisplayValue(
                                oFields.Distribution_Channel,
                                oColumns,
                                "Distribution_Channel"
                            ),
                            Customer: getDisplayValue(
                                oFields.Customer,
                                oColumns,
                                "Customer"
                            ),
                            Material: getDisplayValue(
                                oFields.Material,
                                oColumns,
                                "Material"
                            )
                        },
                        Data: {
                            ConditionType: r.conditionType,
                            KeyCombinationId: r.keyCombinationId,
                            Fields: oFields,
                            Columns: oColumns
                        }
                    };
                });

                this.getModel("submissionModel").setData({ rows });

                const initiatorComments = (oData.comments || [])
                    .filter(c => c.role !== "Approver")
                    .map(c => ({
                        Text: c.commentText,
                        UserName: c.createdBy,
                        Date: c.createdAt ? new Date(c.createdAt).toLocaleString() : "",
                        IsNew: false
                    }));

                this.getModel("initiatorModel").setData(initiatorComments);

                // merge after load
                this._mergeComments();
            });
        },
        _hasNewComment: function (comments) {
            return comments.some(c => c.IsNew);
        },

        _mergeComments: function () {
            const init = this.getModel("initiatorModel").getData() || [];
            const appr = this.getModel("approverModel").getData() || [];

            const merged = [...appr, ...init];

            merged.sort((a, b) => new Date(b.Date) - new Date(a.Date));

            this.getModel("commentModel").setData(merged);
        },

        addApproverCommentToModels: function (text, userName) {
            const apprModel = this.getModel("approverModel");
            const arr = apprModel.getData() || [];

            arr.push({
                Text: text,
                UserName: userName || "Approver",
                Date: new Date().toLocaleString(),
                IsNew: true
            });

            apprModel.setData(arr);
            this._mergeComments();
        },
        _addApproveComment: async function () {
            const comments = this.getModel("commentModel").getData() || [];
            const newComments = comments.filter(c => c.IsNew);
            if (!newComments.length) return;

            const base = this._getDatabaseBaseURL();
            const token = await this._fetchCAPCsrf();
            const requestId = this.getModel("request").getProperty("/reqId");

            for (let c of newComments) {
                await fetch(`${base}SalesPricingComments`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRF-Token": token
                    },
                    body: JSON.stringify({
                        commentText: c.Text,
                        role: "Approver",
                        user: c.UserName,
                        request_requestId: requestId
                    }),
                    credentials: "include"
                });
            }
        },

        //Approve or Reject Functions
        _getDatabaseBaseURL: function () {
            const oModel = this.getModel("ServiceModel");
            const sUrl =
                oModel &&
                (oModel.sServiceUrl ||
                    oModel.oServiceUrl ||
                    (oModel.getServiceUrl && oModel.getServiceUrl()));

            if (!sUrl) {
                throw new Error("ServiceModel service URL not found");
            }

            return sUrl.endsWith("/") ? sUrl : sUrl + "/";
        },

        async _fetchCAPCsrf() {
            const base = this._getDatabaseBaseURL();
            const res = await fetch(base, {
                method: "GET",
                headers: { "X-CSRF-Token": "Fetch" },
                credentials: "include"
            });

            return res.headers.get("X-CSRF-Token");
        },

        _updateRequestStatus: async function (reqStatus, wfStatus) {

            const base = this._getDatabaseBaseURL();
            const requestId = this.getModel("request").getProperty("/reqId");
            const token = await this._fetchCAPCsrf();

            const payload = {
                requestStatus: reqStatus,
                workflowStatus: wfStatus
            };

            await fetch(`${base}SalesPricingRequests(requestId='${requestId}')`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-Token": token
                },
                body: JSON.stringify(payload),
                credentials: "include"
            });
        },

        _addApproveComment: async function () {

            const comments = this.getModel("commentModel").getData() || [];
            const newComments = comments.filter(c => c.IsNew);
            if (!newComments.length) return;

            const base = this._getDatabaseBaseURL();
            const token = await this._fetchCAPCsrf();
            const requestId = this.getModel("request").getProperty("/reqId");

            for (let c of newComments) {
                await fetch(`${base}SalesPricingComments`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRF-Token": token
                    },
                    body: JSON.stringify({
                        commentText: c.Text,
                        role: "Approver",
                        user: c.UserName || "Approver",
                        request_requestId: requestId
                    }),
                    credentials: "include"
                });
            }
        },
        _completeWorkflowTask: async function () {
            const base = this._getWorkflowBaseURL();
            const taskId = this.getModel("task").getData().InstanceID;

            const res = await fetch(`${base}/task-instances/${taskId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ status: "COMPLETED" })
            });

            if (!res.ok) {
                throw new Error("Workflow task completion failed");
            }
        },

        // Posting
        _onApprove: async function () {

            const comments = this.getModel("commentModel")?.getData() ?? [];

            if (!this._hasNewComment(comments)) {
                sap.m.MessageBox.information("Please add a comment before approving.");
                return;
            }

            try {
                // (Optional) SAP posting – can be enabled later
                // await this._postPricingDataToSAP();

                // 1. Update CAP
                await this._updateRequestStatus("Approved", "Completed");

                // 2. Save comments
                await this._addApproveComment();

                // 3. Complete workflow
                await this._completeWorkflowTask();

                sap.m.MessageBox.success("Request approved.");
                this._refreshInbox();

            } catch (e) {
                sap.m.MessageBox.error(e.message || "Approve failed");
            }
        },

        _onReject: async function () {

            const comments = this.getModel("commentModel")?.getData() ?? [];

            if (!this._hasNewComment(comments)) {
                sap.m.MessageBox.information("Please add a comment before rejecting.");
                return;
            }

            try {
                // 1. Update CAP
                await this._updateRequestStatus("Rejected", "Rejected");

                // 2. Save comments
                await this._addApproveComment();

                // 3. Complete workflow
                await this._completeWorkflowTask();

                sap.m.MessageBox.error("Request rejected.");
                this._refreshInbox();

            } catch (e) {
                sap.m.MessageBox.error(e.message || "Reject failed");
            }
        },

    });
});
