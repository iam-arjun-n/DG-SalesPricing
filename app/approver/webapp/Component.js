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

            const busy = this._getBusyDialog();
            busy.open();

            try {
                const comments = this.getModel("commentModel")?.getData() ?? [];
                if (!this._hasNewComment(comments)) {
                    busy.close();
                    sap.m.MessageBox.information("Please add a comment before approving.");
                    return;
                }

                const result = await this._sendDataToSAP();

                await this._updateRequestStatus("Approved", "Completed");
                await this._addApproveComment();
                await this._completeWorkflowTask();

                busy.close();

                if (!result.success) {
                    this._openResultDialog(
                        "Posting Failed",
                        result.error,
                        "Error"
                    );
                    return;
                }

                this._openResultDialog(
                    "Approved",
                    "Sales Pricing condition records were created successfully.",
                    "Success"
                );

            } catch (e) {
                busy.close();
                this._openResultDialog(
                    "Error",
                    e.message || "Unexpected error occurred",
                    "Error"
                );
            }
        },

        _onReject: async function () {

            const busy = this._getBusyDialog();
            busy.open();

            try {
                const comments = this.getModel("commentModel")?.getData() ?? [];
                if (!this._hasNewComment(comments)) {
                    busy.close();
                    sap.m.MessageBox.information("Please add a comment before rejecting.");
                    return;
                }

                await this._updateRequestStatus("Rejected", "Rejected");
                await this._addApproveComment();
                await this._completeWorkflowTask();

                busy.close();

                this._openResultDialog(
                    "Rejected",
                    "The request has been rejected successfully.",
                    "Warning"
                );

            } catch (e) {
                busy.close();
                this._openResultDialog(
                    "Error",
                    e.message || "Reject failed",
                    "Error"
                );
            }
        },

        //Posting 
        _sendDataToSAP: async function () {

            const rows = this.getModel("submissionModel").getProperty("/rows") || [];

            if (!rows.length) {
                return { success: true };
            }

            try {
                await this._refreshSAPCsrf();
                return await this._createPricingConditions(rows);

            } catch (e) {
                return {
                    success: false,
                    error: e.message || "SAP Pricing creation failed"
                };
            }
        },


        _resolveConditionTable: function (conditionType, keyCombinationId) {

            const map = {
                PB00: {
                    SALE_SOLD_MAT_CUST: "304",      // A304
                    SALE_CUST_MAT_ROLE: "312",     // A312
                    CUST_MAT: "004",               // A004
                    SALE_DIST_MAT_CUST: "305",     // A305
                    PB00_PRICE_CUR_MAT: "020",     // A020
                    PB00_MAT: "003",               // A003
                    PB00_SALE_DIST_MAT: "306",     // A306
                    PB00_VEN_MAT: "017"            // A017
                }
            };

            const table = map?.[conditionType]?.[keyCombinationId];

            if (!table) {
                throw new Error(
                    `No condition table found for ${conditionType} / ${keyCombinationId}`
                );
            }

            return table;
        },
        _createPricingConditions: async function (rows) {

            const failures = [];

            for (const row of rows) {
                try {
                    await this._createSinglePricingCondition(row);
                } catch (e) {
                    failures.push({
                        conditionType: row.Data.ConditionType,
                        error: e.message
                    });
                }
            }

            if (failures.length) {
                throw new Error(
                    failures.map(f => `${f.conditionType}: ${f.error}`).join("\n")
                );
            }

            return { success: true };
        },

        _createSinglePricingCondition: function (row) {

    return new Promise((resolve, reject) => {

        const f = row.Data.Fields || {};
        const c = row.Data.Columns?.[0] || {};

        const table = this._resolveConditionTable(
            row.Data.ConditionType,
            row.Data.KeyCombinationId
        );

        const keyPayload = {};
        this._getTableKeyFields(table).forEach(k => {
            const mapped = this._mapFieldName(k);
            if (mapped && (f[k] || c[k])) {
                keyPayload[mapped] = f[k] || c[k];
            }
        });

        const payload = {
            ConditionType: row.Data.ConditionType,
            ConditionApplication: "V",
            ConditionTable: table,

            ConditionRateValue: parseFloat(c.Amount).toFixed(3),
            ConditionRateValueUnit: c.Unit,
            ConditionQuantity: "1",
            ConditionQuantityUnit: c.UoM || "EA",

            to_SlsPrcgCndnRecdValidity: {
                results: [{
                    ConditionValidityStartDate: this._formatDateToODataV2(c.Valid_From),
                    ConditionValidityEndDate: this._formatDateToODataV2(c.Valid_To),
                    ...keyPayload
                }]
            }
        };

        console.log("Final Deep Insert Payload:");
        console.log(JSON.stringify(payload, null, 2));

        this.getModel("SAPSalesModel").create(
            "/A_SlsPrcgConditionRecord",
            payload,
            {
                success: resolve,
                error: function (oError) {
                    const msg =
                        oError?.responseText
                            ? JSON.parse(oError.responseText)?.error?.message?.value
                            : "Condition record creation failed";
                    reject(new Error(msg));
                }
            }
        );
    });
},

        _refreshSAPCsrf: function () {
            return new Promise((resolve, reject) => {
                const oModel = this.getModel("SAPSalesModel");
                oModel.refreshSecurityToken(
                    () => resolve(),
                    (e) => reject(e)
                );
            });
        },

        _getTableKeyFields: function (table) {
            const tableKeys = {
                "304": ["Sales_Organization", "Distribution_Channel", "Customer", "Material"],
                "312": ["Sales_Organization", "Customer", "Material"],
                "305": ["Sales_Organization", "Distribution_Channel", "Customer", "Material"],
                "004": ["Customer", "Material"],
                "003": ["Material"],
                "020": ["Price_List_Type", "Material"],
                "306": ["Sales_Organization", "Distribution_Channel", "Material"],
                "017": ["Supplier", "Material"]
            };
            return tableKeys[table] || [];
        },

        _mapFieldName: function (field) {
            const map = {
                Sales_Organization: "SalesOrganization",
                Distribution_Channel: "DistributionChannel",
                Customer: "Customer",
                Sold_To_Party: "SoldToParty",
                Material: "Material",
                Supplier: "Supplier",
                Price_List_Type: "PriceListType",
                Division: "Division"
            };
            return map[field];
        },



        _formatDateToODataV2: function (dateStr) {
            if (!dateStr) {
                // SAP pricing REQUIRES end date
                // Use 31.12.9999 as standard open-ended validity
                return "/Date(253402214400000)/"; // 9999-12-31
            }

            const d = new Date(dateStr);
            if (isNaN(d.getTime())) {
                throw new Error("Invalid date format: " + dateStr);
            }

            return `/Date(${d.getTime()})/`;
        },


        _refreshInbox: function () {
            const startup = this.getComponentData().startupParameters;
            startup?.inboxAPI?.updateTask(
                "NA",
                startup.taskModel.getData().InstanceID
            );
        },

        _getBusyDialog: function () {
            if (!this._busyDialog) {
                this._busyDialog = new sap.m.BusyDialog({
                    title: "Processing",
                    text: "Please wait while the request is being processed..."
                });
            }
            return this._busyDialog;
        },

        _openResultDialog: function (title, message, state) {

            if (!this._resultDialog) {
                this._resultDialog = sap.ui.xmlfragment(
                    "com.deloitte.mdg.salepricing.approver.approver.view.fragments.ResultDialog",
                    this
                );
                this.getRootControl().addDependent(this._resultDialog);
            }

            const oModel = new sap.ui.model.json.JSONModel({
                title,
                message,
                state
            });

            this._resultDialog.setModel(oModel, "result");
            this._resultDialog.open();
        },

        onResultDialogClose: function () {
            if (this._resultDialog) {
                this._resultDialog.close();
            }
            window.location.reload();
        },

    });
});
