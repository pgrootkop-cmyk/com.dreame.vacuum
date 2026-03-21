'use strict';

module.exports = {
  async getVacuumData({ homey }) {
    return homey.app.getVacuumData();
  },

  async getRenderedMap({ homey, query }) {
    const did = query.did;
    if (!did) return null;
    return homey.app.getRenderedMap(did, query.colorScheme);
  },

  async getRobotPosition({ homey, query }) {
    const did = query.did;
    if (!did) return null;
    return homey.app.getRobotPosition(did);
  },

  async getRooms({ homey, query }) {
    const did = query.did;
    const device = homey.app._findVacuumDevice(did);
    if (!device) return [];
    return device.getRooms();
  },

  async getZones({ homey, query }) {
    const did = query.did;
    const device = homey.app._findVacuumDevice(did);
    if (!device) return [];
    return device.getZones();
  },

  async saveZone({ homey, body }) {
    const did = body.did;
    const device = homey.app._findVacuumDevice(did);
    if (!device) throw new Error('Device not found');
    const zone = body.zone;
    if (!zone || !zone.name || !zone.coords) throw new Error('Invalid zone data');
    try {
      return await device.saveZone(zone);
    } catch (e) {
      homey.app.log(`[API] saveZone error: ${e.message}`);
      throw e;
    }
  },

async deleteZone({ homey, query }) {
    const did = query.did;
    const zoneId = query.zoneId;
    const device = homey.app._findVacuumDevice(did);
    if (!device) throw new Error('Device not found');
    if (!zoneId) throw new Error('Missing zoneId');
    await device.deleteZone(zoneId);
    return { ok: true };
  },

  // GET fallback for zone deletion (settings page can't send DELETE body reliably)
  async deleteZoneGet({ homey, query }) {
    const did = query.did;
    const zoneId = query.zoneId;
    const device = homey.app._findVacuumDevice(did);
    if (!device) throw new Error('Device not found');
    if (!zoneId) throw new Error('Missing zoneId');
    try {
      await device.deleteZone(zoneId);
      return { ok: true };
    } catch (e) {
      homey.app.log(`[API] deleteZone error: ${e.message}`);
      throw e;
    }
  },
};
