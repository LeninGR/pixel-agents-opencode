import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockWebSocketSend = vi.fn();
const mockWebSocket = { send: mockWebSocketSend, readyState: 1, data: {} };

let wsOpenHandler: ((ws: typeof mockWebSocket) => void) | null = null;
let wsMessageHandler: ((ws: typeof mockWebSocket, message: string | Buffer) => void) | null = null;
let wsCloseHandler: ((ws: typeof mockWebSocket, code: number, reason: string) => void) | null = null;

const mockBunServe = vi.fn((opts: any) => {
  wsOpenHandler = opts.websocket?.open ?? null;
  wsMessageHandler = opts.websocket?.message ?? null;
  wsCloseHandler = opts.websocket?.close ?? null;
  return { port: 3456, stop: vi.fn() };
});

vi.stubGlobal("Bun", { serve: mockBunServe });

import { StateManager } from "../state-manager.js";

describe("PixelAgentsServer (simplified)", () => {
  let stateManager: StateManager;
  let server: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockWebSocketSend.mockClear();
    wsOpenHandler = null;
    wsMessageHandler = null;
    wsCloseHandler = null;

    stateManager = new StateManager();
    const mod = await import("../server.js");
    server = new mod.PixelAgentsServer(stateManager, { port: 3456, host: "127.0.0.1" });
  });

  afterEach(() => {
    server?.stop();
  });

  it("sends state snapshot when a WebSocket client connects", () => {
    server.start();
    expect(wsOpenHandler).not.toBeNull();
    wsOpenHandler!(mockWebSocket as any);

    expect(mockWebSocketSend).toHaveBeenCalled();
    const firstMessage = JSON.parse(mockWebSocketSend.mock.calls[0][0]);
    expect(firstMessage.type).toBe("state_update");
  });

  it("broadcasts messages to all connected sockets", () => {
    server.start();
    const mockSocket2 = { send: vi.fn(), readyState: 1, data: {} };

    wsOpenHandler!(mockWebSocket as any);
    wsOpenHandler!(mockSocket2 as any);
    mockWebSocketSend.mockClear();
    (mockSocket2.send as any).mockClear();

    const msg = { type: "agent_spawn", id: "agent-1", name: "test" };
    server.broadcast(msg);

    const expected = JSON.stringify(msg);
    expect(mockWebSocketSend).toHaveBeenCalledWith(expected);
    expect(mockSocket2.send).toHaveBeenCalledWith(expected);
  });

  it("removes socket on close and does not broadcast to it", () => {
    server.start();
    wsOpenHandler!(mockWebSocket as any);
    mockWebSocketSend.mockClear();

    expect(wsCloseHandler).not.toBeNull();
    wsCloseHandler!(mockWebSocket as any, 1000, "");

    server.broadcast({ type: "agent_idle", id: "agent-1" });
    expect(mockWebSocketSend).not.toHaveBeenCalled();
  });

  it("handles client messages via onClientMessage callback", () => {
    const onMsg = vi.fn();
    server.onClientMessage = onMsg;
    server.start();

    wsOpenHandler!(mockWebSocket as any);
    mockWebSocketSend.mockClear();

    const clientMsg = JSON.stringify({ type: "layout_save", layout: { cols: 10, rows: 8 } });
    expect(wsMessageHandler).not.toBeNull();
    wsMessageHandler!(mockWebSocket as any, clientMsg);

    expect(onMsg).toHaveBeenCalled();
  });

  it("ignores malformed client messages", () => {
    server.start();
    wsOpenHandler!(mockWebSocket as any);
    mockWebSocketSend.mockClear();

    expect(() => wsMessageHandler!(mockWebSocket as any, "not json")).not.toThrow();
    expect(mockWebSocketSend).not.toHaveBeenCalled();
  });

  it("broadcast does not throw with no connected sockets", () => {
    server.start();
    expect(() => server.broadcast({ type: "test" })).not.toThrow();
  });
});
