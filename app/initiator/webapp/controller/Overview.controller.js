sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
], function (Controller, Fragment, JSONModel, MessageToast) {
    "use strict";

    return Controller.extend("com.deloitte.mdg.salepricing.initiator.initiator.controller.Main", {
        onInit() {
            var oModel = this.getOwnerComponent().getModel("MainServiceModel");
            this.getView().setModel(oModel);
        },
        navigateTo: function (view) {
            this.getOwnerComponent().getRouter().navTo(view);
        },
        page_main_create: function () {
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("RouteSubmission", {
                request_type: "create"
            });
        },
        page_main_change: function(){
            this.navigateTo("Display");

        }
    });
});