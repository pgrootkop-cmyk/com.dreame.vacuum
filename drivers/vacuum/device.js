'use strict';

const Homey = require('homey');

// SIID/PIID property constants
const PROP = {
  STATE:          { siid: 2, piid: 1 },
  ERROR:          { siid: 2, piid: 2 },
  BATTERY:        { siid: 3, piid: 1 },
  CLEANING_TIME:  { siid: 4, piid: 2 },
  CLEANED_AREA:   { siid: 4, piid: 3 },
  SUCTION_LEVEL:  { siid: 4, piid: 4 },
  WATER_VOLUME:   { siid: 4, piid: 5 },
  CLEANING_MODE:  { siid: 4, piid: 23 },

  // Consumables
  MAIN_BRUSH_LEFT:  { siid: 9, piid: 2 },
  SIDE_BRUSH_LEFT:  { siid: 10, piid: 2 },
  FILTER_LEFT:      { siid: 11, piid: 1 },
  SENSOR_DIRTY_LEFT:{ siid: 16, piid: 1 },
  MOP_PAD_LEFT:     { siid: 18, piid: 1 },

  // Dock/Station
  SELF_WASH_STATUS: { siid: 4, piid: 25 },
  AUTO_EMPTY_STATUS:{ siid: 15, piid: 5 },
  LOW_WATER_WARNING:{ siid: 4, piid: 41 },
  DUST_BAG_STATUS:  { siid: 27, piid: 3 },
  CLEAN_WATER_TANK: { siid: 27, piid: 1 },
  DIRTY_WATER_TANK: { siid: 27, piid: 2 },
  CLEANING_PROGRESS:{ siid: 4, piid: 63 },

  // Toggles
  CARPET_BOOST:     { siid: 4, piid: 12 },
  DND_ENABLED:      { siid: 5, piid: 1 },

  // Auto-switch settings (JSON key-value store for CleanGenius, route, etc.)
  AUTO_SWITCH_SETTINGS: { siid: 4, piid: 50 },
  // CleanGenius mode (vacuum&mop vs vacuum-then-mop)
  CLEANGENIUS_MODE: { siid: 28, piid: 5 },
  // Task type (standard/custom/smart/etc.)
  TASK_TYPE: { siid: 4, piid: 58 },
};

// SIID/AIID action constants
const ACTION = {
  START:         { siid: 2, aiid: 1 },
  PAUSE:         { siid: 2, aiid: 2 },
  CHARGE:        { siid: 3, aiid: 1 },
  START_CUSTOM:  { siid: 4, aiid: 1 },
  STOP:          { siid: 4, aiid: 2 },
  LOCATE:        { siid: 7, aiid: 1 },
  START_AUTO_EMPTY: { siid: 15, aiid: 1 },
  RESET_MAIN_BRUSH: { siid: 9, aiid: 1 },
  RESET_SIDE_BRUSH: { siid: 10, aiid: 1 },
  RESET_FILTER:     { siid: 11, aiid: 1 },
  RESET_SENSOR:     { siid: 16, aiid: 1 },
  RESET_MOP_PAD:    { siid: 18, aiid: 1 },
};

// Dreame state → Homey vacuumcleaner_state mapping
const STATE_MAP = {
  1: 'cleaning',   // SWEEPING
  2: 'stopped',    // IDLE
  3: 'stopped',    // PAUSED
  4: 'stopped',    // ERROR
  5: 'docked',     // RETURNING
  6: 'charging',   // CHARGING
  7: 'cleaning',   // MOPPING
  8: 'docked',     // DRYING
  9: 'docked',     // WASHING (self-clean)
  10: 'docked',    // RETURNING_TO_WASH
  11: 'docked',    // BUILDING_MAP
  12: 'cleaning',  // SWEEPING_AND_MOPPING
  13: 'charging',  // CHARGING_COMPLETED
  14: 'docked',    // UPGRADING
  15: 'docked',    // CLEAN_SUMMON
  16: 'docked',    // STATION_RESET
  17: 'docked',    // RETURNING_INSTALL_MOP
  18: 'docked',    // RETURNING_REMOVE_MOP
  19: 'cleaning',  // WATER_CHECK
  20: 'docked',    // DUST_COLLECTION
  21: 'docked',    // REMOTE_CONTROL
  22: 'cleaning',  // SMART_CHARGING
  23: 'cleaning',  // SECOND_CLEANING
  24: 'cleaning',  // HUMAN_FOLLOWING
  25: 'cleaning',  // SPOT_CLEANING
  26: 'cleaning',  // RETURNING_AUTO_EMPTY
  27: 'docked',    // SHORTCUT_WAITING
  28: 'cleaning',  // SHORTCUT_CLEANING
  29: 'docked',    // STATION_CLEANING
  30: 'docked',    // DRAINING
  31: 'docked',    // WATER_CHANGE
  32: 'docked',    // STATION_DRYING
  33: 'cleaning',  // SEGMENT_CLEANING
  34: 'cleaning',  // ZONE_CLEANING
  35: 'cleaning',  // CRUISING_PATH
  36: 'cleaning',  // CRUISING_POINT
  37: 'cleaning',  // FAST_MAPPING
  38: 'docked',    // AUTO_WATER_REFILLING
};

// Self-wash base status mapping
const SELF_WASH_MAP = {
  0: 'idle', 1: 'washing', 2: 'drying', 3: 'returning_to_wash',
  4: 'paused', 5: 'clean_add_water', 6: 'adding_water',
};

// Auto empty status mapping
const AUTO_EMPTY_MAP = { 0: 'idle', 1: 'active', 2: 'not_performed' };

// Water tank status mapping
const WATER_TANK_MAP = { 0: 'installed', 1: 'not_installed', 2: 'low_water', 3: 'no_water' };

// Dirty water tank mapping
const DIRTY_WATER_TANK_MAP = { 0: 'installed', 1: 'not_installed_or_full' };

// Dust bag mapping
const DUST_BAG_MAP = { 0: 'installed', 1: 'not_installed', 2: 'full' };

// Suction level mapping: enum id ↔ Dreame value
const SUCTION_MAP = { quiet: 0, standard: 1, strong: 2, turbo: 3 };
const SUCTION_REVERSE = { 0: 'quiet', 1: 'standard', 2: 'strong', 3: 'turbo' };

// Cleaning mode mapping
const CLEANING_MODE_MAP = { sweeping: 0, mopping: 1, sweeping_and_mopping: 2, mopping_after_sweeping: 3 };
const CLEANING_MODE_REVERSE = { 0: 'sweeping', 1: 'mopping', 2: 'sweeping_and_mopping', 3: 'mopping_after_sweeping' };

// Water volume mapping
const WATER_VOLUME_MAP = { low: 1, medium: 2, high: 3 };
const WATER_VOLUME_REVERSE = { 1: 'low', 2: 'medium', 3: 'high' };

// CleanGenius level mapping
const CLEANGENIUS_MAP = { off: 0, routine: 1, deep: 2 };
const CLEANGENIUS_REVERSE = { 0: 'off', 1: 'routine', 2: 'deep' };

// CleanGenius mode mapping (only when CleanGenius is active)
const CLEANGENIUS_MODE_MAP = { vacuum_and_mop: 2, mop_after_vacuum: 3 };
const CLEANGENIUS_MODE_REVERSE = { 2: 'vacuum_and_mop', 3: 'mop_after_vacuum' };

// Cleaning route mapping
const CLEANING_ROUTE_MAP = { standard: 1, intensive: 2, deep: 3, quick: 4 };
const CLEANING_ROUTE_REVERSE = { 1: 'standard', 2: 'intensive', 3: 'deep', 4: 'quick' };

// Mop wash frequency mapping (values = area in m², 0 = by room)
const MOP_WASH_FREQ_MAP = { by_room: 0, '5m2': 5, '10m2': 10, '15m2': 15, '20m2': 20, '25m2': 25 };
const MOP_WASH_FREQ_REVERSE = { 0: 'by_room', 5: '5m2', 10: '10m2', 15: '15m2', 20: '20m2', 25: '25m2' };

// Grouped value encoding for self-wash-base cleaning mode (siid:4, piid:23)
function splitGroupedMode(value) {
  return {
    mode: value & 0xFF,
    washFreq: (value >> 8) & 0xFF,
    waterLevel: (value >> 16) & 0xFF,
  };
}

function combineGroupedMode(mode, washFreq, waterLevel) {
  return ((waterLevel & 0xFF) << 16) | ((washFreq & 0xFF) << 8) | (mode & 0xFF);
}

// Dock status codes reported as error codes but not actual errors
const DOCK_INFO_CODES = new Set([30, 38, 54, 56, 57, 61, 70, 71, 74, 75]);

// Error code descriptions
const ERROR_CODES = {
  0: 'No error',
  1: 'LiDAR blocked',
  2: 'Bumper stuck',
  3: 'Wheel suspended',
  4: 'Cliff sensor error',
  5: 'Main brush stuck',
  6: 'Side brush stuck',
  7: 'Wheel stuck',
  8: 'Robot stuck',
  9: 'Filter blocked',
  10: 'Charging base not found',
  11: 'Battery error',
  12: 'Wall sensor error',
  13: 'Water tank missing',
  14: 'Mop pad missing',
  15: 'Dust bag full',
  17: 'Magnetic strip detected',
  18: 'Wall sensor dirty',
  19: 'Charging contacts dirty',
  21: 'Laser distance sensor blocked',
  22: 'Bumper stuck',
  23: 'Dock communication error',
  24: 'Dust bag missing',
  25: 'Mop not installed',
  26: 'Mop dirty, please clean',
  27: 'Self-clean failed',
  28: 'Robot on carpet with mop',
  29: 'Filter blocked or wet',
  30: 'Drying timeout',
  32: 'Station disconnected',
  33: 'Station low water',
  34: 'Station dirty water full',
  35: 'Washboard not installed',
  37: 'Dirty water tank not installed',
  38: 'Clear water tank empty',
  39: 'Dirty water tank full',
  40: 'Washboard needs cleaning',
  43: 'Dust bag full',
  44: 'Camera blocked',
  46: 'Camera dirty',
  52: 'Robot tilted',
  54: 'Clean water tank low',
  56: 'Silver ion module exhausted',
  57: 'Cleaning solution low',
  61: 'Drying filter needs cleaning',
  70: 'Drying filter not installed',
  71: 'Cleaning solution empty',
  74: 'Mop pads drying',
  75: 'Mop pads need replacing',
};

const COMMAND_DEBOUNCE_MS = 10000;

class DreameVacuumDevice extends Homey.Device {

  async onInit() {
    this.log('Dreame Vacuum device initialized:', this.getName());

    this._did = this.getData().id;
    this._bindDomain = this.getStoreValue('bindDomain') || '';
    this._pollInterval = null;
    this._lastCommandTime = 0;
    this._pollCycle = 0;
    this._consumableLowNotified = {};

    // Ensure all capabilities are present (for devices paired before new capabilities were added)
    const requiredCapabilities = [
      'onoff', 'vacuumcleaner_state', 'measure_battery', 'dreame_suction_level',
      'dreame_cleaning_mode', 'dreame_water_volume', 'dreame_cleaned_area',
      'dreame_cleaning_time', 'dreame_cleaning_progress', 'dreame_carpet_boost',
      'dreame_dnd', 'dreame_cleangenius', 'dreame_cleaning_route', 'dreame_mop_wash_frequency',
      'dreame_self_wash_status', 'dreame_dust_collection',
      'dreame_water_tank', 'dreame_dirty_water_tank', 'dreame_dust_bag',
      'dreame_main_brush_left', 'dreame_side_brush_left', 'dreame_filter_left',
      'dreame_mop_pad_left', 'dreame_sensor_dirty_left', 'dreame_error',
    ];
    for (const cap of requiredCapabilities) {
      if (!this.hasCapability(cap)) {
        this.log(`Adding missing capability: ${cap}`);
        await this.addCapability(cap);
      }
    }

    // Probe-once: detect which advanced properties the device supports
    this._unsupportedProps = new Set(this.getStoreValue('unsupportedProps') || []);
    this._probeComplete = this.getStoreValue('probeComplete') || false;

    // Register capability listeners
    this.registerCapabilityListener('onoff', this._onOnOff.bind(this));
    this.registerCapabilityListener('vacuumcleaner_state', this._onVacuumState.bind(this));
    this.registerCapabilityListener('dreame_suction_level', this._onSuctionLevel.bind(this));
    this.registerCapabilityListener('dreame_cleaning_mode', this._onCleaningMode.bind(this));
    this.registerCapabilityListener('dreame_water_volume', this._onWaterVolume.bind(this));
    this.registerCapabilityListener('dreame_carpet_boost', this._onCarpetBoost.bind(this));
    this.registerCapabilityListener('dreame_dnd', this._onDnd.bind(this));
    if (this.hasCapability('dreame_cleangenius')) {
      this.registerCapabilityListener('dreame_cleangenius', this._onCleanGenius.bind(this));
    }
    if (this.hasCapability('dreame_cleaning_route')) {
      this.registerCapabilityListener('dreame_cleaning_route', this._onCleaningRoute.bind(this));
    }
    if (this.hasCapability('dreame_mop_wash_frequency')) {
      this.registerCapabilityListener('dreame_mop_wash_frequency', this._onMopWashFrequency.bind(this));
    }

    // Fetch bindDomain if not stored
    if (!this._bindDomain) {
      await this._fetchBindDomain();
    }

    // Start polling
    this.restartPolling();
  }

  async _fetchBindDomain() {
    try {
      const api = this.homey.app.getApi();
      if (!api) return;

      const info = await api.getDeviceInfo(this._did);
      if (info.bindDomain) {
        this._bindDomain = info.bindDomain;
        await this.setStoreValue('bindDomain', this._bindDomain);
      }
    } catch (err) {
      this.error('Failed to fetch bindDomain:', err.message);
    }
  }

  _getApi() {
    const api = this.homey.app.getApi();
    if (!api) {
      throw new Error('API not initialized. Please repair the device.');
    }
    return api;
  }

  restartPolling() {
    this.stopPolling();

    const interval = (this.getSetting('poll_interval') || 5) * 1000;
    this._pollInterval = this.homey.setInterval(() => this._poll(), interval);

    // Initial poll
    this._poll();
  }

  stopPolling() {
    if (this._pollInterval) {
      this.homey.clearInterval(this._pollInterval);
      this._pollInterval = null;
    }
  }

  _forceRefresh() {
    this.homey.setTimeout(() => {
      this._forceNextPoll = true;
      this._poll();
    }, 3000);
  }

  async _poll() {
    // Skip poll if a command was recently sent (debounce), unless forced
    if (!this._forceNextPoll && Date.now() - this._lastCommandTime < COMMAND_DEBOUNCE_MS) {
      return;
    }
    this._forceNextPoll = false;

    try {
      const api = this.homey.app.getApi();
      if (!api) {
        return;
      }

      if (!api.accessToken) {
        await api.login();
      }

      const props = [
        PROP.STATE,
        PROP.ERROR,
        PROP.BATTERY,
        PROP.CLEANING_TIME,
        PROP.CLEANED_AREA,
        PROP.SUCTION_LEVEL,
        PROP.WATER_VOLUME,
        PROP.CLEANING_MODE,
        PROP.SELF_WASH_STATUS,
        PROP.CLEANING_PROGRESS,
        PROP.CARPET_BOOST,
        PROP.DND_ENABLED,
      ];

      // Advanced properties (skip if known unsupported)
      if (!this._unsupportedProps.has('4-50')) props.push(PROP.AUTO_SWITCH_SETTINGS);
      if (!this._unsupportedProps.has('28-5')) props.push(PROP.CLEANGENIUS_MODE);
      if (!this._unsupportedProps.has('4-58')) props.push(PROP.TASK_TYPE);

      // Poll consumables + dock sensors less frequently (every 12th cycle = ~60s)
      this._pollCycle = (this._pollCycle + 1) % 12;
      if (this._pollCycle === 1) {
        props.push(
          PROP.MAIN_BRUSH_LEFT,
          PROP.SIDE_BRUSH_LEFT,
          PROP.FILTER_LEFT,
          PROP.SENSOR_DIRTY_LEFT,
          PROP.MOP_PAD_LEFT,
          PROP.AUTO_EMPTY_STATUS,
          PROP.DUST_BAG_STATUS,
          PROP.CLEAN_WATER_TANK,
          PROP.DIRTY_WATER_TANK,
          PROP.LOW_WATER_WARNING,
        );
      }

      const results = await api.getProperties(this._did, this._bindDomain, props);

      if (!Array.isArray(results)) {
        this.error('Unexpected poll result:', results);
        return;
      }

      for (const r of results) {
        if (r.code !== undefined && r.code !== 0) {
          // Track unsupported properties (code -2)
          if (r.code === -2 && !this._probeComplete) {
            const propKey = `${r.siid}-${r.piid}`;
            this._unsupportedProps.add(propKey);
          }
          continue;
        }

        const key = `${r.siid}-${r.piid}`;
        const value = r.value;

        switch (key) {
          case '2-1': // STATE
            if (STATE_MAP[value]) {
              const homeyState = STATE_MAP[value];
              await this.setCapabilityValue('vacuumcleaner_state', homeyState).catch(this.error);
              // Keep onoff in sync: cleaning = on, everything else = off
              await this.setCapabilityValue('onoff', homeyState === 'cleaning').catch(this.error);
            }
            break;

          case '2-2': // ERROR
            {
              // Some codes are informational dock statuses, not real errors
              const isRealError = value !== 0 && !DOCK_INFO_CODES.has(value);

              if (value === 0 || DOCK_INFO_CODES.has(value)) {
                await this.setCapabilityValue('dreame_error', 'None').catch(this.error);
              } else {
                const errorText = ERROR_CODES[value] || `Unknown error (${value})`;
                await this.setCapabilityValue('dreame_error', errorText).catch(this.error);
              }

              // Only trigger flow card for real errors
              if (isRealError) {
                const errorText = ERROR_CODES[value] || `Unknown error (${value})`;
                const errorCard = this.homey.flow.getDeviceTriggerCard('dreame_error_occurred');
                await errorCard.trigger(this, { error: errorText }).catch(e => this.error('Trigger error:', e));
              }
            }
            break;

          case '3-1': // BATTERY
            await this.setCapabilityValue('measure_battery', value).catch(this.error);
            break;

          case '4-2': // CLEANING_TIME
            await this.setCapabilityValue('dreame_cleaning_time', value).catch(this.error);
            break;

          case '4-3': // CLEANED_AREA
            await this.setCapabilityValue('dreame_cleaned_area', value).catch(this.error);
            break;

          case '4-4': // SUCTION_LEVEL
            if (SUCTION_REVERSE[value] !== undefined) {
              await this.setCapabilityValue('dreame_suction_level', SUCTION_REVERSE[value]).catch(this.error);
            } else {
              this.error('Unknown suction level value:', value);
            }
            break;

          case '4-5': // WATER_VOLUME
            if (WATER_VOLUME_REVERSE[value] !== undefined) {
              await this.setCapabilityValue('dreame_water_volume', WATER_VOLUME_REVERSE[value]).catch(this.error);
            } else {
              this.error('Unknown water volume value:', value);
            }
            break;

          case '4-23': { // CLEANING_MODE (may be grouped value on self-wash-base)
            const currentState = this.getCapabilityValue('vacuumcleaner_state');
            const isCleaning = currentState === 'cleaning';

            // Check if this is a grouped value (> 255 means bytes are packed)
            if (value > 255) {
              const grouped = splitGroupedMode(value);
              this._isGroupedMode = true;
              this._groupedModeRaw = value;

              // Extract cleaning mode from byte0
              const modeVal = grouped.mode;
              if (CLEANING_MODE_REVERSE[modeVal] !== undefined) {
                if (isCleaning || !this.getCapabilityValue('dreame_cleaning_mode')) {
                  await this.setCapabilityValue('dreame_cleaning_mode', CLEANING_MODE_REVERSE[modeVal]).catch(this.error);
                }
              }

              // Extract mop wash frequency from byte1
              if (this.hasCapability('dreame_mop_wash_frequency')) {
                const freqVal = grouped.washFreq;
                const freq = MOP_WASH_FREQ_REVERSE[freqVal];
                if (freq !== undefined) {
                  await this.setCapabilityValue('dreame_mop_wash_frequency', freq).catch(this.error);
                }
              }
            } else {
              // Simple non-grouped mode
              this._isGroupedMode = false;
              if (CLEANING_MODE_REVERSE[value] !== undefined) {
                if (isCleaning || !this.getCapabilityValue('dreame_cleaning_mode')) {
                  await this.setCapabilityValue('dreame_cleaning_mode', CLEANING_MODE_REVERSE[value]).catch(this.error);
                }
              } else {
                this.error('Unknown cleaning mode value:', value);
              }
            }
            break;
          }

          case '4-25': // SELF_WASH_STATUS
            if (SELF_WASH_MAP[value] !== undefined) {
              await this.setCapabilityValue('dreame_self_wash_status', SELF_WASH_MAP[value]).catch(this.error);
            }
            break;

          case '4-63': // CLEANING_PROGRESS
            await this.setCapabilityValue('dreame_cleaning_progress', value || 0).catch(this.error);
            break;

          case '4-12': // CARPET_BOOST
            await this.setCapabilityValue('dreame_carpet_boost', !!value).catch(this.error);
            break;

          case '5-1': // DND_ENABLED
            await this.setCapabilityValue('dreame_dnd', !!value).catch(this.error);
            break;

          case '9-2': // MAIN_BRUSH_LEFT
            await this.setCapabilityValue('dreame_main_brush_left', value).catch(this.error);
            this._checkConsumable('Main Brush', value);
            break;

          case '10-2': // SIDE_BRUSH_LEFT
            await this.setCapabilityValue('dreame_side_brush_left', value).catch(this.error);
            this._checkConsumable('Side Brush', value);
            break;

          case '11-1': // FILTER_LEFT
            await this.setCapabilityValue('dreame_filter_left', value).catch(this.error);
            this._checkConsumable('Filter', value);
            break;

          case '16-1': // SENSOR_DIRTY_LEFT
            await this.setCapabilityValue('dreame_sensor_dirty_left', value).catch(this.error);
            this._checkConsumable('Sensor', value);
            break;

          case '18-1': // MOP_PAD_LEFT
            await this.setCapabilityValue('dreame_mop_pad_left', value).catch(this.error);
            this._checkConsumable('Mop Pad', value);
            break;

          case '15-5': // AUTO_EMPTY_STATUS
            if (AUTO_EMPTY_MAP[value] !== undefined) {
              await this.setCapabilityValue('dreame_dust_collection', AUTO_EMPTY_MAP[value]).catch(this.error);
            }
            break;

          case '27-3': // DUST_BAG_STATUS
            if (DUST_BAG_MAP[value] !== undefined) {
              await this.setCapabilityValue('dreame_dust_bag', DUST_BAG_MAP[value]).catch(this.error);
            }
            break;

          case '27-1': // CLEAN_WATER_TANK
            if (WATER_TANK_MAP[value] !== undefined) {
              await this.setCapabilityValue('dreame_water_tank', WATER_TANK_MAP[value]).catch(this.error);
              // Trigger low water warning
              if (value === 2 || value === 3) {
                const status = value === 2 ? 'Low Water' : 'No Water';
                const card = this.homey.flow.getDeviceTriggerCard('low_water_warning');
                await card.trigger(this, { status }).catch(e => this.error('Low water trigger:', e));
              }
            }
            break;

          case '27-2': // DIRTY_WATER_TANK
            if (DIRTY_WATER_TANK_MAP[value] !== undefined) {
              await this.setCapabilityValue('dreame_dirty_water_tank', DIRTY_WATER_TANK_MAP[value]).catch(this.error);
            }
            break;

          case '4-41': // LOW_WATER_WARNING (separate from tank status)
            break; // Handled via 27-1

          case '4-50': { // AUTO_SWITCH_SETTINGS
            // Parse JSON auto-switch settings
            try {
              if (typeof value === 'string') {
                const settings = JSON.parse(value);
                // Settings can be an object or array of {k,v} pairs
                const settingsMap = {};
                if (Array.isArray(settings)) {
                  for (const s of settings) settingsMap[s.k] = s.v;
                } else if (settings.k) {
                  settingsMap[settings.k] = settings.v;
                }
                // CleanGenius (SmartHost)
                if (settingsMap.SmartHost !== undefined && this.hasCapability('dreame_cleangenius')) {
                  const cg = CLEANGENIUS_REVERSE[settingsMap.SmartHost];
                  if (cg !== undefined) {
                    await this.setCapabilityValue('dreame_cleangenius', cg).catch(this.error);
                  }
                }
                // Cleaning Route (CleanRoute)
                if (settingsMap.CleanRoute !== undefined && this.hasCapability('dreame_cleaning_route')) {
                  const route = CLEANING_ROUTE_REVERSE[settingsMap.CleanRoute];
                  if (route !== undefined) {
                    await this.setCapabilityValue('dreame_cleaning_route', route).catch(this.error);
                  }
                }
              }
            } catch (e) {
              this.error('Failed to parse AUTO_SWITCH_SETTINGS:', value);
            }
            break;
          }

          case '28-5': // CLEANGENIUS_MODE
            // Only meaningful when CleanGenius is active
            if (CLEANGENIUS_MODE_REVERSE[value] !== undefined) {
              this._cleanGeniusMode = CLEANGENIUS_MODE_REVERSE[value];
            }
            break;

          case '4-58': // TASK_TYPE
            this._taskType = value;
            break;
        }
      }

      // Complete probe and save unsupported props
      if (!this._probeComplete) {
        this._probeComplete = true;
        await this.setStoreValue('probeComplete', true);
        await this.setStoreValue('unsupportedProps', [...this._unsupportedProps]);
        this.log('Probe complete. Unsupported props:', [...this._unsupportedProps]);

        // Remove capabilities for unsupported features
        if (this._unsupportedProps.has('4-50')) {
          // AUTO_SWITCH_SETTINGS not supported = no CleanGenius or route
          if (this.hasCapability('dreame_cleangenius')) await this.removeCapability('dreame_cleangenius');
          if (this.hasCapability('dreame_cleaning_route')) await this.removeCapability('dreame_cleaning_route');
          if (this.hasCapability('dreame_mop_wash_frequency')) await this.removeCapability('dreame_mop_wash_frequency');
        }
        if (this._unsupportedProps.has('28-5')) {
          // No CleanGenius mode support (handled via flow cards only)
        }
      }

      // Mark device available after successful poll
      if (!this.getAvailable()) {
        await this.setAvailable();
      }
    } catch (err) {
      this.error('Poll failed:', err.message);

      if (err.message.includes('401') || err.message.includes('Authentication') || err.message.includes('Login failed')) {
        await this.setUnavailable('Authentication failed. Use Repair to reconnect.');
      }
    }
  }

  // Capability listeners

  async _onOnOff(value) {
    if (value) {
      await this._onVacuumState('cleaning');
    } else {
      await this._onVacuumState('docked');
    }
  }

  async _startCleaning() {
    this._lastCommandTime = Date.now();
    const api = this._getApi();

    // Apply configured cleaning mode, suction and water volume before starting
    const mode = this.getCapabilityValue('dreame_cleaning_mode');
    const suction = this.getCapabilityValue('dreame_suction_level');
    const water = this.getCapabilityValue('dreame_water_volume');
    const propsToSet = [];
    if (mode && CLEANING_MODE_MAP[mode] !== undefined) {
      let modeValue = CLEANING_MODE_MAP[mode];
      if (this._isGroupedMode && this._groupedModeRaw !== undefined) {
        const grouped = splitGroupedMode(this._groupedModeRaw);
        modeValue = combineGroupedMode(modeValue, grouped.washFreq, grouped.waterLevel);
      }
      propsToSet.push({ siid: PROP.CLEANING_MODE.siid, piid: PROP.CLEANING_MODE.piid, value: modeValue });
    }
    if (suction && SUCTION_MAP[suction] !== undefined) {
      propsToSet.push({ siid: PROP.SUCTION_LEVEL.siid, piid: PROP.SUCTION_LEVEL.piid, value: SUCTION_MAP[suction] });
    }
    if (water && WATER_VOLUME_MAP[water] !== undefined) {
      propsToSet.push({ siid: PROP.WATER_VOLUME.siid, piid: PROP.WATER_VOLUME.piid, value: WATER_VOLUME_MAP[water] });
    }
    if (propsToSet.length > 0) {
      await api.setProperties(this._did, this._bindDomain, propsToSet).catch(e => this.error('Pre-start set props:', e));
    }
    await api.callAction(this._did, this._bindDomain, ACTION.START.siid, ACTION.START.aiid);

    // Instant feedback
    await this.setCapabilityValue('vacuumcleaner_state', 'cleaning').catch(this.error);
    await this.setCapabilityValue('onoff', true).catch(this.error);
    this._forceRefresh();
  }

  _isIdle() {
    const state = this.getCapabilityValue('vacuumcleaner_state');
    return state !== 'cleaning';
  }

  async _onVacuumState(value) {
    this._lastCommandTime = Date.now();
    const api = this._getApi();

    switch (value) {
      case 'cleaning':
        await this._startCleaning();
        return; // _startCleaning handles feedback + refresh
      case 'stopped':
        await api.callAction(this._did, this._bindDomain, ACTION.PAUSE.siid, ACTION.PAUSE.aiid);
        await this.setCapabilityValue('onoff', false).catch(this.error);
        break;
      case 'docked':
      case 'charging':
        await api.callAction(this._did, this._bindDomain, ACTION.CHARGE.siid, ACTION.CHARGE.aiid);
        await this.setCapabilityValue('onoff', false).catch(this.error);
        break;
    }

    this._forceRefresh();
  }

  async _onSuctionLevel(value) {
    await this.setSuctionLevel(value);
    this._forceRefresh();
  }

  async _onCleaningMode(value) {
    await this.setCleaningMode(value);
    this._forceRefresh();
  }

  async _onWaterVolume(value) {
    await this.setWaterVolume(value);
    this._forceRefresh();
  }

  // Public command methods (used by flow cards)

  async setSuctionLevel(level) {
    this._lastCommandTime = Date.now();
    const api = this._getApi();
    const dreameValue = SUCTION_MAP[level];

    if (dreameValue === undefined) {
      throw new Error(`Invalid suction level: ${level}`);
    }

    await api.setProperties(this._did, this._bindDomain, [
      { siid: PROP.SUCTION_LEVEL.siid, piid: PROP.SUCTION_LEVEL.piid, value: dreameValue },
    ]);

    await this.setCapabilityValue('dreame_suction_level', level);
  }

  async setCleaningMode(mode) {
    this._lastCommandTime = Date.now();
    const api = this._getApi();
    const dreameValue = CLEANING_MODE_MAP[mode];

    if (dreameValue === undefined) {
      throw new Error(`Invalid cleaning mode: ${mode}`);
    }

    let valueToSend = dreameValue;
    // If device uses grouped mode, preserve wash frequency and water level
    if (this._isGroupedMode && this._groupedModeRaw !== undefined) {
      const grouped = splitGroupedMode(this._groupedModeRaw);
      valueToSend = combineGroupedMode(dreameValue, grouped.washFreq, grouped.waterLevel);
    }

    await api.setProperties(this._did, this._bindDomain, [
      { siid: PROP.CLEANING_MODE.siid, piid: PROP.CLEANING_MODE.piid, value: valueToSend },
    ]);

    await this.setCapabilityValue('dreame_cleaning_mode', mode);
  }

  async setWaterVolume(volume) {
    this._lastCommandTime = Date.now();
    const api = this._getApi();
    const dreameValue = WATER_VOLUME_MAP[volume];

    if (dreameValue === undefined) {
      throw new Error(`Invalid water volume: ${volume}`);
    }

    await api.setProperties(this._did, this._bindDomain, [
      { siid: PROP.WATER_VOLUME.siid, piid: PROP.WATER_VOLUME.piid, value: dreameValue },
    ]);

    await this.setCapabilityValue('dreame_water_volume', volume);
  }

  async locate() {
    this._lastCommandTime = Date.now();
    const api = this._getApi();
    await api.callAction(this._did, this._bindDomain, ACTION.LOCATE.siid, ACTION.LOCATE.aiid);
  }

  // Auto-switch settings helper (writes JSON key-value to siid:4, piid:50)
  async _setAutoSwitchProperty(key, value) {
    this._lastCommandTime = Date.now();
    const api = this._getApi();
    const payload = JSON.stringify({ k: key, v: value });
    await api.setProperties(this._did, this._bindDomain, [
      { siid: PROP.AUTO_SWITCH_SETTINGS.siid, piid: PROP.AUTO_SWITCH_SETTINGS.piid, value: payload },
    ]);
  }

  async _onCleanGenius(value) {
    const dreameValue = CLEANGENIUS_MAP[value];
    if (dreameValue === undefined) throw new Error(`Invalid CleanGenius level: ${value}`);
    await this._setAutoSwitchProperty('SmartHost', dreameValue);

    // Auto-start: selecting Routine or Deep while idle starts cleaning
    if (dreameValue > 0 && this._isIdle()) {
      this.log('CleanGenius %s selected while idle — auto-starting', value);
      await this._startCleaning();
    }
  }

  async setCleanGenius(level) {
    const dreameValue = CLEANGENIUS_MAP[level];
    if (dreameValue === undefined) throw new Error(`Invalid CleanGenius level: ${level}`);
    await this._setAutoSwitchProperty('SmartHost', dreameValue);
    if (this.hasCapability('dreame_cleangenius')) {
      await this.setCapabilityValue('dreame_cleangenius', level);
    }
  }

  async setCleanGeniusMode(method) {
    this._lastCommandTime = Date.now();
    const api = this._getApi();
    const dreameValue = CLEANGENIUS_MODE_MAP[method];
    if (dreameValue === undefined) throw new Error(`Invalid CleanGenius mode: ${method}`);
    await api.setProperties(this._did, this._bindDomain, [
      { siid: PROP.CLEANGENIUS_MODE.siid, piid: PROP.CLEANGENIUS_MODE.piid, value: dreameValue },
    ]);
  }

  async _onCleaningRoute(value) {
    await this.setCleaningRoute(value);
    this._forceRefresh();
  }

  async setCleaningRoute(route) {
    const dreameValue = CLEANING_ROUTE_MAP[route];
    if (dreameValue === undefined) throw new Error(`Invalid cleaning route: ${route}`);
    await this._setAutoSwitchProperty('CleanRoute', dreameValue);
    if (this.hasCapability('dreame_cleaning_route')) {
      await this.setCapabilityValue('dreame_cleaning_route', route);
    }
  }

  async _onMopWashFrequency(value) {
    await this.setMopWashFrequency(value);
    this._forceRefresh();
  }

  async setMopWashFrequency(frequency) {
    this._lastCommandTime = Date.now();
    const api = this._getApi();
    const freqValue = MOP_WASH_FREQ_MAP[frequency];
    if (freqValue === undefined) throw new Error(`Invalid mop wash frequency: ${frequency}`);

    // Mop wash frequency is encoded in byte1 of the grouped cleaning mode value (siid:4, piid:23)
    // When idle, device reports 4-23=0 so _isGroupedMode may be false — construct from current caps
    let mode, waterLevel;
    if (this._isGroupedMode && this._groupedModeRaw !== undefined) {
      const grouped = splitGroupedMode(this._groupedModeRaw);
      mode = grouped.mode;
      waterLevel = grouped.waterLevel;
    } else {
      const currentMode = this.getCapabilityValue('dreame_cleaning_mode');
      mode = (currentMode && CLEANING_MODE_MAP[currentMode] !== undefined) ? CLEANING_MODE_MAP[currentMode] : 2;
      const currentWater = this.getCapabilityValue('dreame_water_volume');
      waterLevel = (currentWater && WATER_VOLUME_MAP[currentWater] !== undefined) ? WATER_VOLUME_MAP[currentWater] : 2;
    }

    const newValue = combineGroupedMode(mode, freqValue, waterLevel);
    await api.setProperties(this._did, this._bindDomain, [
      { siid: PROP.CLEANING_MODE.siid, piid: PROP.CLEANING_MODE.piid, value: newValue },
    ]);
    this._groupedModeRaw = newValue;
    this._isGroupedMode = true;

    if (this.hasCapability('dreame_mop_wash_frequency')) {
      await this.setCapabilityValue('dreame_mop_wash_frequency', frequency);
    }
  }

  async startRoomCleaning(roomId, repeats, suction, water) {
    this._lastCommandTime = Date.now();
    const api = this._getApi();
    const suctionValue = SUCTION_MAP[suction] !== undefined ? SUCTION_MAP[suction] : 1;
    const waterValue = WATER_VOLUME_MAP[water] !== undefined ? WATER_VOLUME_MAP[water] : 2;
    const repeatCount = Math.max(1, Math.min(3, repeats || 1));

    const cleanlist = [[roomId, repeatCount, suctionValue, waterValue, 1]];
    const params = JSON.stringify({ selects: cleanlist });

    // START_CUSTOM action with status=18 (SEGMENT_CLEANING) and cleaning properties
    await api.callAction(this._did, this._bindDomain, ACTION.START_CUSTOM.siid, ACTION.START_CUSTOM.aiid, [
      { piid: 1, value: 18 },
      { piid: 10, value: params },
    ]);
  }

  async _onCarpetBoost(value) {
    this._lastCommandTime = Date.now();
    const api = this.homey.app.getApi();
    if (!api) throw new Error('API not initialized');
    await api.setProperties(this._did, this._bindDomain, [
      { siid: PROP.CARPET_BOOST.siid, piid: PROP.CARPET_BOOST.piid, value: value ? 1 : 0 },
    ]);
  }

  async _onDnd(value) {
    this._lastCommandTime = Date.now();
    const api = this.homey.app.getApi();
    if (!api) throw new Error('API not initialized');
    await api.setProperties(this._did, this._bindDomain, [
      { siid: PROP.DND_ENABLED.siid, piid: PROP.DND_ENABLED.piid, value: value ? 1 : 0 },
    ]);
  }

  async startSelfClean() {
    this._lastCommandTime = Date.now();
    const api = this.homey.app.getApi();
    if (!api) throw new Error('API not initialized');
    // Self-clean uses a set_properties call to toggle washing
    await api.setProperties(this._did, this._bindDomain, [
      { siid: 4, piid: 34, value: 1 },
    ]);
  }

  async startDrying() {
    this._lastCommandTime = Date.now();
    const api = this.homey.app.getApi();
    if (!api) throw new Error('API not initialized');
    await api.setProperties(this._did, this._bindDomain, [
      { siid: 4, piid: 40, value: 1 },
    ]);
  }

  async startAutoEmpty() {
    this._lastCommandTime = Date.now();
    const api = this.homey.app.getApi();
    if (!api) throw new Error('API not initialized');
    await api.callAction(this._did, this._bindDomain, ACTION.START_AUTO_EMPTY.siid, ACTION.START_AUTO_EMPTY.aiid);
  }

  async resetConsumable(siid, aiid) {
    const api = this.homey.app.getApi();
    if (!api) throw new Error('API not initialized');
    await api.callAction(this._did, this._bindDomain, siid, aiid);
  }

  _checkConsumable(name, percentage) {
    const threshold = this.getSetting('consumable_threshold') || 10;
    if (percentage <= threshold && !this._consumableLowNotified[name]) {
      this._consumableLowNotified[name] = true;
      const card = this.homey.flow.getDeviceTriggerCard('consumable_low');
      card.trigger(this, { consumable: name, percentage }).catch(e => this.error('Consumable trigger:', e));
    } else if (percentage > threshold) {
      this._consumableLowNotified[name] = false;
    }
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    if (changedKeys.includes('poll_interval')) {
      this.restartPolling();
    }

    if (changedKeys.includes('country')) {
      const api = this.homey.app.getApi();
      if (api) {
        api.country = newSettings.country;
      }
    }
  }

  onDeleted() {
    this.stopPolling();
    this.log('Dreame Vacuum device deleted:', this.getName());
  }

}

module.exports = DreameVacuumDevice;
