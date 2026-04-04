export class ErrorReporter {
  constructor(options = {}) {
    this.dsn = options.dsn || import.meta.env.VITE_SENTRY_DSN;
    this.environment = options.environment || import.meta.env.VITE_ENV || 'production';
    this.release = options.release || import.meta.env.VITE_RELEASE || 'unknown';
    this.enabled = !!this.dsn;
    this.queue = [];
    this.maxQueueSize = 20;
  }

  captureException(error, context = {}) {
    const event = {
      event_id: crypto.randomUUID?.() || Math.random().toString(36).substring(2),
      timestamp: new Date().toISOString(),
      level: 'error',
      platform: 'javascript',
      logger: 'frontend',
      environment: this.environment,
      release: this.release,
      exception: {
        values: [{
          type: error.name || 'Error',
          value: error.message || String(error),
          stacktrace: error.stack ? { frames: this._parseStack(error.stack) } : undefined
        }]
      },
      extra: context,
      tags: {
        url: window.location.href,
        userAgent: navigator.userAgent
      }
    };

    this._send(event);
  }

  captureMessage(message, level = 'info', context = {}) {
    const event = {
      event_id: crypto.randomUUID?.() || Math.random().toString(36).substring(2),
      timestamp: new Date().toISOString(),
      level,
      platform: 'javascript',
      logger: 'frontend',
      environment: this.environment,
      release: this.release,
      message,
      extra: context,
      tags: {
        url: window.location.href,
        userAgent: navigator.userAgent
      }
    };

    this._send(event);
  }

  _send(event) {
    if (!this.enabled) {
      if (this.environment !== 'production') {
        console.warn('[ErrorReporter] No DSN configured, event queued:', event.message || event.exception?.values?.[0]?.value);
      }
      if (this.queue.length < this.maxQueueSize) {
        this.queue.push(event);
      }
      return;
    }

    const dsnParts = this.dsn.match(/\/\/(?<key>[^@]+)@(?<host>[^/]+)\/(?<id>\d+)/);

    if (!dsnParts) return;

    const ingestUrl = `https://${dsnParts.groups.host}/api/${dsnParts.groups.id}/envelope/`;

    const envelope = [
      { event_id: event.event_id, sent_at: new Date().toISOString(), dsn: this.dsn, sdk: { name: 'error-reporter', version: '1.0.0' } },
      { type: 'event', content_type: 'application/json' },
      event
    ];

    navigator.sendBeacon?.(ingestUrl, JSON.stringify(envelope)) ||
      fetch(ingestUrl, {
        method: 'POST',
        body: JSON.stringify(envelope),
        keepalive: true
      }).catch(() => {});
  }

  _parseStack(stack) {
    return stack.split('\n')
      .filter(line => line.includes('at ') || line.includes('@'))
      .map(line => {
        const match = line.match(/at\s+(?<func>.+?)\s+\((?<url>.+?):(?<line>\d+):(?<col>\d+)\)/)
          || line.match(/(?<func>[^@]+)@(?<url>.+?):(?<line>\d+):(?<col>\d+)/);
        if (!match) return null;
        return {
          function: match.groups.func?.trim(),
          filename: match.groups.url,
          lineno: parseInt(match.groups.line, 10),
          colno: parseInt(match.groups.col, 10)
        };
      })
      .filter(Boolean);
  }
}
