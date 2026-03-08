'use strict';

const mqtt = require('mqtt');
const crypto = require('crypto');
const EventEmitter = require('events');

/**
 * MQTT client for Dreame vacuum real-time property updates.
 *
 * Connects to the Dreame MQTT broker using OAuth credentials.
 * Receives properties_changed events pushed by the device.
 *
 * Usage:
 *   const client = new DreameMqtt({ logger });
 *   client.on('properties', (did, params) => { ... });
 *   await client.connect({ uid, accessToken, bindDomain, did, model, country });
 *   // later:
 *   client.disconnect();
 */
class DreameMqtt extends EventEmitter {

  constructor({ logger } = {}) {
    super();
    this._log = logger || (() => {});
    this._client = null;
    this._connected = false;
    this._reconnectTimer = null;
    this._config = null;
    this._reconnectAttempts = 0;
  }

  /**
   * Connect to the Dreame MQTT broker.
   * @param {Object} opts
   * @param {string} opts.uid         - User ID from OAuth login
   * @param {string} opts.accessToken - Access token from OAuth login
   * @param {string} opts.bindDomain  - e.g. "awsde0.iot.dreame.tech:8883"
   * @param {string} opts.did         - Device ID
   * @param {string} opts.model       - Device model e.g. "dreame.vacuum.p2259"
   * @param {string} opts.country     - Country code e.g. "eu", "de", "us"
   * @param {string} [opts.masterUid] - Master/owner UID (defaults to uid)
   */
  async connect(opts) {
    if (this._client) {
      this.disconnect();
    }

    this._config = { ...opts };
    const { uid, accessToken, bindDomain, did, model, country } = opts;
    const masterUid = opts.masterUid || uid;

    if (!uid || !accessToken || !bindDomain) {
      throw new Error('MQTT connect requires uid, accessToken and bindDomain');
    }

    // Parse broker host/port from bindDomain
    const [brokerHost, brokerPortStr] = bindDomain.split(':');
    const brokerPort = parseInt(brokerPortStr, 10) || 8883;
    const brokerHostBase = brokerHost.split('.')[0]; // e.g. "awsde0"

    // Generate random agent ID
    const agentId = crypto.randomBytes(4).toString('hex');

    // Client ID: p_{uid}_{agentId}_{brokerHostBase}
    const clientId = `p_${uid}_${agentId}_${brokerHostBase}`;

    // Topic: /status/{did}/{masterUid}/{model}/{country}/
    this._topic = `/status/${did}/${masterUid}/${model}/${country}/`;

    const brokerUrl = `mqtts://${brokerHost}:${brokerPort}`;

    this._client = mqtt.connect(brokerUrl, {
      clientId,
      username: uid,
      password: accessToken,
      rejectUnauthorized: false, // Dreame uses self-signed certs
      reconnectPeriod: 0, // We handle reconnect ourselves
      connectTimeout: 15000,
      keepalive: 60,
      clean: true,
      protocolVersion: 4,
    });

    this._client.on('connect', () => {
      this._connected = true;
      this._reconnectAttempts = 0;
      this._client.subscribe(this._topic, { qos: 0 }, (err) => {
        if (err) {
          this._log(`[MQTT] Subscribe error: ${err.message}`);
        }
      });
      this.emit('connected');
    });

    this._client.on('message', (topic, payload) => {
      this._handleMessage(topic, payload);
    });

    this._client.on('error', (err) => {
      this._log(`[MQTT] Error: ${err.message}`);
      this.emit('error', err);
    });

    this._client.on('close', () => {
      const wasConnected = this._connected;
      this._connected = false;
      if (wasConnected) {
        this.emit('disconnected');
        this._scheduleReconnect();
      }
    });

    this._client.on('offline', () => {
      this._connected = false;
    });
  }

  /**
   * Update the access token (e.g. after refresh). Reconnects if needed.
   */
  updateToken(accessToken) {
    if (this._config) {
      this._config.accessToken = accessToken;
    }
    // If disconnected, reconnect with new token
    if (!this._connected && this._config) {
      this.connect(this._config).catch(e => this._log(`[MQTT] Reconnect error: ${e.message}`));
    }
  }

  disconnect() {
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
    if (this._client) {
      this._client.end(true);
      this._client = null;
    }
    this._connected = false;
  }

  get connected() {
    return this._connected;
  }

  _scheduleReconnect() {
    if (this._reconnectTimer) return;
    // Exponential backoff: 10s, 20s, 40s, 80s, max 300s
    const delay = Math.min(10000 * Math.pow(2, this._reconnectAttempts), 300000);
    this._reconnectAttempts++;
    this._reconnectTimer = setTimeout(() => {
      this._reconnectTimer = null;
      if (!this._connected && this._config) {
        this.connect(this._config).catch(e => this._log(`[MQTT] Reconnect error: ${e.message}`));
      }
    }, delay);
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
