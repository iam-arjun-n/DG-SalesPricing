sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "com/deloitte/mdg/salepricing/approver/approver/model/keyCombinations"
], function (Controller, JSONModel, KeyCombinations) {
    "use strict";

    return Controller.extend(
        "com.deloitte.mdg.salepricing.approver.approver.controller.View",
        {

            onInit: function () {
                const oRouter = sap.ui.core.UIComponent.getRouterFor(this);
                oRouter.getRoute("RouteView")
                    .attachPatternMatched(this._onRouteMatched, this);
            },

            _onRouteMatched: function (oEvent) {
                const sData = oEvent.getParameter("arguments").data;
                const oRow = JSON.parse(decodeURIComponent(sData));

                const oFields = oRow.Data.Fields || {};
                const oColumns = oRow.Data.Columns || {};

                this.getView().setModel(
                    new JSONModel({
                        Sales_Organization: oFields.SalesOrganization || "",
                        Distribution_Channel: oFields.DistributionChannel || "",
                        Customer: oFields.Customer || "",
                        Material: oFields.Material || "",
                        Material_Price_Group: oFields.MaterialPriceGroup || "",
                        Division: oFields.Division || "",
                        Departure_City_Region: oFields.DepartureCityRegion || "",
                        Sold_To_Party: oFields.SoldToParty || "",
                        Price_List_Type: oFields.PriceListType || "",
                        Document_Currency: oFields.DocumentCurrency || "",
                        Supplier: oFields.Supplier || ""
                    }),
                    "fieldModel"
                );

                this.getView().setModel(
                    new JSONModel({
                        rows: Array.isArray(oColumns) ? oColumns : [oColumns]
                    }),
                    "columnModel"
                );

                this._applyKeyCombinationVisibility(
                    oRow.Data.ConditionType,
                    oRow.Data.KeyCombinationId
                );
            },

            _applyKeyCombinationVisibility: function (conditionType, keyCombinationId) {
                const aConfigs =
                    KeyCombinations.Configuration[conditionType] || [];

                const oConfig = aConfigs.find(c => c.id === keyCombinationId);
                if (!oConfig) {
                    console.warn(
                        "No key combination config found",
                        conditionType,
                        keyCombinationId
                    );
                    return;
                }

                const oViewState = {};

                oConfig.fields.forEach(id => {
                    oViewState[id] = { visible: true };
                });

                oViewState.showVBox = true;
                oViewState.addrowbtn = false;

                this.getView().setModel(
                    new JSONModel(oViewState),
                    "viewModel"
                );
            },

            navBack: function () {
                this.getOwnerComponent()
                    .getRouter()
                    .navTo("RouteOverview");
            },

        }
    );
});
