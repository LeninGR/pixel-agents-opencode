import { resolve, join, extname } from 'path';
import { existsSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import type { Server, ServerWebSocket } from 'bun';
import type { StateManager } from './state-manager.js';
import type { ServerConfig, StateUpdate } from './opencode-types.js';

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

export class PixelAgentsServer {
  private server: Server<undefined> | null = null;
  private webRoot: string;
  private stateManager: StateManager;
  private sockets: Set<ServerWebSocket<undefined>> = new Set();
  private unsubscribeState: (() => void) | null = null;
  port: number;

  /** Callback for client→server messages (layout_save, layout_load, etc.) */
  onClientMessage:
    | ((data: Record<string, unknown>, ws: ServerWebSocket<undefined>) => void)
    | null = null;

  constructor(stateManager: StateManager, config: ServerConfig) {
    this.stateManager = stateManager;
    this.port = config.port;
    const __dirname = fileURLToPath(new URL('.', import.meta.url));
    this.webRoot = resolve(__dirname, 'web');
  }

  start(): void {
    this.unsubscribeState = this.stateManager.onStateChange((update) => {
      this.broadcast(update);
    });

    this.server = Bun.serve({
      port: this.port,
      hostname: '127.0.0.1',
      fetch: (req: Request, server: Server<undefined>) => {
        const url = new URL(req.url);
        if (url.pathname === '/ws') {
          const upgraded = server.upgrade(req);
          if (upgraded) return undefined as unknown as Response;
          return new Response('WebSocket upgrade failed', { status: 400 });
        }
        return this.serveStatic(url.pathname);
      },
      websocket: {
        open: (ws: ServerWebSocket<undefined>) => {
          this.sockets.add(ws);
          // Send current state snapshot
          ws.send(JSON.stringify(this.stateManager.getSnapshot()));
        },
        close: (ws: ServerWebSocket<undefined>) => {
          this.sockets.delete(ws);
        },
        message: (ws: ServerWebSocket<undefined>, raw: string | Buffer) => {
          try {
            const data = JSON.parse(raw.toString());
            if (this.onClientMessage) this.onClientMessage(data, ws);
          } catch {
            /* ignore malformed */
          }
        },
      },
    });

    this.port = this.server.port ?? this.port;
  }

  stop(): void {
    this.unsubscribeState?.();
    this.unsubscribeState = null;
    this.server?.stop();
    this.server = null;
    this.sockets.clear();
  }

  get url(): string {
    return `http://127.0.0.1:${this.port}`;
  }

  /** Broadcast any JSON-serializable message to all connected clients. */
  broadcast(msg: StateUpdate | Record<string, unknown>): void {
    const raw = JSON.stringify(msg);
    for (const ws of this.sockets) {
      try {
        ws.send(raw);
      } catch {
        /* ignore */
      }
    }
  }

  private serveStatic(pathname: string): Response {
    if (pathname === '/') pathname = '/index.html';
    if (pathname.startsWith('/')) pathname = pathname.slice(1);
    const filePath = join(this.webRoot, pathname);
    if (!filePath.startsWith(this.webRoot)) {
      return new Response('Forbidden', { status: 403 });
    }
    if (!existsSync(filePath)) {
      return new Response('Not Found', { status: 404 });
    }
    try {
      const content = readFileSync(filePath);
      const ext = extname(filePath);
      return new Response(content, {
        headers: { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' },
      });
    } catch {
      return new Response('Internal Server Error', { status: 500 });
    }
  }
}
