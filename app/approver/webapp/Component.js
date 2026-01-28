sap.ui.define([
    "sap/ui/core/UIComponent",
    "com/deloitte/mdg/salepricing/approver/approver/model/models"
], (UIComponent, models) => {
    "use strict";

    return UIComponent.extend("com.deloitte.mdg.salepricing.approver.approver.Component", {
        metadata: {
            manifest: "json",
            interfaces: [
                "sap.ui.core.IAsyncContentCreation"
            ]
        },

        init() {
            UIComponent.prototype.init.apply(this, arguments);
            this.setModel(models.createDeviceModel(), "device");
            this.getRouter().initialize();
            this._setupInboxActions();
            this._loadWorkflowContext();
        },

        createContent: function () {
            return this._getMainView();
        },

        _getMainView: function () {
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
                () => this._onApprove()
            );

            inboxAPI.addAction(
                { action: "REJECT", label: "Reject", type: "reject" },
                () => this._onReject()
            );
        },

        _loadWorkflowContext: function () {

            const compData = this.getComponentData();
            const startup = compData && compData.startupParameters;

            if (!startup || !startup.taskModel) {
                console.info("Workflow context not available (not Inbox launch)");
                return;
            }

            const taskModel = startup.taskModel;
            this.setModel(taskModel, "task");

            const contextUrl =
                startup.taskModel.sServiceUrl +
                "/TaskCollection('" +
                startup.taskModel.sTaskId +
                "')/context";

            const contextModel = new sap.ui.model.json.JSONModel(contextUrl);

            contextModel.attachRequestCompleted(() => {
                const data = contextModel.getData();

                if (typeof data === "string") {
                    console.error("Workflow context error:", data);
                    return;
                }

                console.log("Workflow Context Loaded:", data);
                this.setModel(contextModel, "context");

                this._reqId = data.requestId || data.ReqId;
            });
        },
    });
});