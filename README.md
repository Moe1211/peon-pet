# peon-pet

A macOS desktop pet for [Peon-Ping](https://peonping.com) — a JARVIS-style thinking orb that reacts to your Claude Code **and** OpenCode events. Built on Electron + Three.js.

<video src="https://github.com/user-attachments/assets/7fd9a2cb-d227-49ad-8ccc-7953ec392a2d" autoplay loop muted playsinline width="400"></video>

Sits in the bottom-left corner of your screen, floats over all windows, and ignores mouse clicks (hover for tooltips).

## Requirements

- macOS 13 or later (required by Electron 44; Linux/Windows untested)
- Node.js 18+
- [peon-ping](https://peonping.com) installed and running

## Quick start

```bash
git clone <repo> peon-pet
cd peon-pet
npm install
npm start
```

Check your dock for the Peon-Ping logo — right-click it for controls.

## Install permanently (auto-start at login)

```bash
./install.sh
```

Installs a macOS LaunchAgent that starts peon-pet at login and restarts it if it quits. Logs go to `/tmp/peon-pet.log`.

To remove:

```bash
./uninstall.sh
```

## Dock controls

Right-click the dock icon:

- **Hide Pet** / **Show Pet** — toggle visibility without quitting
- **Quit** — exit completely

## States

The pet is a JARVIS-style **thinking orb** (`renderer/app.js` + `renderer/orb-state.js`).
The sprite is retired; the orb colour encodes what's happening:

| State | Colour | When |
|---|---|---|
| idle | dim steel blue | sleeping / nothing running |
| connecting | sky | session start / resume |
| working | JARVIS cyan | thinking (prompt submitted, task running) |
| listening | gold | **waiting on you** — permission / plan approval |
| responding | aqua-green | task complete (`Stop`) |
| solving | violet | tool failure / plain shell |
| searching | mint | read / grep / glob / web |
| composing | magenta | edit / write |
| shaping | amber | subagents, or a git write (`push`/`commit`/`merge`/…) |

Events (Claude Code + OpenCode via peon-ping):

| Event | Orb |
|---|---|
| `SessionStart` | connecting |
| `UserPromptSubmit` | working |
| `Stop` | responding |
| `PermissionRequest` / `Notification` | listening |
| `PostToolUseFailure` | solving |
| `PreCompact` | listening |

**Waiting latch:** when the agent blocks on you (permission prompt / plan approval), the orb
holds **gold** and does not decay to thinking/sleeping until you answer — no more idling while an
approval is pending.

Tool calls drive the orb directly (`read`→searching, `edit`→composing, `bash`→solving, …; a
`git push/commit/…` inside a shell command → shaping). See `renderer/orb-state.js`.

The pet returns to **idle** after 30 s of inactivity (unless it's waiting on you).

## Session dots

Up to 10 glowing orbs appear above the pet — one per tracked session (Claude Code or OpenCode):

- **Bright pulsing green** — active (event within last 30 s)
- **Dim green** — idle (last event 30 s–2 min ago)

Sessions are removed when Claude Code fires `SessionEnd`, or automatically after 10 min of inactivity.

Hover over a dot to see the project folder and status. Hover anywhere on the widget to see all active project names.

## Non-Claude sessions (OpenCode, Cursor, …)

Claude Code transcripts under `~/.claude/projects` are watched by `lib/jsonl-watcher.js`.
Non-Claude adapters never write those, so `lib/state-watcher.js` also polls peon-ping's
`~/.claude/hooks/peon-ping/.state.json` — the one file every adapter updates. Session ids like
`oc-<epoch>` are accepted. The two sources are deduped: Claude UUIDs are handled by the JSONL
watcher only.

### OpenCode tool bridge

OpenCode tool calls don't reach peon-ping, so a small OpenCode plugin writes the latest tool to a
bridge file:

- Plugin: `~/.config/opencode/plugins/peon-pet-tools.ts` (hooks `tool.execute.before`)
- Bridge file: `~/.peon-pet/tool.json` → `{ session_id, tool, command, timestamp }`
- Watcher: `lib/tool-watcher.js` polls it → IPC → orb state

Independent of peon-ping's own adapter, so peon-ping upgrades won't clobber it.

## Dependencies

- **boolean**: Replaced with a local shim (`patches/boolean-shim`) via `overrides` so the deprecated `boolean` package is not installed. The shim matches the same API (`boolean`, `isBooleanable`).
- **glob / inflight**: These come from **Jest** (and related packages). Jest 29 still uses `glob@7`, which depends on deprecated `inflight`. You may see npm deprecation warnings; they are harmless. Upgrading to `glob@10` would require Jest to use the new API (see [jestjs/jest#15173](https://github.com/jestjs/jest/issues/15173), [#15910](https://github.com/jestjs/jest/issues/15910)). Until Jest updates, the warnings can be ignored or suppressed.

## Development

```bash
npm run dev    # starts with DevTools detached
npm test       # Jest suites + node --test for the pure orb mapping
```

Simulate an event by writing to the peon-ping state file:

```bash
python3 -c "
import json, time, os, uuid
f = os.path.expanduser('~/.claude/hooks/peon-ping/.state.json')
try: state = json.load(open(f))
except: state = {}
state['last_active'] = {
  'session_id': str(uuid.uuid4()),
  'timestamp': time.time(),
  'event': 'PermissionRequest'
}
json.dump(state, open(f, 'w'))
"
```

Valid events: `SessionStart`, `SessionEnd`, `Stop`, `UserPromptSubmit`, `PermissionRequest`, `PostToolUseFailure`, `PreCompact`

## Assets

The orb is drawn by the vendored `renderer/vendor/thinking-orbs.js` (see the header of that file
for the local tint patches). The old sprite/atlas assets (`renderer/assets/*`) and the bundled
characters (orc / capybara / hello-kitty) are retained but no longer shown — the orb replaces the
sprite.
