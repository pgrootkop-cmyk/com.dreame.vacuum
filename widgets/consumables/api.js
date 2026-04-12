'use strict';

module.exports = {
  async getDeviceData({ homey, query }) {
    const devices = homey.app.getVacuumData();
    const did = query.did;
    if (did) {
      const match = devices.find(d => d.id === did || d.homeyId === did);
      return match || null;
    }
    return devices[0] || null;
  },
};
