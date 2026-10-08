'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { StateWatcher, EVENT_MAP } = require('../lib/state-watcher');

const writeState = (file, state) => fs.writeFileSync(file, JSON.stringify(state));

describe('StateWatcher', () => {
  let dir, file, watcher;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'peon-state-'));
    file = path.join(dir, '.state.json');
    watcher = new StateWatcher(file);
  });

  afterEach(() => {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  });

  test('seeds SessionSeen for non-Claude sessions and skips UUIDs', () => {
    writeState(file, {
      session_start_times: {
        'oc-1791495809676': 1791497220.5,
        '73eeccc8-9afa-4626-b1c9-a14b479d013f': 1791469552.5,
      },
    });
    const events = [];
    watcher.on('session-event', (e) => events.push(e));
    watcher._poll();

    const seen = events.filter((e) => e.event === 'SessionSeen');
    expect(seen).toHaveLength(1);
    expect(seen[0].sessionId).toBe('oc-1791495809676');
    expect(seen[0].timestamp).toBe(1791497220500);
  });

  test('first poll adopts last_active silently (no startup replay)', () => {
    writeState(file, { last_active: { session_id: 'oc-1', event: 'Stop', timestamp: 100 } });
    const events = [];
    watcher.on('session-event', (e) => events.push(e));
    watcher._poll();
    expect(events).toHaveLength(0);
  });

  test('emits mapped event for a new non-Claude last_active', () => {
    writeState(file, { last_active: { session_id: 'oc-1', event: 'Stop', timestamp: 100 } });
    watcher._poll(); // initialize at ts=100

    const events = [];
    watcher.on('session-event', (e) => events.push(e));
    writeState(file, {
      last_active: { session_id: 'oc-2', event: 'UserPromptSubmit', timestamp: 101, cwd: '/tmp/x' },
    });
    watcher._poll();

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      sessionId: 'oc-2',
      event: 'UserPromptSubmit',
      cwd: '/tmp/x',
      timestamp: 101000,
    });
  });

  test('skips UUID last_active (Claude is owned by JsonlWatcher)', () => {
    writeState(file, { last_active: { session_id: 'oc-1', event: 'Stop', timestamp: 100 } });
    watcher._poll();

    const events = [];
    watcher.on('session-event', (e) => events.push(e));
    writeState(file, {
      last_active: { session_id: '73eeccc8-9afa-4626-b1c9-a14b479d013f', event: 'Stop', timestamp: 102 },
    });
    watcher._poll();
    expect(events).toHaveLength(0);
  });

  test('maps Notification → PermissionRequest', () => {
    expect(EVENT_MAP.Notification).toBe('PermissionRequest');
  });
});
