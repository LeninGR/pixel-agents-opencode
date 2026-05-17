// ── Client OfficeState mirror ─────────────────────────────────────────────────

/**
 * Client-side office state.
 * Mirrors the server's OfficeState via WebSocket messages.
 * Manages characters, layout, bubbles, and camera for the frontend renderer.
 */
export class OfficinaApp {
  /** @type {Map<string, object>} */
  characters = new Map();
  /** @type {object|null} */
  layout = null;
  /** @type {Array<{id: string, col: number, row: number, text: string}>} */
  bubbles = [];
  /** @type {WebSocket|null} */
  ws = null;
  /** @type {HTMLCanvasElement|null} */
  canvas = null;
  /** @type {object} */
  camera = { x: 0, y: 0, zoom: 2 };
  /** @type {number} */
  frame = 0;
  /** @type {(sound: string) => void} */
  onSound = null;
  /** @type {import("./dissolve-effect.js").DissolveEffect|null} */
  dissolveEffect = null;

  /**
   * @param {HTMLCanvasElement} canvas
   */
  constructor(canvas) {
    this.canvas = canvas;
    this.connectWebSocket();
    this.setupCanvasResize();
  }

  // ── WebSocket ────────────────────────────────────────────────────────────

  connectWebSocket() {
    const protocol = typeof location !== "undefined" && location.protocol === "https:" ? "wss:" : "ws:";
    const host = typeof location !== "undefined" ? location.host : "localhost:3456";
    const wsUrl = `${protocol}//${host}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        // Connected — layout will be sent by server
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch {
          // Ignore malformed messages
        }
      };

      this.ws.onclose = () => {
        // Reconnect after delay
        if (typeof setTimeout !== "undefined") {
          setTimeout(() => this.connectWebSocket(), 3000);
        }
      };

      this.ws.onerror = () => {
        // Error — will trigger onclose → reconnect
      };
    } catch {
      // WebSocket not available (Node/test)
      this.ws = null;
    }
  }

  // ── Message routing ──────────────────────────────────────────────────────

  /**
   * Route a ServerMessage to the appropriate handler.
   * @param {object} msg — discriminated union by msg.type
   */
  handleMessage(msg) {
    if (!msg || typeof msg.type !== "string") return;

    switch (msg.type) {
      case "layout":
        this.handleLayout(msg.layout);
        break;
      case "agent_spawn":
        this.handleAgentSpawn(msg);
        break;
      case "agent_remove":
        this.handleAgentRemove(msg);
        break;
      case "agent_active":
        this.handleAgentActive(msg);
        break;
      case "agent_idle":
        this.handleAgentIdle(msg);
        break;
      case "agent_tool":
        this.handleAgentTool(msg);
        break;
      case "subagent_spawn":
        this.handleSubagentSpawn(msg);
        break;
      case "subagent_remove":
        this.handleSubagentRemove(msg);
        break;
      case "agent_bubble":
        this.handleAgentBubble(msg);
        break;
      case "sound_play":
        this.handleSoundPlay(msg);
        break;
      // Ignore unknown types gracefully
    }
  }

  // ── Layout ───────────────────────────────────────────────────────────────

  handleLayout(layout) {
    this.layout = layout;
  }

  // ── Agent lifecycle ─────────────────────────────────────────────────────

  handleAgentSpawn(msg) {
    const { id, palette, seatId } = msg;
    // Default position if no seat known
    const col = 10;
    const row = 5;

    this.characters.set(id, {
      id,
      palette,
      col,
      row,
      direction: 0,
      frame: 0,
      state: "idle",
      seatId: seatId ?? -1,
      tool: null,
    });
  }

  handleAgentRemove(msg) {
    // Trigger dissolve effect before removing character
    const ch = this.characters.get(msg.id);
    if (ch && this.dissolveEffect) {
      this.dissolveEffect.start(ch.col, ch.row, ch.palette);
    }
    this.characters.delete(msg.id);
  }

  handleAgentActive(msg) {
    const ch = this.characters.get(msg.id);
    if (ch) {
      ch.state = "work";
      ch.seatId = msg.seatId;
    }
  }

  handleAgentIdle(msg) {
    const ch = this.characters.get(msg.id);
    if (ch) {
      ch.state = "idle";
    }
  }

  handleAgentTool(msg) {
    const ch = this.characters.get(msg.id);
    if (ch) {
      ch.tool = msg.tool;
    }
  }

  handleSubagentSpawn(msg) {
    const { parentId, id } = msg;
    const parent = this.characters.get(parentId);
    const col = parent ? parent.col + 1 : 10;
    const row = parent ? parent.row : 5;

    this.characters.set(id, {
      id,
      palette: parent ? [...parent.palette] : ["#f4c08e", "#3d2b1f", "#7f8c8d", "#2c3e50", "#bdc3c7", "#2c3e50"],
      col,
      row,
      direction: 0,
      frame: 0,
      state: "idle",
      seatId: -1,
      tool: null,
    });
  }

  handleSubagentRemove(msg) {
    const subId = `sub-${msg.parentId}-${msg.toolId}`;
    this.characters.delete(subId);
  }

  handleAgentBubble(msg) {
    const ch = this.characters.get(msg.id);
    if (ch) {
      this.bubbles.push({
        id: msg.id,
        col: ch.col,
        row: ch.row,
        text: msg.bubble,
        timeout: 3000,
      });
    }
  }

  handleSoundPlay(msg) {
    if (this.onSound) {
      this.onSound(msg.sound);
    }
  }

  // ── Canvas resize ────────────────────────────────────────────────────────

  setupCanvasResize() {
    if (!this.canvas) return;

    const resize = () => {
      const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
      const parent = this.canvas.parentElement;
      const w = parent ? parent.clientWidth : (this.canvas.width || 800);
      const h = parent ? parent.clientHeight : (this.canvas.height || 600);

      this.canvas.width = w * dpr;
      this.canvas.height = h * dpr;
      if (this.canvas.style) {
        this.canvas.style.width = w + "px";
        this.canvas.style.height = h + "px";
      }

      const ctx = this.canvas.getContext("2d");
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("resize", resize);
    }
    resize();
  }

  // ── Update tick ──────────────────────────────────────────────────────────

  /**
   * Update client-side state: advance animations, clean expired bubbles.
   * @param {number} dt — delta time in seconds
   */
  update(dt) {
    this.frame++;

    // Advance character frames for animation
    for (const ch of this.characters.values()) {
      ch.frame = (ch.frame + 1) % 60; // Wrap at 60 to avoid overflow
    }

    // Remove expired bubbles
    this.bubbles = this.bubbles.filter((b) => {
      b.timeout -= dt * 1000;
      return b.timeout > 0;
    });
  }
}

// ── Bootstrap ────────────────────────────────────────────────────────────────

/**
 * Initialize the application when the DOM is ready.
 * Creates a single canvas and starts the OfficinaApp.
 */
export function initOfficina() {
  const canvas = document.getElementById("office");
  if (!canvas) {
    console.error("Canvas #office not found");
    return null;
  }

  const app = new OfficinaApp(canvas);
  return app;
}

// Auto-bootstrap if running in browser (via module script tag — deferred by default)
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      initOfficina();
    });
  } else {
    // DOM already ready (module is deferred)
    initOfficina();
  }
}
