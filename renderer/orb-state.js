// Pure orb mapping — no DOM, no THREE, no Electron. Imported by the renderer
// (browser ESM) and covered by tests/orb-state.test.mjs (node --test).

// Sprite anim → orb state. The sprite is hidden; playAnim still drives the orb.
export const ANIM_TO_ORB = {
  sleeping:  'idle',
  waking:    'connecting',
  typing:    'working',
  alarmed:   'listening',
  celebrate: 'responding',
  annoyed:   'solving',
};

// Per-state orb ink as "r,g,b". Read by the vendored renderer via
// globalThis.__peonOrbInk (see renderer/vendor/thinking-orbs.js — the dark-theme
// `250,250,250` literals were made runtime-tintable). Depth is carried by alpha,
// so a flat RGB keeps the shading.
export const ORB_COLORS = {
  idle:       '90,140,180',   // dim steel blue — resting
  connecting: '110,200,255',  // sky — waking / session start
  working:    '0,214,255',    // JARVIS cyan — thinking
  listening:  '255,196,64',   // gold — needs your input
  responding: '64,255,196',   // aqua-green — task complete
  solving:    '170,150,255',  // violet — recovering from error
  searching:  '90,230,200',   // mint — reading / web / grep
  composing:  '230,140,255',  // magenta — edit / write
  shaping:    '255,160,80',   // amber — subagents / git writes
};

// Tool name (lowercased) → orb state. Covers Claude Code and OpenCode tool ids.
export const TOOL_TO_ORB = {
  websearch: 'searching', webfetch: 'searching', fetch: 'searching', 'web-search': 'searching',
  read: 'searching', grep: 'searching', glob: 'searching', list: 'searching', search: 'searching',
  edit: 'composing', write: 'composing', multiedit: 'composing', patch: 'composing', apply_patch: 'composing',
  task: 'shaping', agent: 'shaping', subagent: 'shaping',
  askuserquestion: 'listening', question: 'listening',
  bash: 'solving', shell: 'solving', terminal: 'solving',
};

export const GIT_WRITE_RE = /\bgit\s+(push|commit|merge|rebase|pull|fetch|tag|reset|cherry-pick)\b/;

export function orbStateForTool(tool, command) {
  const t = String(tool || '').toLowerCase();
  if ((t === 'bash' || t === 'shell' || t === 'terminal') && command && GIT_WRITE_RE.test(String(command))) {
    return 'shaping';
  }
  return TOOL_TO_ORB[t] || 'solving';
}
