'use strict';

const Homey = require('homey');
const DreameApi = require('../../lib/DreameApi');

class DreameVacuumDriver extends Homey.Driver {

  async onInit() {
    this.log('Dreame Vacuum driver initialized');

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

    this.homey.flow.getActionCard('start_room_cleaning')
      .registerRunListener(async (args) => {
        await args.device.startRoomCleaning(args.room_id, args.repeats, args.suction, args.water);
      });
  }

  async onPair(session) {
    let api = null;
    let country = 'eu';

    session.setHandler('login', async (data) => {
      const username = data.username;
      const password = data.password;
      country = this.homey.app.homey.settings.get('country') || 'eu';

      this.log('Login attempt, country:', country);
      api = new DreameApi({ username, password, country });

      try {
        const result = await api.login();
        this.log('Login successful');
        this.homey.app.setCredentials(username, password, country);
        if (result.refresh_token) {
          this.homey.app.saveRefreshToken(result.refresh_token);
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
            },
          }));
      } catch (err) {
        this.error('Failed to list devices:', err.message);
        throw new Error('Failed to list devices. Please try again.');
      }
    });
  }

  async onRepair(session, device) {
    session.setHandler('login', async (data) => {
      const username = data.username;
      const password = data.password;
      const country = this.homey.app.homey.settings.get('country') || 'eu';

      const api = new DreameApi({ username, password, country });

      try {
        const result = await api.login();
        this.homey.app.setCredentials(username, password, country);
        if (result.refresh_token) {
          this.homey.app.saveRefreshToken(result.refresh_token);
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
