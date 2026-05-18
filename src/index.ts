import type { Plugin } from "@opencode-ai/plugin"
import { tool } from "@opencode-ai/plugin"
import { StateManager } from "./state-manager.js"
import { PixelAgentsServer } from "./server.js"
import { OfficeState } from "./game/office-state.js"
import { createDefaultLayout } from "./game/layout-serializer.js"

const DEFAULT_PORT = 3456

// ── Auto-generated palettes (session ID → persistent color set) ──────────

const PALETTE_POOL: string[][] = [
  // [skin,    hair,     shirt,    pants]
  ["#f0c8a0", "#3d2010", "#cc4444", "#2a2a3a"], // fair, brown hair, red shirt
  ["#d4a574", "#1a1a1a", "#3366aa", "#3a3a2a"], // tan, black hair, blue shirt
  ["#e8c090", "#5a3a1a", "#44aa44", "#2a3040"], // warm, dark brown, green
  ["#c8956c", "#8a6030", "#aa44aa", "#3a2a2a"], // olive, auburn, purple
  ["#f5d0b0", "#c8a030", "#dd8833", "#202840"], // pale, blonde, orange
  ["#b87850", "#0a0a0a", "#eeeeee", "#1a2a1a"], // dark, black, white
  ["#e0b888", "#4a2a3a", "#338888", "#2a2828"], // light tan, maroon, teal
  ["#d0a068", "#6a4a2a", "#ffcc00", "#283040"], // golden, chestnut, yellow
]

let paletteIndex = 0
const sessionPaletteMap = new Map<string, string[]>()

/** Returns a persistent palette for the given session ID — same session = same color. */
function paletteForSession(sessionID: string): string[] {
  const existing = sessionPaletteMap.get(sessionID)
  if (existing) return existing

  const p = [...PALETTE_POOL[paletteIndex % PALETTE_POOL.length]]
  paletteIndex++
  sessionPaletteMap.set(sessionID, p)
  return p
}

const PixelAgentsPlugin: Plugin = async (ctx) => {
  const stateManager = new StateManager()

  // ── Office state (domain layer) ──────────────────────────────────────────
  const layout = createDefaultLayout(20, 11)
  const officeState = new OfficeState(layout)

  const server = new PixelAgentsServer(stateManager, officeState, {
    port: DEFAULT_PORT,
    host: "127.0.0.1",
  })

  // ── Session tracking ──────────────────────────────────────────────────────
  const sessionSeatMap = new Map<string, number>() // sessionID → seatId
  const sessionAgentMap = new Map<string, string>() // sessionID → agentName (for StateManager compat)

  function getAgentNameForSession(sessionID: string): string {
    return sessionAgentMap.get(sessionID) || sessionID
  }

  /** Coerce agent parameter (string | object | undefined) to a safe string. */
  function safeAgentName(agent: unknown, fallback: string): string {
    if (typeof agent === "string") return agent
    if (agent && typeof agent === "object" && "name" in agent && typeof (agent as Record<string, unknown>).name === "string") {
      return (agent as Record<string, string>).name
    }
    return fallback
  }

  try {
    server.start()
    await ctx.client.app.log({
      body: {
        service: "pixel-agents",
        level: "info",
        message: `Pixel Agents running at ${server.url}`,
      },
    })
  } catch (err) {
    await ctx.client.app.log({
      body: {
        service: "pixel-agents",
        level: "error",
        message: `Failed to start Pixel Agents server: ${err}`,
      },
    })
  }

  return {
    tool: {
      "pixel-agents": tool({
        description:
          "Open the Pixel Agents visualization page showing animated pixel art characters for each active agent",
        args: {},
        async execute() {
          try {
            await ctx.$`open ${server.url}`
          } catch {
            await ctx.$`xdg-open ${server.url}`
          }
          return `Pixel Agents is running at ${server.url}`
        },
      }),
    },

    event: async ({ event }) => {
      // Spawn agent on session-level events (created, status, updated)
      const isSessionEvent = event.type.startsWith("session.")
      if (isSessionEvent) {
        const props = event.properties as Record<string, unknown>
        const sessionID = (typeof props.sessionID === "string" ? props.sessionID : undefined)
          || (props.info && typeof props.info === "object" ? (props.info as { id: string }).id : undefined)

        // Skip non-session IDs (message IDs, sub-IDs)
        if (sessionID && typeof sessionID === "string" && !sessionID.startsWith("msg_") && !officeState.characters.has(sessionID)) {
          const palette = paletteForSession(sessionID)
          // Assign next available seat (round-robin)
          if (!sessionSeatMap.has(sessionID)) {
            const usedSeats = new Set(sessionSeatMap.values())
            const nextSeat = officeState.seats.find(s => !usedSeats.has(s.id))
            const seatId = nextSeat ? nextSeat.id : (officeState.seats[0]?.id ?? 0)
            sessionSeatMap.set(sessionID, seatId)
          }
          officeState.addAgent(sessionID, getAgentNameForSession(sessionID), palette, sessionSeatMap.get(sessionID))
        }
      }

      // Handle idle event
      if (event.type === "session.idle") {
        const idleSid = (event.properties as Record<string, unknown>).sessionID as string
        if (idleSid) {
          officeState.setAgentInactive(idleSid)
          stateManager.setAgentIdle(getAgentNameForSession(idleSid))
        }
      }
    },

    "tool.execute.before": async ({ tool: toolName, sessionID }, { args }) => {
      const agentName = getAgentNameForSession(sessionID)

      if (toolName === "task" || toolName === "call_omo_agent") {
        // Spawn sub-agent in OfficeState
        officeState.addSubagent(sessionID, toolName)

        const agentType =
          (args as Record<string, unknown>).subagent_type as string | undefined
        if (agentType) {
          stateManager.setAgentAction(
            agentName,
            "orchestrating",
            `Delegating to ${agentType}`,
          )
        }
      } else {
        stateManager.handleToolStart(agentName, toolName)
      }
    },

    "tool.execute.after": async ({ tool: toolName, sessionID }) => {
      const agentName = getAgentNameForSession(sessionID)

      if (toolName === "task" || toolName === "call_omo_agent") {
        officeState.removeSubagent(sessionID, toolName)
      }
      stateManager.handleToolEnd(agentName, toolName)
    },

    "chat.message": async ({ sessionID, agent }, { message }) => {
      const agentName = safeAgentName(agent, sessionID)
      sessionAgentMap.set(sessionID, agentName)

      // Spawn agent if not already in OfficeState
      if (!officeState.characters.has(sessionID)) {
        const palette = paletteForSession(sessionID)
        officeState.addAgent(sessionID, agentName, palette)
        await ctx.client.app.log({
          body: { service: "pixel-agents", level: "info", message: `chat.message spawned agent: ${agentName} (${sessionID})` },
        })
      }

      // Assign seat if not already assigned (round-robin)
      if (!sessionSeatMap.has(sessionID)) {
        const usedSeats = new Set(sessionSeatMap.values())
        const nextSeat = officeState.seats.find(s => !usedSeats.has(s.id))
        const seatId = nextSeat ? nextSeat.id : (officeState.seats[0]?.id ?? 0)
        sessionSeatMap.set(sessionID, seatId)
      }

      officeState.setAgentActive(sessionID, sessionSeatMap.get(sessionID)!)
      stateManager.setAgentAction(agentName, "thinking", "Composing response")
    },

    "chat.params": async ({ sessionID, agent }) => {
      const agentName = safeAgentName(agent, sessionID)
      sessionAgentMap.set(sessionID, agentName)
      stateManager.setAgentAction(agentName, "thinking", "Preparing request")
    },
  }
}

export default PixelAgentsPlugin
export { PixelAgentsPlugin as server }
