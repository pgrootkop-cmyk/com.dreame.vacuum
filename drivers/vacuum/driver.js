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
      return this._getRoomAutocomplete(query, args);
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
  }

  async onPair(session) {
    let api = null;
    let country = 'eu';

    session.setHandler('login', async (data) => {
      const username = data.username;
      const password = data.password;
      country = this.homey.settings.get('country') || 'eu';

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
        return true;
      } catch (err) {
        this.error('Login failed:', err.message);
        throw new Error(`Login failed: ${err.message}`);
      }
    });

    session.setHandler('list_devices', async () => {
      if (!api) {
        api = this.homey.app.getApi();
      }
      if (!api) {
        throw new Error('Not logged in');
      }

      try {
        const devices = await api.getDevices();

        return devices
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
      } catch (err) {
        this.error('Failed to list devices:', err.message);
        throw new Error('Failed to list devices. Please try again.');
      }
    });
  }

  _getRoomAutocompleteWithAny(query, args) {
    const rooms = args.device ? args.device.getRooms() : [];
    const results = [
      { name: 'Any room', description: 'Triggers for all rooms', id: '' },
      ...rooms.map(r => ({
        name: r.name,
        description: `Room ID: ${r.id}`,
        id: String(r.id),
      })),
    ];
    if (!query) return results;
    const q = query.toLowerCase();
    return results.filter(r => r.name.toLowerCase().includes(q));
  }

  _getRoomAutocomplete(query, args) {
    const rooms = args.device ? args.device.getRooms() : [];
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
    const rooms = args.device ? args.device.getRooms() : [];
    if (rooms.length === 0) {
      return [{ name: 'No rooms discovered yet', description: 'Rooms appear after the vacuum maps your home', id: '_none' }];
    }

    const results = [];

    // Add "All rooms" option
    const allIds = rooms.map(r => r.id).join(',');
    const allNames = rooms.map(r => r.name).join(', ');
    results.push({
      name: 'All rooms',
      description: allNames,
      id: allIds,
    });

    // Add individual rooms
    for (const r of rooms) {
      results.push({
        name: r.name,
        description: `Room ID: ${r.id}`,
        id: String(r.id),
      });
    }

    // Add common combinations (pairs)
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

        return true;
      } catch (err) {
        this.error('Repair login failed:', err.message);
        throw new Error('Login failed. Check your credentials.');
      }
    });
  }

}

module.exports = DreameVacuumDriver;
