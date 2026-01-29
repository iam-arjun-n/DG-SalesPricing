sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";

    return Controller.extend(
        "com.deloitte.mdg.salepricing.approver.approver.controller.Overview",
        {
            onInit: function () {

            },

            onSelectionChange: function (oEvent) {
                const oTable = oEvent.getSource();
                const bSelected = oTable.getSelectedItem() !== null;

                this.byId("Overview_Button_View").setEnabled(bSelected);
            },

            onView: function () {
                const oTable = this.byId("Overview_Table");
                const oItem = oTable.getSelectedItem();

                if (!oItem) {
                    return;
                }

                const oRow = oItem
                    .getBindingContext("submissionModel")
                    .getObject();

                this.getOwnerComponent()
                    .getRouter()
                    .navTo("RouteView", {
                        data: encodeURIComponent(JSON.stringify(oRow))
                    });
            },

            onPostComment: function (oEvent) {
                const text = oEvent.getParameter("value");
                if (!text || !text.trim()) return;

                const user =
                    sap.ushell?.Container?.getUser?.()
                        ? sap.ushell.Container.getUser().getEmail()
                        : "approver@system.com";

                this.getOwnerComponent().addApproverCommentToModels(text, user);
                oEvent.getSource().setValue("");
            },

        }
    );
});
