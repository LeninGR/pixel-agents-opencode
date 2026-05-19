# Pixel Agents — OpenCode Plugin

**Visualiza tus agentes de OpenCode como personajes pixel art en una oficina virtual.**  
Cada sesión, cada sub-agente SDD, cada herramienta — todo visible en tiempo real.

Basado en el motor visual de [pablodelucca/pixel-agents](https://github.com/pablodelucca/pixel-agents) (7.5k ⭐), adaptado como plugin nativo para OpenCode.

---

## 🏗️ Arquitectura

```
┌──────────────────────────────────────────────────────────┐
│                      OpenCode                            │
│  ┌──────────────────────────────────────────────────┐   │
│  │  PixelAgentsPlugin (src/index.ts)                │   │
│  │  • Event hooks (session.*, chat.message, tool.*) │   │
│  │  • Palette system (8 human tones per session)    │   │
│  │  • StateManager (agent action tracking)          │   │
│  └──────────────┬───────────────────────────────────┘   │
│                 │ Bun.serve()                            │
│  ┌──────────────▼───────────────────────────────────┐   │
│  │  PixelAgentsServer (src/server.ts)               │   │
│  │  • HTTP :3456 — sirve webview (React + Canvas)   │   │
│  │  • WebSocket /ws — eventos de agentes en tiempo real│ │
│  └──────────────┬───────────────────────────────────┘   │
└─────────────────┼───────────────────────────────────────┘
                  │ WebSocket
┌─────────────────▼───────────────────────────────────────┐
│  Navegador (http://127.0.0.1:3456)                      │
│  ┌──────────────────────────────────────────────────┐   │
│  │  opencode-bridge.js                              │   │
│  │  WebSocket → MessageEvent → React hooks          │   │
│  └──────────────┬───────────────────────────────────┘   │
│  ┌──────────────▼───────────────────────────────────┐   │
│  │  Pixel Agents Webview (React 19 + Canvas 2D)     │   │
│  │  • Metro City characters (JIK-A-4)               │   │
│  │  • Furniture PNGs + manifest system              │   │
│  │  • Layout editor (walls, floors, desks, chairs)  │   │
│  │  • BFS pathfinding, z-sorting, game loop         │   │
│  └──────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

### Ciclo de vida de un agente

```
OpenCode inicia
  │
  ▼
session.status ──→ plugin detecta ──→ server.broadcast("agent_spawn") ──→ bridge ──→ webview
  │                                                                                    │
  ▼                                                                                    ▼
chat.message ──→ plugin confirma ──→ server.broadcast("agent_tool")      personaje aparece en la oficina
  │                                                                      (paleta fija por nombre)
  ▼
tool.execute.before ──→ plugin detecta herramienta ──→ animación (typing/reading/bash)
  │
  ▼
session.idle ──→ agente se va al rest room (nunca desaparece)
```

### Sub-agentes SDD

Cuando el orquestador lanza fases SDD (`/sdd-propose`, `/sdd-apply`, etc.) se crean sub-agentes:

```
gentle-orchestrator ──task──→ gentle-sdd-spec    (char_1)
                    ──task──→ gentle-sdd-apply   (char_2)
                    ──task──→ gentle-sdd-verify  (char_3)
```

Cada sub-agente tiene su propio personaje Metro City y aparece junto al padre.

---

## 📦 Estructura del proyecto

```
pixel-agents-opencode/
├── src/                          # Capa OpenCode (nuestra)
│   ├── index.ts                  # Plugin entry: hooks, paletas, sesiones
│   ├── server.ts                 # Bun WebSocket + HTTP server
│   ├── state-manager.ts          # Tracking de acciones de agentes
│   ├── opencode-types.ts         # Tipos específicos de OpenCode
│   └── __tests__/                # 14 tests (vitest)
│
├── webview-ui/                   # Frontend (pablodelucca)
│   ├── src/
│   │   ├── App.tsx               # Composición React
│   │   ├── hooks/                # useExtensionMessages, useEditorActions
│   │   ├── office/
│   │   │   ├── engine/           # Game loop, Canvas 2D, BFS, FSM
│   │   │   ├── sprites/          # Metro City characters, sprite cache
│   │   │   ├── editor/           # Layout editor (undo/redo, paint, place)
│   │   │   └── layout/           # Furniture catalog, tile map
│   │   └── components/           # Toolbar, Settings, Zoom, Tooltip
│   └── public/assets/
│       ├── characters/           # 6 PNGs Metro City (112×96px c/u)
│       ├── furniture/            # Muebles PNG + manifest.json
│       ├── floors/               # Patrones de piso PNG
│       └── walls/                # Auto-tile walls PNG
│
├── server/                       # Claude Code hooks (pablodelucca)
├── shared/assets/                # Utilidades de assets (pablodelucca)
├── scripts/                      # Herramientas: asset-manager, wall editor
├── dist/                         # Build output
│   ├── plugin.js                 # Bundle del plugin (8.5 KB)
│   └── web/                      # Webview build (Vite, 293 KB)
├── standalone.mjs                # Servidor Node.js para desarrollo
└── package.json                  # main: "dist/plugin.js"
```

---

## 🚀 Instalación y uso

### Requisitos

- [OpenCode](https://github.com/opencode-ai/opencode) instalado
- Node.js 22+ (para build y servidor standalone)
- npm

### Build

```bash
git clone https://github.com/LeninGR/pixel-agents-opencode.git
cd pixel-agents-opencode
npm install
cd webview-ui && npm install && cd ..
npm run build:webview    # Vite → dist/web/
npm run build:opencode   # tsup → dist/plugin.js
```

### Configurar en OpenCode

Agregá la ruta del proyecto en `~/.config/opencode/opencode.json`:

```json
{
  "plugin": ["/ruta/a/pixel-agents-opencode"]
}
```

Reiniciá OpenCode. El plugin carga automáticamente y levanta el servidor en `http://127.0.0.1:3456`.

### Modo desarrollo (sin OpenCode)

Si querés probar el webview sin OpenCode:

```bash
node standalone.mjs
# Abrí http://127.0.0.1:3456
```

Esto levanta un servidor Node.js con WebSocket que sirve el webview y acepta eventos vía API:

```bash
curl -X POST http://127.0.0.1:3456/api/broadcast \
  -H 'Content-Type: application/json' \
  -d '{"type":"agent_spawn","id":"test","name":"Test","palette":["#f0c8a0","#3d2010","#cc4444","#2a2a3a"]}'
```

---

## 🎨 Asignación de personajes

Cada agente de OpenCode tiene un personaje Metro City fijo según su nombre:

| Agente                | Personaje | Sprite                         |
| --------------------- | --------- | ------------------------------ |
| `gentle-orchestrator` | char_4    | `assets/characters/char_4.png` |
| `gentle-sdd-spec`     | char_1    | `assets/characters/char_1.png` |
| `gentle-sdd-apply`    | char_2    | `assets/characters/char_2.png` |
| `gentle-sdd-verify`   | char_3    | `assets/characters/char_3.png` |
| `gentle-sdd-design`   | char_0    | `assets/characters/char_0.png` |
| `gentle-sdd-tasks`    | char_5    | `assets/characters/char_5.png` |
| _otros_               | rotativo  | (0-5 automático)               |

Definido en `dist/web/opencode-bridge.js` → `NAME_PALETTE`.

### Agregar personajes nuevos

1. Creá el sprite sheet: **112×96px** PNG, 7 frames × 16px, 3 direcciones × 32px
2. Guardalo en `webview-ui/public/assets/characters/char_6.png`
3. Actualizá `PALETTE_COUNT` en `shared/assets/constants.ts`
4. Agregalo al array `characters` en `asset-index.json`
5. Rebuild: `cd webview-ui && npx vite build --outDir ../dist/web`
6. Agregá el mapeo en `NAME_PALETTE` del bridge

Para crear sprites: [Piskel](https://www.piskelapp.com/) (gratis, online), [Aseprite](https://www.aseprite.org/), [LibreSprite](https://libresprite.github.io/).

---

## 🔧 Sistema de paletas

El plugin asigna una paleta de 4 colores a cada sesión (persistente):

```
palette[0] = tono de piel   (ej. #f0c8a0)
palette[1] = color de pelo  (ej. #3d2010)
palette[2] = color de camisa (ej. #cc4444)
palette[3] = color de pantalón (ej. #2a2a3a)
```

8 paletas predefinidas en `src/index.ts` → `PALETTE_POOL`. La misma sesión siempre recibe la misma paleta (`sessionPaletteMap`).

---

## 📡 Protocolo WebSocket

El servidor envía estos mensajes al webview:

| Mensaje         | Disparador          | Datos                                               |
| --------------- | ------------------- | --------------------------------------------------- |
| `state_update`  | StateManager cambia | `{ agents: { [name]: { action, detail, since } } }` |
| `agent_spawn`   | chat.message        | `{ id, name, palette }`                             |
| `session_event` | session.\*          | `{ eventType, sessionID, agentName, palette }`      |
| `agent_tool`    | tool.execute        | `{ id, name, tool }`                                |

El bridge (`opencode-bridge.js`) traduce estos a `MessageEvent` que el webview React consume.

---

## 🧪 Tests

```bash
npm test                 # 14 tests OpenCode (vitest)
cd webview-ui && npm test  # tests del webview
```

---

## 📚 Créditos

- **Motor visual**: [pablodelucca/pixel-agents](https://github.com/pablodelucca/pixel-agents) — MIT License
- **Personajes**: [JIK-A-4, Metro City](https://jik-a-4.itch.io/metrocity-free-topdown-character-pack)
- **Integración OpenCode**: [LeninGR/pixel-agents-opencode](https://github.com/LeninGR/pixel-agents-opencode)

---

## 📄 Licencia

MIT License — ver [LICENSE](LICENSE).
