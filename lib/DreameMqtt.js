'use strict';

const mqtt = require('mqtt');
const crypto = require('crypto');
const EventEmitter = require('events');

const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_BASE_MS = 10000;
const RECONNECT_MAX_MS = 300000;

/**
 * MQTT client for Dreame vacuum real-time property updates.
 *
 * Connects to the Dreame MQTT broker using OAuth credentials.
 * Receives properties_changed events pushed by the device.
 *
 * Emits:
 *   'properties' (did, params) - property updates from device
 *   'message' (data)           - other MQTT messages
 *   'connected'                - broker connection established
 *   'disconnected'             - broker connection lost
 *   'auth_error'               - authentication failed (token expired)
 *   'gave_up'                  - max reconnect attempts reached
 */
class DreameMqtt extends EventEmitter {

  constructor({ logger } = {}) {
    super();
    // Safety net: prevent unhandled 'error' events from crashing the process
    this.on('error', () => {});
    this._log = logger || (() => {});
    this._client = null;
    this._clientId = 0; // monotonic ID to detect stale client events
    this._connected = false;
    this._reconnectTimer = null;
    this._config = null;
    this._reconnectAttempts = 0;
    this._stopped = false; // true when gave up or manually disconnected
  }

  /**
   * Connect to the Dreame MQTT broker.
   * @param {Object} opts
   * @param {string} opts.uid         - User ID from OAuth login
   * @param {string} opts.accessToken - Access token from OAuth login
   * @param {string} opts.bindDomain  - e.g. "awsde0.iot.dreame.tech:8883"
   * @param {string} opts.did         - Device ID
   * @param {string} opts.model       - Device model e.g. "dreame.vacuum.p2259"
   * @param {string} opts.country     - Region/country code e.g. "eu", "de", "us"
   */
  async connect(opts) {
    this._destroyClient();

    this._stopped = false;
    this._config = { ...opts };
    const { uid, accessToken, bindDomain, did, model, country } = opts;

    if (!uid || !accessToken || !bindDomain) {
      throw new Error('MQTT connect requires uid, accessToken and bindDomain');
    }

    // Parse broker host/port from bindDomain
    const [brokerHost, brokerPortStr] = bindDomain.split(':');
    const brokerPort = parseInt(brokerPortStr, 10) || 8883;

    // Simple random clientId matching ioBroker.dreamehome format
    const clientIdStr = `p_${crypto.randomBytes(8).toString('hex')}`;

    // Topic uses logged-in user's uid (not device owner's uid) — matches ioBroker/Dreame app behavior
    this._topic = `/status/${did}/${uid}/${model}/${country}/`;

    const brokerUrl = `mqtts://${brokerHost}:${brokerPort}`;
    const myClientId = ++this._clientId;

    const mqttOpts = {
      clientId: clientIdStr,
      username: uid,
      password: accessToken,
      rejectUnauthorized: false,
      reconnectPeriod: 0, // we handle reconnect ourselves
      connectTimeout: 15000,
      keepalive: 60,
      clean: true,
      protocolVersion: 4,
    };

    // Use connectAsync — resolves on successful connect, rejects on error/timeout
    this._client = await mqtt.connectAsync(brokerUrl, mqttOpts);

    // If we got here, the connection succeeded
    this._connected = true;
    this._reconnectAttempts = 0;

    this._client.subscribe(this._topic, { qos: 0 }, (err) => {
      if (err) {
        this._log(`[MQTT] Subscribe error: ${err.message}`);
      }
    });

    this._client.on('message', (topic, payload) => {
      if (myClientId !== this._clientId) return;
      this._handleMessage(topic, payload);
    });

    this._client.on('error', (err) => {
      if (myClientId !== this._clientId) return;
      this._log(`[MQTT] Error: ${err.message}`);

      // Detect auth errors — token expired or invalid credentials
      const msg = (err.message || '').toLowerCase();
      const code = err.code;
      if (msg.includes('not authorized') || msg.includes('bad user') || code === 4 || code === 5) {
        this._log('[MQTT] Auth error — token may be expired');
        this.emit('auth_error', err);
        return;
      }

      // All other errors: log only, don't re-emit on EventEmitter
      // (re-emitting 'error' with no listener would crash the process)
    });

    this._client.on('close', () => {
      if (myClientId !== this._clientId) return; // stale client, ignore
      const wasConnected = this._connected;
      this._connected = false;
      if (wasConnected) {
        this.emit('disconnected');
      }
      if (!this._stopped) {
        this._scheduleReconnect();
      }
    });

    this._client.on('offline', () => {
      if (myClientId !== this._clientId) return;
      this._connected = false;
    });

    this.emit('connected');
  }

  /**
   * Update the access token (e.g. after refresh) and reconnect.
   */
  updateToken(accessToken) {
    if (this._config) {
      this._config.accessToken = accessToken;
    }
    // Reset reconnect counter since we have a fresh token
    this._reconnectAttempts = 0;
    this._stopped = false;

    if (!this._connected && this._config) {
      // Cancel any pending reconnect — reconnect immediately with new token
      if (this._reconnectTimer) {
        clearTimeout(this._reconnectTimer);
        this._reconnectTimer = null;
      }
      this.connect(this._config).catch(e => {
        this._log(`[MQTT] Reconnect error: ${e.message}`);
        this._handleConnectError(e);
      });
    }
  }

  disconnect() {
    this._stopped = true;
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
    this._destroyClient();
    this._connected = false;
  }

  get connected() {
    return this._connected;
  }

  _destroyClient() {
    if (this._client) {
      // Increment clientId so any pending events from this client are ignored
      this._clientId++;
      try {
        this._client.end(true);
      } catch (_) {
        // ignore errors during force-close
      }
      this._client = null;
    }
  }

  _scheduleReconnect() {
    if (this._reconnectTimer || this._stopped) return;

    if (this._reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      this._log(`[MQTT] Max reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) reached — giving up`);
      this._stopped = true;
      this.emit('gave_up');
      return;
    }

    // Exponential backoff: 10s, 20s, 40s, 80s, max 300s
    const delay = Math.min(RECONNECT_BASE_MS * Math.pow(2, this._reconnectAttempts), RECONNECT_MAX_MS);
    this._reconnectAttempts++;
    this._log(`[MQTT] Reconnect attempt ${this._reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${delay / 1000}s`);

    this._reconnectTimer = setTimeout(() => {
      this._reconnectTimer = null;
      if (!this._connected && !this._stopped && this._config) {
        this.connect(this._config).catch(e => {
          this._log(`[MQTT] Reconnect error: ${e.message}`);
          // connectAsync rejects on failure — schedule next attempt
          this._handleConnectError(e);
        });
      }
    }, delay);
  }

  _handleConnectError(err) {
    this._connected = false;
    const msg = (err.message || '').toLowerCase();
    const code = err.code;
    if (msg.includes('not authorized') || msg.includes('bad user') || code === 4 || code === 5) {
      this._log('[MQTT] Auth error during connect — token may be expired');
      this.emit('auth_error', err);
      return;
    }
    // Schedule next reconnect attempt for non-auth errors
    if (!this._stopped) {
      this._scheduleReconnect();
    }
  }

  _handleMessage(topic, payload) {
    try {
      const msg = JSON.parse(payload.toString());
      const data = msg.data || msg;

      if (data.method === 'properties_changed' && Array.isArray(data.params)) {
        const did = data.params[0]?.did || this._config?.did;
        this.emit('properties', did, data.params);
      } else if (data.method) {
        this.emit('message', data);
      }
    } catch (e) {
      this._log(`[MQTT] Message parse error: ${e.message}`);
    }
  }
}

module.exports = DreameMqtt;
