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
                        Sales_Organization: oFields.Sales_Organization || "",
                        Distribution_Channel: oFields.Distribution_Channel || "",
                        Customer: oFields.Customer || "",
                        Material: oFields.Material || "",
                        Material_Price_Group: oFields.Material_Price_Group || "",
                        Division: oFields.Division || "",
                        Departure_City_Region: oFields.Departure_City_Region || "",
                        Sold_To_Party: oFields.Sold_To_Party || "",
                        Price_List_Type: oFields.Price_List_Type || "",
                        Document_Currency: oFields.Document_Currency || "",
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
                const configs = KeyCombinations.Configuration[conditionType] || [];
                const config = configs.find(c => c.id === keyCombinationId);

                const oViewState = {};

                [
                    "Field_Sales_Organization",
                    "Field_Distribution_Channel",
                    "Field_Customer",
                    "Field_Material",
                    "Field_Material_Price_Group",
                    "Field_Division",
                    "Field_Departure_City_Region",
                    "Field_Sold_To_Party",
                    "Field_Price_List_Type",
                    "Field_Document_Currency",
                    "Field_Supplier",
                    "Column_Material",
                    "Column_Material_Group",
                    "Column_Plant",
                    "Column_Status",
                    "Column_Price_Group",
                    "Column_Departure_City_Region",
                    "Column_Tax_Class_Customer",
                    "Column_Tax_Class_Material",
                    "Column_Description",
                    "Column_Processing_Status",
                    "Column_Partner_Role",
                    "Column_Amount",
                    "Column_Unit",
                    "Column_Pricing_Unit",
                    "Column_UoM",
                    "Column_Calculation_Type",
                    "Column_Scale_Base_Type",
                    "Column_Valid_From",
                    "Column_Valid_To",
                    "Column_Deletion",
                    "Column_Condition_Supplement",
                    "Column_Scales",
                    "Column_Texts",
                    "Column_Exclusion",
                    "Column_Payment_Terms",
                    "Column_Fixed_Value_Date",
                    "Column_Additional_Value_Days",
                    "Column_Customer",
                    "Column_Tax_Code",
                    "Column_Withholding_Tax_Code",
                    "Column_Licence_No",
                    "Column_Licence_Date",
                    "Column_Deletion_Indictor"].forEach(id => {
                        oViewState[id] = { visible: false };
                    });

                if (config) {
                    config.fields.forEach(id => {
                        oViewState[id] = { visible: true };
                    });
                }

                oViewState.showVBox = true;
                oViewState.addrowbtn = false;

                this.getView().setModel(new JSONModel(oViewState), "viewModel");
            },

            navBack: function () {
                this.getOwnerComponent()
                    .getRouter()
                    .navTo("RouteOverview");
            },

        }
    );
});
