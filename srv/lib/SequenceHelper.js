module.exports = class SequenceHelper {
  constructor({ db, entity }) {
    this.db = db;
    this.entity = entity;
  }

  async getNextRequestId() {
    const result = await this.db.run(
      SELECT.one
        .from(this.entity)
        .columns`max(requestId) as maxId`
    );

    let nextNumber = 1;

    if (result?.maxId) {
      const numeric = parseInt(result.maxId.replace("SPRC", ""), 10);
      if (!Number.isNaN(numeric)) {
        nextNumber = numeric + 1;
      }
    }

    return `SPRC${String(nextNumber).padStart(6, "0")}`;
  }
};
