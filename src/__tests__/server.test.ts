import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock Bun global before importing server module
const mockWebSocketSend = vi.fn();
const mockWebSocket = {
  send: mockWebSocketSend,
  readyState: 1, // OPEN
  data: {},
};

let wsOpenHandler: ((ws: typeof mockWebSocket) => void) | null = null;
let wsMessageHandler: ((ws: typeof mockWebSocket, message: string | Buffer) => void) | null = null;
let wsCloseHandler: ((ws: typeof mockWebSocket, code: number, reason: string) => void) | null = null;
let stopCallback: (() => void) | null = null;

// Mock the global Bun object (used by server.ts as Bun.serve(...))
const mockBunServe = vi.fn((opts: any) => {
  wsOpenHandler = opts.websocket?.open ?? null;
  wsMessageHandler = opts.websocket?.message ?? null;
  wsCloseHandler = opts.websocket?.close ?? null;
  return {
    port: 3456,
    stop: vi.fn(() => {
      stopCallback?.();
    }),
  };
});

vi.stubGlobal("Bun", {
  serve: mockBunServe,
});

import { StateManager } from "../state-manager.js";
import { OfficeState } from "../game/office-state.js";
import { createDefaultLayout } from "../game/layout-serializer.js";
import type { ServerMessage } from "../types.js";

describe("PixelAgentsServer", () => {
  let stateManager: StateManager;
  let officeState: OfficeState;
  let server: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockWebSocketSend.mockClear();
    wsOpenHandler = null;
    wsMessageHandler = null;
    wsCloseHandler = null;
    stopCallback = null;

    stateManager = new StateManager();
    officeState = new OfficeState(createDefaultLayout(20, 11));

    // Re-import server to get fresh instance with mocks
    const mod = await import("../server.js");
    server = new mod.PixelAgentsServer(stateManager, officeState, {
      port: 3456,
      host: "127.0.0.1",
    });
  });

  afterEach(() => {
    server?.stop();
  });

  it("sends layout message when a WebSocket client connects", () => {
    server.start();

    // Simulate a WebSocket connection
    expect(wsOpenHandler).not.toBeNull();
    wsOpenHandler!(mockWebSocket as any);

    // Should send a layout message as first message
    expect(mockWebSocketSend).toHaveBeenCalled();
    const firstMessage = JSON.parse(mockWebSocketSend.mock.calls[0][0]);
    expect(firstMessage.type).toBe("layout");
    expect(firstMessage.layout).toBeDefined();
    expect(firstMessage.layout.cols).toBe(20);
    expect(firstMessage.layout.rows).toBe(11);
  });

  it("broadcasts ServerMessage to all connected sockets", () => {
    server.start();

    // Connect two clients
    const mockSocket2 = {
      send: vi.fn(),
      readyState: 1,
      data: {},
    };

    wsOpenHandler!(mockWebSocket as any);
    wsOpenHandler!(mockSocket2 as any);

    // Clear the layout messages that were sent on connect
    mockWebSocketSend.mockClear();
    (mockSocket2.send as any).mockClear();

    // Broadcast a message
    const msg: ServerMessage = {
      type: "agent_spawn", name: "test",
      id: "agent-1",
      palette: ["#ff0000", "#00ff00"],
    };
    server.broadcast(msg);

    const expected = JSON.stringify(msg);
    expect(mockWebSocketSend).toHaveBeenCalledWith(expected);
    expect(mockSocket2.send).toHaveBeenCalledWith(expected);
  });

  it("removes socket on close and does not broadcast to it", () => {
    server.start();

    wsOpenHandler!(mockWebSocket as any);
    mockWebSocketSend.mockClear();

    // Close the socket
    expect(wsCloseHandler).not.toBeNull();
    wsCloseHandler!(mockWebSocket as any, 1000, "");

    // Broadcast after close — should not send to closed socket
    const msg: ServerMessage = {
      type: "agent_idle",
      id: "agent-1",
    };
    server.broadcast(msg);

    expect(mockWebSocketSend).not.toHaveBeenCalled();
  });

  it("handles layout_save client message", () => {
    const onSave = vi.fn();
    server.onLayoutSave = onSave;
    server.start();

    wsOpenHandler!(mockWebSocket as any);
    mockWebSocketSend.mockClear();

    // Send a layout save message from client
    const layoutData = createDefaultLayout(10, 8);
    const clientMsg = JSON.stringify({
      type: "layout_save",
      layout: layoutData,
    });

    expect(wsMessageHandler).not.toBeNull();
    wsMessageHandler!(mockWebSocket as any, clientMsg);

    expect(onSave).toHaveBeenCalled();
    const savedLayout = onSave.mock.calls[0][0];
    expect(savedLayout.cols).toBe(10);
    expect(savedLayout.rows).toBe(8);
  });

  it("handles layout_load client message by sending current layout", () => {
    server.start();

    wsOpenHandler!(mockWebSocket as any);
    mockWebSocketSend.mockClear();

    // Send layout_load from client
    const clientMsg = JSON.stringify({ type: "layout_load" });

    wsMessageHandler!(mockWebSocket as any, clientMsg);

    expect(mockWebSocketSend).toHaveBeenCalled();
    const response = JSON.parse(mockWebSocketSend.mock.calls[0][0]);
    expect(response.type).toBe("layout");
    expect(response.layout).toBeDefined();
  });

  it("broadcast does not throw with no connected sockets", () => {
    server.start();

    // No clients connected
    const msg: ServerMessage = {
      type: "agent_remove",
      id: "agent-1",
    };
    expect(() => server.broadcast(msg)).not.toThrow();
  });

  it("layout_load sends to requesting client only", () => {
    server.start();

    // Connect two clients
    const mockSocket2 = {
      send: vi.fn(),
      readyState: 1,
      data: {},
    };

    wsOpenHandler!(mockWebSocket as any);
    wsOpenHandler!(mockSocket2 as any);

    // Clear layout-on-connect messages
    mockWebSocketSend.mockClear();
    (mockSocket2.send as any).mockClear();

    // Client 2 requests layout_load
    wsMessageHandler!(mockSocket2 as any, JSON.stringify({ type: "layout_load" }));

    // Only the requesting client should receive the layout
    expect(mockWebSocketSend).not.toHaveBeenCalled();
    expect(mockSocket2.send).toHaveBeenCalled();
    const response = JSON.parse((mockSocket2.send as any).mock.calls[0][0]);
    expect(response.type).toBe("layout");
  });

  it("ignores malformed client messages", () => {
    server.start();

    wsOpenHandler!(mockWebSocket as any);
    mockWebSocketSend.mockClear();

    // Send malformed JSON
    expect(() => wsMessageHandler!(mockWebSocket as any, "not json")).not.toThrow();
    expect(mockWebSocketSend).not.toHaveBeenCalled();

    // Send unknown message type
    wsMessageHandler!(mockWebSocket as any, JSON.stringify({ type: "unknown_op" }));
    expect(mockWebSocketSend).not.toHaveBeenCalled();
  });

  it("sends agent_tool message via broadcast", () => {
    server.start();

    wsOpenHandler!(mockWebSocket as any);
    mockWebSocketSend.mockClear();

    const msg: ServerMessage = {
      type: "agent_tool",
      id: "agent-1",
      tool: "bash",
    };
    server.broadcast(msg);

    expect(mockWebSocketSend).toHaveBeenCalled();
    const sent = JSON.parse(mockWebSocketSend.mock.calls[0][0]);
    expect(sent.type).toBe("agent_tool");
    expect(sent.id).toBe("agent-1");
    expect(sent.tool).toBe("bash");
  });
});
