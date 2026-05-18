import type { Plugin } from '@opencode-ai/plugin';
import { tool } from '@opencode-ai/plugin';
import { StateManager } from './state-manager.js';

const SERVER_URL = 'http://127.0.0.1:3456';

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

// ── HTTP broadcast helper ────────────────────────────────────────────────────

async function broadcast(msg: Record<string, unknown>): Promise<void> {
  try {
    await fetch(`${SERVER_URL}/api/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(msg),
    });
  } catch {
    // Server might not be running — ignore
  }
}

// ── Plugin ──────────────────────────────────────────────────────────────────

const PixelAgentsPlugin: Plugin = async (ctx) => {
  const stateManager = new StateManager();
  const sessionAgentMap = new Map<string, string>();

  function getAgentNameForSession(sessionID: string): string {
    return sessionAgentMap.get(sessionID) || sessionID;
  }

  await ctx.client.app.log({
    body: {
      service: 'pixel-agents',
      level: 'info',
      message: `Pixel Agents relay ready → ${SERVER_URL}`,
    },
  });

  return {
    tool: {
      'pixel-agents': tool({
        description: 'Open the Pixel Agents visualization page',
        args: {},
        async execute() {
          try {
            await ctx.$`open ${SERVER_URL}`;
          } catch {
            await ctx.$`xdg-open ${SERVER_URL}`;
          }
          return `Pixel Agents is running at ${SERVER_URL}`;
        },
      }),
    },

    // ── Event hooks ────────────────────────────────────────────────────────

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
          stateManager.setAgentAction(
            agentName,
            event.type === 'session.idle' ? 'idle' : 'thinking',
            '',
          );

          await broadcast({
            type: 'session_event',
            eventType: event.type,
            sessionID,
            agentName,
            palette: paletteForSession(sessionID),
          });
        }
      }
    },

    'chat.message': async ({ sessionID, agent }) => {
      const agentName = safeAgentName(agent, sessionID);
      sessionAgentMap.set(sessionID, agentName);
      stateManager.setAgentAction(agentName, 'thinking', 'Composing response');

      await broadcast({
        type: 'agent_spawn',
        id: sessionID,
        name: agentName,
        palette: paletteForSession(sessionID),
      });
    },

    'tool.execute.before': async ({ tool: toolName, sessionID }) => {
      const agentName = getAgentNameForSession(sessionID);
      stateManager.handleToolStart(agentName, toolName);

      await broadcast({
        type: 'agent_tool',
        id: sessionID,
        name: agentName,
        tool: toolName,
        action: 'active',
      });
    },

    'tool.execute.after': async ({ tool: toolName, sessionID }) => {
      const agentName = getAgentNameForSession(sessionID);
      stateManager.handleToolEnd(agentName, toolName);
    },
  };
};

export default PixelAgentsPlugin;
export { PixelAgentsPlugin as server };
