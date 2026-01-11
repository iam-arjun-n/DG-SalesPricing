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

      //Comment Model
      var oCommentModel = new sap.ui.model.json.JSONModel([]);
      this.getView().setModel(oCommentModel, "commentModel");
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
      this._clearAllModels();
      this.navigateTo("RouteOverview");
    },

    _clearAllModels: function () {
      const oView = this.getView();
      const oSubmissionModel = oView.getModel("submissionModel");
      if (oSubmissionModel) {
        oSubmissionModel.setData({
          rows: [],
          Display: {},
          Data: {}
        });
        oSubmissionModel.refresh(true);
      }

      const oLocalModel = oView.getModel("local");
      if (oLocalModel) {
        oLocalModel.setData({ records: [] });
        oLocalModel.refresh(true);
      }

      const oCommentModel = oView.getModel("commentModel");
      if (oCommentModel) {
        oCommentModel.setData([]);
        oCommentModel.refresh(true);
      }

      this._selectedData = {
        conditionType: "",
        keyCombinationId: ""
      };

      const oTable = oView.byId("Create_Page_Table");
      if (oTable) {
        oTable.removeSelections(true);
      }
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
    onF4_Field_ConditionType: function (oEvent) {
      sap.ui.core.BusyIndicator.show();

      this._currentInputId = oEvent.getSource().getId();

      const oModel = this.getOwnerComponent().getModel("SAPSalesModel");
      const entitySet = "/ZI_CONDITIONTYPETEXT";

      oModel.read(entitySet, {
        success: (oData) => {
          const aEN = oData.results.filter(r =>
            r.LanguageKey === "EN" &&
            r.ConditionType
          );

          const oSeen = {};
          const aUnique = [];

          aEN.forEach(r => {
            if (!oSeen[r.ConditionType]) {
              oSeen[r.ConditionType] = true;
              aUnique.push({
                title: r.ConditionType,
                description: r.Name
              });
            }
          });

          const oF4Model = new sap.ui.model.json.JSONModel({
            results: aUnique
          });

          this.getView().setModel(oF4Model, "F4Model");
          this._openF4Dialog("Condition Type");

          sap.ui.core.BusyIndicator.hide();
        },
        error: (err) => {
          sap.ui.core.BusyIndicator.hide();
          sap.m.MessageBox.error(
            "Failed to load Condition Types"
          );
        }
      });
    },

    //Comment
    onPost: function (oEvent) {
      var oFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({ style: "medium" });
      var oComments = this.getView().getModel("commentModel");
      var oDate = new Date();
      var sDate = oFormat.format(oDate);

      var sValue = oEvent.getParameter("value");
      if (!sValue || !sValue.trim()) {
        sap.m.MessageToast.show("Comment cannot be empty.");
        return;
      }

      var aComments = oComments.getData();

      var oEntry = {
        UserName: this.getOwnerComponent().currentUser,
        Date: sDate,
        Text: sValue
      };

      aComments.unshift(oEntry);
      oComments.setData(aComments);

      oEvent.getSource().setValue("");
    },


  });
});