'use strict';

const Homey = require('homey');
const DreameApi = require('../../lib/DreameApi');

class DreameVacuumDriver extends Homey.Driver {

  async onInit() {
    // Register flow card actions
    this.homey.flow.getActionCard('set_dreame_suction_level')
      .registerRunListener(async (args) => {
        await args.device.setSuctionLevel(args.level);
      });

    this.homey.flow.getActionCard('set_dreame_cleaning_mode')
      .registerRunListener(async (args) => {
        await args.device.setCleaningMode(args.mode);
      });

    this.homey.flow.getActionCard('set_dreame_water_volume')
      .registerRunListener(async (args) => {
        await args.device.setWaterVolume(args.volume);
      });

    this.homey.flow.getActionCard('set_dreame_mopping_type')
      .registerRunListener(async (args) => {
        await args.device.setMoppingType(args.mopping_type);
      });

    this.homey.flow.getActionCard('vacuum_locate')
      .registerRunListener(async (args) => {
        await args.device.locate();
      });

    // Register flow card conditions
    this.homey.flow.getConditionCard('dreame_suction_level_is')
      .registerRunListener(async (args) => {
        return args.device.getCapabilityValue('dreame_suction_level') === args.level;
      });

    this.homey.flow.getConditionCard('dreame_cleaning_mode_is')
      .registerRunListener(async (args) => {
        return args.device.getCapabilityValue('dreame_cleaning_mode') === args.mode;
      });

    // New action cards
    this.homey.flow.getActionCard('reset_main_brush')
      .registerRunListener(async (args) => {
        await args.device.resetConsumable(9, 1);
      });

    this.homey.flow.getActionCard('reset_side_brush')
      .registerRunListener(async (args) => {
        await args.device.resetConsumable(10, 1);
      });

    this.homey.flow.getActionCard('reset_filter')
      .registerRunListener(async (args) => {
        await args.device.resetConsumable(11, 1);
      });

    this.homey.flow.getActionCard('reset_mop_pad')
      .registerRunListener(async (args) => {
        await args.device.resetConsumable(18, 1);
      });

    this.homey.flow.getActionCard('reset_sensor')
      .registerRunListener(async (args) => {
        await args.device.resetConsumable(16, 1);
      });

    this.homey.flow.getActionCard('start_self_clean')
      .registerRunListener(async (args) => {
        await args.device.startSelfClean();
      });

    this.homey.flow.getActionCard('start_drying')
      .registerRunListener(async (args) => {
        await args.device.startDrying();
      });

    this.homey.flow.getActionCard('start_auto_empty')
      .registerRunListener(async (args) => {
        await args.device.startAutoEmpty();
      });

    // New condition cards
    this.homey.flow.getConditionCard('carpet_boost_is_on')
      .registerRunListener(async (args) => {
        return args.device.getCapabilityValue('dreame_carpet_boost') === true;
      });

    this.homey.flow.getConditionCard('dnd_is_on')
      .registerRunListener(async (args) => {
        return args.device.getCapabilityValue('dreame_dnd') === true;
      });

    // State conditions
    this.homey.flow.getConditionCard('is_cleaning')
      .registerRunListener(async (args) => {
        return args.device.getCapabilityValue('vacuumcleaner_state') === 'cleaning';
      });

    this.homey.flow.getConditionCard('is_docked')
      .registerRunListener(async (args) => {
        const state = args.device.getCapabilityValue('vacuumcleaner_state');
        return state === 'docked' || state === 'charging';
      });

    this.homey.flow.getConditionCard('is_charging')
      .registerRunListener(async (args) => {
        return args.device.getCapabilityValue('vacuumcleaner_state') === 'charging';
      });

    this.homey.flow.getConditionCard('dreame_water_volume_is')
      .registerRunListener(async (args) => {
        return args.device.getCapabilityValue('dreame_water_volume') === args.volume;
      });

    this.homey.flow.getConditionCard('dreame_cleangenius_is')
      .registerRunListener(async (args) => {
        return args.device.getCapabilityValue('dreame_cleangenius') === args.level;
      });

    this.homey.flow.getConditionCard('dreame_cleaning_route_is')
      .registerRunListener(async (args) => {
        return args.device.getCapabilityValue('dreame_cleaning_route') === args.route;
      });

    this.homey.flow.getConditionCard('dreame_mop_wash_frequency_is')
      .registerRunListener(async (args) => {
        return args.device.getCapabilityValue('dreame_mop_wash_frequency') === args.frequency;
      });

    this.homey.flow.getConditionCard('battery_level_above')
      .registerRunListener(async (args) => {
        return (args.device.getCapabilityValue('measure_battery') || 0) > args.percentage;
      });

    this.homey.flow.getConditionCard('has_error')
      .registerRunListener(async (args) => {
        const error = args.device.getCapabilityValue('dreame_error');
        return !!error && error !== 'None';
      });

    this.homey.flow.getConditionCard('water_tank_installed')
      .registerRunListener(async (args) => {
        return args.device.getCapabilityValue('dreame_water_tank') === 'installed';
      });

    this.homey.flow.getConditionCard('dust_bag_full')
      .registerRunListener(async (args) => {
        return args.device.getCapabilityValue('dreame_dust_bag') === 'full';
      });

    // CleanGenius flow cards
    this.homey.flow.getActionCard('set_cleangenius')
      .registerRunListener(async (args) => {
        await args.device.setCleanGenius(args.level);
      });

    this.homey.flow.getActionCard('set_cleangenius_mode')
      .registerRunListener(async (args) => {
        await args.device.setCleanGeniusMode(args.method);
      });

    this.homey.flow.getActionCard('set_cleaning_route')
      .registerRunListener(async (args) => {
        await args.device.setCleaningRoute(args.route);
      });

    this.homey.flow.getActionCard('set_mop_wash_frequency')
      .registerRunListener(async (args) => {
        await args.device.setMopWashFrequency(args.frequency);
      });

    const roomCleaningCard = this.homey.flow.getActionCard('start_room_cleaning');
    roomCleaningCard.registerRunListener(async (args) => {
      const { roomId, floorMapId } = this._parseRoomArg(args.room.id);
      if (isNaN(roomId) || roomId <= 0) throw new Error('Invalid room selected');
      await this._ensureFloor(args.device, floorMapId);
      const mode = args.mode && args.mode !== 'current' ? args.mode : null;
      await args.device.startRoomCleaning(roomId, args.repeats, args.suction, args.water, mode);
    });
    roomCleaningCard.registerArgumentAutocompleteListener('room', async (query, args) => {
      return this._getRoomAutocomplete(query, args);
    });

    this.homey.flow.getActionCard('set_carpet_sensitivity')
      .registerRunListener(async (args) => {
        await args.device.setCarpetSensitivity(args.sensitivity);
      });

    this.homey.flow.getActionCard('set_carpet_cleaning')
      .registerRunListener(async (args) => {
        await args.device.setCarpetCleaning(args.mode);
      });

    this.homey.flow.getActionCard('set_mop_wash_level')
      .registerRunListener(async (args) => {
        await args.device.setMopWashLevel(args.level);
      });

    this.homey.flow.getActionCard('set_water_temperature')
      .registerRunListener(async (args) => {
        await args.device.setWaterTemperature(args.temperature);
      });

    this.homey.flow.getActionCard('set_auto_empty_frequency')
      .registerRunListener(async (args) => {
        await args.device.setAutoEmptyFrequency(args.frequency);
      });

    this.homey.flow.getActionCard('set_mop_pressure')
      .registerRunListener(async (args) => {
        await args.device.setMopPressure(args.pressure);
      });

    this.homey.flow.getActionCard('set_drying_time')
      .registerRunListener(async (args) => {
        await args.device.setDryingTime(args.hours);
      });

    this.homey.flow.getActionCard('set_volume')
      .registerRunListener(async (args) => {
        await args.device.setVolume(args.volume);
      });

    const multiRoomCard = this.homey.flow.getActionCard('start_multi_room_cleaning');
    multiRoomCard.registerRunListener(async (args) => {
      const parsed = this._parseMultiRoomArg(args.rooms.id);
      if (parsed.roomIds.length === 0) throw new Error('No valid rooms selected');
      await this._ensureFloor(args.device, parsed.floorMapId);
      await args.device.startMultiRoomCleaning(parsed.roomIds, args.repeats, args.suction, args.water);
    });
    multiRoomCard.registerArgumentAutocompleteListener('rooms', async (query, args) => {
      return this._getMultiRoomAutocomplete(query, args);
    });

    this.homey.flow.getActionCard('start_draining')
      .registerRunListener(async (args) => {
        await args.device.startDraining();
      });

    this.homey.flow.getActionCard('clear_warning')
      .registerRunListener(async (args) => {
        await args.device.clearWarning();
      });

    // Room condition card
    const isCleaningRoomCard = this.homey.flow.getConditionCard('is_cleaning_room');
    isCleaningRoomCard.registerRunListener(async (args) => {
      const { roomId } = this._parseRoomArg(args.room.id);
      return args.device.isCleaningRoom(roomId);
    });
    isCleaningRoomCard.registerArgumentAutocompleteListener('room', async (query, args) => {
      return this._getRoomAutocomplete(query, args);
    });

    // Room trigger cards with autocomplete filtering
    const roomStartedCard = this.homey.flow.getDeviceTriggerCard('room_cleaning_started');
    roomStartedCard.registerRunListener(async (args, state) => {
      if (!args.room || !args.room.id) return true;
      const { roomId } = this._parseRoomArg(args.room.id);
      return String(state.room_id) === String(roomId);
    });
    roomStartedCard.registerArgumentAutocompleteListener('room', async (query, args) => {
      return this._getRoomAutocompleteWithAny(query, args);
    });

    const roomFinishedCard = this.homey.flow.getDeviceTriggerCard('room_cleaning_finished');
    roomFinishedCard.registerRunListener(async (args, state) => {
      if (!args.room || !args.room.id) return true;
      const { roomId } = this._parseRoomArg(args.room.id);
      return String(state.room_id) === String(roomId);
    });
    roomFinishedCard.registerArgumentAutocompleteListener('room', async (query, args) => {
      return this._getRoomAutocompleteWithAny(query, args);
    });

    // --- Manual room ID cards (text input, no autocomplete) ---

    this.homey.flow.getActionCard('start_room_cleaning_by_id')
      .registerRunListener(async (args) => {
        const roomId = parseInt(args.room_id, 10);
        if (isNaN(roomId) || roomId <= 0) throw new Error('Invalid room ID');
        await args.device.startRoomCleaning(roomId, args.repeats, args.suction, args.water);
      });

    this.homey.flow.getActionCard('start_multi_room_cleaning_by_id')
      .registerRunListener(async (args) => {
        const roomIds = String(args.room_ids).split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id) && id > 0);
        if (roomIds.length === 0) throw new Error('No valid room IDs provided');
        await args.device.startMultiRoomCleaning(roomIds, args.repeats, args.suction, args.water);
      });

    this.homey.flow.getConditionCard('is_cleaning_room_by_id')
      .registerRunListener(async (args) => {
        const roomId = parseInt(args.room_id, 10);
        if (isNaN(roomId) || roomId <= 0) throw new Error('Invalid room ID');
        return args.device.isCleaningRoom(roomId);
      });

    // --- Operational state trigger ---
    const stateChangedCard = this.homey.flow.getDeviceTriggerCard('operational_state_changed');
    stateChangedCard.registerRunListener(async (args, state) => {
      if (args.state === 'any') return true;
      return state.state === args.state;
    });

    // --- Stuck triggers (no run listener needed — no args to filter) ---

    // --- Dust bin full trigger (no args to filter) ---

    // --- Dock state changed trigger ---
    const dockStateChangedCard = this.homey.flow.getDeviceTriggerCard('dock_state_changed');
    dockStateChangedCard.registerRunListener(async (args, state) => {
      if (args.state === 'any') return true;
      return state.state === args.state;
    });

    // --- Water tank changed trigger ---
    const waterTankChangedCard = this.homey.flow.getDeviceTriggerCard('water_tank_changed');
    waterTankChangedCard.registerRunListener(async (args, state) => {
      if (args.action === 'any') return true;
      return state.action === args.action;
    });

    // --- New condition cards ---
    this.homey.flow.getConditionCard('is_stuck')
      .registerRunListener(async (args) => {
        return args.device.isStuck();
      });

    this.homey.flow.getConditionCard('operational_state_is')
      .registerRunListener(async (args) => {
        return args.device.getOperationalState() === args.state;
      });

    const roomStartedByIdCard = this.homey.flow.getDeviceTriggerCard('room_cleaning_started_by_id');
    roomStartedByIdCard.registerRunListener(async (args, state) => {
      if (!args.room_id || args.room_id.trim() === '') return true;
      return String(state.room_id) === String(args.room_id).trim();
    });

    const roomFinishedByIdCard = this.homey.flow.getDeviceTriggerCard('room_cleaning_finished_by_id');
    roomFinishedByIdCard.registerRunListener(async (args, state) => {
      if (!args.room_id || args.room_id.trim() === '') return true;
      return String(state.room_id) === String(args.room_id).trim();
    });

    // --- Simple room cleaning cards (use current device settings) ---
    const simpleRoomCard = this.homey.flow.getActionCard('start_room_cleaning_simple');
    simpleRoomCard.registerRunListener(async (args) => {
      const { roomId, floorMapId } = this._parseRoomArg(args.room.id);
      if (isNaN(roomId) || roomId <= 0) throw new Error('Invalid room selected');
      await this._ensureFloor(args.device, floorMapId);
      await args.device.startRoomCleaningSimple(roomId);
    });
    simpleRoomCard.registerArgumentAutocompleteListener('room', async (query, args) => {
      return this._getRoomAutocomplete(query, args);
    });

    const simpleMultiRoomCard = this.homey.flow.getActionCard('start_multi_room_cleaning_simple');
    simpleMultiRoomCard.registerRunListener(async (args) => {
      const parsed = this._parseMultiRoomArg(args.rooms.id);
      if (parsed.roomIds.length === 0) throw new Error('No valid rooms selected');
      await this._ensureFloor(args.device, parsed.floorMapId);
      await args.device.startMultiRoomCleaningSimple(parsed.roomIds);
    });
    simpleMultiRoomCard.registerArgumentAutocompleteListener('rooms', async (query, args) => {
      return this._getMultiRoomAutocomplete(query, args);
    });

    // --- Shortcut card ---
    const shortcutCard = this.homey.flow.getActionCard('start_shortcut');
    shortcutCard.registerRunListener(async (args) => {
      const shortcutData = args.shortcut;
      if (!shortcutData || !shortcutData.id || shortcutData.id === '_none') throw new Error('No shortcut selected');
      await args.device.startShortcut(shortcutData.id);
    });
    shortcutCard.registerArgumentAutocompleteListener('shortcut', async (query, args) => {
      return this._getShortcutAutocomplete(query, args);
    });

    // --- Zone cleaning card ---
    const zoneCleanCard = this.homey.flow.getActionCard('start_zone_cleaning');
    zoneCleanCard.registerRunListener(async (args) => {
      const zoneData = args.zone;
      if (!zoneData || !zoneData.id || zoneData.id === '_none') throw new Error('No zone selected');
      const { itemId, floorMapId } = this._parseFloorItemArg(zoneData.id);
      await this._ensureFloor(args.device, floorMapId);
      const zones = args.device.getZones();
      const zoneIds = String(itemId).split(',');
      const coords = [];
      for (const zid of zoneIds) {
        const zone = zones.find(z => z.id === zid);
        if (zone && zone.coords) coords.push(zone.coords);
      }
      if (coords.length === 0) throw new Error('Zone not found. Reconfigure zones in app settings.');
      const stopAfter = args.after_clean === 'stop';
      await args.device.startZoneCleaning(coords, args.repeats, null, null, zoneData.name, itemId, stopAfter);
    });
    zoneCleanCard.registerArgumentAutocompleteListener('zone', async (query, args) => {
      return this._getZoneAutocomplete(query, args);
    });

    // --- Zone cleaning finished trigger (with optional zone filter) ---
    const zoneFinishedCard = this.homey.flow.getDeviceTriggerCard('zone_cleaning_finished');
    zoneFinishedCard.registerRunListener(async (args, state) => {
      if (!args.zone || !args.zone.id || args.zone.id === '') return true;
      // Match by zone ID (stable) with name fallback (for older saved flows)
      if (state.zone_id) return state.zone_id === args.zone.id;
      return state.zone_name === args.zone.name;
    });
    zoneFinishedCard.registerArgumentAutocompleteListener('zone', async (query, args) => {
      const device = args.device;
      const results = [{ name: 'Any zone', description: 'Triggers for all zones', id: '' }];
      if (device && device.isMultiFloor()) {
        for (const floor of device.getFloorList()) {
          for (const z of device.getFloorZones(floor.mapId)) {
            results.push({ name: `${z.name} (${floor.name})`, description: 'Custom zone', id: z.id });
          }
        }
      } else {
        const zones = device ? device.getZones() : [];
        for (const z of zones) results.push({ name: z.name, description: 'Custom zone', id: z.id });
      }
      if (!query) return results;
      const q = query.toLowerCase();
      return results.filter(r => r.name.toLowerCase().includes(q));
    });

    // --- Waypoint navigation card ---
    const waypointCard = this.homey.flow.getActionCard('navigate_to_waypoint');
    waypointCard.registerRunListener(async (args) => {
      const wpData = args.waypoint;
      if (!wpData || !wpData.id || wpData.id === '_none') throw new Error('No waypoint selected');
      const { itemId, floorMapId } = this._parseFloorItemArg(wpData.id);
      await this._ensureFloor(args.device, floorMapId);
      const waypoints = args.device.getWaypoints();
      const wp = waypoints.find(w => w.id === itemId);
      if (!wp || !wp.coords) throw new Error('Waypoint not found. Reconfigure waypoints in app settings.');
      const stopAfter = args.after_arrival === 'stop';
      await args.device.navigateToWaypoint(wp.coords[0], wp.coords[1], wpData.name, itemId, stopAfter);
    });
    waypointCard.registerArgumentAutocompleteListener('waypoint', async (query, args) => {
      return this._getWaypointAutocomplete(query, args);
    });

    // --- Waypoint arrived trigger (with optional waypoint filter) ---
    const waypointArrivedCard = this.homey.flow.getDeviceTriggerCard('waypoint_arrived');
    waypointArrivedCard.registerRunListener(async (args, state) => {
      if (!args.waypoint || !args.waypoint.id || args.waypoint.id === '') return true;
      if (state.waypoint_id) return state.waypoint_id === args.waypoint.id;
      return state.waypoint_name === args.waypoint.name;
    });
    waypointArrivedCard.registerArgumentAutocompleteListener('waypoint', async (query, args) => {
      const device = args.device;
      const results = [{ name: 'Any waypoint', description: 'Triggers for all waypoints', id: '' }];
      if (device && device.isMultiFloor()) {
        for (const floor of device.getFloorList()) {
          for (const w of device.getFloorWaypoints(floor.mapId)) {
            results.push({ name: `${w.name} (${floor.name})`, description: 'Custom waypoint', id: w.id });
          }
        }
      } else {
        const waypoints = device ? device.getWaypoints() : [];
        for (const w of waypoints) results.push({ name: w.name, description: 'Custom waypoint', id: w.id });
      }
      if (!query) return results;
      const q = query.toLowerCase();
      return results.filter(r => r.name.toLowerCase().includes(q));
    });

    // --- Switch floor card ---
    const switchFloorCard = this.homey.flow.getActionCard('switch_floor');
    switchFloorCard.registerRunListener(async (args) => {
      const floorData = args.floor;
      if (!floorData || !floorData.id || floorData.id === '_none') throw new Error('No floor selected');
      await args.device.switchFloor(parseInt(floorData.id, 10));
    });
    switchFloorCard.registerArgumentAutocompleteListener('floor', async (query, args) => {
      return this._getFloorAutocomplete(query, args);
    });

    // --- Cleaning finished trigger (no args to filter) ---
  }

  async onPair(session) {
    let api = null;
    let country = 'eu';

    session.setHandler('login', async (data) => {
      const username = data.username;
      const password = data.password;
      country = data.region || 'eu';

      api = new DreameApi({ username, password, country });

      try {
        const result = await api.login();
        this.homey.app.setCredentials(username, password, country);
        if (result.refresh_token) {
          this.homey.app.saveRefreshToken(result.refresh_token);
        }
        if (result.uid) {
          this.homey.app.saveUid(result.uid);
        }
        this.log('Pairing: login success', { region: country });
        return true;
      } catch (err) {
        this.error('Login failed:', err.message);
        this.log('Pairing: login failed', { region: country, error: err.message });
        throw new Error(`Login failed: ${err.message}`);
      }
    });

    session.setHandler('list_devices', async () => {
      if (!api) {
        api = this.homey.app.getApi();
      }
      if (!api) {
        this.log('Pairing: list_devices called without API', { region: country }, 'warning');
        throw new Error('Not logged in');
      }

      try {
        const devices = await api.getDevices();
        const vacuums = devices
          .filter(d => d.model && d.model.startsWith('dreame.vacuum.'))
          .map(device => ({
            name: device.customName || device.name || 'Dreame Vacuum',
            data: {
              id: device.did,
            },
            store: {
              model: device.model,
              bindDomain: device.bindDomain || '',
              masterUid: device.uid || '',
            },
          }));

        this.log('Pairing: devices discovered', {
          region: country,
          totalDevices: devices.length,
          vacuums: vacuums.length,
          models: vacuums.map(v => v.store.model),
        });

        return vacuums;
      } catch (err) {
        this.error('Failed to list devices:', err.message);
        this.log('Pairing: device discovery failed', { region: country, error: err.message }, 'error');
        throw new Error('Failed to list devices. Please try again.');
      }
    });
  }

  // ── Multi-floor ID encoding/decoding ──

  /**
   * Parse a room autocomplete ID: either plain "5" or floor-encoded "floor:1234:room:5"
   */
  _parseRoomArg(idStr) {
    const s = String(idStr);
    if (s.startsWith('floor:')) {
      const parts = s.split(':');
      return { roomId: parseInt(parts[3], 10), floorMapId: parseInt(parts[1], 10) };
    }
    return { roomId: parseInt(s, 10), floorMapId: null };
  }

  /**
   * Parse multi-room IDs: either "1,2,3" or "floor:1234:rooms:1,2,3"
   */
  _parseMultiRoomArg(idStr) {
    const s = String(idStr);
    if (s.startsWith('floor:')) {
      const parts = s.split(':');
      const floorMapId = parseInt(parts[1], 10);
      const roomIds = parts[3].split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id) && id > 0);
      return { roomIds, floorMapId };
    }
    const roomIds = s.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id) && id > 0);
    return { roomIds, floorMapId: null };
  }

  /**
   * Parse a zone/waypoint autocomplete ID: either plain "zone_xxx" or "floor:1234:item:zone_xxx"
   */
  _parseFloorItemArg(idStr) {
    const s = String(idStr);
    if (s.startsWith('floor:')) {
      const parts = s.split(':');
      return { itemId: parts.slice(3).join(':'), floorMapId: parseInt(parts[1], 10) };
    }
    return { itemId: s, floorMapId: null };
  }

  /**
   * Switch floor if needed before executing a command.
   */
  async _ensureFloor(device, floorMapId) {
    if (floorMapId != null && device.isMultiFloor() && device.getCurrentMapId() !== floorMapId) {
      await device.switchFloor(floorMapId);
      await new Promise(r => setTimeout(r, 2000)); // settle time for floor switch
    }
  }

  // ── Room autocomplete ──

  _getRoomAutocompleteWithAny(query, args) {
    const device = args.device;
    const results = [{ name: 'Any room', description: 'Triggers for all rooms', id: '' }];

    if (device && device.isMultiFloor()) {
      for (const floor of device.getFloorList()) {
        for (const r of device.getFloorRooms(floor.mapId)) {
          results.push({
            name: `${r.name} (${floor.name})`,
            description: `Room ID: ${r.id}`,
            id: `floor:${floor.mapId}:room:${r.id}`,
          });
        }
      }
    } else {
      const rooms = device ? device.getRooms() : [];
      for (const r of rooms) {
        results.push({ name: r.name, description: `Room ID: ${r.id}`, id: String(r.id) });
      }
    }

    if (!query) return results;
    const q = query.toLowerCase();
    return results.filter(r => r.name.toLowerCase().includes(q));
  }

  _getRoomAutocomplete(query, args) {
    const device = args.device;

    if (device && device.isMultiFloor()) {
      const results = [];
      for (const floor of device.getFloorList()) {
        for (const r of device.getFloorRooms(floor.mapId)) {
          results.push({
            name: `${r.name} (${floor.name})`,
            description: r.customName && r.customName !== r.name ? r.customName : `Room ID: ${r.id}`,
            id: `floor:${floor.mapId}:room:${r.id}`,
          });
        }
      }
      if (results.length === 0) {
        return [{ name: 'No rooms discovered yet', description: 'Rooms appear after the vacuum maps your home', id: '_none' }];
      }
      if (!query) return results;
      const q = query.toLowerCase();
      return results.filter(r => r.name.toLowerCase().includes(q));
    }

    // Single-floor path (unchanged)
    const rooms = device ? device.getRooms() : [];
    if (rooms.length === 0) {
      return [{ name: 'No rooms discovered yet', description: 'Rooms appear after the vacuum maps your home', id: '_none' }];
    }
    const results = rooms.map(r => ({
      name: `${r.name} (ID: ${r.id})`,
      description: r.customName && r.customName !== r.name ? r.customName : '',
      id: String(r.id),
    }));
    if (!query) return results;
    const q = query.toLowerCase();
    return results.filter(r => r.name.toLowerCase().includes(q) || r.id === query);
  }

  _getMultiRoomAutocomplete(query, args) {
    const device = args.device;

    if (device && device.isMultiFloor()) {
      const results = [];
      for (const floor of device.getFloorList()) {
        const floorRooms = device.getFloorRooms(floor.mapId);
        if (floorRooms.length === 0) continue;
        // "All rooms" per floor
        const allIds = floorRooms.map(r => r.id).join(',');
        results.push({
          name: `All rooms (${floor.name})`,
          description: floorRooms.map(r => r.name).join(', '),
          id: `floor:${floor.mapId}:rooms:${allIds}`,
        });
        for (const r of floorRooms) {
          results.push({
            name: `${r.name} (${floor.name})`,
            description: `Room ID: ${r.id}`,
            id: `floor:${floor.mapId}:rooms:${r.id}`,
          });
        }
      }
      if (results.length === 0) {
        return [{ name: 'No rooms discovered yet', description: 'Rooms appear after the vacuum maps your home', id: '_none' }];
      }
      if (!query) return results;
      const q = query.toLowerCase();
      return results.filter(r => r.name.toLowerCase().includes(q));
    }

    // Single-floor path (unchanged)
    const rooms = device ? device.getRooms() : [];
    if (rooms.length === 0) {
      return [{ name: 'No rooms discovered yet', description: 'Rooms appear after the vacuum maps your home', id: '_none' }];
    }

    const results = [];
    const allIds = rooms.map(r => r.id).join(',');
    const allNames = rooms.map(r => r.name).join(', ');
    results.push({ name: 'All rooms', description: allNames, id: allIds });

    for (const r of rooms) {
      results.push({ name: r.name, description: `Room ID: ${r.id}`, id: String(r.id) });
    }

    if (rooms.length > 2 && rooms.length <= 8) {
      for (let i = 0; i < rooms.length; i++) {
        for (let j = i + 1; j < rooms.length; j++) {
          results.push({
            name: `${rooms[i].name} + ${rooms[j].name}`,
            description: `Room IDs: ${rooms[i].id}, ${rooms[j].id}`,
            id: `${rooms[i].id},${rooms[j].id}`,
          });
        }
      }
    }

    if (!query) return results;
    const q = query.toLowerCase();
    return results.filter(r => r.name.toLowerCase().includes(q));
  }

  _getShortcutAutocomplete(query, args) {
    const shortcuts = args.device ? args.device.getShortcuts() : [];
    if (shortcuts.length === 0) {
      return [{ name: 'No shortcuts configured', description: 'Create shortcuts in the Dreame Home app', id: '_none' }];
    }
    const results = shortcuts.map(s => ({
      name: s.name,
      description: `Shortcut #${s.index}`,
      id: String(s.id),
    }));
    if (!query) return results;
    const q = query.toLowerCase();
    return results.filter(r => r.name.toLowerCase().includes(q));
  }

  _getZoneAutocomplete(query, args) {
    const device = args.device;

    if (device && device.isMultiFloor()) {
      const results = [];
      for (const floor of device.getFloorList()) {
        for (const z of device.getFloorZones(floor.mapId)) {
          results.push({
            name: `${z.name} (${floor.name})`,
            description: 'Custom zone',
            id: `floor:${floor.mapId}:item:${z.id}`,
          });
        }
      }
      if (results.length === 0) {
        return [{ name: 'No zones configured', description: 'Draw zones on the map in app settings', id: '_none' }];
      }
      if (!query) return results;
      const q = query.toLowerCase();
      return results.filter(r => r.name.toLowerCase().includes(q));
    }

    // Single-floor path (unchanged)
    const zones = device ? device.getZones() : [];
    if (zones.length === 0) {
      return [{ name: 'No zones configured', description: 'Draw zones on the map in app settings', id: '_none' }];
    }
    const results = zones.map(z => ({ name: z.name, description: 'Custom zone', id: z.id }));
    if (!query) return results;
    const q = query.toLowerCase();
    return results.filter(r => r.name.toLowerCase().includes(q));
  }

  _getWaypointAutocomplete(query, args) {
    const device = args.device;

    if (device && device.isMultiFloor()) {
      const results = [];
      for (const floor of device.getFloorList()) {
        for (const w of device.getFloorWaypoints(floor.mapId)) {
          results.push({
            name: `${w.name} (${floor.name})`,
            description: 'Custom waypoint',
            id: `floor:${floor.mapId}:item:${w.id}`,
          });
        }
      }
      if (results.length === 0) {
        return [{ name: 'No waypoints configured', description: 'Click on the map in app settings to add waypoints', id: '_none' }];
      }
      if (!query) return results;
      const q = query.toLowerCase();
      return results.filter(r => r.name.toLowerCase().includes(q));
    }

    // Single-floor path (unchanged)
    const waypoints = device ? device.getWaypoints() : [];
    if (waypoints.length === 0) {
      return [{ name: 'No waypoints configured', description: 'Click on the map in app settings to add waypoints', id: '_none' }];
    }
    const results = waypoints.map(w => ({ name: w.name, description: 'Custom waypoint', id: w.id }));
    if (!query) return results;
    const q = query.toLowerCase();
    return results.filter(r => r.name.toLowerCase().includes(q));
  }

  _getFloorAutocomplete(query, args) {
    const device = args.device;
    if (!device || !device.isMultiFloor()) {
      return [{ name: 'Multi-floor not supported', description: 'This device does not support multi-floor', id: '_none' }];
    }
    const floors = device.getFloorList();
    if (floors.length === 0) {
      return [{ name: 'No floors discovered yet', description: 'Floors appear after the vacuum maps multiple levels', id: '_none' }];
    }
    const results = floors.map(f => ({
      name: f.name,
      description: `Map ID: ${f.mapId}`,
      id: String(f.mapId),
    }));
    if (!query) return results;
    const q = query.toLowerCase();
    return results.filter(r => r.name.toLowerCase().includes(q));
  }

  async onRepair(session, device) {
    session.setHandler('login', async (data) => {
      const username = data.username;
      const password = data.password;
      const country = this.homey.settings.get('country') || 'eu';

      const api = new DreameApi({ username, password, country });

      try {
        const result = await api.login();
        this.homey.app.setCredentials(username, password, country);
        if (result.refresh_token) {
          this.homey.app.saveRefreshToken(result.refresh_token);
        }
        if (result.uid) {
          this.homey.app.saveUid(result.uid);
        }

        // Re-enable all devices for this driver
        const devices = this.getDevices();
        for (const d of devices) {
          await d.setAvailable();
          d.restartPolling();
        }

        this.log('Repair: login success', { region: country });
        return true;
      } catch (err) {
        this.error('Repair login failed:', err.message);
        this.log('Repair: login failed', { region: country, error: err.message }, 'error');
        throw new Error('Login failed. Check your credentials.');
      }
    });
  }

}

module.exports = DreameVacuumDriver;
