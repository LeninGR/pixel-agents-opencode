import { resolve, join, extname } from "path"
import { existsSync, readFileSync } from "fs"
import { fileURLToPath } from "url"
import type { Server, ServerWebSocket } from "bun"
import type { StateManager } from "./state-manager.js"
import { OfficeState } from "./game/office-state.js"
import type { ServerConfig, StateUpdate, ServerMessage } from "./types.js"

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
  private officeState: OfficeState
  private sockets: Set<ServerWebSocket<undefined>> = new Set()
  private unsubscribeState: (() => void) | null = null
  private unsubscribeOffice: (() => void) | null = null
  port: number
  onLayoutSave: ((layout: any) => void) | null = null

  constructor(
    stateManager: StateManager,
    officeState: OfficeState,
    config: ServerConfig,
  ) {
    this.stateManager = stateManager
    this.officeState = officeState
    this.port = config.port
    const __dirname = fileURLToPath(new URL(".", import.meta.url))
    this.webRoot = resolve(__dirname, "web")
  }

  start(): void {
    // Subscribe to StateManager for backward compat
    this.unsubscribeState = this.stateManager.onStateChange((update) => {
      this.broadcastToClients(update)
    })

    // Subscribe to OfficeState for ServerMessage events
    this.unsubscribeOffice = this.officeState.subscribe((msg) => {
      this.broadcastToClients(msg)
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
          // Send full layout on connect
          const layoutMsg: ServerMessage = {
            type: "layout",
            layout: this.officeState.layout,
          }
          ws.send(JSON.stringify(layoutMsg))
          // Also send backward compat state snapshot
          const snapshot = this.stateManager.getSnapshot()
          ws.send(JSON.stringify(snapshot))
        },
        close: (ws) => {
          this.sockets.delete(ws)
        },
        message: (ws, raw) => {
          this.handleClientMessage(ws, raw)
        },
      },
    })

    this.port = this.server.port ?? this.port
  }

  stop(): void {
    this.unsubscribeState?.()
    this.unsubscribeState = null
    this.unsubscribeOffice?.()
    this.unsubscribeOffice = null
    this.server?.stop()
    this.server = null
    this.sockets.clear()
  }

  get url(): string {
    return `http://127.0.0.1:${this.port}`
  }

  broadcast(msg: ServerMessage | StateUpdate): void {
    this.broadcastToClients(msg)
  }

  private broadcastToClients(msg: ServerMessage | StateUpdate): void {
    const message = JSON.stringify(msg)
    for (const ws of this.sockets) {
      try {
        ws.send(message)
      } catch {}
    }
  }

  private handleClientMessage(
    _ws: ServerWebSocket<undefined>,
    raw: string | Buffer,
  ): void {
    try {
      const data = JSON.parse(raw.toString())
      if (data.type === "layout_save" && data.layout) {
        if (this.onLayoutSave) {
          this.onLayoutSave(data.layout)
        }
      } else if (data.type === "layout_load") {
        // Send current layout back to requesting client
        const layoutMsg: ServerMessage = {
          type: "layout",
          layout: this.officeState.layout,
        }
        _ws.send(JSON.stringify(layoutMsg))
      }
    } catch {
      // Ignore malformed messages
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
