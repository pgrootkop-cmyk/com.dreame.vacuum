'use strict';

module.exports = {
  async getVacuumData({ homey }) {
    return homey.app.getVacuumData();
  },

  async getRenderedMap({ homey, query }) {
    const did = query.did;
    if (!did) return null;
    return homey.app.getRenderedMap(did, query.colorScheme, query.floorId);
  },

  async getRobotPosition({ homey, query }) {
    const did = query.did;
    if (!did) return null;
    return homey.app.getRobotPosition(did);
  },

  async getFloors({ homey, query }) {
    const did = query.did;
    const device = homey.app._findVacuumDevice(did);
    if (!device) return [];
    if (device._multiFloorEnabled && device.getFloors().length === 0) {
      device._requestMapViaMqtt().catch(() => {});
    }
    return device.getFloors();
  },

  async selectFloor({ homey, body }) {
    const did = body.did;
    const mapId = parseInt(body.mapId, 10);
    const device = homey.app._findVacuumDevice(did);
    if (!device) throw new Error('Device not found');
    if (isNaN(mapId)) throw new Error('Invalid mapId');
    homey.app.log(`[API] selectFloor: did=${did} mapId=${mapId}`);
    await device.selectFloor(mapId);
    return { ok: true };
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

    const zones = device.getZones();
    if (zone.id) {
      // Update existing
      const idx = zones.findIndex(z => z.id === zone.id);
      if (idx >= 0) zones[idx] = zone;
      else zones.push(zone);
    } else {
      // Create new
      zone.id = `zone_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      zones.push(zone);
    }
    await device.setZones(zones);
    return zone;
  },

  async deleteZone({ homey, body }) {
    const did = body.did;
    const zoneId = body.zoneId;
    const device = homey.app._findVacuumDevice(did);
    if (!device) throw new Error('Device not found');
    const zones = device.getZones().filter(z => z.id !== zoneId);
    await device.setZones(zones);
    return { ok: true };
  },
};
