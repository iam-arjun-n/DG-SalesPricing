const cds = require("@sap/cds");
const SequenceHelper = require("./lib/SequenceHelper");

class SalesPricingService extends cds.ApplicationService {
  async init() {
    const db = await cds.connect.to("db");
    const { SalesPricingRequests } = this.entities;

    this.before("CREATE", SalesPricingRequests, async (req) => {
      const hanaTable = "COM_DELOITTE_MDG_SALES_PRICING_SALESPRICINGREQUESTS";

      const seq = new SequenceHelper({ db, table: hanaTable });
      const next = await seq.getNextNumber();
      const padded = next.toString().padStart(7, "0");

      req.data.requestId = "SPRC" + padded;

      if (req.data.workflowStatus === "Draft") {
        req.data.requestStatus = "Draft";
        return;
      }

      req.data.requestStatus = "Submitted";
      req.data.workflowStatus = "InApproval";
    });

    return super.init();
  }
}

module.exports = { SalesPricingService };
