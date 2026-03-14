'use strict';

module.exports = {
  async getDeviceData({ homey, query }) {
    const devices = homey.app.getVacuumData();
    const did = query.did;
    if (did) {
      const match = devices.find(d => d.id === did);
      return match || devices[0] || null;
    }
    return devices[0] || null;
  },
};
