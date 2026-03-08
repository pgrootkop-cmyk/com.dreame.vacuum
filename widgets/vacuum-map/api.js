'use strict';

module.exports = {
  async getDeviceData({ homey, query }) {
    const devices = homey.app.getVacuumData();
    const did = query.did;
    if (did) {
      // Widget sends Homey device UUID, but our data uses Dreame DID.
      // Try matching by Dreame DID first, then fall back to first device.
      const match = devices.find(d => d.id === did);
      return match || devices[0] || null;
    }
    return devices[0] || null;
  },

  async getMapData({ homey, query }) {
    // Widget may send Homey device UUID or Dreame DID; _findVacuumDevice handles both.
    const did = query.did;
    const device = homey.app._findVacuumDevice(did);
    if (!device) return null;
    const dreameId = device.getData().id;
    return homey.app.getRenderedMap(dreameId);
  },
};
