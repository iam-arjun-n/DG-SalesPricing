module.exports = class SequenceHelper {
  constructor(options) {
    this.db = options.db;
    this.table = options.table;
  }

  async getNextRequestId() {
    const sql = `
    SELECT MAX("REQUESTID") AS MAX_ID
    FROM "${this.table}"
  `;

    const result = await this.db.run(sql);
    const maxId = result[0]?.MAX_ID;

    let nextNumber = 1;

    if (maxId) {
      const numeric = parseInt(maxId.replace("SPRC", ""), 10);
      if (!Number.isNaN(numeric)) {
        nextNumber = numeric + 1;
      }
    }

    return `SPRC${String(nextNumber).padStart(6, "0")}`;
  }

};