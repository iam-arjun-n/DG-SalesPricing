sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (Controller, Fragment, JSONModel, MessageToast, MessageBox, Filter, FilterOperator) {
    "use strict";

    return Controller.extend("com.deloitte.mdg.salepricing.initiator.initiator.controller.Create", {

        onInit: function () {
            var oModel = this.getOwnerComponent().getModel("SAPSalesModel");
            this.getView().setModel(oModel);

            var oTableModel = new JSONModel({ items: [] });
            this.getView().setModel(oTableModel, "materialModel");

            var oViewModel = new JSONModel({
                Field_Sales_Organization: { visible: false },
                Field_Distribution_Channel: { visible: false },
                Field_Customer: { visible: false },
                Field_Material: { visible: false },
                Field_Material_Price_Group: { visible: false },
                Field_Division: { visible: false },
                Field_Departure_City_Region: { visible: false },
                Field_Sold_To_Party: { visible: false },
                Field_Price_List_Type: { visible: false },
                Field_Document_Currency: { visible: false },
                Field_Supplier: { visible: false },

                Column_Material: { visible: false },
                Column_Material_Group: { visible: false },
                Column_Plant: { visible: false },
                Column_Status: { visible: false },
                Column_Price_Group: { visible: false },
                Column_Departure_City_Region: { visible: false },
                Column_Tax_Class_Customer: { visible: false },
                Column_Tax_Class_Material: { visible: false },
                Column_Description: { visible: false },
                Column_Processing_Status: { visible: false },
                Column_Partner_Role: { visible: false },
                Column_Amount: { visible: false },
                Column_Unit: { visible: false },
                Column_Pricing_Unit: { visible: false },
                Column_UoM: { visible: false },
                Column_Calculation_Type: { visible: false },
                Column_Scale_Base_Type: { visible: false },
                Column_Valid_From: { visible: false },
                Column_Valid_To: { visible: false },
                Column_Deletion: { visible: false },
                Column_Condition_Supplement: { visible: false },
                Column_Scales: { visible: false },
                Column_Texts: { visible: false },
                Column_Exclusion: { visible: false },
                Column_Payment_Terms: { visible: false },
                Column_Fixed_Value_Date: { visible: false },
                Column_Additional_Value_Days: { visible: false },
                Column_Customer: { visible: false },
                Column_Tax_Code: { visible: false },
                Column_Withholding_Tax_Code: { visible: false },
                Column_Licence_No: { visible: false },
                Column_Licence_Date: { visible: false },
                Column_Deletion_Indictor: { visible: false }
            });

            this.getView().setModel(oViewModel, "viewModel");

            // Store active key combination
            this._activeKeyCombination = null;

            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("RouteCreate").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function (oEvent) {
            var sEncodedParams = oEvent.getParameter("arguments").data;
            if (!sEncodedParams) {
                return;
            }

            try {
                var oParams = JSON.parse(decodeURIComponent(sEncodedParams));
                var sConditionType = oParams.conditionType;
                var sKeyCombinationId = oParams.keyCombinationId;

                sap.ui.require([
                    "com/deloitte/mdg/salepricing/initiator/initiator/model/keyCombinations"
                ], function (keyCombinations) {

                    var aCombos = keyCombinations.Configuration[sConditionType] || [];
                    var oKeyCombo = aCombos.find(c => c.id === sKeyCombinationId);

                    this._activeKeyCombination = oKeyCombo;

                    var oViewModel = this.getView().getModel("viewModel");

                    Object.keys(oViewModel.getData()).forEach(function (k) {
                        oViewModel.setProperty("/" + k + "/visible", false);
                    });

                    if (oKeyCombo && oKeyCombo.fields) {
                        oKeyCombo.fields.forEach(function (f) {
                            if (oViewModel.getProperty("/" + f)) {
                                oViewModel.setProperty("/" + f + "/visible", true);
                            }
                        });
                    }

                    // 🔹 Reset table and add ONE empty row
                    var oTableModel = this.getView().getModel("materialModel");
                    oTableModel.setProperty("/items", []);
                    oTableModel.getProperty("/items").push(
                        this._createEmptyRowForKeyCombination()
                    );
                    oTableModel.refresh(true);

                }.bind(this));

            } catch (e) {
                console.error("Invalid route data", e);
            }
        },

        _createEmptyRowForKeyCombination: function () {
            var oRow = {};

            if (!this._activeKeyCombination || !this._activeKeyCombination.fields) {
                return oRow;
            }

            this._activeKeyCombination.fields.forEach(function (f) {
                if (f.startsWith("Column_")) {
                    var sProp = f.replace("Column_", "");
                    oRow[sProp] = "";
                }
            });

            return oRow;
        },

        page_createPriceConditions_addRow: function () {
            var oTableModel = this.getView().getModel("materialModel");
            var aItems = oTableModel.getProperty("/items");

            aItems.push(this._createEmptyRowForKeyCombination());
            oTableModel.refresh(true);
        },

        navigateTo: function (sRoute) {
            this.getOwnerComponent().getRouter().navTo(sRoute);
        },

        page_createPriceConditions_navigateBack: function () {
            this.getOwnerComponent().getRouter().navTo("RouteSubmission", {
                request_type: "create"
            });
        },

        page_createPriceConditions_Delete: function () {
            var oTable = this.byId("CreatePriceCondition_Page_Table");
            var oModel = this.getView().getModel("materialModel");
            var aData = oModel.getProperty("/items");
            var aSelectedIndices = oTable.getSelectedIndices();

            if (!aSelectedIndices.length) {
                MessageToast.show("No items selected");
                return;
            }

            MessageBox.confirm("Delete selected rows?", {
                onClose: function (oAction) {
                    if (oAction === MessageBox.Action.OK) {
                        aSelectedIndices.sort((a, b) => b - a);
                        aSelectedIndices.forEach(i => aData.splice(i, 1));
                        oModel.refresh(true);
                        oTable.clearSelection();
                    }
                }
            });
        }
    });
});
