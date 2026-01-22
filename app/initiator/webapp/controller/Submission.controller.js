sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/core/Fragment",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "com/deloitte/mdg/salepricing/initiator/initiator/model/keyCombinations"

], function (Controller, Fragment, JSONModel, MessageToast, Filter, FilterOperator, KeyCombinations) {
  "use strict";

  return Controller.extend("com.deloitte.mdg.salepricing.initiator.initiator.controller.Submissison", {

    onInit: function () {
      var oLocalModel = new JSONModel({ records: [] });
      this.getView().setModel(oLocalModel, "local");
      this.getView().byId("Submission_Table").setModel(oLocalModel);
      this._selectedData = {
        conditionType: "",
        keyCombinationId: ""
      };
      const oDraftModel = new sap.ui.model.json.JSONModel({
        requestId: "",
        requestType: "",
        workflowStatus: "",
        requestStatus: "",
        createdByName: "",
        salesPricingData: []
      });
      this.getView().setModel(oDraftModel, "DraftModel");

      this.getView().setModel(new JSONModel([]), "commentModel");

      sap.ui.core.UIComponent
        .getRouterFor(this)
        .getRoute("RouteSubmission")
        .attachPatternMatched(this._onRouteMatched, this);
    },

    _onRouteMatched: function (oEvent) {
      const args = oEvent.getParameter("arguments") || {};
      const sRouteType = args.request_type || "create";
      const sReqId = args.request_id;

      const oDraftModel = this.getView().getModel("DraftModel");

      if (sRouteType !== "view") {

        const sFormatted =
          sRouteType.charAt(0).toUpperCase() + sRouteType.slice(1);

        oDraftModel.setProperty("/requestType", sFormatted);

        this._applyVisibility(sFormatted);

        this.getUserInfo().then(u => {
          oDraftModel.setProperty(
            "/createdByName",
            u.displayName || u.email || u.name || u
          );
        });

        return;
      }

      if (sRouteType === "view" && sReqId) {
        this._loadRequestFromCAP(sReqId).then(() => {

          const oDraft = oDraftModel.getData();
          let sVisibilityKey = "View";

          if (oDraft.workflowStatus === "Draft") {
            sVisibilityKey = "Draft_" + oDraft.requestType;
          }

          this._applyVisibility(sVisibilityKey);
        });
      }
    },

    _loadRequestFromCAP: function (reqId) {
      const oModel = this.getOwnerComponent().getModel("ServiceModel");

      const oContext = oModel.bindContext(
        `/SalesPricingRequests(requestId='${reqId}')`,
        null,
        { $expand: "conditionRecords,comments" }
      );

      return oContext.requestObject().then(oData => {

        const oDraftModel = this.getView().getModel("DraftModel");

        oDraftModel.setData({
          requestId: oData.requestId,
          requestType: oData.requestType,
          workflowStatus: oData.workflowStatus,
          requestStatus: oData.requestStatus,
          createdByName: oData.createdByName,

          // IMPORTANT: keep DB structure intact
          salesPricingData: (oData.conditionRecords || []).map(r => ({
            ConditionType: r.conditionType,
            KeyCombinationId: r.keyCombinationId,
            Fields: JSON.parse(r.fields),
            Columns: JSON.parse(r.columns)
          }))
        });

        // comments → UI model
        const aComments = (oData.comments || []).map(c => ({
          UserName: c.createdBy,
          Date: c.createdAt,
          Text: c.commentText
        }));

        this.getView().getModel("commentModel").setData(aComments);
      });
    },

    _buildDraftPayload: function () {

      const oDraft = this.getView().getModel("DraftModel").getData();
      const aComments = this.getView().getModel("commentModel").getData() || [];

      return {
        requestType: oDraft.requestType,
        workflowStatus: "Draft",
        requestStatus: "Draft",
        createdByName: oDraft.createdByName,

        conditionRecords: oDraft.salesPricingData.map(r => ({
          conditionType: r.ConditionType,
          keyCombinationId: r.KeyCombinationId,
          fields: JSON.stringify(r.Fields),
          columns: JSON.stringify(r.Columns)
        })),

        comments: aComments.map(c => ({
          user: c.UserName,
          role: "Initiator",
          commentText: c.Text
        }))
      };
    },


    _applyVisibility: function (sType) {
      var oView = this.getView();

      var config = {
        Create: {
          columns: ["Submission_Column_ConditionType", "Submission_Column_SalesOrg", "Submission_Column_DistChan", "Submission_Column_Customer"],
          buttons: [
            "Submission_Button_Add", "Submission_Button_Delete",
            "Submission_Button_Edit", "Submission_Button_View",
            "Submission_Button_Send", "Submission_Button_Duplicatecheck",
            "Submission_FileUploader", "Submission_Button_Export"
          ]
        },
        Change: {
          columns: [
            "Submission_Column_SalesOrg", "Submission_Column_DistChan",
            "Submission_Column_Customer", "Submission_Column_Material"
          ],
          buttons: [
            "Submission_Button_Edit", "Submission_Button_View",
            "Submission_Button_ChangeLog", "Submission_Button_Send"
          ]
        },
        Extend: {
          columns: [
            "Submission_Column_SalesOrg", "Submission_Column_DistChan",
            "Submission_Column_Customer", "Submission_Column_Material"
          ],
          buttons: [
            "Submission_Button_Edit", "Submission_Button_View",
            "Submission_Button_Send"
          ]
        },
        View: {
          columns: [
            "Submission_Column_ConditionType",
            "Submission_Column_SalesOrg",
            "Submission_Column_DistChan",
            "Submission_Column_Customer",
          ],
          buttons: [
            "Submission_Button_View"
          ]
        }
      };

      var allColumns = [
        "Submission_Column_ConditionType", "Submission_Column_SalesOrg",
        "Submission_Column_DistChan", "Submission_Column_Customer",
        "Submission_Column_Material"
      ];

      var allButtons = [
        "Submission_Button_Add", "Submission_Button_AddFromRef",
        "Submission_Button_Edit", "Submission_Button_Delete",
        "Submission_Button_View", "Submission_Button_ChangeLog",
        "Submission_Button_Send", "Submission_Button_Duplicatecheck",
        "Submission_Button_Validate", "Submission_FileUploader",
        "Submission_Button_Export"
      ];

      allColumns.concat(allButtons).forEach(function (id) {
        var ctrl = oView.byId(id);
        if (ctrl && ctrl.setVisible) {
          ctrl.setVisible(false);
        }
      });

      (config[sType] && config[sType].columns || []).forEach(function (id) {
        var ctrl = oView.byId(id);
        if (ctrl && ctrl.setVisible) {
          ctrl.setVisible(true);
        }
      });

      (config[sType] && config[sType].buttons || []).forEach(function (id) {
        var ctrl = oView.byId(id);
        if (ctrl && ctrl.setVisible) {
          ctrl.setVisible(true);
        }
      });
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

    async _patchRequest(payload, requestId) {

      const base = this.getOwnerComponent()
        .getManifestEntry("/sap.app/dataSources/DatabaseService/uri");

      const csrf = await this._fetchServiceCSRFToken();

      const response = await fetch(
        `${base}SalesPricingRequests(requestId='${requestId}')`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrf
          },
          credentials: "include",
          body: JSON.stringify(payload)
        }
      );

      if (!response.ok) {
        throw new Error(await response.text());
      }
    },

    async _fetchServiceCSRFToken() {
      const base = this.getOwnerComponent()
        .getManifestEntry("/sap.app/dataSources/DatabaseService/uri");

      const response = await fetch(base, {
        method: "GET",
        headers: {
          "X-CSRF-Token": "Fetch"
        },
        credentials: "include"
      });

      return response.headers.get("X-CSRF-Token");
    },

    //Draft Feature
    onDraftPress: async function () {
      try {
        const oDraftModel = this.getView().getModel("DraftModel");
        const oDraft = oDraftModel.getData();
        const oModel = this.getOwnerComponent().getModel("ServiceModel");

        const payload = this._buildDraftPayload();

        if (oDraft.requestId) {
          await this._patchRequest(payload, oDraft.requestId);
        }
        else {
          const listBinding = oModel.bindList("/SalesPricingRequests");
          const context = await listBinding.create(payload);
          await context.created();

          oDraftModel.setProperty(
            "/requestId",
            context.getProperty("requestId")
          );
        }

        MessageToast.show("Draft saved successfully");

        this.getOwnerComponent()
          .getRouter()
          .navTo("RouteOverview");

      } catch (e) {
        sap.m.MessageBox.error(
          "Failed to save draft:\n\n" + (e.message || e)
        );
      }
    }

  });
});