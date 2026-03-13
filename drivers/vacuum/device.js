'use strict';

const Homey = require('homey');
const zlib = require('zlib');
const crypto = require('crypto');

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
  SELF_WASH_BASE:   { siid: 4, piid: 34 },
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
  CHILD_LOCK:       { siid: 4, piid: 27 },
  RESUME_CLEANING:  { siid: 4, piid: 11 },
  TIGHT_MOPPING:    { siid: 4, piid: 29 },
  SILENT_DRYING:    { siid: 28, piid: 27 },

  // Auto-switch settings (JSON key-value store for CleanGenius, route, etc.)
  AUTO_SWITCH_SETTINGS: { siid: 4, piid: 50 },
  // CleanGenius mode (vacuum&mop vs vacuum-then-mop)
  CLEANGENIUS_MODE: { siid: 28, piid: 5 },
  // Task type (standard/custom/smart/etc.)
  TASK_TYPE: { siid: 4, piid: 58 },

  // Enum settings
  CARPET_SENSITIVITY:   { siid: 4, piid: 28 },
  CARPET_CLEANING:      { siid: 4, piid: 36 },
  MOP_WASH_LEVEL:       { siid: 4, piid: 46 },
  DRYING_TIME:          { siid: 4, piid: 40 },
  VOLUME:               { siid: 7, piid: 1 },
  WATER_TEMPERATURE:    { siid: 28, piid: 8 },
  AUTO_EMPTY_FREQUENCY: { siid: 15, piid: 2 },
  MOP_PRESSURE:         { siid: 28, piid: 86 },

  // Read-only status
  CHARGING_STATUS:      { siid: 3, piid: 2 },
  DRYING_PROGRESS:      { siid: 4, piid: 64 },
  DRAINAGE_STATUS:      { siid: 4, piid: 60 },
  DETERGENT_STATUS:     { siid: 27, piid: 4 },
  HOT_WATER_STATUS:     { siid: 27, piid: 15 },
  DOCK_CLEANING_STATUS: { siid: 4, piid: 61 },

  // Substatus properties
  STATUS:               { siid: 4, piid: 1 },
  TASK_STATUS:          { siid: 4, piid: 7 },
  MOP_PAD_INSTALLED:    { siid: 4, piid: 53 },
  DUST_COLLECTION:      { siid: 15, piid: 3 },

  // Lifetime stats
  FIRST_CLEANING_DATE: { siid: 12, piid: 1 },
  TOTAL_CLEANED_AREA:  { siid: 12, piid: 4 },

  // Map data - cloud requires object name approach, not direct property read
  MAP_DATA: { siid: 6, piid: 1 },
  MAP_OBJECT_NAME: { siid: 6, piid: 2 },
  MAP_EXTEND_DATA: { siid: 6, piid: 3 },
  MAP_LIST: { siid: 6, piid: 39 },
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
  CLEAR_WARNING:    { siid: 4, aiid: 3 },
  START_WASHING:    { siid: 4, aiid: 4 },
  REQUEST_MAP:      { siid: 6, aiid: 1 },
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

// Carpet sensitivity mapping
const CARPET_SENSITIVITY_MAP = { low: 1, medium: 2, high: 3 };
const CARPET_SENSITIVITY_REVERSE = { 1: 'low', 2: 'medium', 3: 'high' };

// Carpet cleaning mode
const CARPET_CLEANING_MAP = { avoidance: 1, adaptation: 2, remove_mop: 3, vacuum_and_mop: 5, ignore: 6 };
const CARPET_CLEANING_REVERSE = { 1: 'avoidance', 2: 'adaptation', 3: 'remove_mop', 5: 'vacuum_and_mop', 6: 'ignore' };

// Mop wash level
const MOP_WASH_LEVEL_MAP = { deep: 0, daily: 1, water_saving: 2 };
const MOP_WASH_LEVEL_REVERSE = { 0: 'deep', 1: 'daily', 2: 'water_saving' };

// Water temperature
const WATER_TEMP_MAP = { normal: 0, mild: 1, warm: 2, hot: 3, max: 4 };
const WATER_TEMP_REVERSE = { 0: 'normal', 1: 'mild', 2: 'warm', 3: 'hot', 4: 'max' };

// Auto empty frequency
const AUTO_EMPTY_FREQ_MAP = { standard: 0, high: 1, low: 2, intelligent: 4 };
const AUTO_EMPTY_FREQ_REVERSE = { 0: 'standard', 1: 'high', 2: 'low', 4: 'intelligent' };

// Mop pressure
const MOP_PRESSURE_MAP = { light: 0, normal: 1 };
const MOP_PRESSURE_REVERSE = { 0: 'light', 1: 'normal' };

// Charging status
const CHARGING_STATUS_MAP = { 1: 'charging', 2: 'not_charging', 3: 'completed', 5: 'returning' };

// Drainage status
const DRAINAGE_STATUS_MAP = { 0: 'idle', 1: 'draining', 2: 'completed', 3: 'failed' };

// Detergent status
const DETERGENT_STATUS_MAP = { 0: 'installed', 1: 'disabled', 2: 'low' };

// Hot water status
const HOT_WATER_STATUS_MAP = { 0: 'disabled', 1: 'enabled' };

// Dock cleaning status
const DOCK_CLEANING_STATUS_MAP = { 0: 'idle', 1: 'cleaning', 2: 'drying' };

// Vacuum substatus (siid:4, piid:1)
const STATUS_REVERSE = {
  0: 'Idle', 1: 'Paused', 2: 'Cleaning', 3: 'Returning', 4: 'Part Cleaning',
  5: 'Follow Wall', 6: 'Charging', 7: 'OTA', 12: 'Error', 13: 'Remote Control',
  14: 'Sleeping', 17: 'Standby', 18: 'Segment Cleaning', 19: 'Zone Cleaning',
  20: 'Spot Cleaning', 21: 'Fast Mapping', 22: 'Cruising Path', 23: 'Cruising Point',
  24: 'Summon Clean', 25: 'Shortcut', 26: 'Person Follow', 1501: 'Water Check',
};

// Task status (siid:4, piid:7)
const TASK_STATUS_REVERSE = {
  0: 'Completed', 1: 'Auto Cleaning', 2: 'Zone Cleaning', 3: 'Segment Cleaning',
  4: 'Spot Cleaning', 5: 'Fast Mapping', 6: 'Auto Cleaning Paused',
  7: 'Zone Cleaning Paused', 8: 'Segment Cleaning Paused', 9: 'Spot Cleaning Paused',
  20: 'Cruising Path', 21: 'Cruising Path Paused', 22: 'Cruising Point',
  25: 'Returning Install Mop', 26: 'Returning Remove Mop', 27: 'Station Cleaning',
};

// Dust collection availability (siid:15, piid:3)
const DUST_COLLECTION_MAP = { 0: 'not_available', 1: 'available', 2: 'overuse', 3: 'never' };

// Prop key to capability mapping for probe-based removal
const PROP_TO_CAPABILITY = {
  '4-27': 'dreame_child_lock',
  '4-11': 'dreame_resume_cleaning',
  '4-29': 'dreame_tight_mopping',
  '28-27': 'dreame_silent_drying',
  '4-28': 'dreame_carpet_sensitivity',
  '4-36': 'dreame_carpet_cleaning',
  '4-46': 'dreame_mop_wash_level',
  '4-40': 'dreame_drying_time',
  '7-1': 'dreame_volume',
  '28-8': 'dreame_water_temperature',
  '15-2': 'dreame_auto_empty_frequency',
  '28-86': 'dreame_mop_pressure',
  '3-2': 'dreame_charging_status',
  '4-64': 'dreame_drying_progress',
  '4-60': 'dreame_drainage_status',
  '27-4': 'dreame_detergent_status',
  '27-15': 'dreame_hot_water_status',
  '4-61': 'dreame_dock_cleaning_status',
  '12-4': 'dreame_total_cleaned_area',
  '4-1': 'dreame_status',
  '4-7': 'dreame_task_status',
  '4-53': 'dreame_mop_pad_installed',
  '15-3': 'dreame_dust_collection_available',
};

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

// Adaptive polling intervals (ms)
const POLL_FAST = 5000;        // MQTT disconnected (fallback)
const POLL_ACTIVE = 15000;     // MQTT connected + cleaning (backup)
const POLL_IDLE = 60000;       // MQTT connected + idle (safety net)
const MQTT_STALE_MS = 120000;  // If no MQTT message for 2min during cleaning, fall back to fast poll
const MAP_REFRESH_INTERVAL = 600000; // 10min — periodic map refresh via HTTP when MQTT is down
const MQTT_RESTART_DELAY = 1800000;  // 30min — full MQTT restart after giving up
const TOKEN_REFRESH_MARGIN = 100;    // seconds before expiry to proactively refresh (matches ioBroker)

// Segment/room type names from Dreame protocol
const SEGMENT_TYPE_NAMES = {
  0: 'Room', 1: 'Living Room', 2: 'Primary Bedroom', 3: 'Study',
  4: 'Kitchen', 5: 'Dining Hall', 6: 'Bathroom', 7: 'Balcony',
  8: 'Corridor', 9: 'Utility Room', 10: 'Closet', 11: 'Meeting Room',
  12: 'Office', 13: 'Fitness Area', 14: 'Recreation Area', 15: 'Secondary Bedroom',
};

// Map data header size (27 bytes: map_id, frame_id, frame_type, robot/charger pos, grid, width, height, left, top)
const MAP_HEADER_SIZE = 27;

// AES-CBC IV for map decryption, keyed by model suffix (from Tasshack DEVICE_INFO)
const MODEL_MAP_IV = {
  qFKhvoAqRFTPfKN6: ['r2209'],
  OFULk9To37qRdXY3: ['c102cn', 'c102gl', 'd103cn', 'd110ch', 'r2210'],
  dndRQ3z8ACjDdDMo: ['r2211o'],
  NRwnBj5FsNPgBNbT: null, // Default IV for most modern models (r2212+, r2235+, r2253*, r2449*, etc.)
  '4sCv3Q2BtbWVBIB2': ['r2216o'],
  ojxGnogHfVuefVfx: ['r2240'],
  '3F0ji4ufBMaH1ThM': ['r2243', 'r2312', 'r2312a', 'r2328', 'r2380', 'r2380r', 'r2388', 'r2422', 'r2422a', 'r2422b', 'r2422c', 'r2458a', 'r2458h', 'r2459a', 'r2459h', 'r2459k', 'r2459r', 'r2463r', 'r2478r', 'r2478v', 'r2479r', 'r2490', 'r2491', 'r2491a', 'r2491b', 'r2491d', 'r2493', 'r2493a', 'r2497'],
  nf3Zi2Mq8jD5AAOm: ['r2250'],
  FmnfaI2pbem0k75t: ['r2251a', 'r2251o', 'r2257o', 'r2317', 'r2345a', 'r2345h', 'r2363', 'r2363a', 'r2363n', 'r2364', 'r2364a', 'r2382a', 'r2382k', 'r2382r', 'r2383a', 'r2383k', 'r2386', 'r2471', 'r2563b', 'r2563v'],
  wRy05fYLQJMRH6Mj: ['r2254'],
  '8qnS9dqgT3CppGe1': ['p2140', 'p2140a', 'p2140o', 'p2140p', 'p2140q'],
  '6PFiLPYMHLylp7RR': ['p2114a', 'p2114o'],
  RNO4p35b2QKaovHC: ['p2149o'],
};

/**
 * Get the AES-CBC IV for a given vacuum model suffix.
 * Returns the IV string (16 chars) or null if no IV needed.
 */
function getMapIvForModel(model) {
  if (!model) return null;
  const suffix = model.replace('dreame.vacuum.', '');
  // Check specific model lists first
  for (const [iv, models] of Object.entries(MODEL_MAP_IV)) {
    if (models === null) continue; // Skip the default entry
    if (models.includes(suffix)) return iv;
  }
  // Default IV for modern models (r2212+) that use encryption
  return 'NRwnBj5FsNPgBNbT';
}

/**
 * Parse room/segment info from raw MAP_DATA property value.
 * MAP_DATA is base64 (URL-safe), optionally AES-encrypted, zlib-compressed.
 * After the binary image pixels there's a JSON object with seg_inf (segment info).
 */
function extractRoomsFromSegInf(segInf, log) {
  const rooms = [];
  // Parse room info from seg_inf entries

  for (const [idStr, info] of Object.entries(segInf)) {
    const id = parseInt(idStr, 10);
    if (isNaN(id) || id <= 0) continue;

    const type = info.type !== undefined ? info.type : 0;
    const index = info.index !== undefined ? info.index : 0;

    let customName = null;
    if (info.name) {
      try {
        customName = Buffer.from(info.name, 'base64').toString('utf8');
      } catch {
        customName = null;
      }
    }

    let name;
    if (customName) {
      name = customName;
    } else if (type !== 0 && SEGMENT_TYPE_NAMES[type]) {
      name = SEGMENT_TYPE_NAMES[type];
      if (index > 0) name = `${name} ${index + 1}`;
    } else {
      name = `Room ${id}`;
    }

    rooms.push({ id, name, customName, type, index });
  }

  rooms.sort((a, b) => a.id - b.id);
  // Rooms parsed successfully
  return rooms;
}

function parseMapRooms(raw, logger, aesKey, modelIv) {
  const log = logger || (() => {});
  if (!raw || raw === '') {
    return [];
  }

  try {
    let mapStr = String(raw);

    // URL-safe base64 → standard base64
    mapStr = mapStr.replace(/_/g, '/').replace(/-/g, '+');

    // Key may be appended after comma (inline MQTT data)
    if (!aesKey && mapStr.includes(',')) {
      const parts = mapStr.split(',');
      mapStr = parts[0];
      aesKey = parts[1];
    }

    let buf = Buffer.from(mapStr, 'base64');
    log(`[MAP] Raw buffer: ${buf.length} bytes, hasKey: ${!!aesKey}`);

    // AES-256-CBC decrypt if key is present
    if (aesKey) {
      try {
        const keyHash = crypto.createHash('sha256').update(aesKey).digest('hex').substring(0, 32);
        // IV from model-specific lookup (16-char string → 16 bytes UTF-8)
        const iv = modelIv ? Buffer.from(modelIv, 'utf8') : Buffer.alloc(16, 0);
        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(keyHash, 'utf8'), iv);
        decipher.setAutoPadding(true);
        buf = Buffer.concat([decipher.update(buf), decipher.final()]);
        log(`[MAP] AES decrypted: ${buf.length} bytes`);
      } catch (e) {
        log(`[MAP] AES decrypt failed: ${e.message}, trying without`);
        buf = Buffer.from(mapStr, 'base64');
      }
    }

    // Zlib decompress (try zlib format first, then raw deflate)
    try {
      buf = zlib.inflateSync(buf);
    } catch (e1) {
      try {
        buf = zlib.inflateRawSync(buf);
      } catch (e2) {
        log(`[MAP] Inflate failed: ${e1.message}`);
        return [];
      }
    }

    if (buf.length < MAP_HEADER_SIZE) {
      log(`[MAP] Buffer too small: ${buf.length} < ${MAP_HEADER_SIZE}`);
      return [];
    }

    const width = buf.readInt16LE(19);
    const height = buf.readInt16LE(21);
    const imageSize = MAP_HEADER_SIZE + (width * height);
    log(`[MAP] Decoded: ${width}x${height}, buf=${buf.length}, imageSize=${imageSize}`);

    if (buf.length <= imageSize) {
      log(`[MAP] No JSON after pixels (buf=${buf.length} <= imageSize=${imageSize})`);
      return [];
    }

    const jsonStr = buf.slice(imageSize).toString('utf8');
    const dataJson = JSON.parse(jsonStr);
    const jsonKeys = Object.keys(dataJson).join(',');
    log(`[MAP] JSON keys: ${jsonKeys}`);

    const frameMap = !!(dataJson.fsm && dataJson.fsm === 1);
    const savedMapStatus = dataJson.ris !== undefined ? dataJson.ris : -1;
    const frameType = buf.readUInt8(4); // 73=I-frame, 80=P-frame
    const isSavedMap = frameType === 73 && !frameMap && savedMapStatus === -1
      && !dataJson.rpur && !dataJson.iscleanlog;

    // Extract segment IDs from pixel data first (matching Tasshack approach)
    const segmentIds = new Set();
    const pixelData = buf.slice(MAP_HEADER_SIZE, MAP_HEADER_SIZE + (width * height));

    if (frameMap) {
      // Frame map: segment_id = pixel >> 2 (63=wall, 62=floor, 61=unknown)
      for (let i = 0; i < pixelData.length; i++) {
        const pixel = pixelData[i];
        if (pixel > 0) {
          const segId = pixel >> 2;
          if (segId > 0 && segId < 61) segmentIds.add(segId);
        }
      }
    } else if (savedMapStatus !== 1 && savedMapStatus !== 0) {
      // Saved map / normal I-frame: segment_id = pixel & 0x3F, bit 7 = wall
      for (let i = 0; i < pixelData.length; i++) {
        const pixel = pixelData[i];
        if (pixel > 0 && !(pixel >> 7)) {
          const segId = pixel & 0x3F;
          if (segId > 0) segmentIds.add(segId);
        }
      }
    }

    // Build rooms from pixel segments, then enrich with seg_inf metadata
    if (segmentIds.size > 0 && segmentIds.size < 61) {
      const segInf = dataJson.seg_inf || {};
      log(`[MAP] Pixel segments: ${segmentIds.size}, seg_inf entries: ${Object.keys(segInf).length}`);
      const rooms = [...segmentIds].sort((a, b) => a - b).map(id => {
        const info = segInf[String(id)] || {};
        const type = info.type !== undefined ? info.type : 0;
        const index = info.index !== undefined ? info.index : 0;
        let customName = null;
        if (info.name) {
          try { customName = Buffer.from(info.name, 'base64').toString('utf8'); } catch { /* ignore */ }
        }
        let name;
        if (customName) {
          name = customName;
        } else if (type !== 0 && SEGMENT_TYPE_NAMES[type]) {
          name = SEGMENT_TYPE_NAMES[type];
          if (index > 0) name = `${name} ${index + 1}`;
        } else {
          name = `Room ${id}`;
        }
        return { id, name, customName, type, index };
      });
      return rooms;
    }

    // If no pixels had segments, try seg_inf directly
    if (dataJson.seg_inf) {
      const rooms = extractRoomsFromSegInf(dataJson.seg_inf, log);
      log(`[MAP] seg_inf found: ${Object.keys(dataJson.seg_inf).length} entries, ${rooms.length} rooms`);
      if (rooms.length > 0) return rooms;
    }

    // Check for nested saved map in 'rism' key
    if (dataJson.rism) {
      log(`[MAP] Recursing into rism (${String(dataJson.rism).length} chars)`);
      const nestedRooms = parseMapRooms(dataJson.rism, log);
      if (nestedRooms.length > 0) return nestedRooms;
    }

    return [];
  } catch (e) {
    log(`[MAP] Parse error: ${e.message}`);
    return [];
  }
}

class DreameVacuumDevice extends Homey.Device {

  async onInit() {
    this._did = this.getData().id;
    this._bindDomain = this.getStoreValue('bindDomain') || '';
    this._pollInterval = null;
    this._lastCommandTime = 0;
    this._pollCycle = 0;
    this._forceNextPoll = false;
    this._lastTriggeredError = null;
    this._consumableLowNotified = {};
    this._rooms = this.getStoreValue('rooms') || [];
    this._cleaningRoomIds = [];
    this._mqttConnected = false;
    this._lastMqttMessage = 0;
    this._currentPollInterval = POLL_FAST;
    this._mqttListeners = null; // track our own listeners for cleanup
    this._mapRefreshTimer = null;
    this._mqttRetryTimer = null; // track connect retry timer
    this._mqttRestartTimer = null; // track full restart timer
    this._refreshingToken = false; // guard concurrent token refresh

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
        await this.addCapability(cap);
      }
    }

    // Probeable capabilities: added initially, removed after probe if unsupported
    const probeableCapabilities = [
      'dreame_child_lock', 'dreame_resume_cleaning', 'dreame_tight_mopping',
      'dreame_silent_drying', 'dreame_carpet_sensitivity', 'dreame_carpet_cleaning',
      'dreame_mop_wash_level', 'dreame_drying_time', 'dreame_volume',
      'dreame_water_temperature', 'dreame_auto_empty_frequency', 'dreame_mop_pressure',
      'dreame_charging_status', 'dreame_drying_progress', 'dreame_drainage_status',
      'dreame_detergent_status', 'dreame_hot_water_status', 'dreame_dock_cleaning_status',
      'dreame_total_cleaned_area',
      'dreame_status', 'dreame_task_status', 'dreame_mop_pad_installed',
      'dreame_dust_collection_available',
    ];
    for (const cap of probeableCapabilities) {
      if (!this.hasCapability(cap)) {
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

    // Listeners for new probeable writable capabilities
    if (this.hasCapability('dreame_child_lock')) {
      this.registerCapabilityListener('dreame_child_lock', this._onChildLock.bind(this));
    }
    if (this.hasCapability('dreame_resume_cleaning')) {
      this.registerCapabilityListener('dreame_resume_cleaning', this._onResumeCleaning.bind(this));
    }
    if (this.hasCapability('dreame_tight_mopping')) {
      this.registerCapabilityListener('dreame_tight_mopping', this._onTightMopping.bind(this));
    }
    if (this.hasCapability('dreame_silent_drying')) {
      this.registerCapabilityListener('dreame_silent_drying', this._onSilentDrying.bind(this));
    }
    if (this.hasCapability('dreame_carpet_sensitivity')) {
      this.registerCapabilityListener('dreame_carpet_sensitivity', this._onCarpetSensitivity.bind(this));
    }
    if (this.hasCapability('dreame_carpet_cleaning')) {
      this.registerCapabilityListener('dreame_carpet_cleaning', this._onCarpetCleaning.bind(this));
    }
    if (this.hasCapability('dreame_mop_wash_level')) {
      this.registerCapabilityListener('dreame_mop_wash_level', this._onMopWashLevel.bind(this));
    }
    if (this.hasCapability('dreame_drying_time')) {
      this.registerCapabilityListener('dreame_drying_time', this._onDryingTime.bind(this));
    }
    if (this.hasCapability('dreame_volume')) {
      this.registerCapabilityListener('dreame_volume', this._onVolume.bind(this));
    }
    if (this.hasCapability('dreame_water_temperature')) {
      this.registerCapabilityListener('dreame_water_temperature', this._onWaterTemperature.bind(this));
    }
    if (this.hasCapability('dreame_auto_empty_frequency')) {
      this.registerCapabilityListener('dreame_auto_empty_frequency', this._onAutoEmptyFrequency.bind(this));
    }
    if (this.hasCapability('dreame_mop_pressure')) {
      this.registerCapabilityListener('dreame_mop_pressure', this._onMopPressure.bind(this));
    }

    // Fetch bindDomain if not stored
    if (!this._bindDomain) {
      await this._fetchBindDomain();
    }

    // Start polling (HTTP as primary on Cloud, fallback on Local)
    this.restartPolling();

    // Connect MQTT for real-time updates (Local platform only — Cloud lacks raw socket support)
    if (this.homey.platform === 'local') {
      this._connectMqtt();
    }
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

  /**
   * Send diagnostic log to Sentry when user has opted in.
   * @param {'debug'|'info'|'warning'|'error'|'fatal'} level
   */
  _diag(message, extra, level = 'info') {
    this.homey.app.sendDiagnostic(message, {
      ...extra,
      did: this._did,
      model: this.getStoreValue('model') || 'unknown',
    }, level);
  }

  /**
   * Send error to Sentry when user has opted in.
   * @param {'warning'|'error'|'fatal'} level
   */
  _diagError(err, extra, level = 'error') {
    this.homey.app.sendError(err, {
      ...extra,
      did: this._did,
      model: this.getStoreValue('model') || 'unknown',
    }, level);
  }

  _getApi() {
    const api = this.homey.app.getApi();
    if (!api) {
      throw new Error('API not initialized. Please repair the device.');
    }
    return api;
  }

  /**
   * Connect to Dreame MQTT broker for real-time property updates.
   */
  async _connectMqtt() {
    try {
      const api = this.homey.app.getApi();
      if (!api) {
        return;
      }

      // Ensure we have a valid token and uid
      if (!api.accessToken || !api.uid) {
        await api.login();
        this.homey.app.saveUid(api.uid);
      }

      const uid = api.uid;
      const region = api.region || api.country || this.homey.settings.get('country') || 'eu';
      const model = this.getStoreValue('model') || '';

      if (!uid || !api.accessToken || !this._bindDomain) {
        this._mqttRetryTimer = this.homey.setTimeout(() => this._connectMqtt(), 15000);
        return;
      }

      const mqttClient = this.homey.app.getMqtt();

      // Remove previous listeners from this device (prevent leaks)
      this._removeMqttListeners(mqttClient);

      // Create bound listeners we can track and remove later
      const listeners = {
        properties: (did, params) => {
          if (did === this._did || !did) {
            this._handleMqttProperties(params);
          }
        },
        connected: () => {
          this._mqttConnected = true;
          this._lastMqttMessage = Date.now();
          const cachedRooms = this._rooms ? this._rooms.length : 0;
          this._diag(`[MQTT] Connected, ${cachedRooms} cached rooms`, null, 'info');
          this._adjustPolling();
          this._stopMapRefreshTimer();
          this._requestMapViaMqtt();

          // If no 6-3 arrives within 60s, log it and try HTTP fallback
          this._mapResponseTimeout = this.homey.setTimeout(() => {
            if (!this._rooms || this._rooms.length === 0) {
              this._diag('[MAP] No 6-3 received after 60s, trying HTTP fallback', null, 'warning');
              this._refreshMapViaHttp().catch(() => {});
            }
          }, 60000);
        },
        disconnected: () => {
          this._mqttConnected = false;
          this._diag('[MQTT] Disconnected', null, 'warning');
          this._adjustPolling();
          this._startMapRefreshTimer();
        },
        auth_error: () => {
          this.log('[MQTT] Auth error — refreshing token');
          this._diag('[MQTT] Auth error', null, 'error');
          this._mqttConnected = false;
          this._adjustPolling();
          this._handleMqttAuthError();
        },
        gave_up: () => {
          this.log('[MQTT] Gave up reconnecting — relying on HTTP polling, will retry in 30min');
          this._diag('[MQTT] Gave up reconnecting', null, 'fatal');
          this._mqttConnected = false;
          this._adjustPolling();
          this._startMapRefreshTimer();
          this._scheduleMqttRestart();
        },
      };
      this._mqttListeners = { client: mqttClient, listeners };

      mqttClient.on('properties', listeners.properties);
      mqttClient.on('connected', listeners.connected);
      mqttClient.on('disconnected', listeners.disconnected);
      mqttClient.on('auth_error', listeners.auth_error);
      mqttClient.on('gave_up', listeners.gave_up);

      this._diag('[MQTT] Connecting', { uid, model, region, broker: this._bindDomain }, 'debug');
      await mqttClient.connect({
        uid,
        accessToken: api.accessToken,
        bindDomain: this._bindDomain,
        did: this._did,
        model,
        country: region,
      });

      // Start proactive token refresh to prevent auth expiry
      this._startTokenRefreshTimer();
    } catch (e) {
      this.error('[MQTT] Connect error:', e.message);
      this._diagError(e, { context: 'mqtt_connect' });
      this._startMapRefreshTimer();
      this._mqttRetryTimer = this.homey.setTimeout(() => this._connectMqtt(), 30000);
    }
  }

  _cancelMqttRetryTimer() {
    if (this._mqttRetryTimer) {
      this.homey.clearTimeout(this._mqttRetryTimer);
      this._mqttRetryTimer = null;
    }
  }

  /**
   * Schedule a full MQTT restart after giving up.
   * Fresh login + reconnect attempt after 30 minutes.
   */
  _scheduleMqttRestart() {
    this._cancelMqttRestartTimer();
    this._mqttRestartTimer = this.homey.setTimeout(() => {
      this._mqttRestartTimer = null;
      this.log('[MQTT] Attempting full restart after cooldown');
      this._restartMqtt();
    }, MQTT_RESTART_DELAY);
  }

  _cancelMqttRestartTimer() {
    if (this._mqttRestartTimer) {
      this.homey.clearTimeout(this._mqttRestartTimer);
      this._mqttRestartTimer = null;
    }
  }

  /**
   * Start proactive token refresh timer.
   * Refreshes token before expiry to prevent auth failures on MQTT and API.
   * Matches ioBroker pattern: setInterval((expires_in - 100) * 1000).
   */
  _startTokenRefreshTimer() {
    this._stopTokenRefreshTimer();
    const api = this.homey.app.getApi();
    if (!api || !api.tokenExpiry) return;

    const msUntilRefresh = api.tokenExpiry - Date.now() - (TOKEN_REFRESH_MARGIN * 1000);
    const delay = Math.max(msUntilRefresh, 60000); // At least 1 minute
    this._diag(`[TOKEN] Proactive refresh scheduled in ${Math.round(delay / 1000)}s`, null, 'debug');

    this._tokenRefreshTimer = this.homey.setTimeout(async () => {
      this._tokenRefreshTimer = null;
      try {
        const currentApi = this.homey.app.getApi();
        if (!currentApi) return;
        this._diag('[TOKEN] Proactive refresh triggered', null, 'debug');
        await currentApi.refreshAccessToken();
        this.homey.app.saveUid(currentApi.uid);
        // MQTT gets new token via onTokenUpdate → updateToken
        // Schedule next refresh
        this._startTokenRefreshTimer();
      } catch (e) {
        this.error('[TOKEN] Proactive refresh failed:', e.message);
        // Retry in 5 minutes
        this._tokenRefreshTimer = this.homey.setTimeout(() => {
          this._tokenRefreshTimer = null;
          this._startTokenRefreshTimer();
        }, 300000);
      }
    }, delay);
  }

  _stopTokenRefreshTimer() {
    if (this._tokenRefreshTimer) {
      this.homey.clearTimeout(this._tokenRefreshTimer);
      this._tokenRefreshTimer = null;
    }
  }

  /**
   * Full MQTT restart: fresh login, new connection from scratch.
   */
  async _restartMqtt() {
    try {
      const api = this.homey.app.getApi();
      if (!api) return;

      // Fresh login to get new tokens
      await api.login();
      this.homey.app.saveUid(api.uid);

      // Re-fetch bindDomain in case it changed
      await this._fetchBindDomain();

      // Clean up old listeners and reconnect
      const mqttClient = this.homey.app.getMqtt();
      this._removeMqttListeners(mqttClient);
      this._stopMapRefreshTimer();

      await this._connectMqtt();
      this.log('[MQTT] Full restart succeeded');
    } catch (e) {
      this.error('[MQTT] Full restart failed:', e.message);
      this._diagError(e, { context: 'mqtt_restart' });
      // Schedule another attempt
      this._scheduleMqttRestart();
    }
  }

  /**
   * Remove our own MQTT listeners without affecting other devices.
   */
  _removeMqttListeners(mqttClient) {
    if (this._mqttListeners) {
      const { client, listeners } = this._mqttListeners;
      const target = mqttClient || client;
      if (target) {
        for (const [event, fn] of Object.entries(listeners)) {
          target.removeListener(event, fn);
        }
      }
      this._mqttListeners = null;
    }
  }

  /**
   * Handle MQTT auth error — refresh token and reconnect.
   */
  async _handleMqttAuthError() {
    if (this._refreshingToken) return; // prevent concurrent refresh
    this._refreshingToken = true;
    try {
      const api = this.homey.app.getApi();
      if (!api) return;
      await api.login();
      this.homey.app.saveUid(api.uid);
      // updateToken triggers reconnect with fresh credentials
      const mqttClient = this.homey.app.getMqtt();
      mqttClient.updateToken(api.accessToken);
    } catch (e) {
      this.error('[MQTT] Token refresh failed:', e.message);
      this._diagError(e, { context: 'mqtt_token_refresh' });
      // Polling continues as fallback
    } finally {
      this._refreshingToken = false;
    }
  }

  /**
   * Start periodic map refresh via HTTP when MQTT is unavailable.
   */
  _startMapRefreshTimer() {
    if (this._mapRefreshTimer) return;
    this._mapRefreshTimer = this.homey.setInterval(() => {
      this._refreshMapViaHttp();
    }, MAP_REFRESH_INTERVAL);
  }

  _stopMapRefreshTimer() {
    if (this._mapRefreshTimer) {
      this.homey.clearInterval(this._mapRefreshTimer);
      this._mapRefreshTimer = null;
    }
  }

  /**
   * Refresh map data via HTTP API as fallback when MQTT is down.
   */
  async _refreshMapViaHttp() {
    try {
      const api = this.homey.app.getApi();
      if (!api) return;

      this._diag('[MAP] HTTP fallback: requesting map via API', null, 'debug');

      // Request map — the response comes via the cloud API
      await api.callAction(
        this._did, this._bindDomain,
        ACTION.REQUEST_MAP.siid, ACTION.REQUEST_MAP.aiid,
        [{ piid: 2, value: '{}' }],
      );

      // Try to download map using last known object name
      const objectName = this.getStoreValue('mapObjectName');
      if (objectName) {
        this._diag(`[MAP] HTTP fallback: downloading with cached path`, null, 'debug');
        await this._downloadMapData(objectName);
      } else {
        this._diag('[MAP] HTTP fallback: no cached map path available', null, 'warning');
      }
    } catch (e) {
      this._diag(`[MAP] HTTP fallback error: ${e.message}`, null, 'warning');
    }
  }

  /**
   * Request map data via the REQUEST_MAP action after MQTT connects.
   * The device will push MAP_DATA via MQTT in response.
   */
  async _requestMapViaMqtt() {
    try {
      const mqttClient = this.homey.app.getMqtt();
      if (!mqttClient || !mqttClient.connected) {
        this._diag('[MAP] Skipping map request — MQTT not connected', null, 'debug');
        return;
      }
      this._diag('[MAP] Requesting map via ACTION 6-1', null, 'debug');
      const api = this._getApi();
      const result = await api.callAction(
        this._did, this._bindDomain,
        ACTION.REQUEST_MAP.siid, ACTION.REQUEST_MAP.aiid,
        [{ piid: 2, value: '{}' }],
      );
      this._diag('[MAP] Map request sent', { result: JSON.stringify(result).slice(0, 200) }, 'debug');
      // Map data will arrive via MQTT property 6-3
    } catch (e) {
      this._diag(`[MAP] Map request error: ${e.message}`, null, 'error');
    }
  }

  /**
   * Download map data from Dreame cloud using the object path from MQTT 6-3.
   */
  async _downloadMapData(objectName) {
    // Some models append an encryption key after a comma (e.g. "ali_dreame/.../0,key")
    let filePath = objectName;
    let mapKey = null;
    if (objectName && objectName.includes(',')) {
      const parts = objectName.split(',');
      filePath = parts[0];
      mapKey = parts[1];
    }

    const api = this._getApi();
    const model = this.getStoreValue('model') || '';
    const buffer = await api.getMapData(this._did, filePath, model);

    const mapStr = buffer.toString('utf8');
    const parseLogger = (msg) => { this._diag(msg, null, 'debug'); };
    const modelIv = getMapIvForModel(model);
    const rooms = parseMapRooms(mapStr, parseLogger, mapKey, modelIv);
    this._diag(`[MAP] Parsed ${rooms.length} rooms from map data`, null, 'debug');
    if (rooms.length > 0) {
      this._rooms = rooms;
      this.setStoreValue('rooms', rooms).catch(this.error);
    }

    // Cache map data for future widget use (object name + dimensions)
    // Append encryption key after comma so app.js _decodeMapData can decrypt
    this.setStoreValue('mapObjectName', objectName).catch(this.error);
    this.setStoreValue('mapRawBase64', mapKey ? mapStr + ',' + mapKey : mapStr).catch(this.error);
  }

  /**
   * Handle property updates received via MQTT.
   * Routes all properties through the same _applyProperty handler as polling.
   */
  _handleMqttProperties(params) {
    this._lastMqttMessage = Date.now();
    const propKeys = params.map(p => `${p.siid}-${p.piid}`).join(',');
    this._diag(`[MQTT:IN] ${params.length} props: ${propKeys}`, null, 'debug');

    for (const p of params) {
      const key = `${p.siid}-${p.piid}`;
      const value = p.value;

      // MQTT 6-1 sends P-frame map updates (partial pixel data for real-time position).
      // These are NOT complete maps — they lack seg_inf/rism and have unstable pixel segments.
      // Room discovery comes from 6-3 cloud download (full saved map with seg_inf).
      // Only use 6-1 for rooms if we have zero cached rooms (bootstrap fallback).
      if (key === '6-1' && value) {
        if (!this._rooms || this._rooms.length === 0) {
          const rooms = parseMapRooms(value, (msg) => { this._diag(msg, null, 'debug'); });
          if (rooms.length > 0) {
            this._diag(`[MAP] Bootstrap rooms from 6-1 P-frame: ${rooms.length} segments`, null, 'debug');
            this._rooms = rooms;
            this.setStoreValue('rooms', rooms).catch(this.error);
          }
        }
        continue;
      }

      // Handle map object name from MQTT - download the actual map data
      if (key === '6-3' && value) {
        if (this._mapResponseTimeout) {
          this.homey.clearTimeout(this._mapResponseTimeout);
          this._mapResponseTimeout = null;
        }
        this._diag(`[MAP] Got object path via MQTT 6-3: ${String(value).slice(0, 100)}`, null, 'debug');
        this._downloadMapData(value).catch(e => {
          this._diag(`[MAP] Download error: ${e.message}`, null, 'error');
          this._diagError(e, { context: 'mqtt_map_download' });
        });
        continue;
      }

      // Route all other properties through shared handler
      this._applyProperty(key, value);
    }

    // Adjust polling speed based on new state
    this._adjustPolling();
  }

  /**
   * Apply a single property update to capabilities.
   * Shared between MQTT push and HTTP poll — single source of truth.
   */
  async _applyProperty(key, value) {
    switch (key) {
      case '2-1': // STATE
        if (STATE_MAP[value]) {
          const homeyState = STATE_MAP[value];
          await this.setCapabilityValue('vacuumcleaner_state', homeyState).catch(this.error);
          await this.setCapabilityValue('onoff', homeyState === 'cleaning').catch(this.error);
          if (homeyState !== 'cleaning' && this._cleaningRoomIds.length > 0) {
            this._fireRoomFinishedTriggers();
          }
        }
        break;

      case '2-2': { // ERROR
        const isRealError = value !== 0 && !DOCK_INFO_CODES.has(value);
        if (value === 0 || DOCK_INFO_CODES.has(value)) {
          await this.setCapabilityValue('dreame_error', 'None').catch(this.error);
        } else {
          const errorText = ERROR_CODES[value] || `Unknown error (${value})`;
          await this.setCapabilityValue('dreame_error', errorText).catch(this.error);
        }
        if (isRealError && this._lastTriggeredError !== value) {
          this._lastTriggeredError = value;
          const errorText = ERROR_CODES[value] || `Unknown error (${value})`;
          const errorCard = this.homey.flow.getDeviceTriggerCard('dreame_error_occurred');
          await errorCard.trigger(this, { error: errorText }).catch(e => this.error('Trigger error:', e));
        } else if (!isRealError) {
          this._lastTriggeredError = null;
        }
        break;
      }

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
        }
        break;

      case '4-5': // WATER_VOLUME
        if (WATER_VOLUME_REVERSE[value] !== undefined) {
          await this.setCapabilityValue('dreame_water_volume', WATER_VOLUME_REVERSE[value]).catch(this.error);
        }
        break;

      case '4-23': { // CLEANING_MODE (may be grouped value)
        const currentState = this.getCapabilityValue('vacuumcleaner_state');
        const isCleaning = currentState === 'cleaning';
        if (value > 255) {
          const grouped = splitGroupedMode(value);
          this._isGroupedMode = true;
          this._groupedModeRaw = value;
          if (CLEANING_MODE_REVERSE[grouped.mode] !== undefined) {
            if (isCleaning || !this.getCapabilityValue('dreame_cleaning_mode')) {
              await this.setCapabilityValue('dreame_cleaning_mode', CLEANING_MODE_REVERSE[grouped.mode]).catch(this.error);
            }
          }
          if (this.hasCapability('dreame_mop_wash_frequency')) {
            const freq = MOP_WASH_FREQ_REVERSE[grouped.washFreq];
            if (freq !== undefined) {
              await this.setCapabilityValue('dreame_mop_wash_frequency', freq).catch(this.error);
            }
          }
        } else {
          this._isGroupedMode = false;
          if (CLEANING_MODE_REVERSE[value] !== undefined) {
            if (isCleaning || !this.getCapabilityValue('dreame_cleaning_mode')) {
              await this.setCapabilityValue('dreame_cleaning_mode', CLEANING_MODE_REVERSE[value]).catch(this.error);
            }
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

      case '4-41': // LOW_WATER_WARNING (handled via 27-1)
        break;

      case '4-50': { // AUTO_SWITCH_SETTINGS
        try {
          if (typeof value === 'string') {
            const settings = JSON.parse(value);
            const settingsMap = {};
            if (Array.isArray(settings)) {
              for (const s of settings) settingsMap[s.k] = s.v;
            } else if (settings.k) {
              settingsMap[settings.k] = settings.v;
            }
            if (settingsMap.SmartHost !== undefined && this.hasCapability('dreame_cleangenius')) {
              const cg = CLEANGENIUS_REVERSE[settingsMap.SmartHost];
              if (cg !== undefined) {
                await this.setCapabilityValue('dreame_cleangenius', cg).catch(this.error);
              }
            }
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
        if (CLEANGENIUS_MODE_REVERSE[value] !== undefined) {
          this._cleanGeniusMode = CLEANGENIUS_MODE_REVERSE[value];
        }
        break;

      case '4-58': // TASK_TYPE
        this._taskType = value;
        break;

      case '4-27': // CHILD_LOCK
        await this.setCapabilityValue('dreame_child_lock', !!value).catch(this.error);
        break;

      case '4-11': // RESUME_CLEANING
        await this.setCapabilityValue('dreame_resume_cleaning', !!value).catch(this.error);
        break;

      case '4-29': // TIGHT_MOPPING
        await this.setCapabilityValue('dreame_tight_mopping', !!value).catch(this.error);
        break;

      case '28-27': // SILENT_DRYING
        await this.setCapabilityValue('dreame_silent_drying', !!value).catch(this.error);
        break;

      case '4-28': // CARPET_SENSITIVITY
        if (CARPET_SENSITIVITY_REVERSE[value] !== undefined) {
          await this.setCapabilityValue('dreame_carpet_sensitivity', CARPET_SENSITIVITY_REVERSE[value]).catch(this.error);
        }
        break;

      case '4-36': // CARPET_CLEANING
        if (CARPET_CLEANING_REVERSE[value] !== undefined) {
          await this.setCapabilityValue('dreame_carpet_cleaning', CARPET_CLEANING_REVERSE[value]).catch(this.error);
        }
        break;

      case '4-46': // MOP_WASH_LEVEL
        if (MOP_WASH_LEVEL_REVERSE[value] !== undefined) {
          await this.setCapabilityValue('dreame_mop_wash_level', MOP_WASH_LEVEL_REVERSE[value]).catch(this.error);
        }
        break;

      case '4-40': // DRYING_TIME
        await this.setCapabilityValue('dreame_drying_time', value).catch(this.error);
        break;

      case '7-1': // VOLUME
        await this.setCapabilityValue('dreame_volume', value).catch(this.error);
        break;

      case '28-8': // WATER_TEMPERATURE
        if (WATER_TEMP_REVERSE[value] !== undefined) {
          await this.setCapabilityValue('dreame_water_temperature', WATER_TEMP_REVERSE[value]).catch(this.error);
        }
        break;

      case '15-2': // AUTO_EMPTY_FREQUENCY
        if (AUTO_EMPTY_FREQ_REVERSE[value] !== undefined) {
          await this.setCapabilityValue('dreame_auto_empty_frequency', AUTO_EMPTY_FREQ_REVERSE[value]).catch(this.error);
        }
        break;

      case '28-86': // MOP_PRESSURE
        if (MOP_PRESSURE_REVERSE[value] !== undefined) {
          await this.setCapabilityValue('dreame_mop_pressure', MOP_PRESSURE_REVERSE[value]).catch(this.error);
        }
        break;

      case '3-2': // CHARGING_STATUS
        if (CHARGING_STATUS_MAP[value] !== undefined) {
          await this.setCapabilityValue('dreame_charging_status', CHARGING_STATUS_MAP[value]).catch(this.error);
        }
        break;

      case '4-64': // DRYING_PROGRESS
        await this.setCapabilityValue('dreame_drying_progress', value || 0).catch(this.error);
        break;

      case '4-60': // DRAINAGE_STATUS
        if (DRAINAGE_STATUS_MAP[value] !== undefined) {
          await this.setCapabilityValue('dreame_drainage_status', DRAINAGE_STATUS_MAP[value]).catch(this.error);
        }
        break;

      case '27-4': // DETERGENT_STATUS
        if (DETERGENT_STATUS_MAP[value] !== undefined) {
          await this.setCapabilityValue('dreame_detergent_status', DETERGENT_STATUS_MAP[value]).catch(this.error);
        }
        break;

      case '27-15': // HOT_WATER_STATUS
        if (HOT_WATER_STATUS_MAP[value] !== undefined) {
          await this.setCapabilityValue('dreame_hot_water_status', HOT_WATER_STATUS_MAP[value]).catch(this.error);
        }
        break;

      case '4-61': // DOCK_CLEANING_STATUS
        if (DOCK_CLEANING_STATUS_MAP[value] !== undefined) {
          await this.setCapabilityValue('dreame_dock_cleaning_status', DOCK_CLEANING_STATUS_MAP[value]).catch(this.error);
        }
        break;

      case '4-1': // STATUS (cleaning substatus)
        if (STATUS_REVERSE[value] !== undefined) {
          await this.setCapabilityValue('dreame_status', STATUS_REVERSE[value]).catch(this.error);
        }
        break;

      case '4-7': // TASK_STATUS
        if (TASK_STATUS_REVERSE[value] !== undefined) {
          await this.setCapabilityValue('dreame_task_status', TASK_STATUS_REVERSE[value]).catch(this.error);
        }
        break;

      case '4-53': // MOP_PAD_INSTALLED
        await this.setCapabilityValue('dreame_mop_pad_installed', !!value).catch(this.error);
        break;

      case '15-3': // DUST_COLLECTION availability
        if (DUST_COLLECTION_MAP[value] !== undefined) {
          await this.setCapabilityValue('dreame_dust_collection_available', DUST_COLLECTION_MAP[value]).catch(this.error);
        }
        break;

      case '12-1': // FIRST_CLEANING_DATE (read-only, not mapped)
        break;

      case '12-4': // TOTAL_CLEANED_AREA
        await this.setCapabilityValue('dreame_total_cleaned_area', value).catch(this.error);
        break;
    }
  }

  /**
   * Compute the optimal poll interval based on MQTT connection state and device activity.
   */
  _getOptimalPollInterval() {
    if (!this._mqttConnected) return POLL_FAST;

    // If MQTT connected but stale during cleaning, use fast polling
    const isCleaning = this.getCapabilityValue('vacuumcleaner_state') === 'cleaning';
    if (isCleaning && this._lastMqttMessage > 0 && (Date.now() - this._lastMqttMessage) > MQTT_STALE_MS) {
      return POLL_FAST;
    }

    return isCleaning ? POLL_ACTIVE : POLL_IDLE;
  }

  /**
   * Adjust polling interval dynamically. Called when MQTT state or device state changes.
   */
  _adjustPolling() {
    const optimal = this._getOptimalPollInterval();
    if (optimal !== this._currentPollInterval) {
      this._diag(`[MQTT:POLL] Interval changed: ${this._currentPollInterval}ms to ${optimal}ms`, null, 'debug');
      this._currentPollInterval = optimal;
      this.stopPolling();
      this._pollInterval = this.homey.setInterval(() => this._poll(), optimal);
    }
  }

  restartPolling() {
    this.stopPolling();

    this._currentPollInterval = this._getOptimalPollInterval();
    this._pollInterval = this.homey.setInterval(() => this._poll(), this._currentPollInterval);

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

      // Probeable toggle/enum/status properties (polled every cycle)
      const probeableEvery = [
        PROP.CHILD_LOCK, PROP.RESUME_CLEANING, PROP.TIGHT_MOPPING, PROP.SILENT_DRYING,
        PROP.CARPET_SENSITIVITY, PROP.CARPET_CLEANING, PROP.MOP_WASH_LEVEL,
        PROP.DRYING_TIME, PROP.VOLUME, PROP.WATER_TEMPERATURE,
        PROP.AUTO_EMPTY_FREQUENCY, PROP.MOP_PRESSURE,
        PROP.CHARGING_STATUS, PROP.DRYING_PROGRESS, PROP.DRAINAGE_STATUS,
        PROP.DETERGENT_STATUS, PROP.HOT_WATER_STATUS, PROP.DOCK_CLEANING_STATUS,
        PROP.STATUS, PROP.TASK_STATUS,
      ];
      for (const p of probeableEvery) {
        const pk = `${p.siid}-${p.piid}`;
        if (!this._unsupportedProps.has(pk)) props.push(p);
      }

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

        // Probeable consumables + lifetime stats (every 12th cycle)
        const probeableInfrequent = [
          PROP.FIRST_CLEANING_DATE, PROP.TOTAL_CLEANED_AREA,
          PROP.MOP_PAD_INSTALLED, PROP.DUST_COLLECTION,
        ];
        for (const p of probeableInfrequent) {
          const pk = `${p.siid}-${p.piid}`;
          if (!this._unsupportedProps.has(pk)) props.push(p);
        }

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
        await this._applyProperty(key, r.value);
      }

      // Complete probe and save unsupported props
      if (!this._probeComplete) {
        this._probeComplete = true;
        await this.setStoreValue('probeComplete', true);
        await this.setStoreValue('unsupportedProps', [...this._unsupportedProps]);

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

        // Remove probeable capabilities for unsupported props
        for (const [propKey, capName] of Object.entries(PROP_TO_CAPABILITY)) {
          if (this._unsupportedProps.has(propKey) && this.hasCapability(capName)) {
            await this.removeCapability(capName);
          }
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
    await this.setCapabilityValue('dreame_cleangenius', value);

    // Auto-start: selecting Routine or Deep while idle starts cleaning
    if (dreameValue > 0 && this._isIdle()) {
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

  getRooms() {
    return this._rooms || [];
  }

  _fireRoomStartedTriggers(roomIds) {
    const triggerCard = this.homey.flow.getDeviceTriggerCard('room_cleaning_started');
    const triggerByIdCard = this.homey.flow.getDeviceTriggerCard('room_cleaning_started_by_id');
    for (const roomId of roomIds) {
      const room = this._rooms.find(r => r.id === roomId);
      const roomName = room ? room.name : `Room ${roomId}`;
      const tokens = { room_name: roomName, room_id: String(roomId) };
      const state = { room_id: roomId };
      triggerCard.trigger(this, { room_name: roomName }, state)
        .catch(e => this.error('Room start trigger:', e));
      triggerByIdCard.trigger(this, tokens, state)
        .catch(e => this.error('Room start by-id trigger:', e));
    }
  }

  _fireRoomFinishedTriggers() {
    const triggerCard = this.homey.flow.getDeviceTriggerCard('room_cleaning_finished');
    const triggerByIdCard = this.homey.flow.getDeviceTriggerCard('room_cleaning_finished_by_id');
    for (const roomId of this._cleaningRoomIds) {
      const room = this._rooms.find(r => r.id === roomId);
      const roomName = room ? room.name : `Room ${roomId}`;
      const tokens = { room_name: roomName, room_id: String(roomId) };
      const state = { room_id: roomId };
      triggerCard.trigger(this, { room_name: roomName }, state)
        .catch(e => this.error('Room finish trigger:', e));
      triggerByIdCard.trigger(this, tokens, state)
        .catch(e => this.error('Room finish by-id trigger:', e));
    }
    this._cleaningRoomIds = [];
  }

  /**
   * Check if the vacuum is currently cleaning a specific room.
   */
  isCleaningRoom(roomId) {
    const state = this.getCapabilityValue('vacuumcleaner_state');
    if (state !== 'cleaning') return false;
    return this._cleaningRoomIds.includes(roomId);
  }

  async startRoomCleaning(roomId, repeats, suction, water) {
    this._lastCommandTime = Date.now();
    const api = this._getApi();
    const suctionValue = SUCTION_MAP[suction] !== undefined ? SUCTION_MAP[suction] : 1;
    const waterValue = WATER_VOLUME_MAP[water] !== undefined ? WATER_VOLUME_MAP[water] : 2;
    const repeatCount = Math.max(1, Math.min(3, repeats || 1));

    const cleanlist = [[roomId, repeatCount, suctionValue, waterValue, 1]];
    const params = JSON.stringify({ selects: cleanlist });

    // Track cleaning rooms for condition/trigger cards
    this._cleaningRoomIds = [roomId];

    await api.callAction(this._did, this._bindDomain, ACTION.START_CUSTOM.siid, ACTION.START_CUSTOM.aiid, [
      { piid: 1, value: 18 },
      { piid: 10, value: params },
    ]);

    this._fireRoomStartedTriggers([roomId]);
  }

  async _onCarpetBoost(value) {
    this._lastCommandTime = Date.now();
    const api = this._getApi();
    await api.setProperties(this._did, this._bindDomain, [
      { siid: PROP.CARPET_BOOST.siid, piid: PROP.CARPET_BOOST.piid, value: value ? 1 : 0 },
    ]);
  }

  async _onDnd(value) {
    this._lastCommandTime = Date.now();
    const api = this._getApi();
    await api.setProperties(this._did, this._bindDomain, [
      { siid: PROP.DND_ENABLED.siid, piid: PROP.DND_ENABLED.piid, value: value ? 1 : 0 },
    ]);
  }

  // Toggle capability listeners

  async _onChildLock(value) {
    this._lastCommandTime = Date.now();
    const api = this._getApi();
    await api.setProperties(this._did, this._bindDomain, [
      { siid: PROP.CHILD_LOCK.siid, piid: PROP.CHILD_LOCK.piid, value: value ? 1 : 0 },
    ]);
  }

  async _onResumeCleaning(value) {
    this._lastCommandTime = Date.now();
    const api = this._getApi();
    await api.setProperties(this._did, this._bindDomain, [
      { siid: PROP.RESUME_CLEANING.siid, piid: PROP.RESUME_CLEANING.piid, value: value ? 1 : 0 },
    ]);
  }

  async _onTightMopping(value) {
    this._lastCommandTime = Date.now();
    const api = this._getApi();
    await api.setProperties(this._did, this._bindDomain, [
      { siid: PROP.TIGHT_MOPPING.siid, piid: PROP.TIGHT_MOPPING.piid, value: value ? 1 : 0 },
    ]);
  }

  async _onSilentDrying(value) {
    this._lastCommandTime = Date.now();
    const api = this._getApi();
    await api.setProperties(this._did, this._bindDomain, [
      { siid: PROP.SILENT_DRYING.siid, piid: PROP.SILENT_DRYING.piid, value: value ? 1 : 0 },
    ]);
  }

  // Enum capability listeners

  async _onCarpetSensitivity(value) {
    await this.setCarpetSensitivity(value);
    this._forceRefresh();
  }

  async _onCarpetCleaning(value) {
    await this.setCarpetCleaning(value);
    this._forceRefresh();
  }

  async _onMopWashLevel(value) {
    await this.setMopWashLevel(value);
    this._forceRefresh();
  }

  async _onDryingTime(value) {
    await this.setDryingTime(value);
    this._forceRefresh();
  }

  async _onVolume(value) {
    await this.setVolume(value);
    this._forceRefresh();
  }

  async _onWaterTemperature(value) {
    await this.setWaterTemperature(value);
    this._forceRefresh();
  }

  async _onAutoEmptyFrequency(value) {
    await this.setAutoEmptyFrequency(value);
    this._forceRefresh();
  }

  async _onMopPressure(value) {
    await this.setMopPressure(value);
    this._forceRefresh();
  }

  // Public command methods for new settings

  async setCarpetSensitivity(sensitivity) {
    this._lastCommandTime = Date.now();
    const api = this._getApi();
    const value = CARPET_SENSITIVITY_MAP[sensitivity];
    if (value === undefined) throw new Error(`Invalid carpet sensitivity: ${sensitivity}`);
    await api.setProperties(this._did, this._bindDomain, [
      { siid: PROP.CARPET_SENSITIVITY.siid, piid: PROP.CARPET_SENSITIVITY.piid, value },
    ]);
    await this.setCapabilityValue('dreame_carpet_sensitivity', sensitivity);
  }

  async setCarpetCleaning(mode) {
    this._lastCommandTime = Date.now();
    const api = this._getApi();
    const value = CARPET_CLEANING_MAP[mode];
    if (value === undefined) throw new Error(`Invalid carpet cleaning mode: ${mode}`);
    await api.setProperties(this._did, this._bindDomain, [
      { siid: PROP.CARPET_CLEANING.siid, piid: PROP.CARPET_CLEANING.piid, value },
    ]);
    await this.setCapabilityValue('dreame_carpet_cleaning', mode);
  }

  async setMopWashLevel(level) {
    this._lastCommandTime = Date.now();
    const api = this._getApi();
    const value = MOP_WASH_LEVEL_MAP[level];
    if (value === undefined) throw new Error(`Invalid mop wash level: ${level}`);
    await api.setProperties(this._did, this._bindDomain, [
      { siid: PROP.MOP_WASH_LEVEL.siid, piid: PROP.MOP_WASH_LEVEL.piid, value },
    ]);
    await this.setCapabilityValue('dreame_mop_wash_level', level);
  }

  async setDryingTime(hours) {
    this._lastCommandTime = Date.now();
    const api = this._getApi();
    await api.setProperties(this._did, this._bindDomain, [
      { siid: PROP.DRYING_TIME.siid, piid: PROP.DRYING_TIME.piid, value: hours },
    ]);
    await this.setCapabilityValue('dreame_drying_time', hours);
  }

  async setVolume(volume) {
    this._lastCommandTime = Date.now();
    const api = this._getApi();
    await api.setProperties(this._did, this._bindDomain, [
      { siid: PROP.VOLUME.siid, piid: PROP.VOLUME.piid, value: volume },
    ]);
    await this.setCapabilityValue('dreame_volume', volume);
  }

  async setWaterTemperature(temp) {
    this._lastCommandTime = Date.now();
    const api = this._getApi();
    const value = WATER_TEMP_MAP[temp];
    if (value === undefined) throw new Error(`Invalid water temperature: ${temp}`);
    await api.setProperties(this._did, this._bindDomain, [
      { siid: PROP.WATER_TEMPERATURE.siid, piid: PROP.WATER_TEMPERATURE.piid, value },
    ]);
    await this.setCapabilityValue('dreame_water_temperature', temp);
  }

  async setAutoEmptyFrequency(frequency) {
    this._lastCommandTime = Date.now();
    const api = this._getApi();
    const value = AUTO_EMPTY_FREQ_MAP[frequency];
    if (value === undefined) throw new Error(`Invalid auto empty frequency: ${frequency}`);
    await api.setProperties(this._did, this._bindDomain, [
      { siid: PROP.AUTO_EMPTY_FREQUENCY.siid, piid: PROP.AUTO_EMPTY_FREQUENCY.piid, value },
    ]);
    await this.setCapabilityValue('dreame_auto_empty_frequency', frequency);
  }

  async setMopPressure(pressure) {
    this._lastCommandTime = Date.now();
    const api = this._getApi();
    const value = MOP_PRESSURE_MAP[pressure];
    if (value === undefined) throw new Error(`Invalid mop pressure: ${pressure}`);
    await api.setProperties(this._did, this._bindDomain, [
      { siid: PROP.MOP_PRESSURE.siid, piid: PROP.MOP_PRESSURE.piid, value },
    ]);
    await this.setCapabilityValue('dreame_mop_pressure', pressure);
  }

  // Multi-room cleaning

  async startMultiRoomCleaning(roomIds, repeats, suction, water) {
    this._lastCommandTime = Date.now();
    const api = this._getApi();
    const suctionValue = SUCTION_MAP[suction] !== undefined ? SUCTION_MAP[suction] : 1;
    const waterValue = WATER_VOLUME_MAP[water] !== undefined ? WATER_VOLUME_MAP[water] : 2;
    const repeatCount = Math.max(1, Math.min(3, repeats || 1));

    const cleanlist = roomIds.map(id => [id, repeatCount, suctionValue, waterValue, 1]);
    const params = JSON.stringify({ selects: cleanlist });

    // Track cleaning rooms for condition/trigger cards
    this._cleaningRoomIds = [...roomIds];

    await api.callAction(this._did, this._bindDomain, ACTION.START_CUSTOM.siid, ACTION.START_CUSTOM.aiid, [
      { piid: 1, value: 18 },
      { piid: 10, value: params },
    ]);

    this._fireRoomStartedTriggers(roomIds);
  }

  // Warning/dock actions

  async clearWarning() {
    this._lastCommandTime = Date.now();
    const api = this._getApi();
    await api.callAction(this._did, this._bindDomain, ACTION.CLEAR_WARNING.siid, ACTION.CLEAR_WARNING.aiid);
  }

  async startDraining() {
    this._lastCommandTime = Date.now();
    const api = this._getApi();
    await api.callAction(this._did, this._bindDomain, ACTION.START_WASHING.siid, ACTION.START_WASHING.aiid, [
      { piid: 1, value: '7,1' },
    ]);
  }

  async startSelfClean() {
    this._lastCommandTime = Date.now();
    const api = this._getApi();
    await api.setProperties(this._did, this._bindDomain, [
      { siid: PROP.SELF_WASH_BASE.siid, piid: PROP.SELF_WASH_BASE.piid, value: 1 },
    ]);
  }

  async startDrying() {
    this._lastCommandTime = Date.now();
    const api = this._getApi();
    await api.setProperties(this._did, this._bindDomain, [
      { siid: PROP.SELF_WASH_BASE.siid, piid: PROP.SELF_WASH_BASE.piid, value: 2 },
    ]);
  }

  async startAutoEmpty() {
    this._lastCommandTime = Date.now();
    const api = this._getApi();
    await api.callAction(this._did, this._bindDomain, ACTION.START_AUTO_EMPTY.siid, ACTION.START_AUTO_EMPTY.aiid);
  }

  async resetConsumable(siid, aiid) {
    const api = this._getApi();
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
    if (changedKeys.includes('poll_interval') || changedKeys.includes('adaptive_polling')) {
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
    this._stopMapRefreshTimer();
    this._stopTokenRefreshTimer();
    this._cancelMqttRetryTimer();
    this._cancelMqttRestartTimer();
    if (this._mapResponseTimeout) {
      this.homey.clearTimeout(this._mapResponseTimeout);
      this._mapResponseTimeout = null;
    }
    // Only remove our listeners — don't disconnect the shared MQTT singleton
    // (other devices may still be using it; app.onUninit() handles disconnect)
    this._removeMqttListeners();
  }

}

module.exports = DreameVacuumDevice;
