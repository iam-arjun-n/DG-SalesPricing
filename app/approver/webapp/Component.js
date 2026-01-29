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

                const comments = (oData.comments || []).map(c => ({
                    UserName: c.createdBy,
                    Date: c.createdAt,
                    Text: c.commentText
                }));

                this.getModel("commentModel").setData(comments);
            });
        }
    });
});
