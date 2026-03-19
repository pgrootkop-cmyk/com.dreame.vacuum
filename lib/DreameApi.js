'use strict';

const crypto = require('crypto');

const PASSWORD_SALT = 'RAylYC%fmSKp7%Tq';
const BASIC_AUTH = 'ZHJlYW1lX2FwcHYxOkFQXmR2QHpAU1FZVnhOODg=';
const USER_AGENT = 'Dreame_Smarthome/2.1.9 (iPhone; iOS 18.4.1; Scale/3.00)';
const TOKEN_REFRESH_MARGIN = 120; // seconds before expiry

class DreameApi {

  constructor({ username, password, country = 'eu' }) {
    this.username = username;
    this.password = password;
    this.country = country;
    this.accessToken = null;
    this.refreshToken = null;
    this.tenantId = '000000';
    this.uid = null;
    this.region = country; // overwritten by login response if server returns different region
    this.tokenExpiry = 0;
    this._loginPromise = null;
    this._requestId = 0;
    this._failCount = 0;
    this.onTokenUpdate = null;
  }

  _notifyTokenUpdate() {
    if (this.onTokenUpdate) {
      this.onTokenUpdate({
        accessToken: this.accessToken,
        refreshToken: this.refreshToken,
        tokenExpiry: this.tokenExpiry,
        tenantId: this.tenantId,
        uid: this.uid,
        region: this.region,
      });
    }
  }

  _log(...args) {
    if (this.logger) {
      this.logger(...args);
    }
  }

  get baseUrl() {
    return `https://${this.country}.iot.dreame.tech:13267`;
  }

  _hashPassword(password) {
    return crypto.createHash('md5').update(password + PASSWORD_SALT).digest('hex');
  }

  _nextRequestId() {
    this._requestId += 1;
    return this._requestId;
  }

  _commonHeaders() {
    return {
      'Authorization': `Basic ${BASIC_AUTH}`,
      'Tenant-Id': this.tenantId,
      'User-Agent': USER_AGENT,
    };
  }

  _authHeaders() {
    return {
      ...this._commonHeaders(),
      'Content-Type': 'application/json',
      'Dreame-Auth': this.accessToken,
    };
  }

  async login() {
    // Singleton promise to prevent concurrent logins
    if (this._loginPromise) {
      return this._loginPromise;
    }

    this._loginPromise = this._doLogin();
    try {
      return await this._loginPromise;
    } finally {
      this._loginPromise = null;
    }
  }

  async _doLogin() {
    // Build body as raw string like Tasshack does (no URL-encoding of values)
    const passwordHash = this._hashPassword(this.password);
    const body = `platform=IOS&scope=all&grant_type=password&username=${this.username}&password=${passwordHash}&type=account`;

    const url = `${this.baseUrl}/dreame-auth/oauth/token`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...this._commonHeaders(),
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': '*/*',
        'Accept-Language': 'en-US;q=0.8',
        'Accept-Encoding': 'gzip, deflate',
      },
      body,
      signal: AbortSignal.timeout(15000),
    });

    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`Login failed: ${response.status} - non-JSON response`);
    }

    if (!response.ok) {
      const detail = data.error_description || data.error || data.message || responseText.substring(0, 200);
      throw new Error(`Login failed: ${response.status} - ${detail}`);
    }

    if (!data.access_token) {
      throw new Error('Login failed: no access_token in response');
    }

    this.accessToken = data.access_token;
    this.refreshToken = data.refresh_token;
    this.tenantId = data.tenant_id || this.tenantId;
    this.uid = data.uid;
    this.region = data.region || this.country;
    this.tokenExpiry = Date.now() + (data.expires_in * 1000);
    this._failCount = 0;
    this._notifyTokenUpdate();

    return data;
  }

  async refreshAccessToken() {
    if (!this.refreshToken) {
      return this.login();
    }

    const body = `platform=IOS&scope=all&grant_type=refresh_token&refresh_token=${this.refreshToken}`;

    try {
      const response = await fetch(`${this.baseUrl}/dreame-auth/oauth/token`, {
        method: 'POST',
        headers: {
          ...this._commonHeaders(),
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': '*/*',
          'Accept-Language': 'en-US;q=0.8',
          'Accept-Encoding': 'gzip, deflate',
        },
        body,
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        // Refresh failed, fall back to full login
        this.refreshToken = null;
        return this.login();
      }

      const data = await response.json();

      if (!data.access_token) {
        this.refreshToken = null;
        return this.login();
      }

      this.accessToken = data.access_token;
      this.refreshToken = data.refresh_token;
      this.tenantId = data.tenant_id || this.tenantId;
      this.tokenExpiry = Date.now() + (data.expires_in * 1000);
      this._failCount = 0;
      this._notifyTokenUpdate();

      return data;
    } catch (err) {
      // Refresh failed, fall back to full login
      this.refreshToken = null;
      return this.login();
    }
  }

  async _ensureToken() {
    if (!this.accessToken) {
      await this.login();
      return;
    }

    // Refresh if within margin of expiry
    if (Date.now() > this.tokenExpiry - (TOKEN_REFRESH_MARGIN * 1000)) {
      await this.refreshAccessToken();
    }
  }

  async _request(path, body = null, retries = 2) {
    await this._ensureToken();

    const url = `${this.baseUrl}${path}`;
    const options = {
      method: body ? 'POST' : 'GET',
      headers: this._authHeaders(),
      signal: AbortSignal.timeout(15000),
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, options);

        if (response.status === 401) {
          // Token expired, refresh and retry
          await this.refreshAccessToken();
          options.headers = this._authHeaders();
          continue;
        }

        if (!response.ok) {
          throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        this._failCount = 0;
        return data;
      } catch (err) {
        if (attempt === retries) {
          this._failCount += 1;
          throw err;
        }
        // Progressive backoff between retries (500ms, 1000ms, ...)
        await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
      }
    }
  }

  async getDevices() {
    const data = await this._request('/dreame-user-iot/iotuserbind/device/listV2', {});
    const result = data.data || data.result || {};
    if (Array.isArray(result)) return result;
    if (result.page && result.page.records) return result.page.records;
    if (result.records) return result.records;
    return [];
  }

  async getDeviceInfo(did) {
    const data = await this._request('/dreame-user-iot/iotuserbind/device/info', { did });
    return data.data || data.result || {};
  }

  _getHostPrefix(bindDomain) {
    // bindDomain is like "awsde0.iot.dreame.tech:8883"
    // We need just "awsde0"
    if (!bindDomain) return '';
    const host = bindDomain.split('.')[0];
    return host;
  }

  async sendCommand(did, bindDomain, method, params) {
    const hostPrefix = this._getHostPrefix(bindDomain);
    const reqId = this._nextRequestId();

    const body = {
      did,
      id: reqId,
      data: {
        did,
        id: reqId,
        method,
        params,
      },
    };

    const data = await this._request(
      `/dreame-iot-com-${hostPrefix}/device/sendCommand`,
      body,
    );

    return data.data || data;
  }

  async getProperties(did, bindDomain, props) {
    // props is an array of { siid, piid }
    const params = props.map(p => ({
      did,
      siid: p.siid,
      piid: p.piid,
    }));

    const result = await this.sendCommand(did, bindDomain, 'get_properties', params);
    const properties = result.result || result;
    if (!Array.isArray(properties)) {
      const code = properties.code || properties.status || 'unknown';
      const msg = properties.msg || properties.message || '';
      this._log(`[API] get_properties returned non-array: code=${code} msg=${msg}`);
      return [];
    }
    return properties;
  }

  async setProperties(did, bindDomain, props) {
    // props is an array of { siid, piid, value }
    const params = props.map(p => ({
      did,
      siid: p.siid,
      piid: p.piid,
      value: p.value,
    }));

    const result = await this.sendCommand(did, bindDomain, 'set_properties', params);
    return result.result || result;
  }

  async callAction(did, bindDomain, siid, aiid, inParams = []) {
    const params = {
      did,
      siid,
      aiid,
      in: inParams,
    };

    const result = await this.sendCommand(did, bindDomain, 'action', params);
    return result.result || result;
  }

  /**
   * Download map data from Dreame cloud storage.
   * @param {string} objectName - e.g. "ali_dreame/ZI944993/790067509/0"
   * @returns {Buffer} Raw map data
   */
  async getMapData(did, objectName, model) {
    await this._ensureToken();

    // Dreame cloud API: get a pre-signed download URL for the map file
    const endpoints = [
      {
        path: '/dreame-user-iot/iotfile/getDownloadUrl',
        body: { did, model: model || '', filename: objectName, region: this.country },
      },
      {
        path: '/dreame-user-iot/iotfile/getOss1dDownloadUrl',
        body: { did, uid: this.uid || '', model: model || '', filename: objectName, region: this.country },
      },
    ];

    const errors = [];
    for (const ep of endpoints) {
      const url = `${this.baseUrl}${ep.path}`;
      try {
        let response = await fetch(url, {
          method: 'POST',
          headers: this._authHeaders(),
          body: JSON.stringify(ep.body),
          signal: AbortSignal.timeout(15000),
        });

        // Retry once on 401 (token expired between _ensureToken and request)
        if (response.status === 401) {
          this._log(`[MAP-API] ${ep.path} returned 401, refreshing token`);
          await this.refreshAccessToken();
          response = await fetch(url, {
            method: 'POST',
            headers: this._authHeaders(),
            body: JSON.stringify(ep.body),
            signal: AbortSignal.timeout(15000),
          });
        }

        const data = await response.json();

        // Extract download URL from response
        let downloadUrl = null;
        if (data.data && typeof data.data === 'string' && data.data.startsWith('http')) {
          downloadUrl = data.data;
        } else if (data.data && data.data.url) {
          downloadUrl = data.data.url;
        }

        if (downloadUrl) {
          const mapResponse = await fetch(downloadUrl, { signal: AbortSignal.timeout(60000) });
          if (!mapResponse.ok) {
            errors.push(`${ep.path}: download ${mapResponse.status}`);
            this._log(`[MAP-API] Download failed: ${mapResponse.status}`);
            continue;
          }
          return Buffer.from(await mapResponse.arrayBuffer());
        }

        // No download URL in response — log the actual API response for debugging
        const code = data.code || data.status || 'unknown';
        const msg = data.msg || data.message || JSON.stringify(data).slice(0, 200);
        errors.push(`${ep.path}: no URL (code=${code}, msg=${msg})`);
        this._log(`[MAP-API] ${ep.path} returned no download URL: code=${code}, msg=${msg}`);

      } catch (e) {
        errors.push(`${ep.path}: ${e.message}`);
        this._log(`[MAP-API] ${ep.path} failed: ${e.message}`);
      }
    }

    throw new Error(`All map download endpoints failed: ${errors.join('; ')}`);
  }

  get isConnected() {
    return this._failCount < 5 && this.accessToken !== null;
  }

  setCredentials({ username, password, country }) {
    this.username = username;
    this.password = password;
    this.country = country || this.country;
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = 0;
    this._failCount = 0;
  }

}

module.exports = DreameApi;
