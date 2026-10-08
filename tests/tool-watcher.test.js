'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { ToolWatcher } = require('../lib/tool-watcher');

describe('ToolWatcher', () => {
  let dir, file, watcher;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'peon-tool-'));
    file = path.join(dir, 'tool.json');
    watcher = new ToolWatcher(file);
  });

  afterEach(() => {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  });

  test('emits on a new bridge write', () => {
    fs.writeFileSync(file, JSON.stringify({
      session_id: 'oc-1', tool: 'bash', command: 'git push', timestamp: 100,
    }));
    const events = [];
    watcher.on('tool', (e) => events.push(e));
    watcher._poll();

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ sessionId: 'oc-1', tool: 'bash', command: 'git push' });
  });

  test('ignores a stale timestamp', () => {
    fs.writeFileSync(file, JSON.stringify({ tool: 'read', timestamp: 100 }));
    watcher._poll();
    const events = [];
    watcher.on('tool', (e) => events.push(e));
    watcher._poll();
    expect(events).toHaveLength(0);
  });

  test('missing file is a no-op', () => {
    const events = [];
    watcher.on('tool', (e) => events.push(e));
    watcher._poll();
    expect(events).toHaveLength(0);
  });
});
