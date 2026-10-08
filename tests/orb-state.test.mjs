// Run with: node --test tests/orb-state.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  orbStateForTool,
  TOOL_TO_ORB,
  ANIM_TO_ORB,
  ORB_COLORS,
} from '../renderer/orb-state.js';

test('read/grep/glob/web map to searching', () => {
  for (const t of ['read', 'grep', 'glob', 'websearch', 'webfetch', 'list']) {
    assert.equal(orbStateForTool(t), 'searching', t);
  }
});

test('edit/write/multiedit map to composing', () => {
  for (const t of ['edit', 'write', 'multiedit', 'patch', 'apply_patch']) {
    assert.equal(orbStateForTool(t), 'composing', t);
  }
});

test('task/agent map to shaping', () => {
  for (const t of ['task', 'agent', 'subagent']) {
    assert.equal(orbStateForTool(t), 'shaping', t);
  }
});

test('ask/question map to listening', () => {
  for (const t of ['askuserquestion', 'question']) {
    assert.equal(orbStateForTool(t), 'listening', t);
  }
});

test('plain bash maps to solving', () => {
  assert.equal(orbStateForTool('bash', 'ls -la'), 'solving');
  assert.equal(orbStateForTool('shell', 'pwd'), 'solving');
});

test('git write commands override bash to shaping', () => {
  assert.equal(orbStateForTool('bash', 'git push origin master'), 'shaping');
  assert.equal(orbStateForTool('bash', 'git commit -m "x"'), 'shaping');
  assert.equal(orbStateForTool('shell', 'cd /x && git rebase main'), 'shaping');
});

test('non-write git commands stay solving', () => {
  assert.equal(orbStateForTool('bash', 'git status'), 'solving');
  assert.equal(orbStateForTool('bash', 'git log --oneline'), 'solving');
});

test('tool names are case-insensitive', () => {
  assert.equal(orbStateForTool('Read'), 'searching');
  assert.equal(orbStateForTool('BASH', 'git push'), 'shaping');
});

test('unknown / empty tool falls back to solving', () => {
  assert.equal(orbStateForTool('frobnicate'), 'solving');
  assert.equal(orbStateForTool(''), 'solving');
  assert.equal(orbStateForTool(undefined), 'solving');
});

test('every anim maps to a state that has a colour', () => {
  for (const [anim, state] of Object.entries(ANIM_TO_ORB)) {
    assert.ok(ORB_COLORS[state], `anim ${anim} → ${state} has no colour`);
  }
});

test('every tool target has a colour', () => {
  for (const [tool, state] of Object.entries(TOOL_TO_ORB)) {
    assert.ok(ORB_COLORS[state], `tool ${tool} → ${state} has no colour`);
  }
});
