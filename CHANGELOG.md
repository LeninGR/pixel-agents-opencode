# Changelog

## v1.0.0

Initial release of the Pixel Agents OpenCode plugin — a companion visualizer that turns OpenCode sessions and sub-agents into animated pixel-art characters in a virtual office.

### Features

- **Multi-session detection** — Detects active OpenCode sessions and renders each as a pixel character in the office. Session title and project name are shown as room labels.
- **Sub-agent spawning** — SDD sub-agents (`sdd-propose`, `sdd-spec`, `sdd-design`, `sdd-tasks`, `sdd-apply`, `sdd-verify`, `sdd-explore`) appear as characters next to their parent orchestrator agent.
- **Zombie session filtering** — Raw `ses_*` session IDs from incomplete sub-agent launches are filtered at multiple levels (state manager, plugin hooks, bridge) so they never render as orphaned characters.
- **Sub-agents stack on parent** — Sub-agents spawn on the parent's tile with a visual offset instead of searching for distant walkable tiles, preventing "empty office" artifacts.
- **Node.js server** — HTTP + WebSocket server using Node.js `http.createServer` and `ws` (OpenCode runs in Node.js, not Bun).
- **Message buffer with replay** — Server buffers up to 200 recent messages (60s TTL) and replays them to new WebSocket clients so they catch up on existing agents.
- **Port conflict handling** — Server tries port 3457 first, then falls back to 3458, 3459, ... if the port is busy.
- **`clearAllAgents` handler** — Webview resets its agent state on every bridge reconnect, preventing stale agent renderings from previous sessions.

### Architecture

The plugin (loaded by OpenCode via `package.json` `main` field) starts an HTTP server that serves the pixel-art webview and a WebSocket endpoint. The bridge script (`opencode-bridge.js`) translates server messages into the message format the webview's React app expects. Session detection uses OpenCode's `session.list()` SDK method with periodic polling to catch new sub-sessions created by the `task` tool.

Built on top of the [pixel-agents](https://github.com/pablodelucca/pixel-agents) VS Code extension engine (pixel-art canvas, character FSM, layout editor, asset system).

### Files

- `src/index.ts` — Plugin entry, session hooks, sub-agent detection
- `src/server.ts` — Node.js HTTP + WebSocket server, message buffer
- `src/state-manager.ts` — Internal agent state, zombie filtering
- `src/constants.ts` — Agent palette constants
- `scripts/opencode-bridge.js` — WebSocket-to-React message translation
- `webview-ui/` — React + Vite webview with canvas rendering
- `docs/architecture-diagram.md` — Architecture documentation
