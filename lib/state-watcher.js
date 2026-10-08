'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const EventEmitter = require('events');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const POLL_INTERVAL_MS = 700;

// peon-ping hook event → peon-pet event (EVENT_TO_ANIM keys in session-tracker)
const EVENT_MAP = {
  SessionStart: 'SessionStart',
  UserPromptSubmit: 'UserPromptSubmit',
  Stop: 'Stop',
  Notification: 'PermissionRequest',
  PermissionRequest: 'PermissionRequest',
  PostToolUseFailure: 'PostToolUseFailure',
  PreCompact: 'PreCompact',
  idle_prompt: 'Stop',
  SessionEnd: 'SessionEnd',
};

function defaultStatePath() {
  const configDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
  return path.join(configDir, 'hooks', 'peon-ping', '.state.json');
}

/**
 * Watches peon-ping's `.state.json` — the one place every IDE adapter
 * (Claude Code, OpenCode, Cursor, …) records its most recent event. This is how
 * non-Claude sessions reach the pet (e.g. OpenCode via Paseo, ids like `oc-…`):
 * JsonlWatcher only ever sees `~/.claude/projects` transcripts, which OpenCode
 * never writes.
 *
 * Claude sessions (UUID ids) are skipped here — JsonlWatcher owns them and
 * emits richer events; reacting to both would double-fire animations.
 *
 * Emits: 'session-event' { sessionId, event, cwd, timestamp(ms) }
 */
class StateWatcher extends EventEmitter {
  constructor(statePath = defaultStatePath()) {
    super();
    this._path = statePath;
    this._interval = null;
    this._initialized = false;
    this._lastTs = 0;       // last processed last_active.timestamp (seconds)
    this._seen = new Set(); // session ids we've emitted SessionSeen for
  }

  start() {
    this._poll();
    this._interval = setInterval(() => this._poll(), POLL_INTERVAL_MS);
  }

  stop() {
    if (this._interval) clearInterval(this._interval);
    this._interval = null;
  }

  _poll() {
    let state;
    try {
      state = JSON.parse(fs.readFileSync(this._path, 'utf8'));
    } catch {
      return;
    }

    // Seed dots for known non-Claude sessions (once each).
    const starts = state.session_start_times || {};
    for (const [sid, t] of Object.entries(starts)) {
      if (this._seen.has(sid) || UUID_RE.test(sid)) continue;
      this._seen.add(sid);
      this.emit('session-event', {
        sessionId: sid,
        event: 'SessionSeen',
        cwd: null,
        timestamp: Math.round((Number(t) || 0) * 1000),
      });
    }

    const la = state.last_active;
    // First poll: adopt the current timestamp silently so we don't replay a
    // stale event (e.g. an old Stop) as an animation on startup.
    if (!this._initialized) {
      this._initialized = true;
      if (la) this._lastTs = Number(la.timestamp) || 0;
      return;
    }

    if (!la || !la.session_id) return;
    const ts = Number(la.timestamp) || 0;
    if (ts <= this._lastTs) return;
    this._lastTs = ts;
    if (UUID_RE.test(la.session_id)) return; // Claude → JsonlWatcher

    this.emit('session-event', {
      sessionId: la.session_id,
      event: EVENT_MAP[la.event] || la.event,
      cwd: la.cwd || null,
      timestamp: Math.round(ts * 1000),
    });
  }
}

module.exports = { StateWatcher, EVENT_MAP };
