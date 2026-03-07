import type { Plugin } from "@opencode-ai/plugin"
import { tool } from "@opencode-ai/plugin"
import { StateManager } from "./state-manager.js"
import { PixelAgentsServer } from "./server.js"

const DEFAULT_PORT = 3456

const PixelAgentsPlugin: Plugin = async (ctx) => {
  const stateManager = new StateManager()
  const server = new PixelAgentsServer(stateManager, {
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

  // Track which agent is active in each session (sessionID -> agentName)
  const sessionAgentMap = new Map<string, string>()

  function getAgentForSession(sessionID: string): string {
    return sessionAgentMap.get(sessionID) || "sisyphus"
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
        case "session.idle": {
          const agentName = getAgentForSession(event.properties.sessionID)
          stateManager.setAgentIdle(agentName)
          sessionAgentMap.delete(event.properties.sessionID)
          break
        }
        case "session.created":
          break
      }
    },

    "tool.execute.before": async ({ tool: toolName, sessionID }, { args }) => {
      const agentName = getAgentForSession(sessionID)
      if (toolName === "task" || toolName === "call_omo_agent") {
        const agentType =
          (args as Record<string, unknown>).subagent_type as string | undefined
        if (agentType) {
          stateManager.setAgentAction(agentType, "thinking", "Spawned")
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
      const agentName = getAgentForSession(sessionID)
      stateManager.handleToolEnd(agentName, toolName)
    },

    "chat.message": async ({ sessionID, agent }, { message }) => {
      const agentName = agent || getAgentForSession(sessionID)
      sessionAgentMap.set(sessionID, agentName)
      stateManager.setAgentAction(agentName, "thinking", "Composing response")
    },

    "chat.params": async ({ sessionID, agent }) => {
      sessionAgentMap.set(sessionID, agent)
      stateManager.setAgentAction(agent, "thinking", "Preparing request")
    },
  }
}

export default PixelAgentsPlugin
