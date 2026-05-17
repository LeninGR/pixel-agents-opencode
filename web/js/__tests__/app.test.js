import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock WebSocket
class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = 1; // OPEN
    this.onopen = null;
    this.onclose = null;
    this.onmessage = null;
    this.onerror = null;
    this.sent = [];
  }
  send(data) {
    this.sent.push(data);
  }
  close() {
    this.readyState = 3; // CLOSED
    if (this.onclose) this.onclose({ code: 1000 });
  }
  receive(data) {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(data) });
    }
  }
}

// Canvas mock factory
function mockCanvas() {
  return {
    width: 800,
    height: 600,
    style: {},
    getContext: () => ({
      canvas: { width: 800, height: 600 },
      fillStyle: "",
      fillRect() {},
      setTransform() {},
    }),
  };
}

// Stub globals before each test
beforeEach(() => {
  vi.stubGlobal("WebSocket", MockWebSocket);
  vi.stubGlobal("location", { protocol: "http:", host: "localhost:3456" });
  vi.stubGlobal("setTimeout", vi.fn((fn) => {
    fn();
    return 1;
  }));
  vi.stubGlobal("clearTimeout", vi.fn());
  vi.stubGlobal("devicePixelRatio", 1);
});

describe("OfficinaApp (Task 3.5)", () => {
  it("exports OfficinaApp class", async () => {
    const { OfficinaApp } = await import("../app.js");
    expect(typeof OfficinaApp).toBe("function");
  });

  it("creates WebSocket connection on init", async () => {
    const { OfficinaApp } = await import("../app.js");
    const canvas = mockCanvas();
    const app = new OfficinaApp(canvas);

    expect(app.ws).toBeInstanceOf(MockWebSocket);
    expect(app.ws.url).toContain("/ws");
  });

  it("handleMessage routes agent_spawn to state", async () => {
    const { OfficinaApp } = await import("../app.js");
    const canvas = mockCanvas();
    const app = new OfficinaApp(canvas);

    app.handleMessage({
      type: "agent_spawn",
      id: "session-123",
      palette: ["#aaa", "#bbb", "#ccc", "#ddd", "#eee", "#fff"],
      seatId: 0,
    });

    expect(app.characters.has("session-123")).toBe(true);
    const ch = app.characters.get("session-123");
    expect(ch.id).toBe("session-123");
    expect(ch.palette).toEqual(["#aaa", "#bbb", "#ccc", "#ddd", "#eee", "#fff"]);
  });

  it("handleMessage routes agent_remove", async () => {
    const { OfficinaApp } = await import("../app.js");
    const canvas = mockCanvas();
    const app = new OfficinaApp(canvas);

    app.handleMessage({ type: "agent_spawn", id: "s1", palette: ["#f00"] });
    expect(app.characters.has("s1")).toBe(true);

    app.handleMessage({ type: "agent_remove", id: "s1" });
    expect(app.characters.has("s1")).toBe(false);
  });

  it("handleMessage routes agent_active", async () => {
    const { OfficinaApp } = await import("../app.js");
    const canvas = mockCanvas();
    const app = new OfficinaApp(canvas);

    app.handleMessage({ type: "agent_spawn", id: "s1", palette: ["#f00"] });
    app.handleMessage({ type: "agent_active", id: "s1", seatId: 3 });

    expect(app.characters.get("s1").state).toBe("work");
  });

  it("handleMessage routes agent_idle", async () => {
    const { OfficinaApp } = await import("../app.js");
    const canvas = mockCanvas();
    const app = new OfficinaApp(canvas);

    app.handleMessage({ type: "agent_spawn", id: "s1", palette: ["#f00"] });
    app.handleMessage({ type: "agent_idle", id: "s1" });

    expect(app.characters.get("s1").state).toBe("idle");
  });

  it("handleMessage routes agent_tool", async () => {
    const { OfficinaApp } = await import("../app.js");
    const canvas = mockCanvas();
    const app = new OfficinaApp(canvas);

    app.handleMessage({ type: "agent_spawn", id: "s1", palette: ["#f00"] });
    app.handleMessage({ type: "agent_tool", id: "s1", tool: "bash" });

    const ch = app.characters.get("s1");
    expect(ch.tool).toBe("bash");
  });

  it("handleMessage routes subagent_spawn and subagent_remove", async () => {
    const { OfficinaApp } = await import("../app.js");
    const canvas = mockCanvas();
    const app = new OfficinaApp(canvas);

    app.handleMessage({
      type: "subagent_spawn",
      parentId: "parent",
      toolId: "task-1",
      id: "sub-parent-task-1",
    });

    expect(app.characters.has("sub-parent-task-1")).toBe(true);

    app.handleMessage({
      type: "subagent_remove",
      parentId: "parent",
      toolId: "task-1",
    });

    expect(app.characters.has("sub-parent-task-1")).toBe(false);
  });

  it("handleMessage routes agent_bubble", async () => {
    const { OfficinaApp } = await import("../app.js");
    const canvas = mockCanvas();
    const app = new OfficinaApp(canvas);

    app.handleMessage({ type: "agent_spawn", id: "s1", palette: ["#f00"] });
    app.handleMessage({ type: "agent_bubble", id: "s1", bubble: "waiting" });

    expect(app.bubbles.length).toBeGreaterThanOrEqual(1);
    expect(app.bubbles.some(b => b.id === "s1" && b.text === "waiting")).toBe(true);
  });

  it("handleMessage routes sound_play (fires callback)", async () => {
    let playedSound = null;
    const { OfficinaApp } = await import("../app.js");
    const canvas = mockCanvas();
    const app = new OfficinaApp(canvas);

    app.onSound = (sound) => { playedSound = sound; };

    app.handleMessage({ type: "sound_play", sound: "done" });

    expect(playedSound).toBe("done");
  });

  it("handleMessage stores layout on connect", async () => {
    const { OfficinaApp } = await import("../app.js");
    const canvas = mockCanvas();
    const app = new OfficinaApp(canvas);

    app.handleMessage({
      type: "layout",
      layout: { cols: 20, rows: 11, tiles: [], furniture: [], tileColors: {} },
    });

    expect(app.layout).toBeDefined();
    expect(app.layout.cols).toBe(20);
    expect(app.layout.rows).toBe(11);
  });

  it("ignores unknown message types gracefully", async () => {
    const { OfficinaApp } = await import("../app.js");
    const canvas = mockCanvas();
    const app = new OfficinaApp(canvas);

    // These should not throw
    expect(() => app.handleMessage({ type: "unknown" })).not.toThrow();
    expect(() => app.handleMessage(null)).not.toThrow();
    expect(() => app.handleMessage({})).not.toThrow();
  });
});
