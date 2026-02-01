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

            var oFieldModel = new JSONModel({
                Sales_Organization: "",
                Distribution_Channel: "",
                Customer: "",
                Material: "",
                Material_Price_Group: "",
                Division: "",
                Departure_City_Region: "",
                Sold_To_Party: "",
                Price_List_Type: "",
                Document_Currency: "",
                Supplier: ""
            });

            this.getView().setModel(oFieldModel, "fieldModel");

            var oColumnModel = new JSONModel({ rows: [] });
            this.getView().setModel(oColumnModel, "columnModel");


            var oDraftModel = new sap.ui.model.json.JSONModel({
                ConditionType: "",
                KeyCombinationId: "",
                Fields: {},
                Columns: []
            });

            this.getView().setModel(oDraftModel, "draftModel");


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

                var oDraftModel = this.getView().getModel("draftModel");

                oDraftModel.setProperty("/ConditionType", sConditionType);
                oDraftModel.setProperty("/KeyCombinationId", sKeyCombinationId);
                oDraftModel.setProperty("/Fields", {});
                oDraftModel.setProperty("/Columns", []);

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

                    var oColumnModel = this.getView().getModel("columnModel");
                    oColumnModel.setProperty("/rows", [this._createEmptyRow()]);
                    oColumnModel.refresh(true);

                }.bind(this));

            } catch (e) {
                console.error("Invalid route data", e);
            }
        },

        _createEmptyRow: function () {
            var oRow = {};

            if (!this._activeKeyCombination || !this._activeKeyCombination.fields) {
                return oRow;
            }
            const oToday = new Date();
            const sToday = oToday.toISOString().split("T")[0];
            const sMaxDate = "9999-12-31";


            this._activeKeyCombination.fields.forEach(function (f) {
                if (!f.startsWith("Column_")) {
                    return;
                }

                var sProp = f.replace("Column_", "");

                if (sProp === "Valid_From") {
                    oRow[sProp] = sToday;
                    return;
                }

                if (sProp === "Valid_To") {
                    oRow[sProp] = sMaxDate;
                    return;
                }

                const aBooleanFields = [
                    "Deletion",
                    "Condition_Supplement",
                    "Scales",
                    "Texts",
                    "Deletion_Indictor"
                ];

                if (aBooleanFields.includes(sProp)) {
                    oRow[sProp] = false;   
                    return;
                }

                oRow[sProp] = "";
            });

            return oRow;
        },

        onAddRow: function () {
            var oColumnModel = this.getView().getModel("columnModel");
            var aRows = oColumnModel.getProperty("/rows");

            aRows.push(this._createEmptyRow());
            oColumnModel.refresh(true);
        },

        navigateTo: function (sRoute) {
            this.getOwnerComponent().getRouter().navTo(sRoute);
        },

        navBack: function () {
            this._resetAllModels();
            this.getOwnerComponent().getRouter().navTo("RouteSubmission", {
                request_type: "create"
            });
        },

        onDeleteRow: function () {
            var oTable = this.byId("CreatePriceCondition_Page_Table");
            var oModel = this.getView().getModel("columnModel");
            var aData = oModel.getProperty("/rows");
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
        },

        //F4 Helper Functions
        _openF4Dialog: function (title) {

            if (!this._F4Dialog) {
                Fragment.load({
                    id: this.getView().getId(),
                    name: "com.deloitte.mdg.salepricing.initiator.initiator.fragment.F4Dialog",
                    controller: this
                }).then((oDialog) => {
                    this._F4Dialog = oDialog;
                    this.getView().addDependent(oDialog);
                    oDialog.setTitle(title);
                    oDialog.open();
                });
            } else {
                this._F4Dialog.setTitle(title);
                this._F4Dialog.open();
            }
        },

        onF4Search: function (oEvent) {
            const sValue = oEvent.getParameter("newValue");

            const oList = this.byId("F4List");
            const oBinding = oList.getBinding("items");

            const oFilter = new sap.ui.model.Filter({
                filters: [
                    new sap.ui.model.Filter("title", sap.ui.model.FilterOperator.Contains, sValue),
                    new sap.ui.model.Filter("description", sap.ui.model.FilterOperator.Contains, sValue)
                ],
                and: false
            });

            oBinding.filter([oFilter]);
        },

        onF4Select: function (oEvent) {
            const oItem = oEvent.getParameter("listItem");
            if (!oItem) {
                return;
            }

            const sValue = oItem.getTitle();

            const oInput = sap.ui.getCore().byId(this._currentInputId);
            if (oInput) {
                oInput.setValue(sValue);

                const oBinding = oInput.getBinding("value");
                if (oBinding) {
                    oBinding.getModel().setProperty(oBinding.getPath(), sValue);
                }
            }

            const oSearch = this.byId("F4SearchField");
            const oList = this.byId("F4List");

            if (oSearch) {
                oSearch.setValue("");
            }
            if (oList) {
                oList.getBinding("items").filter([]);
            }

            this._F4Dialog.close();
        },


        onF4Cancel: function () {
            this._F4Dialog.close();
        },

        //F4 Main Functions For Field
        onF4_Field_SalesOrganization: function (oEvent) {
            sap.ui.core.BusyIndicator.show();

            const inputId = oEvent.getSource().getId();
            this._currentInputId = inputId;

            const oModel = this.getOwnerComponent().getModel("ValueHelp1Model");
            const entitySet = "/ZI_SALESORGANIZATION";

            oModel.read(entitySet, {
                success: (oData) => {
                    const formattedData = oData.results.map(item => ({
                        title: item.SalesOrganization,
                        description: item.Name
                    }));

                    const wrappedData = { results: formattedData };
                    const oF4Model = new sap.ui.model.json.JSONModel(wrappedData);
                    this.getView().setModel(oF4Model, "F4Model");
                    this._openF4Dialog("Sales Organization");

                    sap.ui.core.BusyIndicator.hide();
                },
                error: (err) => {
                    sap.ui.core.BusyIndicator.hide();
                    sap.m.MessageBox.error("Failed to load Sales Organization: " + err.message);
                }
            });
        },

        onF4_Field_DistributionChannel: function (oEvent) {
            sap.ui.core.BusyIndicator.show();

            const inputId = oEvent.getSource().getId();
            this._currentInputId = inputId;

            const oModel = this.getOwnerComponent().getModel("ValueHelp1Model");
            const entitySet = "/C_Dischannelvaluehelp";

            oModel.read(entitySet, {
                success: (oData) => {
                    const formattedData = oData.results.map(item => ({
                        title: item.DistributionChannel,
                        description: item.DistributionChannel_Text
                    }));

                    const wrappedData = { results: formattedData };
                    const oF4Model = new sap.ui.model.json.JSONModel(wrappedData);
                    this.getView().setModel(oF4Model, "F4Model");
                    this._openF4Dialog("Distribution Channel");

                    sap.ui.core.BusyIndicator.hide();
                },
                error: (err) => {
                    sap.ui.core.BusyIndicator.hide();
                    sap.m.MessageBox.error("Failed to load Distribution Channel: " + err.message);
                }
            });
        },

        onF4_Field_Division: function (oEvent) {
            sap.ui.core.BusyIndicator.show();
            this._currentInputId = oEvent.getSource().getId();

            const oModel = this.getOwnerComponent().getModel("ValueHelp1Model");

            oModel.read("/ZP_DIVISION_VH", {
                success: (oData) => {
                    const data = oData.results.map(i => ({
                        title: i.division,
                        description: i.Text
                    }));

                    this.getView().setModel(new JSONModel({ results: data }), "F4Model");
                    this._openF4Dialog("Division");
                    sap.ui.core.BusyIndicator.hide();
                },
                error: () => {
                    sap.ui.core.BusyIndicator.hide();
                    MessageBox.error("Failed to load Division");
                }
            });
        },

        onF4_Field_Customer: function (oEvent) {
            sap.ui.core.BusyIndicator.show();
            this._currentInputId = oEvent.getSource().getId();

            const oModel = this.getOwnerComponent().getModel("ValueHelp1Model");

            oModel.read("/I_Customer_VH", {
                success: (oData) => {
                    const data = oData.results.map(i => ({
                        title: i.Customer,
                        description: i.CustomerName
                    }));

                    this.getView().setModel(new JSONModel({ results: data }), "F4Model");
                    this._openF4Dialog("Customer");
                    sap.ui.core.BusyIndicator.hide();
                },
                error: () => {
                    sap.ui.core.BusyIndicator.hide();
                    MessageBox.error("Failed to load Customer");
                }
            });
        },

        onF4_Field_SoldToParty: function (oEvent) {
            sap.ui.core.BusyIndicator.show();
            this._currentInputId = oEvent.getSource().getId();

            const oModel = this.getOwnerComponent().getModel("ValueHelp1Model");

            oModel.read("/I_Customer_VH", {
                success: (oData) => {
                    const data = oData.results.map(i => ({
                        title: i.Customer,
                        description: i.CustomerName
                    }));

                    this.getView().setModel(new JSONModel({ results: data }), "F4Model");
                    this._openF4Dialog("Sold-To Party");
                    sap.ui.core.BusyIndicator.hide();
                },
                error: () => {
                    sap.ui.core.BusyIndicator.hide();
                    MessageBox.error("Failed to load Sold-To Party");
                }
            });
        },

        onF4_Field_Material: function (oEvent) {
            sap.ui.core.BusyIndicator.show();
            this._currentInputId = oEvent.getSource().getId();

            const oModel = this.getOwnerComponent().getModel("ValueHelp1Model");

            oModel.read("/I_MaterialStdVH", {
                success: (oData) => {
                    const data = oData.results.map(i => ({
                        title: i.Material,
                        description: i.Material_Text
                    }));

                    this.getView().setModel(new JSONModel({ results: data }), "F4Model");
                    this._openF4Dialog("Material");
                    sap.ui.core.BusyIndicator.hide();
                },
                error: () => {
                    sap.ui.core.BusyIndicator.hide();
                    MessageBox.error("Failed to load Material");
                }
            });
        },

        onF4_Field_MaterialGroup: function (oEvent) {
            sap.ui.core.BusyIndicator.show();
            this._currentInputId = oEvent.getSource().getId();

            const oModel = this.getOwnerComponent().getModel("ValueHelp1Model");

            oModel.read("/I_MaterialGroup", {
                success: (oData) => {
                    const data = oData.results.map(i => ({
                        title: i.MaterialGroup,
                        description: i.MaterialGroup_Text
                    }));

                    this.getView().setModel(new JSONModel({ results: data }), "F4Model");
                    this._openF4Dialog("Material Group");
                    sap.ui.core.BusyIndicator.hide();
                },
                error: () => {
                    sap.ui.core.BusyIndicator.hide();
                    MessageBox.error("Failed to load Material Group");
                }
            });
        },

        onF4_Field_Supplier: function (oEvent) {
            sap.ui.core.BusyIndicator.show();
            this._currentInputId = oEvent.getSource().getId();

            const oModel = this.getOwnerComponent().getModel("ValueHelp1Model");

            oModel.read("/I_Supplier_VH", {
                success: (oData) => {
                    const data = oData.results.map(i => ({
                        title: i.Supplier,
                        description: i.SupplierName
                    }));

                    this.getView().setModel(new JSONModel({ results: data }), "F4Model");
                    this._openF4Dialog("Supplier");
                    sap.ui.core.BusyIndicator.hide();
                },
                error: () => {
                    sap.ui.core.BusyIndicator.hide();
                    MessageBox.error("Failed to load Supplier");
                }
            });
        },

        onF4_Field_DocumentCurrency: function (oEvent) {
            sap.ui.core.BusyIndicator.show();
            this._currentInputId = oEvent.getSource().getId();
            var oModel = this.getOwnerComponent().getModel("ValueHelp1Model");
            var sEntitySet = "/ZI_SDCURRENCY";

            oModel.read(sEntitySet, {
                success: function (oData) {
                    var aResults = oData.results.map(function (item) {
                        return {
                            title: item.currency,
                            description: item.currency
                        };
                    });
                    var oF4Model = new sap.ui.model.json.JSONModel({
                        results: aResults
                    });

                    this.getView().setModel(oF4Model, "F4Model");
                    this._openF4Dialog("Document Currency");

                    sap.ui.core.BusyIndicator.hide();
                }.bind(this),

                error: function (oError) {
                    sap.ui.core.BusyIndicator.hide();
                    sap.m.MessageBox.error(
                        "Failed to load Document Currency value help"
                    );
                }
            });
        },

        onF4_Field_PriceListType: function (oEvent) {
            sap.ui.core.BusyIndicator.show();
            this._currentInputId = oEvent.getSource().getId();
            var oModel = this.getOwnerComponent().getModel("ValueHelp1Model");
            var sEntitySet = "/ZI_SDCURRENCY";

            oModel.read(sEntitySet, {
                success: function (oData) {
                    var aResults = oData.results.map(function (item) {
                        return {
                            title: item.PriceListType,
                            description: item.PLTDescription
                        };
                    });
                    var oF4Model = new sap.ui.model.json.JSONModel({
                        results: aResults
                    });

                    this.getView().setModel(oF4Model, "F4Model");
                    this._openF4Dialog("Price List Type");

                    sap.ui.core.BusyIndicator.hide();
                }.bind(this),

                error: function (oError) {
                    sap.ui.core.BusyIndicator.hide();
                    sap.m.MessageBox.error(
                        "Failed to load Price List Type value help"
                    );
                }
            });
        },

        //F4 Main Function For Columns
        onF4_Column_Material: function (oEvent) {
            sap.ui.core.BusyIndicator.show();
            this._currentInputId = oEvent.getSource().getId();

            const oModel = this.getOwnerComponent().getModel("ValueHelp1Model");

            oModel.read("/I_MaterialStdVH", {
                success: (oData) => {
                    const data = oData.results.map(i => ({
                        title: i.Material,
                        description: i.Material_Text
                    }));

                    this.getView().setModel(new JSONModel({ results: data }), "F4Model");
                    this._openF4Dialog("Material");
                    sap.ui.core.BusyIndicator.hide();
                },
                error: () => {
                    sap.ui.core.BusyIndicator.hide();
                    MessageBox.error("Failed to load Material");
                }
            });
        },

        onF4_Column_MaterialGroup: function (oEvent) {
            sap.ui.core.BusyIndicator.show();
            this._currentInputId = oEvent.getSource().getId();

            const oModel = this.getOwnerComponent().getModel("ValueHelp1Model");

            oModel.read("/I_MaterialGroup", {
                success: (oData) => {
                    const data = oData.results.map(i => ({
                        title: i.MaterialGroup,
                        description: i.MaterialGroup_Text
                    }));

                    this.getView().setModel(new JSONModel({ results: data }), "F4Model");
                    this._openF4Dialog("Material Group");
                    sap.ui.core.BusyIndicator.hide();
                },
                error: () => {
                    sap.ui.core.BusyIndicator.hide();
                    MessageBox.error("Failed to load Material Group");
                }
            });
        },

        onF4_Column_Customer: function (oEvent) {
            sap.ui.core.BusyIndicator.show();
            this._currentInputId = oEvent.getSource().getId();

            const oModel = this.getOwnerComponent().getModel("ValueHelp1Model");

            oModel.read("/I_Customer_VH", {
                success: (oData) => {
                    const data = oData.results.map(i => ({
                        title: i.Customer,
                        description: i.CustomerName
                    }));

                    this.getView().setModel(new JSONModel({ results: data }), "F4Model");
                    this._openF4Dialog("Customer");
                    sap.ui.core.BusyIndicator.hide();
                },
                error: () => {
                    sap.ui.core.BusyIndicator.hide();
                    MessageBox.error("Failed to load Customer");
                }
            });
        },

        onF4_Column_Plant: function (oEvent) {
            sap.ui.core.BusyIndicator.show();
            this._currentInputId = oEvent.getSource().getId();

            const oModel = this.getOwnerComponent().getModel("ValueHelp1Model");

            oModel.read("/I_Plant", {
                success: (oData) => {
                    const data = oData.results.map(i => ({
                        title: i.Plant,
                        description: i.PlantName
                    }));

                    this.getView().setModel(new JSONModel({ results: data }), "F4Model");
                    this._openF4Dialog("Customer");
                    sap.ui.core.BusyIndicator.hide();
                },
                error: () => {
                    sap.ui.core.BusyIndicator.hide();
                    MessageBox.error("Failed to load Customer");
                }
            });
        },

        onF4_Column_UoM: function (oEvent) {
            sap.ui.core.BusyIndicator.show();
            this._currentInputId = oEvent.getSource().getId();

            const oModel = this.getOwnerComponent().getModel("ValueHelp1Model");

            oModel.read("/I_UnitOfMeasure", {
                success: (oData) => {
                    const data = oData.results.map(i => ({
                        title: i.UnitOfMeasure,
                        description: i.UnitOfMeasure_Text
                    }));

                    this.getView().setModel(new JSONModel({ results: data }), "F4Model");
                    this._openF4Dialog("Customer");
                    sap.ui.core.BusyIndicator.hide();
                },
                error: () => {
                    sap.ui.core.BusyIndicator.hide();
                    MessageBox.error("Failed to load Customer");
                }
            });
        },

        // Suggestion Function
        onSuggestSalesOrganization: function () { },
        onSuggestDistributionChannel: function () { },
        onSuggestCustomer: function () { },
        onSuggestMaterial: function () { },
        onSuggestMaterialGroup: function () { },
        onSuggestDivision: function () { },
        onSuggestDepartureCityRegion: function () { },
        onSuggestSoldToParty: function () { },
        onSuggestPriceListType: function () { },
        onSuggestDocumentCurrency: function () { },
        onSuggestSupplier: function () { },


        // Live Change Function
        onLiveSalesOrganization: function () { },
        onLiveDistributionChannel: function () { },
        onLiveCustomer: function () { },
        onLiveMaterial: function () { },
        onLiveMaterialGroup: function () { },
        onLiveDivision: function () { },
        onLiveDepartureCityRegion: function () { },
        onLiveSoldToParty: function () { },
        onLivePriceListType: function () { },
        onLiveDocumentCurrency: function () { },
        onLiveSupplier: function () { },

        //Save Function
        _collectFields: function () {
            return {
                ...this.getView().getModel("fieldModel").getData()
            };
        },

        _collectColumns: function () {
            const aRows = this.getView()
                .getModel("columnModel")
                .getProperty("/rows") || [];

            return aRows.map(r => ({ ...r }));
        },

        _resolveValue: function (draft, fieldName) {

            if (draft.Fields && draft.Fields[fieldName]) {
                return draft.Fields[fieldName];
            }

            if (draft.Columns && draft.Columns.length > 0) {
                return draft.Columns[0][fieldName] || "";
            }

            return "";
        },

        //Reset Function
        _resetAllModels: function () {
            // Reset field model
            this.getView().getModel("fieldModel").setData({
                Sales_Organization: "",
                Distribution_Channel: "",
                Customer: "",
                Material: "",
                Material_Price_Group: "",
                Division: "",
                Departure_City_Region: "",
                Sold_To_Party: "",
                Price_List_Type: "",
                Document_Currency: "",
                Supplier: ""
            });

            // Reset column model
            this.getView().getModel("columnModel").setData({
                rows: []
            });

            // Reset draft model
            this.getView().getModel("draftModel").setData({
                ConditionType: "",
                KeyCombinationId: "",
                Fields: {},
                Columns: []
            });

            // Reset runtime state
            this._activeKeyCombination = null;
        },

        //Save Function
        onSave: function () {
            const oDraftModel = this.getView().getModel("draftModel");

            oDraftModel.setProperty("/Fields", this._collectFields());
            oDraftModel.setProperty("/Columns", this._collectColumns());

            const oDraft = oDraftModel.getData();
            const oSubmissionModel = this.getOwnerComponent().getModel("submissionModel");

            const entry = {
                Data: JSON.parse(JSON.stringify(oDraft)),
                Display: {
                    ConditionType: oDraft.ConditionType,
                    KeyCombinationId: oDraft.KeyCombinationId,
                    SalesOrganization: this._resolveValue(oDraft, "Sales_Organization"),
                    DistributionChannel: this._resolveValue(oDraft, "Distribution_Channel"),
                    Customer: this._resolveValue(oDraft, "Customer"),
                    Material: this._resolveValue(oDraft, "Material"),
                    Division: this._resolveValue(oDraft, "Division"),

                }
            };

            const aRows = oSubmissionModel.getProperty("/rows");
            aRows.push(entry);
            oSubmissionModel.refresh(true);

            MessageToast.show("Condition record added");
            this._resetAllModels();
            this.getOwnerComponent()
                .getRouter()
                .navTo("RouteSubmission", { request_type: "create" });
        },

        //Cancel Function
        onCancel: function () {
            this._resetAllModels();

            this.getOwnerComponent()
                .getRouter()
                .navTo("RouteSubmission", { request_type: "create" });
        }


    });
});
