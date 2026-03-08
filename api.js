'use strict';

module.exports = {
  async getVacuumData({ homey }) {
    return homey.app.getVacuumData();
  },

  async getRenderedMap({ homey, query }) {
    const did = query.did;
    if (!did) return null;
    return homey.app.getRenderedMap(did);
  },
};
