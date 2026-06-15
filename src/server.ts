import { existsSync, readFileSync } from 'fs';
import {
  createServer,
  type IncomingMessage,
  type Server as HttpServer,
  type ServerResponse,
} from 'http';
import { extname,join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { type WebSocket,WebSocketServer } from 'ws';

import type { ServerConfig, StateUpdate } from './opencode-types.js';
import type { StateManager } from './state-manager.js';

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
  private httpServer: HttpServer | null = null;
  private wss: WebSocketServer | null = null;
  private webRoot: string;
  private stateManager: StateManager;
  private sockets: Set<WebSocket> = new Set();
  private unsubscribeState: (() => void) | null = null;
  private recentMessages: Array<Record<string, unknown>> = [];
  private static readonly MAX_BUFFER = 200;
  port: number;

  /** Callback for client→server messages (layout_save, layout_load, etc.) */
  onClientMessage: ((data: Record<string, unknown>, ws: WebSocket) => void) | null = null;

  constructor(stateManager: StateManager, config: ServerConfig) {
    this.stateManager = stateManager;
    this.port = config.port;
    const __dirname = fileURLToPath(new URL('.', import.meta.url));
    this.webRoot = resolve(__dirname, 'web');
  }

  start(): void {
    if (this.httpServer) {
      this.stop();
    }

    this.unsubscribeState = this.stateManager.onStateChange((update) => {
      this.broadcast(update);
    });

    this.httpServer = createServer((req: IncomingMessage, res: ServerResponse) => {
      const pathname = req.url || '/';

      // Handle WebSocket upgrade separately
      if (pathname === '/ws') {
        // Will be handled by WebSocketServer
        return;
      }

      this.serveStatic(pathname, res);
    });

    this.wss = new WebSocketServer({ server: this.httpServer, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket) => {
      this.sockets.add(ws);

      // Send initial state
      ws.send(JSON.stringify(this.stateManager.getSnapshot()));

      // Replay recent messages to new client (catches up on missed spawns).
      // Skip the internal _ts timestamp field.
      for (const msg of this.recentMessages) {
        try {
          const { _ts, ...clean } = msg as Record<string, unknown> & { _ts?: number };
          ws.send(JSON.stringify(clean));
        } catch {}
      }

      ws.on('message', (raw: Buffer) => {
        try {
          const data = JSON.parse(raw.toString());
          if (this.onClientMessage) this.onClientMessage(data, ws);
        } catch {
          /* ignore malformed */
        }
      });

      ws.on('close', () => {
        this.sockets.delete(ws);
      });
    });

    this.httpServer.listen(this.port, '127.0.0.1', () => {
      // Server started
    });
  }

  stop(): void {
    this.unsubscribeState?.();
    this.unsubscribeState = null;

    // Close all WebSocket connections
    for (const ws of this.sockets) {
      try {
        ws.close();
      } catch {}
    }
    this.sockets.clear();

    // Close WebSocket server
    this.wss?.close();
    this.wss = null;

    // Close HTTP server
    this.httpServer?.close();
    this.httpServer = null;
  }

  get url(): string {
    return `http://127.0.0.1:${this.port}`;
  }

  /** Broadcast any JSON-serializable message to all connected clients. */
  broadcast(msg: StateUpdate | Record<string, unknown>): void {
    // Tag message with timestamp for age-based filtering on replay
    const tagged = { ...(msg as Record<string, unknown>), _ts: Date.now() };
    // Buffer message for replay to new clients
    this.recentMessages.push(tagged);
    if (this.recentMessages.length > PixelAgentsServer.MAX_BUFFER) {
      this.recentMessages.shift();
    }
    // Expire messages older than 60s — they shouldn't be replayed
    const now = Date.now();
    this.recentMessages = this.recentMessages.filter(
      (m) => now - ((m as { _ts?: number })._ts ?? 0) < 60_000,
    );

    const raw = JSON.stringify(msg);
    for (const ws of this.sockets) {
      try {
        if (ws.readyState === 1) {
          // WebSocket.OPEN
          ws.send(raw);
        }
      } catch {
        /* ignore */
      }
    }
  }

  private serveStatic(pathname: string, res: ServerResponse): void {
    if (pathname === '/') pathname = '/index.html';
    if (pathname.startsWith('/')) pathname = pathname.slice(1);
    const filePath = join(this.webRoot, pathname);
    if (!filePath.startsWith(this.webRoot)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    if (!existsSync(filePath)) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }
    try {
      const content = readFileSync(filePath);
      const ext = extname(filePath);
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
      res.end(content);
    } catch {
      res.writeHead(500);
      res.end('Internal Server Error');
    }
  }
}
