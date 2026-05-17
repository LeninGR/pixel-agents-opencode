import type { Plugin } from "@opencode-ai/plugin"
import { tool } from "@opencode-ai/plugin"
import { StateManager } from "./state-manager.js"
import { PixelAgentsServer } from "./server.js"
import { OfficeState } from "./game/office-state.js"
import { createDefaultLayout } from "./game/layout-serializer.js"
import { MIN_AGENT_LIFETIME_S } from "./game/constants.js"

const DEFAULT_PORT = 3456

// ── Auto-generated palettes (session ID → deterministic color set) ──────────

const PALETTE_POOL: string[][] = [
  ["#4a90d9", "#357abd", "#6bb5ff", "#e8f0fe"],
  ["#9b59b6", "#7d3c98", "#c39bdb", "#f5eef8"],
  ["#27ae60", "#1e8449", "#58d68d", "#eafaf1"],
  ["#e67e22", "#ca6f1e", "#f0b37e", "#fef5e7"],
  ["#e74c3c", "#c0392b", "#f1948a", "#fdedec"],
  ["#1abc9c", "#17a589", "#76d7c4", "#e8f8f5"],
  ["#d35400", "#a04000", "#f5b041", "#fef9e7"],
  ["#34495e", "#2c3e50", "#7f8c8d", "#ebedef"],
]

let paletteIndex = 0

function nextPalette(): string[] {
  const p = PALETTE_POOL[paletteIndex % PALETTE_POOL.length]
  paletteIndex++
  return [...p]
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

  // ── Session tracking ──────────────────────────────────────────────────────
  const sessionSeatMap = new Map<string, number>() // sessionID → seatId
  const sessionAgentMap = new Map<string, string>() // sessionID → agentName (for StateManager compat)
  const sessionIdleTimers = new Map<string, ReturnType<typeof setTimeout>>()

  function getAgentNameForSession(sessionID: string): string {
    return sessionAgentMap.get(sessionID) || sessionID
  }

  function scheduleAgentDespawn(sessionID: string): void {
    // Clear any existing timer
    const existing = sessionIdleTimers.get(sessionID)
    if (existing) clearTimeout(existing)

    const timer = setTimeout(() => {
      officeState.removeAgent(sessionID)
      stateManager.removeAgent(
        getAgentNameForSession(sessionID),
      )
      sessionSeatMap.delete(sessionID)
      sessionAgentMap.delete(sessionID)
      sessionIdleTimers.delete(sessionID)
    }, MIN_AGENT_LIFETIME_S * 1000)

    sessionIdleTimers.set(sessionID, timer)
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
      switch (event.type) {
        case "session.created": {
          const sessionID = event.properties.info.id
          // Cancel any pending despawn
          const existingTimer = sessionIdleTimers.get(sessionID)
          if (existingTimer) {
            clearTimeout(existingTimer)
            sessionIdleTimers.delete(sessionID)
          }
          // Spawn agent if not already present
          if (!officeState.characters.has(sessionID)) {
            const palette = nextPalette()
            officeState.addAgent(sessionID, palette)
          }
          break
        }
        case "session.idle": {
          const sessionID = event.properties.sessionID
          officeState.setAgentInactive(sessionID)
          stateManager.setAgentIdle(
            getAgentNameForSession(sessionID),
          )
          scheduleAgentDespawn(sessionID)
          break
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
      const agentName = agent || sessionID
      sessionAgentMap.set(sessionID, agentName)

      // Cancel any pending despawn — agent is active again
      const existingTimer = sessionIdleTimers.get(sessionID)
      if (existingTimer) {
        clearTimeout(existingTimer)
        sessionIdleTimers.delete(sessionID)
      }

      // Spawn agent if not already in OfficeState
      if (!officeState.characters.has(sessionID)) {
        const palette = nextPalette()
        officeState.addAgent(sessionID, palette)
      }

      // Assign seat if not already assigned
      if (!sessionSeatMap.has(sessionID)) {
        const seatId = officeState.seats.length > 0 ? officeState.seats[0].id : 0
        sessionSeatMap.set(sessionID, seatId)
      }

      officeState.setAgentActive(sessionID, sessionSeatMap.get(sessionID)!)
      stateManager.setAgentAction(agentName, "thinking", "Composing response")
    },

    "chat.params": async ({ sessionID, agent }) => {
      sessionAgentMap.set(sessionID, agent)
      stateManager.setAgentAction(agent, "thinking", "Preparing request")
    },
  }
}

export default PixelAgentsPlugin
