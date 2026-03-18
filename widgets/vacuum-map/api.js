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

  async getMapData({ homey, query }) {
    const did = query.did;
    const device = homey.app._findVacuumDevice(did);
    if (!device) return null;
    const dreameId = device.getData().id;
    return homey.app.getRenderedMap(dreameId, query.colorScheme, query.floorId);
  },

  async getRobotPosition({ homey, query }) {
    const did = query.did;
    const device = homey.app._findVacuumDevice(did);
    if (!device) return null;
    return device.getRobotPosition();
  },
};
