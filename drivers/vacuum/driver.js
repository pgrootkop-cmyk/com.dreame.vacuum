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

    // Simple room cleaning cards (use current device settings)
    const simpleRoomCard = this.homey.flow.getActionCard('start_room_cleaning_simple');
    simpleRoomCard.registerRunListener(async (args) => {
      const roomId = parseInt(args.room.id, 10);
      if (isNaN(roomId) || roomId <= 0) throw new Error('Invalid room selected');
      await args.device.startRoomCleaningSimple(roomId);
    });
    simpleRoomCard.registerArgumentAutocompleteListener('room', async (query, args) => {
      return this._getRoomAutocomplete(query, args);
    });

    const simpleMultiRoomCard = this.homey.flow.getActionCard('start_multi_room_cleaning_simple');
    simpleMultiRoomCard.registerRunListener(async (args) => {
      const roomIds = String(args.rooms.id).split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id) && id > 0);
      if (roomIds.length === 0) throw new Error('No valid rooms selected');
      await args.device.startMultiRoomCleaningSimple(roomIds);
    });
    simpleMultiRoomCard.registerArgumentAutocompleteListener('rooms', async (query, args) => {
      return this._getMultiRoomAutocomplete(query, args);
    });

    const roomCleaningCard = this.homey.flow.getActionCard('start_room_cleaning');
    roomCleaningCard.registerRunListener(async (args) => {
      const roomId = parseInt(args.room.id, 10);
      if (isNaN(roomId) || roomId <= 0) throw new Error('Invalid room selected');
      await args.device.startRoomCleaning(roomId, args.repeats, args.suction, args.water);
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
      const roomIds = String(args.rooms.id).split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id) && id > 0);
      if (roomIds.length === 0) throw new Error('No valid rooms selected');
      await args.device.startMultiRoomCleaning(roomIds, args.repeats, args.suction, args.water);
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
      const roomId = parseInt(args.room.id, 10);
      return args.device.isCleaningRoom(roomId);
    });
    isCleaningRoomCard.registerArgumentAutocompleteListener('room', async (query, args) => {
      return this._getRoomAutocompleteWithAny(query, args);
    });

    // Room trigger cards with autocomplete filtering
    const roomStartedCard = this.homey.flow.getDeviceTriggerCard('room_cleaning_started');
    roomStartedCard.registerRunListener(async (args, state) => {
      // Match if no room selected (any room) or room matches
      if (!args.room || !args.room.id) return true;
      return String(state.room_id) === String(args.room.id);
    });
    roomStartedCard.registerArgumentAutocompleteListener('room', async (query, args) => {
      return this._getRoomAutocompleteWithAny(query, args);
    });

    const roomFinishedCard = this.homey.flow.getDeviceTriggerCard('room_cleaning_finished');
    roomFinishedCard.registerRunListener(async (args, state) => {
      if (!args.room || !args.room.id) return true;
      return String(state.room_id) === String(args.room.id);
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
      const zones = args.device.getZones();
      // Support multi-zone: id can be comma-separated zone IDs
      const zoneIds = String(zoneData.id).split(',');
      const coords = [];
      for (const zid of zoneIds) {
        const zone = zones.find(z => z.id === zid);
        if (zone && zone.coords) coords.push(zone.coords);
      }
      if (coords.length === 0) throw new Error('Zone not found. Reconfigure zones in app settings.');
      await args.device.startZoneCleaning(coords, args.repeats, null, null, zoneData.name);
    });
    zoneCleanCard.registerArgumentAutocompleteListener('zone', async (query, args) => {
      return this._getZoneAutocomplete(query, args);
    });

    // --- Zone cleaning finished trigger (with optional zone filter) ---
    const zoneFinishedCard = this.homey.flow.getDeviceTriggerCard('zone_cleaning_finished');
    zoneFinishedCard.registerRunListener(async (args, state) => {
      if (!args.zone || !args.zone.id || args.zone.id === '') return true; // Any zone
      return state.zone_name === args.zone.name;
    });
    zoneFinishedCard.registerArgumentAutocompleteListener('zone', async (query, args) => {
      const zones = args.device ? args.device.getZones() : [];
      const results = [
        { name: 'Any zone', description: 'Triggers for all zones', id: '' },
        ...zones.map(z => ({ name: z.name, description: '', id: z.id })),
      ];
      if (!query) return results;
      const q = query.toLowerCase();
      return results.filter(r => r.name.toLowerCase().includes(q));
    });

    // --- Select floor card ---
    const selectFloorCard = this.homey.flow.getActionCard('select_floor');
    selectFloorCard.registerRunListener(async (args) => {
      const mapId = parseInt(args.floor.id, 10);
      if (isNaN(mapId)) throw new Error('Invalid floor selected');
      await args.device.selectFloor(mapId);
    });
    selectFloorCard.registerArgumentAutocompleteListener('floor', async (query, args) => {
      return this._getFloorAutocomplete(query, args);
    });

    // --- Operational state trigger ---
    const stateChangedCard = this.homey.flow.getDeviceTriggerCard('operational_state_changed');
    stateChangedCard.registerRunListener(async (args, state) => {
      if (args.state === 'any') return true;
      return state.state === args.state;
    });

    // --- Stuck triggers (no run listener needed — no args to filter) ---

    // --- Dust bin full trigger (no args to filter) ---

    // --- Cleaning finished trigger (no args to filter) ---

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
      const roomId = parseInt(args.room.id, 10);
      if (isNaN(roomId) || roomId <= 0) throw new Error('Invalid room selected');
      await args.device.startRoomCleaningSimple(roomId);
    });
    simpleRoomCard.registerArgumentAutocompleteListener('room', async (query, args) => {
      return this._getRoomAutocomplete(query, args);
    });

    const simpleMultiRoomCard = this.homey.flow.getActionCard('start_multi_room_cleaning_simple');
    simpleMultiRoomCard.registerRunListener(async (args) => {
      const roomIds = String(args.rooms.id).split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id) && id > 0);
      if (roomIds.length === 0) throw new Error('No valid rooms selected');
      await args.device.startMultiRoomCleaningSimple(roomIds);
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
      const zones = args.device.getZones();
      const zoneIds = String(zoneData.id).split(',');
      const coords = [];
      for (const zid of zoneIds) {
        const zone = zones.find(z => z.id === zid);
        if (zone && zone.coords) coords.push(zone.coords);
      }
      if (coords.length === 0) throw new Error('Zone not found. Reconfigure zones in app settings.');
      const stopAfter = args.after_clean === 'stop';
      await args.device.startZoneCleaning(coords, args.repeats, null, null, zoneData.name, zoneData.id, stopAfter);
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
      const zones = args.device ? args.device.getZones() : [];
      const results = [
        { name: 'Any zone', description: 'Triggers for all zones', id: '' },
        ...zones.map(z => ({ name: z.name, description: 'Custom zone', id: z.id })),
      ];
      if (!query) return results;
      const q = query.toLowerCase();
      return results.filter(r => r.name.toLowerCase().includes(q));
    });

    // --- Waypoint navigation card ---
    const waypointCard = this.homey.flow.getActionCard('navigate_to_waypoint');
    waypointCard.registerRunListener(async (args) => {
      const wpData = args.waypoint;
      if (!wpData || !wpData.id || wpData.id === '_none') throw new Error('No waypoint selected');
      const waypoints = args.device.getWaypoints();
      const wp = waypoints.find(w => w.id === wpData.id);
      if (!wp || !wp.coords) throw new Error('Waypoint not found. Reconfigure waypoints in app settings.');
      const stopAfter = args.after_arrival === 'stop';
      await args.device.navigateToWaypoint(wp.coords[0], wp.coords[1], wpData.name, wpData.id, stopAfter);
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
      const waypoints = args.device ? args.device.getWaypoints() : [];
      const results = [
        { name: 'Any waypoint', description: 'Triggers for all waypoints', id: '' },
        ...waypoints.map(w => ({ name: w.name, description: 'Custom waypoint', id: w.id })),
      ];
      if (!query) return results;
      const q = query.toLowerCase();
      return results.filter(r => r.name.toLowerCase().includes(q));
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
        this.homey.app.sendDiagnostic('Pairing: login success', { region: country });
        return true;
      } catch (err) {
        this.error('Login failed:', err.message);
        this.homey.app.sendDiagnostic('Pairing: login failed', { region: country, error: err.message }, 'warning');
        throw new Error(`Login failed: ${err.message}`);
      }
    });

    session.setHandler('list_devices', async () => {
      if (!api) {
        api = this.homey.app.getApi();
      }
      if (!api) {
        this.homey.app.sendDiagnostic('Pairing: list_devices called without API', { region: country }, 'warning');
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

        this.homey.app.sendDiagnostic('Pairing: devices discovered', {
          region: country,
          totalDevices: devices.length,
          vacuums: vacuums.length,
          models: vacuums.map(v => v.store.model),
        });

        return vacuums;
      } catch (err) {
        this.error('Failed to list devices:', err.message);
        this.homey.app.sendDiagnostic('Pairing: device discovery failed', { region: country, error: err.message }, 'error');
        throw new Error('Failed to list devices. Please try again.');
      }
    });
  }

  _getFloorLabel(args) {
    const floors = args.device ? args.device.getFloors() : [];
    if (floors.length <= 1) return '';
    const selectedId = args.device._selectedFloorId;
    const floor = floors.find(f => f.id === selectedId);
    return floor ? floor.name : 'Current floor';
  }

  _getRoomAutocompleteWithAny(query, args) {
    const floors = args.device ? args.device.getFloors() : [];
    const hasMultiFloor = floors.length > 1;
    const allRooms = args.device && hasMultiFloor
      ? args.device.getAllFloorRooms()
      : (args.device ? args.device.getRooms() : []).map(r => ({ ...r, floorId: null, floorName: null }));

    const results = [
      { name: 'Any room', description: 'Triggers for all rooms on all floors', id: '' },
    ];

    if (hasMultiFloor) {
      // Add "All rooms on <floor>" options
      for (const floor of floors) {
        const floorRooms = allRooms.filter(r => r.floorId === floor.id);
        if (floorRooms.length > 0) {
          const ids = floorRooms.map(r => r.id).join(',');
          results.push({
            name: `All rooms on ${floor.name}`,
            description: floorRooms.map(r => r.name).join(', '),
            id: ids,
          });
        }
      }
    }

    // Add individual rooms with floor label
    for (const r of allRooms) {
      results.push({
        name: r.name,
        description: r.floorName ? `${r.floorName} — Room ID: ${r.id}` : `Room ID: ${r.id}`,
        id: String(r.id),
      });
    }

    if (!query) return results;
    const q = query.toLowerCase();
    return results.filter(r => r.name.toLowerCase().includes(q));
  }

  _getRoomAutocomplete(query, args) {
    const floors = args.device ? args.device.getFloors() : [];
    const hasMultiFloor = floors.length > 1;

    // For multi-floor devices, show rooms from ALL floors so users don't need to switch floors first
    const allRooms = args.device && hasMultiFloor
      ? args.device.getAllFloorRooms()
      : (args.device ? args.device.getRooms() : []).map(r => ({ ...r, floorId: null, floorName: null }));

    if (allRooms.length === 0) {
      return [{ name: 'No rooms discovered yet', description: 'Rooms appear after the vacuum maps your home', id: '_none' }];
    }
    const results = allRooms.map(r => ({
      name: `${r.name} (ID: ${r.id})`,
      description: r.floorName || '',
      id: String(r.id),
    }));
    if (!query) return results;
    const q = query.toLowerCase();
    return results.filter(r => r.name.toLowerCase().includes(q) || r.id === query);
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
    const zones = args.device ? args.device.getZones() : [];
    if (zones.length === 0) {
      return [{ name: 'No zones configured', description: 'Draw zones on the map in app settings', id: '_none' }];
    }
    const floors = args.device ? args.device.getFloors() : [];
    const results = zones.map(z => {
      const floor = floors.find(f => f.id === z.floorId);
      const floorLabel = floor ? floor.name : '';
      return {
        name: z.name,
        description: floorLabel ? `${floorLabel}` : 'Custom zone',
        id: z.id,
      };
    });
    if (!query) return results;
    const q = query.toLowerCase();
    return results.filter(r => r.name.toLowerCase().includes(q));
  }

  _getFloorAutocomplete(query, args) {
    const floors = args.device ? args.device.getFloors() : [];
    if (floors.length === 0) {
      return [{ name: 'Floor 1', description: 'Default floor (single-floor device)', id: '0' }];
    }
    const results = floors.map(f => ({
      name: f.name,
      description: `Floor ${f.index}`,
      id: String(f.id),
    }));
    if (!query) return results;
    const q = query.toLowerCase();
    return results.filter(r => r.name.toLowerCase().includes(q));
  }

  _getMultiRoomAutocomplete(query, args) {
    const floors = args.device ? args.device.getFloors() : [];
    const hasMultiFloor = floors.length > 1;
    const allRooms = args.device && hasMultiFloor
      ? args.device.getAllFloorRooms()
      : (args.device ? args.device.getRooms() : []).map(r => ({ ...r, floorId: null, floorName: null }));

    if (allRooms.length === 0) {
      return [{ name: 'No rooms discovered yet', description: 'Rooms appear after the vacuum maps your home', id: '_none' }];
    }

    const results = [];

    if (hasMultiFloor) {
      // Per-floor "All rooms on <floor>" options
      for (const floor of floors) {
        const floorRooms = allRooms.filter(r => r.floorId === floor.id);
        if (floorRooms.length > 0) {
          results.push({
            name: `All rooms on ${floor.name}`,
            description: floorRooms.map(r => r.name).join(', '),
            id: floorRooms.map(r => r.id).join(','),
          });
        }
      }
    } else {
      // Single floor "All rooms"
      const allIds = allRooms.map(r => r.id).join(',');
      results.push({
        name: 'All rooms',
        description: allRooms.map(r => r.name).join(', '),
        id: allIds,
      });
    }

    // Add individual rooms with floor label
    for (const r of allRooms) {
      results.push({
        name: r.name,
        description: r.floorName ? `${r.floorName} — Room ID: ${r.id}` : `Room ID: ${r.id}`,
        id: String(r.id),
      });
    }

    // Add common combinations (pairs) per floor
    if (hasMultiFloor) {
      for (const floor of floors) {
        const floorRooms = allRooms.filter(r => r.floorId === floor.id);
        if (floorRooms.length > 2 && floorRooms.length <= 8) {
          for (let i = 0; i < floorRooms.length; i++) {
            for (let j = i + 1; j < floorRooms.length; j++) {
              results.push({
                name: `${floorRooms[i].name} + ${floorRooms[j].name}`,
                description: `${floor.name} — Room IDs: ${floorRooms[i].id}, ${floorRooms[j].id}`,
                id: `${floorRooms[i].id},${floorRooms[j].id}`,
              });
            }
          }
        }
      }
    } else if (allRooms.length > 2 && allRooms.length <= 8) {
      for (let i = 0; i < allRooms.length; i++) {
        for (let j = i + 1; j < allRooms.length; j++) {
          results.push({
            name: `${allRooms[i].name} + ${allRooms[j].name}`,
            description: `Room IDs: ${allRooms[i].id}, ${allRooms[j].id}`,
            id: `${allRooms[i].id},${allRooms[j].id}`,
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
    const zones = args.device ? args.device.getZones() : [];
    if (zones.length === 0) {
      return [{ name: 'No zones configured', description: 'Draw zones on the map in app settings', id: '_none' }];
    }
    const results = zones.map(z => ({
      name: z.name,
      description: 'Custom zone',
      id: z.id,
    }));
    if (!query) return results;
    const q = query.toLowerCase();
    return results.filter(r => r.name.toLowerCase().includes(q));
  }

  _getWaypointAutocomplete(query, args) {
    const waypoints = args.device ? args.device.getWaypoints() : [];
    if (waypoints.length === 0) {
      return [{ name: 'No waypoints configured', description: 'Click on the map in app settings to add waypoints', id: '_none' }];
    }
    const results = waypoints.map(w => ({
      name: w.name,
      description: 'Custom waypoint',
      id: w.id,
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

        this.homey.app.sendDiagnostic('Repair: login success', { region: country });
        return true;
      } catch (err) {
        this.error('Repair login failed:', err.message);
        this.homey.app.sendDiagnostic('Repair: login failed', { region: country, error: err.message }, 'warning');
        throw new Error('Login failed. Check your credentials.');
      }
    });
  }

}

module.exports = DreameVacuumDriver;
