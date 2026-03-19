'use strict';

// Uses global fetch (Node 18+ built-in)

/**
 * Lightweight Sentry client using the HTTP envelope API.
 * Replaces @sentry/node (~43MB with OpenTelemetry) with ~3KB.
 * Supports: init, setTag, addBreadcrumb, captureMessage, captureException, withScope.
 */

class SentryLite {
  constructor() {
    this._dsn = null;
    this._dsnParts = null;
    this._release = null;
    this._environment = 'production';
    this._tags = {};
    this._breadcrumbs = [];
    this._beforeSend = null;
    this._maxBreadcrumbs = 30;
  }

  init({ dsn, release, environment, beforeSend }) {
    if (!dsn) return;
    this._dsn = dsn;
    this._dsnParts = this._parseDsn(dsn);
    this._release = release || undefined;
    this._environment = environment || 'production';
    this._beforeSend = beforeSend || null;
  }

  setTag(key, value) {
    this._tags[key] = value;
  }

  addBreadcrumb({ message, category, level, data }) {
    this._breadcrumbs.push({
      timestamp: Date.now() / 1000,
      message,
      category: category || 'default',
      level: level || 'info',
      data,
    });
    if (this._breadcrumbs.length > this._maxBreadcrumbs) {
      this._breadcrumbs = this._breadcrumbs.slice(-this._maxBreadcrumbs);
    }
  }

  captureMessage(message, level) {
    const event = this._buildEvent({ message, level: level || 'info' });
    this._send(event);
  }

  captureException(err) {
    const event = this._buildEvent({
      exception: {
        values: [{
          type: err.name || 'Error',
          value: err.message || String(err),
          stacktrace: err.stack ? { frames: this._parseStack(err.stack) } : undefined,
        }],
      },
      level: 'error',
    });
    this._send(event);
  }

  withScope(callback) {
    const scope = new Scope(this);
    callback(scope);
  }

  _buildEvent(overrides) {
    return {
      event_id: this._uuid(),
      timestamp: Date.now() / 1000,
      platform: 'node',
      release: this._release,
      environment: this._environment,
      tags: { ...this._tags },
      breadcrumbs: [...this._breadcrumbs],
      ...overrides,
    };
  }

  _send(event) {
    if (!this._dsnParts) return;
    if (this._beforeSend) {
      event = this._beforeSend(event);
      if (!event) return;
    }

    const { host, projectId, publicKey } = this._dsnParts;
    const url = `${host}/api/${projectId}/envelope/`;
    const header = JSON.stringify({
      event_id: event.event_id,
      sent_at: new Date().toISOString(),
      dsn: this._dsn,
    });
    const itemHeader = JSON.stringify({ type: 'event' });
    const body = `${header}\n${itemHeader}\n${JSON.stringify(event)}`;

    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-sentry-envelope',
        'X-Sentry-Auth': `Sentry sentry_version=7,sentry_client=sentry-lite/1.0,sentry_key=${publicKey}`,
      },
      body,
    }).catch(() => {}); // Fire and forget
  }

  _parseDsn(dsn) {
    try {
      const url = new URL(dsn);
      const publicKey = url.username;
      const projectId = url.pathname.replace('/', '');
      const host = `${url.protocol}//${url.host}`;
      return { host, projectId, publicKey };
    } catch {
      return null;
    }
  }

  _parseStack(stack) {
    if (!stack) return [];
    return stack.split('\n').slice(1).map(line => {
      const match = line.match(/at\s+(?:(.+?)\s+)?\(?(.+?):(\d+):(\d+)\)?/);
      if (!match) return { filename: line.trim() };
      return {
        function: match[1] || '?',
        filename: match[2],
        lineno: parseInt(match[3], 10),
        colno: parseInt(match[4], 10),
      };
    }).reverse();
  }

  _uuid() {
    return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }
}

class Scope {
  constructor(client) {
    this._client = client;
    this._extras = {};
    this._tags = {};
    this._level = null;
  }

  setExtras(extras) { this._extras = { ...this._extras, ...extras }; }
  setTag(key, value) { this._tags[key] = value; }
  setLevel(level) { this._level = level; }

  _apply(event) {
    if (Object.keys(this._extras).length > 0) event.extra = { ...event.extra, ...this._extras };
    if (Object.keys(this._tags).length > 0) event.tags = { ...event.tags, ...this._tags };
    if (this._level) event.level = this._level;
    return event;
  }
}

// Patch withScope to use Scope._apply
const instance = new SentryLite();
const origWithScope = instance.withScope.bind(instance);
instance.withScope = function (callback) {
  const scope = new Scope(instance);
  const origSend = instance._send.bind(instance);
  instance._send = (event) => {
    scope._apply(event);
    origSend(event);
  };
  callback(scope);
  instance._send = origSend;
};

module.exports = instance;
