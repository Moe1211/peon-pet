'use strict';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Non-Claude adapters synthesise ids like peon-ping's OpenCode plugin: `oc-<epoch>`.
const ADAPTER_ID_RE = /^(oc|opencode)-\d+$/i;

function isValidSessionId(id) {
  if (!id || typeof id !== 'string') return false;
  return UUID_RE.test(id) || ADAPTER_ID_RE.test(id);
}

function createSessionTracker() {
  const map = new Map();

  return {
    update(sessionId, timestamp = Date.now()) {
      map.set(sessionId, timestamp);
    },
    prune(cutoff) {
      for (const [id, t] of map) {
        if (t < cutoff) map.delete(id);
      }
    },
    size() {
      return map.size;
    },
    entries() {
      return [...map.entries()];
    },
    remove(sessionId) {
      map.delete(sessionId);
    },
  };
}

function buildSessionStates(entries, now, hotMs, warmMs, maxCount) {
  return entries
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxCount)
    .map(([id, t]) => ({
      id,
      hot:  (now - t) < hotMs,
      warm: (now - t) < warmMs,
    }));
}

const EVENT_TO_ANIM = {
  SessionStart:       'waking',
  Stop:               'celebrate',
  UserPromptSubmit:   'typing',
  PermissionRequest:  'alarmed',
  PostToolUseFailure: 'annoyed',
  PreCompact:         'alarmed',
};

// Events meaning the agent is blocked on the user, and events meaning it resumed.
// Latches the pet into the 'listening' state until you answer (permission / plan
// approval), instead of decaying back to thinking/sleeping while it waits.
const WAITING_EVENTS = new Set(['PermissionRequest', 'Notification']);
const RESUME_EVENTS  = new Set([
  'UserPromptSubmit', 'Stop', 'SessionStart', 'ToolUse', 'PostToolUseFailure', 'SessionEnd',
]);

// → true (start waiting), false (resume), null (no change)
function waitingTransition(event) {
  if (WAITING_EVENTS.has(event)) return true;
  if (RESUME_EVENTS.has(event)) return false;
  return null;
}

module.exports = {
  isValidSessionId,
  createSessionTracker,
  buildSessionStates,
  EVENT_TO_ANIM,
  waitingTransition,
  WAITING_EVENTS,
  RESUME_EVENTS,
};
