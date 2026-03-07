import { resolve, join, extname } from "path"
import { existsSync, readFileSync } from "fs"
import type { Server, ServerWebSocket } from "bun"
import type { StateManager } from "./state-manager.js"
import type { ServerConfig, StateUpdate } from "./types.js"

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
}

export class PixelAgentsServer {
  private server: Server<undefined> | null = null
  private webRoot: string
  private stateManager: StateManager
  private sockets: Set<ServerWebSocket<undefined>> = new Set()
  private unsubscribe: (() => void) | null = null
  port: number

  constructor(stateManager: StateManager, config: ServerConfig) {
    this.stateManager = stateManager
    this.port = config.port
    this.webRoot = resolve(import.meta.dir, "web")
  }

  start(): void {
    this.unsubscribe = this.stateManager.onStateChange((update) => {
      this.broadcastToClients(update)
    })

    this.server = Bun.serve({
      port: this.port,
      hostname: "127.0.0.1",

      fetch: (req, server) => {
        const url = new URL(req.url)

        if (url.pathname === "/ws") {
          const upgraded = server.upgrade(req)
          if (upgraded) return undefined as unknown as Response
          return new Response("WebSocket upgrade failed", { status: 400 })
        }

        return this.serveStatic(url.pathname)
      },

      websocket: {
        open: (ws) => {
          this.sockets.add(ws)
          const snapshot = this.stateManager.getSnapshot()
          ws.send(JSON.stringify(snapshot))
        },
        close: (ws) => {
          this.sockets.delete(ws)
        },
        message: () => {},
      },
    })

    this.port = this.server.port ?? this.port
  }

  stop(): void {
    this.unsubscribe?.()
    this.unsubscribe = null
    this.server?.stop()
    this.server = null
    this.sockets.clear()
  }

  get url(): string {
    return `http://127.0.0.1:${this.port}`
  }

  private broadcastToClients(update: StateUpdate): void {
    const message = JSON.stringify(update)
    for (const ws of this.sockets) {
      try {
        ws.send(message)
      } catch {}
    }
  }

  private serveStatic(pathname: string): Response {
    if (pathname === "/") pathname = "/index.html"

    const filePath = join(this.webRoot, pathname)

    if (!filePath.startsWith(this.webRoot)) {
      return new Response("Forbidden", { status: 403 })
    }

    if (!existsSync(filePath)) {
      return new Response("Not Found", { status: 404 })
    }

    try {
      const content = readFileSync(filePath)
      const ext = extname(filePath)
      const contentType = MIME_TYPES[ext] || "application/octet-stream"

      return new Response(content, {
        headers: { "Content-Type": contentType },
      })
    } catch {
      return new Response("Internal Server Error", { status: 500 })
    }
  }
}
