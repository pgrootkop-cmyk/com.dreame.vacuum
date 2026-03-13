'use strict';

const Homey = require('homey');
const { Log } = require('homey-log');
const Raven = require('raven');
const zlib = require('zlib');
const crypto = require('crypto');
const DreameApi = require('./lib/DreameApi');
const DreameMqtt = require('./lib/DreameMqtt');

// Dreame Light color scheme (matches Tasshack/dreame-vacuum)
const SEGMENT_COLORS = [
  [171, 199, 248], [249, 224, 125], [184, 227, 255], [184, 217, 141],
];
const WALL_COLOR = [159, 159, 159];
const FLOOR_COLOR = [221, 221, 221];
const NEW_SEGMENT_COLOR = [153, 191, 255];
const MAP_HEADER_SIZE = 27;

class DreameApp extends Homey.App {

  async onInit() {
    this.homeyLog = new Log({ homey: this.homey });
    this._api = null;
    this._mqtt = null;
    this._initApi();
  }

  /**
   * Check if diagnostic logging is enabled by the user.
   */
  isDiagnosticEnabled() {
    return this.homey.settings.get('diagnosticLogging') === true;
  }

  /**
   * Send a diagnostic message to Sentry with severity level.
   * Only sends when user has opted in.
   * @param {'debug'|'info'|'warning'|'error'|'fatal'} level
   */
  sendDiagnostic(message, extra, level = 'info') {
    if (!this.isDiagnosticEnabled()) return;
    const opts = { level };
    if (extra) {
      if (extra.model) this.homeyLog.setTags({ model: extra.model });
      opts.extra = extra;
    }
    Raven.captureMessage(message, opts);
  }

  /**
   * Send an error to Sentry (only when user has opted in).
   * @param {'warning'|'error'|'fatal'} level
   */
  sendError(err, extra, level = 'error') {
    if (!this.isDiagnosticEnabled()) return;
    const opts = { level };
    if (extra) {
      if (extra.model) this.homeyLog.setTags({ model: extra.model });
      opts.extra = extra;
    }
    Raven.captureException(err, opts);
  }

  _initApi() {
    const username = this.homey.settings.get('username');
    const password = this.homey.settings.get('password');
    const country = this.homey.settings.get('country') || 'eu';

    if (username && password) {
      this._api = new DreameApi({ username, password, country });
      this._wireApi();
    }
  }

  _wireApi() {
    // Restore tokens if available
    const refreshToken = this.homey.settings.get('refreshToken');
    if (refreshToken) {
      this._api.refreshToken = refreshToken;
    }
    const accessToken = this.homey.settings.get('accessToken');
    const tokenExpiry = this.homey.settings.get('tokenExpiry');
    const tenantId = this.homey.settings.get('tenantId');
    if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
      this._api.accessToken = accessToken;
      this._api.tokenExpiry = tokenExpiry;
    }
    if (tenantId) {
      this._api.tenantId = tenantId;
    }

    // Restore uid and region
    const uid = this.homey.settings.get('uid');
    if (uid) {
      this._api.uid = uid;
    }
    const region = this.homey.settings.get('region');
    if (region) {
      this._api.region = region;
    }

    // Auto-save tokens whenever they change
    this._api.onTokenUpdate = (tokens) => {
      this.homey.settings.set('accessToken', tokens.accessToken);
      this.homey.settings.set('refreshToken', tokens.refreshToken);
      this.homey.settings.set('tokenExpiry', tokens.tokenExpiry);
      this.homey.settings.set('tenantId', tokens.tenantId);
      if (tokens.uid) {
        this.homey.settings.set('uid', tokens.uid);
      }
      if (tokens.region) {
        this.homey.settings.set('region', tokens.region);
      }

      // Update MQTT token if connected
      if (this._mqtt) {
        this._mqtt.updateToken(tokens.accessToken);
      }
    };
  }

  getApi() {
    return this._api;
  }

  /**
   * Get or create the shared MQTT client.
   * Devices call this to register for property updates.
   */
  getMqtt() {
    if (!this._mqtt) {
      this._mqtt = new DreameMqtt({ logger: this.log.bind(this) });
    }
    return this._mqtt;
  }

  setCredentials(username, password, country) {
    this.homey.settings.set('username', username);
    this.homey.settings.set('password', password);
    this.homey.settings.set('country', country || 'eu');

    if (this._api) {
      this._api.setCredentials({ username, password, country });
    } else {
      this._api = new DreameApi({ username, password, country });
    }

    this._wireApi();
  }

  saveRefreshToken(refreshToken) {
    this.homey.settings.set('refreshToken', refreshToken);
    if (this._api) {
      this._api.refreshToken = refreshToken;
    }
  }

  saveUid(uid) {
    this.homey.settings.set('uid', uid);
    if (this._api) {
      this._api.uid = uid;
    }
  }

  /**
   * Get vacuum device data for settings page and widget.
   */
  getVacuumData() {
    const driver = this.homey.drivers.getDriver('vacuum');
    const devices = driver ? driver.getDevices() : [];
    return devices.map(d => {
      const caps = {};
      for (const cap of d.getCapabilities()) {
        caps[cap] = d.getCapabilityValue(cap);
      }
      return {
        id: d.getData().id,
        name: d.getName(),
        rooms: d.getRooms(),
        capabilities: caps,
        store: {
          model: d.getStoreValue('model'),
          mapObjectName: d.getStoreValue('mapObjectName'),
        },
      };
    });
  }

  /**
   * Find a vacuum device by Dreame DID or Homey device index.
   */
  _findVacuumDevice(did) {
    const driver = this.homey.drivers.getDriver('vacuum');
    const devices = driver ? driver.getDevices() : [];
    if (!did) return devices[0] || null;
    // Match by Dreame DID first
    const byDid = devices.find(d => d.getData().id === did);
    if (byDid) return byDid;
    // Fallback: match by index (for widget single-device case)
    return devices[0] || null;
  }

  /**
   * Get rendered map as RGBA pixel data + dimensions for a device.
   * Returns { width, height, pixels: base64-encoded RGBA, rooms: [...] } or null.
   */
  getRenderedMap(did) {
    const device = this._findVacuumDevice(did);
    if (!device) return null;

    const raw = device.getStoreValue('mapRawBase64');
    if (!raw) return null;

    const model = device.getStoreValue('model') || '';
    const rooms = device.getRooms() || [];
    return this._renderMapPixels(raw, rooms, model);
  }

  /**
   * Get the AES-CBC IV for a given vacuum model.
   * Returns the 16-char IV string or null.
   */
  _getMapIv(model) {
    if (!model) return null;
    const suffix = model.replace('dreame.vacuum.', '');
    // Specific model overrides (from Tasshack DEVICE_INFO)
    const specific = {
      r2209: 'qFKhvoAqRFTPfKN6', r2211o: 'dndRQ3z8ACjDdDMo', r2216o: '4sCv3Q2BtbWVBIB2',
      r2240: 'ojxGnogHfVuefVfx', r2250: 'nf3Zi2Mq8jD5AAOm', r2254: 'wRy05fYLQJMRH6Mj',
      r2210: 'OFULk9To37qRdXY3', p2149o: 'RNO4p35b2QKaovHC',
    };
    if (specific[suffix]) return specific[suffix];
    // p2114 family
    if (suffix === 'p2114a' || suffix === 'p2114o') return '6PFiLPYMHLylp7RR';
    // p2140 family
    if (suffix.startsWith('p2140')) return '8qnS9dqgT3CppGe1';
    // 3F0ji4ufBMaH1ThM family
    const family3F = ['r2243', 'r2312', 'r2312a', 'r2328', 'r2380', 'r2380r', 'r2388', 'r2422', 'r2422a', 'r2422b', 'r2422c'];
    if (family3F.includes(suffix) || suffix.startsWith('r2458') || suffix.startsWith('r2459') || suffix.startsWith('r2463') || suffix.startsWith('r2478') || suffix.startsWith('r2479') || suffix.startsWith('r249')) return '3F0ji4ufBMaH1ThM';
    // FmnfaI2pbem0k75t family
    const familyFm = ['r2251a', 'r2251o', 'r2257o', 'r2317', 'r2345a', 'r2345h', 'r2363', 'r2363a', 'r2363n', 'r2364', 'r2364a', 'r2382a', 'r2382k', 'r2382r', 'r2383a', 'r2383k', 'r2386', 'r2471', 'r2563b', 'r2563v'];
    if (familyFm.includes(suffix)) return 'FmnfaI2pbem0k75t';
    // Default IV for most modern models (r2212+, r2253*, r2449*, etc.)
    return 'NRwnBj5FsNPgBNbT';
  }

  /**
   * Decode raw map data (base64, optionally AES-encrypted, zlib-compressed).
   * Returns { buf, width, height, dataJson } or null.
   */
  _decodeMapData(raw, model) {
    let mapStr = String(raw).replace(/_/g, '/').replace(/-/g, '+');
    let aesKey = null;
    if (mapStr.includes(',')) {
      const parts = mapStr.split(',');
      mapStr = parts[0];
      aesKey = parts[1];
    }

    let buf = Buffer.from(mapStr, 'base64');

    if (aesKey) {
      try {
        const keyHash = crypto.createHash('sha256').update(aesKey).digest('hex').substring(0, 32);
        const modelIv = this._getMapIv(model);
        const iv = modelIv ? Buffer.from(modelIv, 'utf8') : Buffer.alloc(16, 0);
        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(keyHash, 'utf8'), iv);
        decipher.setAutoPadding(true);
        buf = Buffer.concat([decipher.update(buf), decipher.final()]);
      } catch (_) {
        buf = Buffer.from(mapStr, 'base64');
      }
    }

    try {
      buf = zlib.inflateSync(buf);
    } catch (_) {
      try { buf = zlib.inflateRawSync(buf); } catch (__) { return null; }
    }

    if (buf.length < MAP_HEADER_SIZE) return null;
    const width = buf.readInt16LE(19);
    const height = buf.readInt16LE(21);
    if (width <= 0 || height <= 0 || width > 4000 || height > 4000) return null;

    const imageSize = MAP_HEADER_SIZE + (width * height);
    let dataJson = {};
    if (buf.length > imageSize) {
      try { dataJson = JSON.parse(buf.slice(imageSize).toString('utf8')); } catch (_) {}
    }

    return { buf, width, height, dataJson };
  }

  /**
   * Get pixel type from raw pixel value, matching Tasshack's logic.
   * frame_map: pixel >> 2 for segment_id (63=wall, 62=floor, 61=unknown)
   * saved map: pixel & 0x3F for segment_id, bit 7 for wall+segment
   */
  _getPixelType(pixel, frameMap, savedMapStatus) {
    if (frameMap) {
      const segId = pixel >> 2;
      if (segId > 0 && segId < 64) {
        if (segId === 63) return { type: 'wall' };
        if (segId === 62) return { type: 'floor' };
        if (segId === 61) return { type: 'outside' };
        return { type: 'segment', id: segId };
      }
      const low = pixel & 0x03;
      if (low === 1 || low === 3) return { type: 'new_segment' };
      if (low === 2) return { type: 'wall' };
      return { type: 'outside' };
    }

    // Non-frame map (saved map / I-frame without fsm)
    const segId = pixel & 0x3F;
    if (pixel >> 7) {
      // High bit set: wall or segment with wall overlay
      if (segId > 0) return { type: 'segment', id: segId };
      return { type: 'wall' };
    }
    if (segId > 0) {
      if (savedMapStatus === 1 || savedMapStatus === 0) {
        if (segId === 1 || segId === 3) return { type: 'new_segment' };
        if (segId === 2) return { type: 'wall' };
        return { type: 'outside' };
      }
      return { type: 'segment', id: segId };
    }
    return { type: 'outside' };
  }

  _renderMapPixels(raw, rooms, model) {
    try {
      // Decode the outer map
      const outer = this._decodeMapData(raw, model);
      if (!outer) return null;

      const { dataJson } = outer;
      const frameMap = !!(dataJson.fsm && dataJson.fsm === 1);
      const savedMapStatus = dataJson.ris !== undefined ? dataJson.ris : -1;

      // Prefer the rism (saved map) if available - it has proper room segments
      let renderData = outer;
      let renderFrameMap = frameMap;
      let renderSavedMapStatus = savedMapStatus;

      if (dataJson.rism) {
        const saved = this._decodeMapData(dataJson.rism, model);
        if (saved && saved.width > 2 && saved.height > 2) {
          renderData = saved;
          renderFrameMap = !!(saved.dataJson.fsm && saved.dataJson.fsm === 1);
          renderSavedMapStatus = saved.dataJson.ris !== undefined ? saved.dataJson.ris : -1;
        }
      }

      const { buf, width, height } = renderData;
      const roomColorMap = {};
      rooms.forEach((r, i) => { roomColorMap[r.id] = i % SEGMENT_COLORS.length; });

      const rgba = Buffer.alloc(width * height * 4);
      // Track segment pixel positions for room label placement
      const segBounds = {};

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const pi = MAP_HEADER_SIZE + (y * width + x);
          const px = buf[pi] || 0;
          const oi = (y * width + x) * 4;

          if (px === 0) continue; // Outside - transparent

          const pxType = this._getPixelType(px, renderFrameMap, renderSavedMapStatus);

          let col;
          switch (pxType.type) {
            case 'wall':
              col = WALL_COLOR;
              break;
            case 'floor':
              col = FLOOR_COLOR;
              break;
            case 'new_segment':
              col = NEW_SEGMENT_COLOR;
              break;
            case 'segment': {
              const colorIdx = roomColorMap[pxType.id] !== undefined
                ? roomColorMap[pxType.id]
                : (pxType.id - 1) % SEGMENT_COLORS.length;
              col = SEGMENT_COLORS[colorIdx];
              // Track bounds for room labels
              if (!segBounds[pxType.id]) segBounds[pxType.id] = { minX: x, maxX: x, minY: y, maxY: y, count: 0 };
              const b = segBounds[pxType.id];
              if (x < b.minX) b.minX = x;
              if (x > b.maxX) b.maxX = x;
              if (y < b.minY) b.minY = y;
              if (y > b.maxY) b.maxY = y;
              b.count++;
              break;
            }
            default:
              continue;
          }

          rgba[oi] = col[0]; rgba[oi + 1] = col[1]; rgba[oi + 2] = col[2]; rgba[oi + 3] = 255;
        }
      }

      // Build room label positions (center of each segment's bounding box)
      const roomLabels = [];
      for (const room of rooms) {
        const b = segBounds[room.id];
        if (b && b.count > 10) {
          roomLabels.push({
            id: room.id,
            name: room.name,
            x: Math.round((b.minX + b.maxX) / 2),
            y: Math.round((b.minY + b.maxY) / 2),
          });
        }
      }

      // Parse robot and charger positions from header
      let robotPos = null;
      let chargerPos = null;
      const headerBuf = renderData.buf;
      if (headerBuf.length >= MAP_HEADER_SIZE) {
        const gridSize = headerBuf.readInt16LE(17);
        const left = headerBuf.readInt16LE(23);
        const top = headerBuf.readInt16LE(25);
        const rX = headerBuf.readInt16LE(5);
        const rY = headerBuf.readInt16LE(7);
        const cX = headerBuf.readInt16LE(11);
        const cY = headerBuf.readInt16LE(13);
        if (rX !== 32767 && rY !== 32767 && gridSize > 0) {
          robotPos = {
            x: Math.round((rX - left) / gridSize),
            y: Math.round((rY - top) / gridSize),
          };
        }
        if (cX !== 32767 && cY !== 32767 && gridSize > 0) {
          chargerPos = {
            x: Math.round((cX - left) / gridSize),
            y: Math.round((cY - top) / gridSize),
          };
        }
      }

      return {
        width, height,
        pixels: rgba.toString('base64'),
        roomLabels,
        robotPos,
        chargerPos,
      };
    } catch (_) {
      return null;
    }
  }

  async onUninit() {
    if (this._mqtt) {
      this._mqtt.disconnect();
      this._mqtt = null;
    }
  }

}

module.exports = DreameApp;
