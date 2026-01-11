sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/core/Fragment",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "com/deloitte/mdg/salepricing/initiator/initiator/model/keyCombinations" // KeyCombination module
  
], function (Controller, Fragment, JSONModel, MessageToast, Filter, FilterOperator, KeyCombinations) {
  "use strict";

  return Controller.extend("com.deloitte.mdg.salepricing.initiator.initiator.controller.Submissison", {

    onInit() {
      // SAP Model
      var oModel = this.getOwnerComponent().getModel("SAPSalesModel");
      this.getView().setModel(oModel);

      // Local JSON model for table
      var oLocalModel = new JSONModel({ records: [] });
      this.getView().setModel(oLocalModel, "local");
      this.getView().byId("Create_Page_Table").setModel(oLocalModel);

      // Selected data
      this._selectedData = {
        conditionType: "",
        keyCombinationId: ""
      };
    },

    navigateTo: function (view, data) {
      if (data) {
        const oRouter = this.getOwnerComponent().getRouter();
        oRouter.navTo(view, { data: JSON.stringify(data) });
      } else {
        this.getOwnerComponent().getRouter().navTo(view);
      }
    },

    navBack: function () {
      this.navigateTo("RouteOverview");
    },


    onAddNew: function () {
      const oView = this.getView();
      if (!this._dialog_createConditionRecord) {
        Fragment.load({
          id: oView.getId(),
          name: "com.deloitte.mdg.salepricing.initiator.initiator.fragment.CreateConditionRecord",
          controller: this
        }).then(function (oDialog) {
          this._dialog_createConditionRecord = oDialog;
          oView.addDependent(oDialog);
          oDialog.open();
        }.bind(this));
      } else {
        this._dialog_createConditionRecord.open();
      }
    },

    dialog_createConditionRecord_submit: async function () {
      const oView = this.getView();
      const oInput = Fragment.byId(oView.getId(), "CCR_Fragment_Input");

      if (!oInput.getValue()) {
        oInput.setValueState("Error");
        oInput.setValueStateText("Condition Type is required");
        MessageToast.show("Please fill all mandatory fields.");
        return;
      } else {
        oInput.setValueState("None");
      }

      // Save selected Condition Type
      this._selectedData.conditionType = oInput.getValue();

      // Get Key Combinations based on condition type
      const aKeyCombinations = KeyCombinations.Configuration[this._selectedData.conditionType] || [];

      if (!this._dialog_keyCombination) {
        this._dialog_keyCombination = await Fragment.load({
          id: oView.getId(),
          name: "com.deloitte.mdg.salepricing.initiator.initiator.fragment.KeyCombination",
          controller: this
        });
        oView.addDependent(this._dialog_keyCombination);
      }

      const oList = Fragment.byId(oView.getId(), "KCF_Fragment_List");

      // Bind key combinations to the list (title=display text, customData=id)
      const kcData = aKeyCombinations.map(kc => ({
        id: kc.id,
        text: kc.text
      }));

      const oKCModel = new JSONModel({ keyCombinations: kcData });
      this._dialog_keyCombination.setModel(oKCModel, "kcModel");

      oList.bindItems({
        path: "kcModel>/keyCombinations",
        template: new sap.m.StandardListItem({
          title: "{kcModel>text}",
          type: "Active",
          press: this.dialog_keyCombination_select.bind(this),
          customData: [
            new sap.ui.core.CustomData({ key: "id", value: "{kcModel>id}" })
          ]
        })
      });

      this._dialog_keyCombination.open();
      this._dialog_createConditionRecord.close();
    },

    dialog_createConditionRecord_cancel: function () {
      const oView = this.getView();
      const oInput = Fragment.byId(oView.getId(), "CCR_Fragment_Input");
      if (oInput) {
        oInput.setValue("");
        oInput.setValueState("None");
      }
      this._dialog_createConditionRecord.close();
    },

    onConditionTypeLiveChange: function (oEvent) {
      const oInput = oEvent.getSource();
      if (oInput.getValue()) {
        oInput.setValueState("None");
      }
    },

    onConditionTypeValueHelp: function (oEvent) {
      const oView = this.getView();
      this._oInputField = oEvent.getSource();
      const that = this;

      const fnOpenDialog = function () {
        const oFilter = that._buildConditionTypeFilter("");
        const oItemsBinding = that._oConditionTypeVH.getBinding("items");
        if (oItemsBinding) {
          oItemsBinding.filter([oFilter]);
        }
        that._oConditionTypeVH.open();
      };

      if (!this._oConditionTypeVH) {
        Fragment.load({
          id: oView.getId(),
          name: "com.deloitte.mdg.salepricing.initiator.initiator.fragment.F4.ConditionType",
          controller: this
        }).then(function (oDialog) {
          this._oConditionTypeVH = oDialog;
          oView.addDependent(this._oConditionTypeVH);
          fnOpenDialog();
        }.bind(this));
      } else {
        fnOpenDialog();
      }
    },

    _buildConditionTypeFilter: function (sValue) {
      const aFilters = [new Filter("LanguageKey", FilterOperator.EQ, "EN")];
      if (sValue) {
        aFilters.push(new Filter([
          new Filter("ConditionType", FilterOperator.Contains, sValue),
          new Filter("Name", FilterOperator.Contains, sValue)
        ], false));
      }
      return new Filter(aFilters, true);
    },

    onConditionTypeValueHelpSearch: function (oEvent) {
      const sValue = oEvent.getParameter("value");
      const oFilter = this._buildConditionTypeFilter(sValue);
      oEvent.getSource().getBinding("items").filter([oFilter]);
    },

    onConditionTypeValueHelpConfirm: function (oEvent) {
      const oSelectedItem = oEvent.getParameter("selectedItem");
      if (oSelectedItem && this._oInputField) {
        this._oInputField.setValue(oSelectedItem.getTitle());
        this._oInputField.setValueState("None");
      }
      oEvent.getSource().close();
    },

    onConditionTypeSuggest: function (oEvent) {
      const sValue = oEvent.getParameter("suggestValue");
      const oBinding = oEvent.getSource().getBinding("suggestionItems");
      oBinding.filter(sValue ? [this._buildConditionTypeFilter(sValue)] : [this._buildConditionTypeFilter("")]);
    },

    dialog_keyCombination_select: function (oEvent) {
      const oSelectedItem = oEvent.getParameter("listItem");
      if (oSelectedItem) {
        const oData = oSelectedItem.getBindingContext("kcModel").getObject();
        this._selectedData.keyCombinationId = oData.id; // store only ID
        console.log("Selected Key Combination ID:", this._selectedData.keyCombinationId);
      }
    },

    dialog_keyCombination_confirm: function () {
    const oView = this.getView();
    const oList = Fragment.byId(oView.getId(), "KCF_Fragment_List");
    const oSelectedItem = oList.getSelectedItem();

    if (!oSelectedItem) {
        MessageToast.show("Please select a Key Combination");
        return;
    }

    // Get the key combination ID only
    const oData = oSelectedItem.getBindingContext("kcModel").getObject();
    this._selectedData.keyCombinationId = oData.id;

    // Close the dialog
    this._dialog_keyCombination.close();

    // Pass both conditionType and keyCombinationId to the URL
    this.navigateTo("RouteCreate", {
        conditionType: this._selectedData.conditionType,
        keyCombinationId: this._selectedData.keyCombinationId
    });

    // Reset selection
    this._selectedData.conditionType = "";
    this._selectedData.keyCombinationId = "";
},

    dialog_keyCombination_cancel: function () {
      this._dialog_keyCombination.close();
      this._selectedData.conditionType = "";
      this._selectedData.keyCombinationId = "";

      const oView = this.getView();
      const oInput = Fragment.byId(oView.getId(), "CCR_Fragment_Input");
      if (oInput) {
        oInput.setValue("");
        oInput.setValueState("None");
      }
    }
  });
});