import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { resolve, extname, join } from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const webRoot = resolve(__dirname, 'dist', 'web');
const PORT = 3456;

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.jpg': 'image/jpeg',
};

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);

  // ── API: broadcast to all WS clients ─────────────────────────────────
  if (req.method === 'POST' && url.pathname === '/api/broadcast') {
    let body = '';
    req.on('data', (chunk) => body += chunk);
    req.on('end', () => {
      try {
        const msg = JSON.parse(body);
        broadcast(msg);
        res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ ok: true }));
      } catch {
        res.writeHead(400).end('invalid json');
      }
    });
    return;
  }

  // ── Static files ─────────────────────────────────────────────────────
  let pathname = url.pathname === '/' ? '/index.html' : url.pathname;
  if (pathname.startsWith('/')) pathname = pathname.slice(1);
  const filePath = join(webRoot, pathname);
  if (!filePath.startsWith(webRoot)) { res.writeHead(403); res.end(); return; }
  if (!existsSync(filePath)) { res.writeHead(404); res.end(); return; }
  const ext = extname(filePath);
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  res.end(readFileSync(filePath));
});

// ── WebSocket ─────────────────────────────────────────────────────────────
const wss = new WebSocketServer({ server });
const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  ws.on('close', () => clients.delete(ws));
});

function broadcast(msg) {
  const data = JSON.stringify(msg);
  for (const c of clients) {
    if (c.readyState === 1) c.send(data);
  }
}

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n✅ Pixel Agents at http://127.0.0.1:${PORT}`);
  console.log(`   API: POST http://127.0.0.1:${PORT}/api/broadcast\n`);
});

process.stdin.resume();
