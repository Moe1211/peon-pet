# pick-up.md — peon-pet local mods

> Handoff for the next agent. Written 2026-10-09.

## What this is

Local fork of `PeonPing/peon-pet` (upstream `origin`), a macOS desktop pet for
peon-ping. On this machine it's been turned into a **JARVIS-style thinking orb**
that reacts to Claude Code **and** OpenCode sessions.

## Where we are

- **Remotes:** `origin` = upstream (`PeonPing/peon-pet`); `fork` =
  `Moe1211/peon-pet` → https://github.com/Moe1211/peon-pet
- **Branch:** `local/orb-adapters`, pushed to `fork` (tracks
  `fork/local/orb-adapters`). `master` stays clean at upstream `ca7c312`.
- **Commits** (on top of upstream `ca7c312`):
  ```
  eb6ed81 docs: pick-up handoff notes
  9e62010 docs: orb, adapters, tool bridge, waiting latch
  c4c6d9c fix: install.sh Electron binary path for launchd
  7afa3d2 feat: react to non-Claude sessions + OpenCode tool bridge
  ac990e8 feat: JARVIS thinking-orb pet (sprite retired)
  ```
- Sync upstream: `git fetch origin` → rebase `local/orb-adapters` onto `origin/master`.
- App running under launchd `com.peonpet.app` (pid changes on restart).

## How to run / verify

```sh
cd ~/stacks/peon-pet
npm test            # 120 Jest + 11 node --test (tests/orb-state.test.mjs)
npm start           # foreground (or `npm run dev` for DevTools)
./install.sh        # (re)install LaunchAgent — unloads + reloads
./uninstall.sh      # stop + remove
tail -f /tmp/peon-pet.err   # logs: /tmp/peon-pet.{log,err}
```

Simulate an event: write a peon-ping hook event to
`~/.claude/hooks/peon-ping/.state.json` (`last_active.event`, timestamp in **seconds**).
Valid: `SessionStart`, `UserPromptSubmit`, `Stop`, `PermissionRequest`,
`PostToolUseFailure`, `PreCompact`, `Notification`, `SessionEnd`.

## Architecture (the mod)

- **`renderer/orb-state.js`** — pure mapping (no DOM/THREE). `ANIM_TO_ORB`,
  `ORB_COLORS`, `TOOL_TO_ORB`, `orbStateForTool`. Imported by `renderer/app.js`,
  covered by `tests/orb-state.test.mjs`.
- **`renderer/app.js`** — orb replaces the sprite (`sprite.visible=false`, bg/border
  hidden too). Tool events drive the orb directly; `playAnim` still runs (hidden).
- **`renderer/vendor/thinking-orbs.js`** — vendored orb renderer (bundled ESM).
  Locally patched: dark-theme ink made runtime-tintable via
  `globalThis.__peonOrbInk` / `__peonOrbTintRGBA`. See its header.
- **`lib/state-watcher.js`** — polls peon-ping `.state.json` for **non-Claude**
  sessions (OpenCode `oc-<epoch>`, Cursor); Claude UUIDs skipped (owned by
  `lib/jsonl-watcher.js`).
- **`lib/tool-watcher.js`** + plugin `~/.config/opencode/plugins/peon-pet-tools.ts`
  → bridge file `~/.peon-pet/tool.json` → orb state per OpenCode tool.
- **Waiting latch** — `PermissionRequest`/`Notification` hold the orb **gold
  (listening)** and suppress the 30s idle→sleep until a resume event. Mapping:
  `lib/session-tracker.js` → `waitingTransition()`; wired in `main.js` +
  `renderer/app.js`.

## Open loops / gotchas

- [ ] **Vendor provenance unknown** — `renderer/vendor/thinking-orbs.js` ships no
      source URL/version/license. Fill the header when known; don't drop the tint
      patches when re-vendoring.
- [ ] **Phase 3 cleanup skipped** — `bg.png` / sprite atlas / border are still
      loaded then hidden (`renderer/app.js`); they're also referenced in `onConfig`
      and the shake code. Remove only if it starts to matter.
- [ ] **Visual confirmation pending** — no one has eyeballed the orb holding gold
      during a real plan approval. Do that.
- **`renderer/package.json`** (`{"type":"module"}`) exists so Node parses
  `renderer/*.js` as ESM for `node --test`. Don't remove it.
- **Electron path:** `install.sh` uses the real
  `node_modules/electron/dist/Electron.app/Contents/MacOS/Electron` (launchd has no
  `node`/PATH). Don't revert to the `.bin/electron` symlink.
- **Test runner split:** Jest (`tests/*.test.js`, CommonJS) + `node --test`
  (`tests/orb-state.test.mjs`, ESM). `npm test` runs both.
