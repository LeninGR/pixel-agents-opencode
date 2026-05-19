import type { Plugin } from '@opencode-ai/plugin';
import { tool } from '@opencode-ai/plugin';
import { writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { PixelAgentsServer } from './server.js';
import { StateManager } from './state-manager.js';

const DEFAULT_PORT = 3456;

// ── Palettes ────────────────────────────────────────────────────────────────

const PALETTE_POOL: string[][] = [
  ['#f0c8a0', '#3d2010', '#cc4444', '#2a2a3a'],
  ['#d4a574', '#1a1a1a', '#3366aa', '#3a3a2a'],
  ['#e8c090', '#5a3a1a', '#44aa44', '#2a3040'],
  ['#c8956c', '#8a6030', '#aa44aa', '#3a2a2a'],
  ['#f5d0b0', '#c8a030', '#dd8833', '#202840'],
  ['#b87850', '#0a0a0a', '#eeeeee', '#1a2a1a'],
  ['#e0b888', '#4a2a3a', '#338888', '#2a2828'],
  ['#d0a068', '#6a4a2a', '#ffcc00', '#283040'],
];

let paletteIndex = 0;
const sessionPaletteMap = new Map<string, string[]>();

function paletteForSession(sessionID: string): string[] {
  const existing = sessionPaletteMap.get(sessionID);
  if (existing) return existing;
  const p = [...PALETTE_POOL[paletteIndex % PALETTE_POOL.length]];
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

  try {
    server.start();
    await ctx.client.app.log({
      body: {
        service: 'pixel-agents',
        level: 'info',
        message: `Pixel Agents running at ${server.url}`,
      },
    });
  } catch (err) {
    await ctx.client.app.log({
      body: { service: 'pixel-agents', level: 'error', message: `Failed to start: ${err}` },
    });
  }

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
          stateManager.setAgentAction(
            agentName,
            event.type === 'session.idle' ? 'idle' : 'thinking',
            '',
          );
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
