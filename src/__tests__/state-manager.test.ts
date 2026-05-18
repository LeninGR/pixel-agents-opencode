import { describe, it, expect } from "vitest";
import { StateManager } from "../state-manager.js";
import { OfficeState } from "../game/office-state.js";
import { createDefaultLayout } from "../game/layout-serializer.js";
import type { ServerMessage } from "../types.js";

describe("StateManager", () => {
  it("sets an agent action and emits snapshot", () => {
    const manager = new StateManager();
    let lastUpdate: unknown = null;

    manager.onStateChange((update) => {
      lastUpdate = update;
    });

    manager.setAgentAction("sisyphus", "coding", "Writing index.ts");

    expect(lastUpdate).toBeTruthy();
    const snapshot = (lastUpdate as any).agents;
    expect(snapshot.sisyphus).toBeDefined();
    expect(snapshot.sisyphus.action).toBe("coding");
  });

  it("marks agent as idle", () => {
    const manager = new StateManager();
    manager.setAgentIdle("oracle");

    const snapshot = manager.getSnapshot();
    expect(snapshot.agents.oracle.action).toBe("idle");
  });

  it("deduplicates identical state updates", () => {
    const manager = new StateManager();
    let callCount = 0;

    manager.onStateChange(() => callCount++);

    manager.setAgentAction("explore", "searching", "grep");
    manager.setAgentAction("explore", "searching", "grep");
    manager.setAgentAction("explore", "searching", "grep");

    expect(callCount).toBe(1);
  });

  it("handles tool start with mapped action", () => {
    const manager = new StateManager();
    manager.handleToolStart("hephaestus", "edit");

    const snapshot = manager.getSnapshot();
    expect(snapshot.agents.hephaestus.action).toBe("coding");
    expect(snapshot.agents.hephaestus.tool).toBe("edit");
  });

  it("handles unknown tool as thinking", () => {
    const manager = new StateManager();
    manager.handleToolStart("metis", "unknown_tool");

    const snapshot = manager.getSnapshot();
    expect(snapshot.agents.metis.action).toBe("thinking");
  });
});

// ── OfficeState lifecycle integration tests ─────────────────────────────────

describe("OfficeState lifecycle (event → broadcast)", () => {
  function subscribeAndCapture(
    office: OfficeState,
  ): { messages: ServerMessage[]; unsubscribe: () => void } {
    const messages: ServerMessage[] = [];
    const unsubscribe = office.subscribe((msg) => {
      messages.push(msg);
    });
    return { messages, unsubscribe };
  }

  it("addAgent emits agent_spawn with correct fields", () => {
    const office = new OfficeState(createDefaultLayout(20, 11));
    const { messages } = subscribeAndCapture(office);

    const palette = ["#ff0000", "#00ff00", "#0000ff"];
    const ch = office.addAgent("session-123", "test", palette, 0);

    expect(messages).toHaveLength(1);
    const msg = messages[0] as Extract<ServerMessage, { type: "agent_spawn" }>;
    expect(msg.type).toBe("agent_spawn");
    expect(msg.id).toBe("session-123");
    expect(msg.palette).toEqual(palette);
    expect(typeof msg.seatId).toBe("number");
    expect(ch.id).toBe("session-123");
    expect(office.characters.has("session-123")).toBe(true);
  });

  it("removeAgent emits agent_remove with correct id", () => {
    const office = new OfficeState(createDefaultLayout(20, 11));
    const { messages } = subscribeAndCapture(office);

    office.addAgent("session-abc", "test", ["#fff"]);
    messages.length = 0; // clear spawn message

    office.removeAgent("session-abc");

    expect(messages).toHaveLength(1);
    const msg = messages[0] as Extract<ServerMessage, { type: "agent_remove" }>;
    expect(msg.type).toBe("agent_remove");
    expect(msg.id).toBe("session-abc");
    expect(office.characters.has("session-abc")).toBe(false);
  });

  it("removeAgent is no-op for unknown id", () => {
    const office = new OfficeState(createDefaultLayout(20, 11));
    const { messages } = subscribeAndCapture(office);

    office.removeAgent("nonexistent");

    expect(messages).toHaveLength(0);
    expect(office.characters.size).toBe(0);
  });

  it("setAgentActive emits agent_active with seatId", () => {
    const office = new OfficeState(createDefaultLayout(20, 11));
    const { messages } = subscribeAndCapture(office);

    office.setAgentActive("agent-1", 3);

    expect(messages).toHaveLength(1);
    const msg = messages[0] as Extract<
      ServerMessage,
      { type: "agent_active" }
    >;
    expect(msg.type).toBe("agent_active");
    expect(msg.id).toBe("agent-1");
    expect(msg.seatId).toBe(3);
  });

  it("setAgentInactive emits agent_idle", () => {
    const office = new OfficeState(createDefaultLayout(20, 11));
    const { messages } = subscribeAndCapture(office);

    office.setAgentInactive("agent-1");

    expect(messages).toHaveLength(1);
    const msg = messages[0] as Extract<ServerMessage, { type: "agent_idle" }>;
    expect(msg.type).toBe("agent_idle");
    expect(msg.id).toBe("agent-1");
  });

  it("addSubagent emits subagent_spawn near parent", () => {
    const office = new OfficeState(createDefaultLayout(20, 11));
    const { messages } = subscribeAndCapture(office);

    // Spawn parent first
    const parent = office.addAgent("parent-session", "test", ["#aaa"], 0);
    messages.length = 0; // clear spawn

    const sub = office.addSubagent("parent-session", "task-1");

    expect(sub).not.toBeNull();
    expect(messages).toHaveLength(1);
    const msg = messages[0] as Extract<
      ServerMessage,
      { type: "subagent_spawn" }
    >;
    expect(msg.type).toBe("subagent_spawn");
    expect(msg.parentId).toBe("parent-session");
    expect(msg.toolId).toBe("task-1");
    // Subagent should be adjacent to parent
    const parentPos = office.characters.get("parent-session")!;
    const subPos = office.characters.get(sub!.id)!;
    const dist =
      Math.abs(parentPos.row - subPos.row) +
      Math.abs(parentPos.col - subPos.col);
    expect(dist).toBe(1); // adjacent (4-connected)
  });

  it("removeSubagent emits subagent_remove", () => {
    const office = new OfficeState(createDefaultLayout(20, 11));
    const { messages } = subscribeAndCapture(office);

    office.addAgent("parent-session", "test", ["#aaa"], 0);
    office.addSubagent("parent-session", "task-1");
    messages.length = 0; // clear spawn messages

    office.removeSubagent("parent-session", "task-1");

    expect(messages).toHaveLength(1);
    const msg = messages[0] as Extract<
      ServerMessage,
      { type: "subagent_remove" }
    >;
    expect(msg.type).toBe("subagent_remove");
    expect(msg.parentId).toBe("parent-session");
    expect(msg.toolId).toBe("task-1");
    expect(
      office.characters.has("sub-parent-session-task-1"),
    ).toBe(false);
  });

  it("addSubagent returns null when parent does not exist", () => {
    const office = new OfficeState(createDefaultLayout(20, 11));
    const { messages } = subscribeAndCapture(office);

    const sub = office.addSubagent("nonexistent-parent", "task-1");

    expect(sub).toBeNull();
    expect(messages).toHaveLength(0);
  });
});
