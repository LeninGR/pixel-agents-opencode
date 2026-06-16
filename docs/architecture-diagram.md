# Pixel Agents — Architecture Diagram

## High-level flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                              USER BROWSER                                 │
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  http://localhost:3457                                             │   │
│  │  ┌───────────────────────┐  ┌─────────────────────────────────┐  │   │
│  │  │  React Webview (Vite) │  │  opencode-bridge.js             │  │   │
│  │  │                       │  │  (WebSocket client)             │  │   │
│  │  │  - App.tsx            │  │                                 │  │   │
│  │  │  - useExtensionMsg    │◄─┤  Translates:                    │  │   │
│  │  │  - OfficeCanvas       │  │  server msg → React msg         │  │   │
│  │  │  - OfficeState        │  │  (agent_spawn → agentCreated)   │  │   │
│  │  │  - ToolOverlay        │  │                                 │  │   │
│  │  └───────────┬───────────┘  └──────────────┬──────────────────┘  │   │
│  │              │  Canvas (postMessage)        │ WebSocket /ws       │   │
│  └──────────────┼──────────────────────────────┼─────────────────────┘   │
│                 │                              │                         │
└─────────────────┼──────────────────────────────┼─────────────────────────┘
                  │                              │
                  │                              │ HTTP+WS
                  │                              │
┌─────────────────┼──────────────────────────────┼─────────────────────────┐
│  PLUGIN PROCESS │  (Node.js, NOT Bun)          │                         │
│                 │                              │                         │
│  ┌──────────────▼──────────────────────────────▼─────────────────────┐  │
│  │  src/server.ts (HTTP + WebSocket server)                           │  │
│  │                                                                    │  │
│  │  - http.createServer (static files)                                │  │
│  │  - WebSocketServer (path: /ws)                                     │  │
│  │  - recentMessages buffer (200 msgs, 60s TTL)                       │  │
│  │  - StateManager.getSnapshot() → state_update                       │  │
│  └────────────────────────┬──────────────────────────────────────────┘  │
│                           │                                              │
│  ┌────────────────────────▼──────────────────────────────────────────┐  │
│  │  src/index.ts (Plugin hooks)                                        │  │
│  │                                                                    │  │
│  │  - 'chat.message' (agent start, has agent name)                    │  │
│  │  - 'event' (session events, ALL sessions incl. subs)               │  │
│  │  - 'tool.execute.before/after'                                     │  │
│  │  - session.list() polling every 3s                                 │  │
│  │                                                                    │  │
│  │  State:                                                            │  │
│  │    sessionAgentMap: Map<sessionID, agentName>                      │  │
│  │    sessionInfoCache: Map<sessionID, {projectName, title, dir}>    │  │
│  │    knownSubSessionIDs: Set<sessionID>                             │  │
│  │    paletteForSession(): picks palette per session                 │  │
│  │    assignSessionSeat(): round-robin seatId (0-3 work, 4-6 rest)   │  │
│  └────────────────────────┬──────────────────────────────────────────┘  │
│                           │                                              │
│  ┌────────────────────────▼──────────────────────────────────────────┐  │
│  │  src/state-manager.ts                                              │  │
│  │                                                                    │  │
│  │  agents: Map<agentName, {name, action, detail, since, tool}>       │  │
│  │  - setAgentAction(name, action) — filters ses_* names              │  │
│  │  - getSnapshot() → state_update broadcast                         │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                           │                                              │
└───────────────────────────┼──────────────────────────────────────────────┘
                            │
                            │ SDK calls (session.list, session.get, etc.)
                            │
┌───────────────────────────▼──────────────────────────────────────────────┐
│                        OpenCode SDK (ctx.client)                          │
│                                                                          │
│  - session.list() — all sessions (root + sub)                           │
│  - session.get({id}) — single session with parentID                     │
│  - app.log({body}) — logging                                            │
└──────────────────────────────────────────────────────────────────────────┘
```

## Sub-agent flow (the buggy path)

```
User types in OpenCode
   │
   ▼
OpenCode calls `gentle-orchestrator` with message
   │
   ▼
gentle-orchestrator invokes `task` tool to delegate to `sdd-propose`
   │
   ▼
OpenCode creates a NEW sub-session (ses_xxx) with parentID pointing to root
   │
   ├──► session.list() picks it up
   │     (polling every 3s)
   │     Plugin: knownSubSessionIDs.add(ses_xxx)
   │     Plugin: sessionAgentMap.set(ses_xxx, ses_xxx)  [placeholder]
   │     Plugin: does NOT emit subagent_spawn (we filter until chat.message)
   │
   ├──► session.* events fire for the sub-session
   │     Plugin: stateManager.setAgentAction(ses_xxx, ...)  [FILTERED: returns early]
   │     Plugin: broadcasts session_event (with agentName: ses_xxx)
   │
   └──► chat.message fires for sdd-propose (sub-agent)
         Plugin: getAgentNameForSession(ses_xxx) = "sdd-propose" (now known)
         Plugin: detects parentID, broadcasts:
                type: 'subagent_spawn', id: ses_xxx, agentName: 'sdd-propose'
         Bridge: tracks pending-ses_xxx, waits for session_event
         Bridge: receives session_event with agentName 'sdd-propose'
         Bridge: emits agentToolStart to orchestrator with status 'Subtask: sdd-propose'
                ──────── Webview: useExtensionMessages.ts line 282-294
                Detects toolName === 'Task' or 'Agent'
                Calls os.addSubagent(parentAgentId, toolId)
                          ──────── officeState.ts line 436
                          Finds closest walkable tile to parent
                          Creates Character in the office
                          ★ IF the office has free walkable tiles, sub-agent
                            appears next to parent ★
                          ★ IF the office is full, sub-agent goes to a
                            distant tile (could appear "outside" the office) ★
                          ★ This is what causes the "empty office" bug ★
```

## Why the empty office appears

The webview's `addSubagent()` searches `this.walkableTiles` for the **closest free tile to the parent**. In the default layout there are exactly 4 work-desk tiles in the office.

**Scenario A** (the working case):

- Parent sits at tile (col=4, row=3) — chair next to desk
- Sub-agent spawns → finds (col=4, row=2) — different chair, same office
- Both render in the SAME office. ✓

**Scenario B** (the buggy case):

- Parent sits at tile (col=4, row=3)
- First sub-agent occupies (col=4, row=2) (or any nearby tile)
- Second sub-agent (e.g. from a zombie ses_xxx) searches further...
- Finds a walkable tile in the lobby area or BREAK room
- Renders in a DIFFERENT region of the canvas
- The lobby has no furniture (just floor), so the sub-agent looks "alone in an empty room"

**The "extra agent" with `ses_xxx` label** is a sub-session whose `chat.message` never fired (the actual sub-agent never started, or the orchestrator killed it before launch). But the sub-session's `session.*` events DO fire and React's `agentToolStart` flow processes them as if they were real sub-agents, creating Characters with `name: 'ses_xxx'` and putting them in random walkable tiles.

## Key insight

The webview's `addSubagent` was designed for the **JSONL flow** where sub-agents have real `toolId`s from PreToolUse hooks. Our bridge synthesizes a `toolId: 'task-ses_xxxx'` for the sub-session, but if MULTIPLE sub-sessions share the same parent (e.g. zombie + real), the React state can get confused and render them in different "rooms" visually.

## Files & line numbers

| File                                           | What it does                                | Critical line                                           |
| ---------------------------------------------- | ------------------------------------------- | ------------------------------------------------------- |
| `src/index.ts`                                 | Plugin entry, session hooks, subagent_spawn | L141-165 (poll), L213-269 (chat.message)                |
| `src/state-manager.ts`                         | Internal state, filters ses\_\*             | L26-38 (setAgentAction)                                 |
| `src/server.ts`                                | HTTP+WS, buffer replay, TTL                 | L65-79 (replay), L126-150 (broadcast)                   |
| `scripts/opencode-bridge.js`                   | WS→React translation                        | L44-51 (ensureAgent), L95-131 (subagent flow)           |
| `webview-ui/src/hooks/useExtensionMessages.ts` | React state, sub-agent creation             | L250-294 (agentToolStart), L391-414 (subagentToolStart) |
| `webview-ui/src/office/engine/officeState.ts`  | Game world, tile assignment                 | L436-488 (addSubagent)                                  |
| `webview-ui/src/office/engine/renderer.ts`     | Canvas rendering                            | (renders all characters in characters map)              |

## Where to fix

**Option A — Plugin/bridge level** (what we've been trying):

- Filter ses\_\* before they reach the webview
- Problem: doesn't help if the React state already has the sub-agent rendered

**Option B — Bridge level**:

- Map sub-agent seatId to the parent's seatId
- Send a custom message the webview understands to override tileCol/tileRow
- Problem: no such message exists in the webview protocol

**Option C — Webview level** (the real fix):

- Modify `addSubagent` to ALWAYS use the parent's `tileCol, tileRow` instead of searching for free tiles
- This guarantees the sub-agent renders on top of the parent character (pixel-stacked)
- The renderer already handles `ch.isSubagent = true` so it would render correctly
- **Estimated change: 10-20 lines in officeState.ts**
