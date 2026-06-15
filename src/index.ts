import type { Plugin } from '@opencode-ai/plugin';
import { tool } from '@opencode-ai/plugin';
import { writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { AGENT_PALETTE_POOL } from './constants.js';
import { PixelAgentsServer } from './server.js';
import { StateManager } from './state-manager.js';

const DEFAULT_PORT = 3457;

// ── Palettes (from constants) ─────────────────────────────────────────────────

let paletteIndex = 0;
const sessionPaletteMap = new Map<string, string[]>();

function paletteForSession(sessionID: string): string[] {
  const existing = sessionPaletteMap.get(sessionID);
  if (existing) return existing;
  const p = [...AGENT_PALETTE_POOL[paletteIndex % AGENT_PALETTE_POOL.length]];
  paletteIndex++;
  sessionPaletteMap.set(sessionID, p);
  return p;
}

function safeAgentName(agent: unknown, fallback: string): string {
  if (typeof agent === 'string') return agent;
  if (
    agent &&
    typeof agent === 'object' &&
    'name' in agent &&
    typeof (agent as Record<string, unknown>).name === 'string'
  ) {
    return (agent as Record<string, string>).name;
  }
  return fallback;
}

// ── Plugin ──────────────────────────────────────────────────────────────────

const PixelAgentsPlugin: Plugin = async (ctx) => {
  writeFileSync(join(tmpdir(), 'pixel-agents-loaded.txt'), 'loaded at ' + new Date().toISOString());
  const stateManager = new StateManager();
  const server = new PixelAgentsServer(stateManager, { port: DEFAULT_PORT, host: '127.0.0.1' });
  const sessionAgentMap = new Map<string, string>();
  const sessionInfoCache = new Map<
    string,
    { projectName: string; sessionTitle: string; directory: string }
  >();
  let sessionSeatCounter = 0; // assigns different work desks per session

  function getAgentNameForSession(sessionID: string): string {
    return sessionAgentMap.get(sessionID) || sessionID;
  }

  /** Get session info from SDK, cached. */
  async function getSessionInfo(
    sessionID: string,
  ): Promise<{ projectName: string; sessionTitle: string; directory: string }> {
    const cached = sessionInfoCache.get(sessionID);
    if (cached) return cached;

    try {
      const result = await ctx.client.session.get({ path: { id: sessionID } });
      const session = (result as { data?: { title?: string; directory?: string } })?.data;
      const directory = session?.directory || '';
      const projectName = directory.split('/').filter(Boolean).pop() || directory;
      const sessionTitle = session?.title || sessionID;
      const info = { projectName, sessionTitle, directory };
      sessionInfoCache.set(sessionID, info);
      return info;
    } catch {
      const fallback = { projectName: sessionID, sessionTitle: sessionID, directory: '' };
      sessionInfoCache.set(sessionID, fallback);
      return fallback;
    }
  }

  /** Assign a work desk seat per session (round-robin across 4 desks: seat 0-3) */
  function assignSessionSeat(_sessionID: string): number {
    // Map 4 work desks (0-3), 3 rest chairs (4-6)
    return sessionSeatCounter++ % 4;
  }

  // Start server (non-blocking)
  try {
    server.start();
  } catch (err) {
    // Server start failed - will be retried
  }

  // Log after a small delay to not block startup
  setTimeout(async () => {
    try {
      await ctx.client.app.log({
        body: {
          service: 'pixel-agents',
          level: 'info',
          message: `Pixel Agents running at ${server.url}`,
        },
      });
    } catch {}
  }, 1000);

  // Detect existing sessions (non-blocking, after delay)
  // Pre-cache session info so when chat.message arrives, we have project/title ready
  // Also poll periodically to catch new sub-sessions spawned by sub-agents
  const knownSubSessionIDs = new Set<string>();
  const knownRootSessionIDs = new Set<string>();

  async function detectSessions() {
    try {
      const sessionsResult = await ctx.client.session.list();
      const sessions =
        (
          sessionsResult as {
            data?: Array<{ id: string; title?: string; directory?: string; parentID?: string }>;
          }
        )?.data || [];

      for (const session of sessions) {
        const sessionID = session.id;
        const directory = session.directory || '';
        const projectName = directory.split('/').filter(Boolean).pop() || directory;
        const sessionTitle = session.title || sessionID;

        // Always cache session info
        sessionInfoCache.set(sessionID, { projectName, sessionTitle, directory });

        if (session.parentID) {
          // Sub-session (created by sub-agent via task tool).
          // We DO NOT emit subagent_spawn at detection time because the
          // actual agent name (e.g. "sdd-propose") is not yet known — only
          // the sessionID. We track the sub-session here and emit the spawn
          // only when chat.message fires (which has the real agent name).
          if (!knownSubSessionIDs.has(sessionID)) {
            knownSubSessionIDs.add(sessionID);
            sessionAgentMap.set(sessionID, sessionID);
          }
        } else {
          // Root session
          knownRootSessionIDs.add(sessionID);
        }
      }
    } catch {}
  }

  // Initial detection
  setTimeout(detectSessions, 500);
  // Poll every 3 seconds to catch new sub-sessions
  setInterval(detectSessions, 3000);

  return {
    tool: {
      'pixel-agents': tool({
        description: 'Open the Pixel Agents visualization page',
        args: {},
        async execute() {
          try {
            await ctx.$`open ${server.url}`;
          } catch {
            await ctx.$`xdg-open ${server.url}`;
          }
          return `Pixel Agents is running at ${server.url}`;
        },
      }),
    },

    event: async ({ event }) => {
      const isSessionEvent = event.type.startsWith('session.');
      if (isSessionEvent) {
        const props = event.properties as Record<string, unknown>;
        const sessionID =
          (typeof props.sessionID === 'string' ? props.sessionID : undefined) ||
          (props.info && typeof props.info === 'object'
            ? (props.info as { id: string }).id
            : undefined);

        if (sessionID && typeof sessionID === 'string' && !sessionID.startsWith('msg_')) {
          const agentName = getAgentNameForSession(sessionID);
          const info = await getSessionInfo(sessionID);
          // Filter out zombie sub-sessions (where agentName is the sessionID
          // because chat.message never fired for them)
          const isZombieSubagent = agentName.startsWith('ses_');
          if (!isZombieSubagent) {
            stateManager.setAgentAction(
              agentName,
              event.type === 'session.idle' ? 'idle' : 'thinking',
              '',
            );
          }
          server.broadcast({
            type: 'session_event',
            eventType: event.type,
            sessionID,
            agentName,
            palette: paletteForSession(sessionID),
            projectName: info.projectName,
            sessionTitle: info.sessionTitle,
            directory: info.directory,
            seatId: assignSessionSeat(sessionID),
          });
        }
      }
    },

    'chat.message': async ({ sessionID, agent }) => {
      const agentName = safeAgentName(agent, sessionID);
      sessionAgentMap.set(sessionID, agentName);
      const info = await getSessionInfo(sessionID);
      stateManager.setAgentAction(agentName, 'thinking', 'Composing response');

      // Check if this is a sub-agent (has a parent session)
      // We track sub-sessions in knownSubSessionIDs from the polling
      // but we don't know the parent here directly. We rely on
      // sessionAgentMap having the sub-session → parent mapping.
      // For now, check if this session has a parent by looking at the
      // session via ctx.client.session.get
      let parentAgent: string | null = null;
      try {
        const sessionResult = await ctx.client.session.get({ path: { id: sessionID } });
        const sessionData = (sessionResult as { data?: { parentID?: string } })?.data;
        if (sessionData?.parentID) {
          parentAgent = sessionAgentMap.get(sessionData.parentID) || sessionData.parentID;
        }
      } catch {}

      if (parentAgent) {
        // This is a sub-agent. Emit subagent_spawn with the REAL agent name.
        // Only emit if the agent name is recognized (filter out sessionID placeholders).
        if (!agentName.startsWith('ses_')) {
          const parentPalette = paletteForSession(sessionID);
          server.broadcast({
            type: 'subagent_spawn',
            id: sessionID,
            parentId: '',
            parentAgent,
            palette: parentPalette,
            projectName: info.projectName,
            sessionTitle: info.sessionTitle,
            directory: info.directory,
            seatId: assignSessionSeat(sessionID),
            agentName,
          });
        }
      } else {
        // Root agent (orchestrator)
        server.broadcast({
          type: 'agent_spawn',
          id: sessionID,
          name: agentName,
          palette: paletteForSession(sessionID),
          projectName: info.projectName,
          sessionTitle: info.sessionTitle,
          directory: info.directory,
          seatId: assignSessionSeat(sessionID),
        });
      }
    },

    'tool.execute.before': async ({ tool: toolName, sessionID }) => {
      const agentName = getAgentNameForSession(sessionID);
      stateManager.handleToolStart(agentName, toolName);
      server.broadcast({ type: 'agent_tool', id: sessionID, name: agentName, tool: toolName });
    },

    'tool.execute.after': async ({ tool: toolName, sessionID }) => {
      const agentName = getAgentNameForSession(sessionID);
      stateManager.handleToolEnd(agentName, toolName);
    },
  };
};

export default PixelAgentsPlugin;
export { PixelAgentsPlugin as server };
