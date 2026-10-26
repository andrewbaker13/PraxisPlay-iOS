/**
 * Praxis Play Team Edition: the client every page uses (phone, projector, host console).
 *
 * The reliability contract (backend .github/instructions/team-games.instructions.md §6a) in code:
 *   - the server holds all state; this client holds a token and refetches everything else
 *   - reconnect is automatic, silent and bounded: 1 s, 2 s, 4 s, 8 s, capped at 10 s, with jitter
 *   - the clock is the server's `round_ends_at`; `timer` ticks correct drift; nothing here ends a round
 *   - HTTP is the fallback: when the socket is down, `me` is polled every few seconds and votes still go
 *   - joining is idempotent: the identity for a room is kept in localStorage and reused
 *
 * Policy functions are pure and exported for tests; the TeamPlayClient class wires them to fetch and
 * WebSocket. No DOM in this file: pages render from the events it emits.
 */
(function (root) {
  'use strict';

  var POLICY = {
    BACKOFF_BASE_MS: 1000,
    BACKOFF_CAP_MS: 10000,
    BACKOFF_JITTER: 0.3,          // up to 30% extra, so a room that blips does not reconnect in lockstep
    MAX_RECONNECT_ATTEMPTS: 0,    // 0 = never give up; a lesson is short and the student did nothing wrong
    POLL_MS_WHEN_DOWN: 3000,      // HTTP fallback cadence while the socket is down
    POLL_MS_WHEN_UP: 20000,       // safety poll while the socket is up, in case an event was missed
    CLOCK_DRIFT_TOLERANCE_S: 1.5, // a timer tick further than this from our clock re-anchors it
    CLOSE_UNKNOWN_ROOM: 4004,     // the server's code for "no such room": do not retry
  };

  function backoffMs(attempt, random) {
    var r = typeof random === 'number' ? random : Math.random();
    var base = Math.min(POLICY.BACKOFF_CAP_MS, POLICY.BACKOFF_BASE_MS * Math.pow(2, Math.max(0, attempt)));
    return Math.round(base + r * POLICY.BACKOFF_JITTER * base);
  }

  function identityKey(room) { return 'teamplay:' + String(room).toUpperCase() + ':identity'; }

  function saveIdentity(storage, room, identity) {
    try { storage.setItem(identityKey(room), JSON.stringify(identity)); return true; } catch (e) { return false; }
  }

  function loadIdentity(storage, room) {
    try {
      var raw = storage.getItem(identityKey(room));
      if (!raw) return null;
      var obj = JSON.parse(raw);
      return obj && typeof obj.player_token === 'string' && obj.player_token ? obj : null;
    } catch (e) { return null; }
  }

  function clearIdentity(storage, room) {
    try { storage.removeItem(identityKey(room)); } catch (e) { /* storage may be blocked */ }
  }

  function projectorTokenKey(room) { return 'teamplay:' + String(room).toUpperCase() + ':projector_token'; }

  function saveProjectorToken(storage, room, token) {
    try { storage.setItem(projectorTokenKey(room), String(token || '')); return true; } catch (e) { return false; }
  }

  function loadProjectorToken(storage, room) {
    try { return storage.getItem(projectorTokenKey(room)) || null; } catch (e) { return null; }
  }

  /** Django writes microseconds; some date parsers accept only milliseconds. Trim before parsing. */
  function parseServerTime(iso) {
    if (!iso) return NaN;
    return Date.parse(String(iso).replace(/(\.\d{3})\d+/, '$1'));
  }

  /** Seconds left on the server's deadline, from an ISO timestamp and the local clock plus a measured offset. */
  function secondsLeft(roundEndsAtIso, nowMs, offsetMs) {
    if (!roundEndsAtIso) return null;
    var ends = parseServerTime(roundEndsAtIso);
    if (isNaN(ends)) return null;
    var left = (ends - (nowMs + (offsetMs || 0))) / 1000;
    return left > 0 ? left : 0;
  }

  /** Re-anchor the local clock to the server's tick when they disagree by more than the tolerance. */
  function clockOffsetFromTick(roundEndsAtIso, serverTimeRemaining, nowMs, currentOffsetMs) {
    var ours = secondsLeft(roundEndsAtIso, nowMs, currentOffsetMs);
    if (ours === null || typeof serverTimeRemaining !== 'number') return currentOffsetMs || 0;
    var drift = ours - serverTimeRemaining;
    if (Math.abs(drift) <= POLICY.CLOCK_DRIFT_TOLERANCE_S) return currentOffsetMs || 0;
    return (currentOffsetMs || 0) + drift * 1000;
  }

  function TeamPlayClient(opts) {
    this.room = String(opts.room || '').toUpperCase();
    this.apiBase = opts.apiBase;
    this.wsBase = opts.wsBase;
    this.role = opts.role || 'player';                 // 'player' | 'host' | 'projector'
    this.playerToken = opts.playerToken || null;       // players
    this.authToken = opts.authToken || null;           // host and projector (the instructor's API token)
    this.projectorToken = opts.projectorToken || null; // paired classroom projector token (Room Code + 4-digit PIN)
    this.projectorPin = opts.projectorPin || null;     // optional 4-digit projector PIN
    this.onEvent = opts.onEvent || function () {};
    this.onStatus = opts.onStatus || function () {};
    this.fetchImpl = opts.fetch || (root.fetch ? root.fetch.bind(root) : null);
    this.WebSocketImpl = opts.WebSocket || root.WebSocket;
    this.setTimeoutImpl = opts.setTimeout || root.setTimeout.bind(root);
    this.clearTimeoutImpl = opts.clearTimeout || root.clearTimeout.bind(root);
    this.now = opts.now || function () { return Date.now(); };
    this.random = opts.random || Math.random;
    this.socket = null;
    this.status = 'idle';         // idle | connecting | live | reconnecting | polling | closed
    this.attempts = 0;
    this.reconnectTimer = null;
    this.pollTimer = null;
    this.closedByUs = false;
    this.clockOffsetMs = 0;
    this.lastState = null;
  }

  TeamPlayClient.prototype._setStatus = function (s) {
    if (this.status !== s) { this.status = s; this.onStatus(s, this); }
  };

  TeamPlayClient.prototype._headers = function (json) {
    var h = {};
    if (json) h['Content-Type'] = 'application/json';
    if (this.role === 'player' && this.playerToken) h['X-Team-Play-Token'] = this.playerToken;
    if (this.role !== 'player' && this.authToken) h['Authorization'] = 'Token ' + this.authToken;
    if (this.role === 'projector' && this.projectorToken) h['X-Projector-Token'] = this.projectorToken;
    if (this.role === 'projector' && this.projectorPin) h['X-Projector-Pin'] = this.projectorPin;
    return h;
  };

  TeamPlayClient.prototype._api = function (method, path, body) {
    var self = this;
    if (!this.fetchImpl) return Promise.reject(new Error('fetch unavailable'));
    return this.fetchImpl(this.apiBase + '/team-play/' + path, {
      method: method, headers: this._headers(!!body), body: body ? JSON.stringify(body) : undefined,
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        return { ok: res.ok, status: res.status, data: data };
      });
    }).then(function (r) {
      if (r.ok && r.data && r.data.session) self.lastState = r.data.session;
      return r;
    });
  };

  // ---- HTTP: the path that always works
  TeamPlayClient.prototype.fetchMe = function () { return this._api('GET', 'sessions/' + this.room + '/me/'); };
  TeamPlayClient.prototype.fetchPublic = function () { return this._api('GET', 'sessions/' + this.room + '/'); };
  TeamPlayClient.prototype.fetchHost = function () { return this._api('GET', 'sessions/' + this.room + '/host/'); };
  TeamPlayClient.prototype.decide = function (optionKey, roundInstanceId) {
    return this._api('POST', 'sessions/' + this.room + '/decide/', { option_key: optionKey, round_instance_id: roundInstanceId });
  };
  TeamPlayClient.prototype.hostAction = function (action, body) {
    // start | round/start | round/extend | round/end | advance | end
    return this._api('POST', 'sessions/' + this.room + '/' + action + '/', body || {});
  };

  /** The view this role should render from, over HTTP. */
  TeamPlayClient.prototype.refresh = function () {
    if (this.role === 'player') return this.fetchMe();
    // The projector is the instructor's own browser, so it reads the host view: it needs both teams'
    // choices and the client's key once the host reveals them. The public view is for anyone else.
    if (this.role === 'host' || this.role === 'projector') return this.fetchHost();
    return this.fetchPublic();
  };

  // ---- WebSocket: makes it live; never required
  TeamPlayClient.prototype.connect = function () {
    var self = this;
    if (this.closedByUs || !this.WebSocketImpl) { this._startPolling(); return; }
    this._setStatus(this.attempts === 0 ? 'connecting' : 'reconnecting');
    var ws;
    try { ws = new this.WebSocketImpl(this.wsBase + '/ws/team-play/' + this.room + '/'); }
    catch (e) { this._scheduleReconnect(); return; }
    this.socket = ws;
    ws.onopen = function () {
      self.attempts = 0;
      self._send(self.role === 'player'
        ? { type: 'identify', role: 'player', player_token: self.playerToken }
        : { type: 'identify', role: self.role, auth_token: self.authToken, projector_token: self.projectorToken, projector_pin: self.projectorPin });
    };
    ws.onmessage = function (ev) {
      var msg;
      try { msg = JSON.parse(ev.data); } catch (e) { return; }
      self._handle(msg);
    };
    ws.onclose = function (ev) {
      self.socket = null;
      if (self.closedByUs) { self._setStatus('closed'); return; }
      if (ev && ev.code === POLICY.CLOSE_UNKNOWN_ROOM) { self._setStatus('closed'); self.onEvent({ type: 'room_gone' }); return; }
      self._scheduleReconnect();
    };
    ws.onerror = function () { /* onclose follows */ };
  };

  TeamPlayClient.prototype._send = function (obj) {
    try { if (this.socket && this.socket.readyState === 1) this.socket.send(JSON.stringify(obj)); } catch (e) { /* ignore */ }
  };

  TeamPlayClient.prototype._handle = function (msg) {
    var self = this;
    switch (msg.type) {
      case 'ping':
        this._send({ type: 'pong', t: msg.t });
        return;
      case 'identified':
        this._setStatus('live');
        this._startPolling();          // the safety poll at the slow cadence
        this.refresh().then(function (r) { if (r.ok) self.onEvent({ type: 'view', data: r.data }); });
        return;
      case 'error':
        this.onEvent(msg);
        return;
      case 'timer':
        this.clockOffsetMs = clockOffsetFromTick(msg.round_ends_at, msg.time_remaining, this.now(), this.clockOffsetMs);
        this.onEvent(msg);
        return;
      case 'state_changed':
      case 'round_opened':
        this.onEvent(msg);
        this.refresh().then(function (r) { if (r.ok) self.onEvent({ type: 'view', data: r.data }); });
        return;
      default:
        this.onEvent(msg);  // hello, roster, desk_progress, presence
    }
  };

  TeamPlayClient.prototype._scheduleReconnect = function () {
    var self = this;
    if (this.closedByUs) return;
    if (POLICY.MAX_RECONNECT_ATTEMPTS && this.attempts >= POLICY.MAX_RECONNECT_ATTEMPTS) { this._setStatus('polling'); this._startPolling(); return; }
    this._setStatus('reconnecting');
    this._startPolling();            // the fallback cadence kicks in while the socket is down
    var delay = backoffMs(this.attempts, this.random());
    this.attempts++;
    if (this.reconnectTimer) this.clearTimeoutImpl(this.reconnectTimer);
    this.reconnectTimer = this.setTimeoutImpl(function () { self.reconnectTimer = null; self.connect(); }, delay);
    return delay;
  };

  /** Called by pages on visibilitychange: a phone that wakes up reconnects now, not after the backoff. */
  TeamPlayClient.prototype.resume = function () {
    if (this.closedByUs || this.status === 'live' || this.status === 'connecting') return;
    if (this.reconnectTimer) { this.clearTimeoutImpl(this.reconnectTimer); this.reconnectTimer = null; }
    this.attempts = 0;
    this.connect();
  };

  TeamPlayClient.prototype._startPolling = function () {
    var self = this;
    var cadence = this.status === 'live' ? POLICY.POLL_MS_WHEN_UP : POLICY.POLL_MS_WHEN_DOWN;
    if (this.pollTimer) this.clearTimeoutImpl(this.pollTimer);
    this.pollTimer = this.setTimeoutImpl(function tick() {
      self.pollTimer = null;
      if (self.closedByUs) return;
      self.refresh().then(function (r) { if (r.ok) self.onEvent({ type: 'view', data: r.data, polled: true }); })
        .catch(function () { /* next tick retries */ })
        .then(function () { self._startPolling(); });
    }, cadence);
  };

  TeamPlayClient.prototype.secondsLeft = function (roundEndsAtIso) {
    return secondsLeft(roundEndsAtIso, this.now(), this.clockOffsetMs);
  };

  TeamPlayClient.prototype.close = function () {
    this.closedByUs = true;
    if (this.reconnectTimer) { this.clearTimeoutImpl(this.reconnectTimer); this.reconnectTimer = null; }
    if (this.pollTimer) { this.clearTimeoutImpl(this.pollTimer); this.pollTimer = null; }
    try { if (this.socket) this.socket.close(1000, 'bye'); } catch (e) { /* ignore */ }
    this._setStatus('closed');
  };

  var TeamPlay = {
    POLICY: POLICY, backoffMs: backoffMs, identityKey: identityKey, saveIdentity: saveIdentity,
    loadIdentity: loadIdentity, clearIdentity: clearIdentity,
    projectorTokenKey: projectorTokenKey, saveProjectorToken: saveProjectorToken, loadProjectorToken: loadProjectorToken,
    secondsLeft: secondsLeft, parseServerTime: parseServerTime,
    clockOffsetFromTick: clockOffsetFromTick, TeamPlayClient: TeamPlayClient,
  };
  root.TeamPlay = TeamPlay;
  if (typeof module !== 'undefined' && module.exports) module.exports = TeamPlay;
})(typeof window !== 'undefined' ? window : globalThis);
