'use strict';

const Homey = require('homey');
const DreameApi = require('./lib/DreameApi');

class DreameApp extends Homey.App {

  async onInit() {
    this.log('Dreame app initialized');
    this._api = null;
    this._initApi();
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

    // Auto-save tokens whenever they change
    this._api.onTokenUpdate = (tokens) => {
      this.homey.settings.set('accessToken', tokens.accessToken);
      this.homey.settings.set('refreshToken', tokens.refreshToken);
      this.homey.settings.set('tokenExpiry', tokens.tokenExpiry);
      this.homey.settings.set('tenantId', tokens.tenantId);
    };
  }

  getApi() {
    return this._api;
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

}

module.exports = DreameApp;
