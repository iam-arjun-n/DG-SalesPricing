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

            var oViewModel = new sap.ui.model.json.JSONModel({
                Field_Sales_Organization: { visible: false },
                Field_Distribution_Channel: { visible: false },
                Field_Customer: { visible: false },
                Field_Material: { visible: false },
                Field_Material_Price_Group: { visible: false },
                Field_Division: { visible: false },
                Field_Departure_City_Region: { visible: false },
                Field_Sold_To_Party:{ visible: false },
                Field_Price_List_Type:{ visible: false },
                Field_Document_Currency:{ visible: false },
                Field_Supplier:{ visible: false },
                Column_Material: { visible: false },
                Column_Material_Group:{ visible: false },
                Column_Plant: { visible: false },
                Column_Status: { visible: false },
                Column_Price_Group: { visible: false },
                Column_Departure_City_Region: { visible: false },
                Column_Tax_Class_Customer: { visible: false },
                Column_Tax_Class_Material: { visible: false },
                Column_Description: { visible: false },
                Column_Processing_Status: { visible: false },
                Column_Partner_Role:{ visible: false },
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
                Column_Deletion_Indictor: { visible: false },
            });
            this.getView().setModel(oViewModel, "viewModel");

            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("RouteCreate").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function (oEvent) {
            var sEncodedParams = oEvent.getParameter("arguments").data;

            if (!sEncodedParams) {
                console.warn("No parameters found in URL");
                return;
            }

            try {
                var oParams = JSON.parse(decodeURIComponent(sEncodedParams));
                var sConditionType = oParams.conditionType;
                var sKeyCombinationId = oParams.keyCombinationId;

                sap.ui.require([
                    "com/deloitte/mdg/salepricing/initiator/initiator/model/keyCombinations"
                ], function (keyCombinations) {
                    var aArray = keyCombinations.Configuration[sConditionType] || [];
                    var oKeyCombo = aArray.find(k => k.id === sKeyCombinationId);

                    var oViewModel = this.getView().getModel("viewModel");

                    // Reset all fields to false
                    Object.keys(oViewModel.getData()).forEach(function (field) {
                        oViewModel.setProperty("/" + field + "/visible", false);
                    });

                    // Set visible = true only for fields in key combination
                    if (oKeyCombo && oKeyCombo.fields) {
                        oKeyCombo.fields.forEach(function (f) {
                            if (oViewModel.getProperty("/" + f)) { // check exists
                                oViewModel.setProperty("/" + f + "/visible", true);
                            }
                        });
                    }
                }.bind(this));
            } catch (err) {
                console.error("Failed to parse URL parameters:", err);
            }
        },
        navigateTo: function (view) {
            this.getOwnerComponent().getRouter().navTo(view);
        },

        page_createPriceConditions_navigateBack: function () {
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("RouteSubmission", {
                request_type: "create"
            });
        },

        // 🔹 Add Row to Table
        page_createPriceConditions_addRow: function () {
            var oTableModel = this.getView().getModel("materialModel");
            var aItems = oTableModel.getProperty("/items");

            aItems.push({
                Customer: "",
                Status: "",
                Description: "",
                ProcessingStatus: "",
                Amount: "",
                Unit: "",
                Per: "",
                UoM: "",
                CalculationType: "",
                ScaleBaseType: "",
                ValidFrom: "",
                ValidTo: "",
                Deletion: false,
                ConditionSupplement: "",
                Scales: "",
                Texts: "",
                Exclusion: false,
                PaymentTerms: "",
                FixedValueDate: "",
                AdditionalValueDate: ""
            });

            oTableModel.setProperty("/items", aItems);
        },

        // 🔹 Save Form + Table Data
        page_createPriceConditions_save: function () {
            var oView = this.getView();

            var oFormData = {
                SalesOrganization: oView.byId("SalesOrganization").getValue(),
                DistributionChannel: oView.byId("DistributionChannel").getValue(),
                Material: oView.byId("Material").getValue(),
                MaterialPriceGroup: oView.byId("MaterialPriceGroup").getValue()
            };

            var oTableModel = oView.getModel("materialModel");
            var aItems = oTableModel.getProperty("/items");

            var oPayload = {
                ...oFormData,
                Conditions: aItems
            };

            var oLocalDataModel = this.getOwnerComponent().getModel("localDataModel");
            var aSaved = oLocalDataModel.getProperty("/conditions");
            aSaved.push(oPayload);
            oLocalDataModel.setProperty("/conditions", aSaved);

            this.getOwnerComponent().getRouter().navTo("Create");
        },

        // 🔹 Cancel Form
        page_createPriceConditions_cancel: function () {
            this.getOwnerComponent().getRouter().navTo("Create");
            var oView = this.getView();

            oView.byId("SalesOrganization").setValue("");
            oView.byId("DistributionChannel").setValue("");
            oView.byId("Material").setValue("");
            oView.byId("MaterialPriceGroup").setValue("");

            var oTableModel = oView.getModel("materialModel");
            oTableModel.setProperty("/items", []);
        },

        // 🔹 Delete Selected Table Rows
        page_createPriceConditions_Delete: function () {
            var oTable = this.byId("CreatePriceCondition_Page_Table");
            var oModel = this.getView().getModel("materialModel");
            var aData = oModel.getProperty("/items");
            var aSelectedIndices = oTable.getSelectedIndices();

            if (aSelectedIndices.length === 0) {
                MessageToast.show("No items selected!");
                return;
            }

            MessageBox.confirm("Are you sure you want to delete the selected items?", {
                title: "Delete Confirmation",
                onClose: function (oAction) {
                    if (oAction === MessageBox.Action.OK) {
                        this._deleteSelectedItems(aSelectedIndices, aData, oModel, oTable);
                    }
                }.bind(this)
            });
        },

        _deleteSelectedItems: function (aSelectedIndices, aData, oModel, oTable) {
            aSelectedIndices.sort((a, b) => b - a);
            aSelectedIndices.forEach(function (iIndex) {
                aData.splice(iIndex, 1);
            });
            oModel.setProperty("/items", aData);
            oTable.clearSelection();
            MessageToast.show("Selected items deleted successfully.");
        },

        // 🔹 Sales Org Value Help (EN only)
        onSalesOrgValueHelp: function (oEvent) {
            var oView = this.getView();
            this._oInputField = oEvent.getSource();

            if (!this._oSalesOrgVH) {
                Fragment.load({
                    id: oView.getId(),
                    name: "com.deloitte.mdg.salepricing.initiator.initiator.fragment.F4.SalesOrganization",
                    controller: this
                }).then(function (oDialog) {
                    this._oSalesOrgVH = oDialog;
                    oView.addDependent(this._oSalesOrgVH);

                    // Apply filter to show only EN language
                    var oBinding = this._oSalesOrgVH.getBinding("items");
                    if (oBinding) {
                        oBinding.filter([new Filter("Language", FilterOperator.EQ, "EN")]);
                    }

                    this._oSalesOrgVH.open();
                }.bind(this));
            } else {
                var oBinding = this._oSalesOrgVH.getBinding("items");
                if (oBinding) {
                    oBinding.filter([new Filter("Language", FilterOperator.EQ, "EN")]);
                }
                this._oSalesOrgVH.open();
            }
        },

        _buildSalesOrgFilter: function (sValue) {
            return new Filter([
                new Filter("SalesOrganization", FilterOperator.Contains, sValue),
                new Filter("SalesOrganizationName", FilterOperator.Contains, sValue)
            ], false);
        },

        onSalesOrgValueHelpSearch: function (oEvent) {
            var sValue = oEvent.getParameter("value");
            var aFilters = [
                new Filter("Language", FilterOperator.EQ, "EN")
            ];

            if (sValue) {
                aFilters.push(this._buildSalesOrgFilter(sValue));
            }

            oEvent.getSource().getBinding("items").filter(aFilters);
        },

        onSalesOrgValueHelpConfirm: function (oEvent) {
            var oSelectedItem = oEvent.getParameter("selectedItem");
            if (oSelectedItem && this._oInputField) {
                this._oInputField.setValue(oSelectedItem.getTitle());
                this._oInputField.setValueState("None");
            }
            oEvent.getSource().close();
        },

        onSalesOrgValueHelpCancel: function (oEvent) {
            var oBinding = oEvent.getSource().getBinding("items");
            if (oBinding) {
                oBinding.filter([new Filter("Language", FilterOperator.EQ, "EN")]);
            }
        },

        // 🔹 Suggest Event (Live Search)
        onSalesOrgSuggest: function (oEvent) {
            var sValue = oEvent.getParameter("suggestValue");
            var oBinding = oEvent.getSource().getBinding("suggestionItems");
            var aFilters = [new Filter("Language", FilterOperator.EQ, "EN")];

            if (sValue) {
                aFilters.push(this._buildSalesOrgFilter(sValue));
            }

            oBinding.filter(aFilters);
        },
        // 🔹 Distribution Channel Value Help (EN only)
        onDistributionChannelValueHelp: function (oEvent) {
            var oView = this.getView();
            this._oDistChannelInput = oEvent.getSource();

            if (!this._oDistChannelVH) {
                Fragment.load({
                    id: oView.getId(),
                    name: "com.deloitte.mdg.salepricing.initiator.initiator.fragment.F4.DistributionChannel",
                    controller: this
                }).then(function (oDialog) {
                    this._oDistChannelVH = oDialog;
                    oView.addDependent(this._oDistChannelVH);

                    // Filter to show only EN
                    var oBinding = this._oDistChannelVH.getBinding("items");
                    if (oBinding) {
                        oBinding.filter([new Filter("Language", FilterOperator.EQ, "EN")]);
                    }

                    this._oDistChannelVH.open();
                }.bind(this));
            } else {
                var oBinding = this._oDistChannelVH.getBinding("items");
                if (oBinding) {
                    oBinding.filter([new Filter("Language", FilterOperator.EQ, "EN")]);
                }
                this._oDistChannelVH.open();
            }
        },

        _buildDistChannelFilter: function (sValue) {
            return new Filter([
                new Filter("DistributionChannel", FilterOperator.Contains, sValue),
                new Filter("DistributionChannelName", FilterOperator.Contains, sValue)
            ], false);
        },

        onDistributionChannelValueHelpSearch: function (oEvent) {
            var sValue = oEvent.getParameter("value");
            var aFilters = [new Filter("Language", FilterOperator.EQ, "EN")];

            if (sValue) {
                aFilters.push(this._buildDistChannelFilter(sValue));
            }

            oEvent.getSource().getBinding("items").filter(aFilters);
        },

        onDistributionChannelValueHelpConfirm: function (oEvent) {
            var oSelectedItem = oEvent.getParameter("selectedItem");
            if (oSelectedItem && this._oDistChannelInput) {
                this._oDistChannelInput.setValue(oSelectedItem.getTitle());
                this._oDistChannelInput.setValueState("None");
            }
            oEvent.getSource().close();
        },

        onDistributionChannelValueHelpCancel: function (oEvent) {
            var oBinding = oEvent.getSource().getBinding("items");
            if (oBinding) {
                oBinding.filter([new Filter("Language", FilterOperator.EQ, "EN")]);
            }
        },

        onDistributionChannelSuggest: function (oEvent) {
            var sValue = oEvent.getParameter("suggestValue");
            var oBinding = oEvent.getSource().getBinding("suggestionItems");
            var aFilters = [new Filter("Language", FilterOperator.EQ, "EN")];

            if (sValue) {
                aFilters.push(this._buildDistChannelFilter(sValue));
            }

            oBinding.filter(aFilters);
        },
        // 🔹 Material Pricing Group Value Help
        // 🔹 Material Pricing Group Value Help
        onMaterialPricingGroupValueHelp: function (oEvent) {
            var oView = this.getView();
            this._oMPGInput = oEvent.getSource();

            if (!this._oMPGDialog) {
                Fragment.load({
                    id: oView.getId() + "--MPGDialog",
                    name: "com.deloitte.mdg.salepricing.initiator.initiator.fragment.F4.MaterialPriceGroup",
                    controller: this
                }).then(function (oDialog) {
                    this._oMPGDialog = oDialog;
                    oView.addDependent(this._oMPGDialog);

                    // Apply filter for EN language
                    var oBinding = this._oMPGDialog.getBinding("items");
                    if (oBinding) {
                        oBinding.filter([new Filter("Language", FilterOperator.EQ, "EN")]);
                    }

                    this._oMPGDialog.open();
                }.bind(this));
            } else {
                var oBinding = this._oMPGDialog.getBinding("items");
                if (oBinding) {
                    oBinding.filter([new Filter("Language", FilterOperator.EQ, "EN")]);
                }
                this._oMPGDialog.open();
            }
        },

        onMaterialPricingGroupValueHelpSearch: function (oEvent) {
            var sValue = oEvent.getParameter("value");
            var oBinding = oEvent.getSource().getBinding("items");

            var aFilters = [new Filter("Language", FilterOperator.EQ, "EN")]; // filter for EN

            if (sValue) {
                aFilters.push(
                    new Filter({
                        filters: [
                            new Filter("MaterialPricingGroup", FilterOperator.Contains, sValue),
                            new Filter("MaterialPricingGroupName", FilterOperator.Contains, sValue)
                        ],
                        and: false
                    })
                );
            }
            oBinding.filter(aFilters);
        },

        onMaterialPricingGroupSuggest: function (oEvent) {
            var sValue = oEvent.getParameter("suggestValue");
            var oBinding = oEvent.getSource().getBinding("suggestionItems");

            var aFilters = [new Filter("Language", FilterOperator.EQ, "EN")]; // filter for EN

            if (sValue) {
                aFilters.push(
                    new Filter({
                        filters: [
                            new Filter("MaterialPricingGroup", FilterOperator.Contains, sValue),
                            new Filter("MaterialPricingGroupName", FilterOperator.Contains, sValue)
                        ],
                        and: false
                    })
                );
            }
            oBinding.filter(aFilters);
        },

        onMaterialPricingGroupValueHelpCancel: function (oEvent) {
            var oDialog = oEvent.getSource();
            if (oDialog && oDialog.close) {
                // Reapply EN filter on cancel
                var oBinding = oDialog.getBinding("items");
                if (oBinding) {
                    oBinding.filter([new Filter("Language", FilterOperator.EQ, "EN")]);
                }
                oDialog.close();
            }
        }


    });
});