import type { Plugin } from "@opencode-ai/plugin"
import { tool } from "@opencode-ai/plugin"
import { StateManager } from "./state-manager.js"
import { PixelAgentsServer } from "./server.js"

const DEFAULT_PORT = 3456

export const PixelAgentsPlugin: Plugin = async (ctx) => {
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

  let currentAgent = "sisyphus"

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
        case "session.idle":
          stateManager.setAgentIdle(currentAgent)
          break
        case "session.created":
          stateManager.setAgentAction(currentAgent, "thinking", "Starting session")
          break
      }
    },

    "tool.execute.before": async ({ tool: toolName }, { args }) => {
      if (toolName === "task" || toolName === "call_omo_agent") {
        const agentType =
          (args as Record<string, unknown>).subagent_type as string | undefined
        if (agentType) {
          stateManager.setAgentAction(agentType, "thinking", "Spawned")
          stateManager.setAgentAction(
            currentAgent,
            "orchestrating",
            `Delegating to ${agentType}`,
          )
        }
      } else {
        stateManager.handleToolStart(currentAgent, toolName)
      }
    },

    "tool.execute.after": async ({ tool: toolName }) => {
      stateManager.handleToolEnd(currentAgent, toolName)
    },

    "chat.message": async ({}, { message }) => {
      stateManager.setAgentAction(currentAgent, "thinking", "Composing response")
    },
  }
}
