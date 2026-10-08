'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const EventEmitter = require('events');

const POLL_INTERVAL_MS = 500;

// Written by the OpenCode bridge plugin (~/.config/opencode/plugins/peon-pet-tools.ts)
// on every `tool.execute.before`. OpenCode tool names aren't in peon-ping's
// state, so this is how OpenCode tool calls reach the pet.
function defaultBridgePath() {
  return path.join(os.homedir(), '.peon-pet', 'tool.json');
}

/**
 * Watches the OpenCode tool bridge file. Emits:
 *   'tool' { sessionId, tool, command }
 */
class ToolWatcher extends EventEmitter {
  constructor(filePath = defaultBridgePath()) {
    super();
    this._file = filePath;
    this._interval = null;
    this._last = 0;
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
    let data;
    try {
      data = JSON.parse(fs.readFileSync(this._file, 'utf8'));
    } catch {
      return;
    }
    const ts = Number(data.timestamp) || 0;
    if (ts <= this._last) return;
    this._last = ts;
    this.emit('tool', {
      sessionId: data.session_id,
      tool: data.tool,
      command: data.command,
    });
  }
}

module.exports = { ToolWatcher };
