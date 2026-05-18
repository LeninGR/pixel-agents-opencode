import { describe, it, expect, beforeEach } from "vitest";
import { OfficeState } from "../office-state.js";
import { createDefaultLayout } from "../layout-serializer.js";
import type { ServerMessage } from "../types.js";

function makeState() {
  return new OfficeState(createDefaultLayout(20, 11));
}

describe("OfficeState construction", () => {
  it("initializes from default layout with valid tileMap, seats, blockedTiles", () => {
    const state = makeState();
    expect(state.layout.cols).toBe(20);
    expect(state.layout.rows).toBe(11);
    expect(state.characters.size).toBe(0);
    expect(state.seats.length).toBeGreaterThan(0);
    expect(state.blockedTiles.size).toBeGreaterThan(0);
    expect(state.tileMap).toBeDefined();
  });
});

describe("addAgent", () => {
  let state: OfficeState;

  beforeEach(() => {
    state = makeState();
  });

  it("spawns agent at assigned seat", () => {
    const agent = state.addAgent("agent-1", "test", ["#ff0000"], 0);
    expect(agent.id).toBe("agent-1");
    expect(state.characters.has("agent-1")).toBe(true);
    // Agent should be at the seat position
    const seat = state.seats[0];
    expect(agent.row).toBe(seat.row);
    expect(agent.col).toBe(seat.col);
    expect(agent.state).toBe("idle");
  });

  it("auto-assigns seat when no seatId given", () => {
    const agent = state.addAgent("auto-seat", "test", ["#00ff00"]);
    expect(agent).toBeDefined();
    expect(state.characters.has("auto-seat")).toBe(true);
  });

  it("finds nearest walkable tile if seat ID does not exist", () => {
    // seatId 9999 does not exist — agent auto-assigns first seat
    const agent = state.addAgent("unknown-seat", "test", ["#ff0000"], 9999);
    expect(agent).toBeDefined();
    // Should be on a walkable tile (in bounds, not a wall)
    expect(agent.row).toBeGreaterThan(0);
    expect(agent.row).toBeLessThan(state.layout.rows - 1);
    expect(agent.col).toBeGreaterThan(0);
    expect(agent.col).toBeLessThan(state.layout.cols - 1);
  });

  it("broadcasts agent_spawn via subscribe", () => {
    const messages: ServerMessage[] = [];
    state.subscribe((msg) => messages.push(msg));

    state.addAgent("broadcast-test", "test", ["#ff0000"], 0);

    expect(messages.length).toBe(1);
    expect(messages[0].type).toBe("agent_spawn");
  });
});

describe("removeAgent", () => {
  it("removes agent from map and broadcasts agent_remove", () => {
    const state = makeState();
    const messages: ServerMessage[] = [];
    state.subscribe((msg) => messages.push(msg));

    state.addAgent("to-remove", "test", ["#ff0000"], 0);
    expect(state.characters.has("to-remove")).toBe(true);

    state.removeAgent("to-remove");
    expect(state.characters.has("to-remove")).toBe(false);

    const removeMsg = messages.find((m) => m.type === "agent_remove");
    expect(removeMsg).toBeDefined();
    if (removeMsg?.type === "agent_remove") {
      expect(removeMsg.id).toBe("to-remove");
    }
  });

  it("no-ops for unknown agent", () => {
    const state = makeState();
    const messages: ServerMessage[] = [];
    state.subscribe((msg) => messages.push(msg));

    state.removeAgent("nonexistent");
    expect(messages.length).toBe(0);
  });
});

describe("setAgentActive / setAgentInactive", () => {
  it("setAgentActive broadcasts agent_active with seatId", () => {
    const state = makeState();
    const messages: ServerMessage[] = [];
    state.subscribe((msg) => messages.push(msg));

    state.addAgent("active-test", "test", ["#ff0000"], 0);
    state.setAgentActive("active-test", 0);

    const activeMsg = messages.find((m) => m.type === "agent_active");
    expect(activeMsg).toBeDefined();
    if (activeMsg?.type === "agent_active") {
      expect(activeMsg.id).toBe("active-test");
    }
  });

  it("setAgentInactive broadcasts agent_idle", () => {
    const state = makeState();
    const messages: ServerMessage[] = [];
    state.subscribe((msg) => messages.push(msg));

    state.addAgent("idle-test", "test", ["#ff0000"], 0);
    state.setAgentInactive("idle-test");

    const idleMsg = messages.find((m) => m.type === "agent_idle");
    expect(idleMsg).toBeDefined();
    if (idleMsg?.type === "agent_idle") {
      expect(idleMsg.id).toBe("idle-test");
    }
  });
});

describe("sub-agents", () => {
  it("addSubagent spawns near parent at adjacent walkable tile", () => {
    const state = makeState();
    state.addAgent("parent", "test", ["#ff0000"], 0);

    const sub = state.addSubagent("parent", "task-1");
    expect(sub).not.toBeNull();
    if (!sub) return; // TypeScript narrowing
    expect(sub.id).toBe("sub-parent-task-1");
    expect(state.characters.has(sub.id)).toBe(true);

    // Should be adjacent to parent
    const parent = state.characters.get("parent")!;
    const dist = Math.abs(sub.row - parent.row) + Math.abs(sub.col - parent.col);
    expect(dist).toBe(1);
  });

  it("removeSubagent removes from map and broadcasts", () => {
    const state = makeState();
    const messages: ServerMessage[] = [];
    state.subscribe((msg) => messages.push(msg));

    state.addAgent("parent", "test", ["#ff0000"], 0);
    state.addSubagent("parent", "task-1");
    state.removeSubagent("parent", "task-1");

    expect(state.characters.has("sub-parent-task-1")).toBe(false);

    const removeMsg = messages.find((m) => m.type === "subagent_remove");
    expect(removeMsg).toBeDefined();
  });
});

describe("agent count and state integrity", () => {
  it("maintains correct character count across add/remove", () => {
    const state = makeState();
    expect(state.characters.size).toBe(0);

    state.addAgent("a", "test", ["#f00"], 0);
    state.addAgent("b", "test", ["#0f0"], 1);
    expect(state.characters.size).toBe(2);

    state.removeAgent("a");
    expect(state.characters.size).toBe(1);
    expect(state.characters.has("b")).toBe(true);
  });

  it("addAgent broadcasts before returning the character", () => {
    const state = makeState();
    let capturedId = "";
    state.subscribe((msg) => {
      if (msg.type === "agent_spawn") capturedId = msg.id;
    });

    const agent = state.addAgent("capture-test", "test", ["#f00"], 0);
    expect(capturedId).toBe("capture-test");
  });
});

describe("update(dt)", () => {
  it("advances all walking characters", () => {
    const state = makeState();
    const agent = state.addAgent("walker", "test", ["#ff0000"], 0);

    // Assign a path manually
    agent.path = [
      [agent.row, agent.col + 1],
    ];
    agent.state = "walk";

    state.update(0.5);
    // Should have moved at least one tile
    expect(agent.col).not.toBe(state.seats[0].col);
  });
});

describe("subscribe / unsubscribe", () => {
  it("subscribe returns unsubscribe function", () => {
    const state = makeState();
    const messages: ServerMessage[] = [];
    const unsub = state.subscribe((msg) => messages.push(msg));

    state.addAgent("sub-test", "test", ["#ff0000"], 0);
    expect(messages.length).toBe(1);

    unsub();
    state.addAgent("sub-test-2", "test", ["#00ff00"], 1);
    expect(messages.length).toBe(1); // no new messages
  });
});
