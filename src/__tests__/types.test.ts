import { describe, it, expect } from "vitest";
import type { ServerMessage, StateUpdate } from "../types.js";

describe("ServerMessage type guard", () => {
  // isServerMessage will be imported when implemented
  // For RED phase, we import a function that doesn't exist yet
  // Vitest will fail at import time if the export is missing
  // We test via a dynamic import pattern to get a proper RED

  it("identifies layout message", async () => {
    const { isServerMessage } = await import("../types.js");
    const msg: ServerMessage = {
      type: "layout",
      layout: { cols: 10, rows: 10, tiles: [], furniture: [], tileColors: {} },
    };
    expect(isServerMessage(msg)).toBe(true);
  });

  it("identifies agent_spawn message", async () => {
    const { isServerMessage } = await import("../types.js");
    const msg: ServerMessage = {
      type: "agent_spawn",
      id: "test-session",
      palette: ["#ff0000", "#00ff00"],
    };
    expect(isServerMessage(msg)).toBe(true);
  });

  it("identifies agent_remove message", async () => {
    const { isServerMessage } = await import("../types.js");
    const msg: ServerMessage = { type: "agent_remove", id: "test-session" };
    expect(isServerMessage(msg)).toBe(true);
  });

  it("identifies agent_active message", async () => {
    const { isServerMessage } = await import("../types.js");
    const msg: ServerMessage = {
      type: "agent_active",
      id: "test-session",
      seatId: 0,
    };
    expect(isServerMessage(msg)).toBe(true);
  });

  it("identifies agent_idle message", async () => {
    const { isServerMessage } = await import("../types.js");
    const msg: ServerMessage = { type: "agent_idle", id: "test-session" };
    expect(isServerMessage(msg)).toBe(true);
  });

  it("identifies agent_tool message", async () => {
    const { isServerMessage } = await import("../types.js");
    const msg: ServerMessage = {
      type: "agent_tool",
      id: "test-session",
      tool: "bash",
    };
    expect(isServerMessage(msg)).toBe(true);
  });

  it("identifies subagent_spawn message", async () => {
    const { isServerMessage } = await import("../types.js");
    const msg: ServerMessage = {
      type: "subagent_spawn",
      parentId: "parent",
      toolId: "task-1",
      id: "sub-parent-task-1",
    };
    expect(isServerMessage(msg)).toBe(true);
  });

  it("identifies subagent_remove message", async () => {
    const { isServerMessage } = await import("../types.js");
    const msg: ServerMessage = {
      type: "subagent_remove",
      parentId: "parent",
      toolId: "task-1",
    };
    expect(isServerMessage(msg)).toBe(true);
  });

  it("identifies agent_bubble message", async () => {
    const { isServerMessage } = await import("../types.js");
    const msg: ServerMessage = {
      type: "agent_bubble",
      id: "test-session",
      bubble: "waiting",
    };
    expect(isServerMessage(msg)).toBe(true);
  });

  it("identifies sound_play message", async () => {
    const { isServerMessage } = await import("../types.js");
    const msg: ServerMessage = { type: "sound_play", sound: "done" };
    expect(isServerMessage(msg)).toBe(true);
  });

  it("rejects non-ServerMessage objects", async () => {
    const { isServerMessage } = await import("../types.js");
    expect(isServerMessage({})).toBe(false);
    expect(isServerMessage({ type: "unknown" })).toBe(false);
    expect(isServerMessage(null)).toBe(false);
    expect(isServerMessage("string")).toBe(false);
    expect(isServerMessage(42)).toBe(false);
  });

  it("rejects StateUpdate (different union branch)", async () => {
    const { isServerMessage } = await import("../types.js");
    const stateUpdate: StateUpdate = {
      type: "state_update",
      agents: {},
    };
    expect(isServerMessage(stateUpdate)).toBe(false);
  });
});

describe("StateUpdate backward compatibility", () => {
  it("StateUpdate type still compiles and works", () => {
    const update: StateUpdate = {
      type: "state_update",
      agents: {
        sisyphus: {
          name: "sisyphus",
          action: "coding",
          detail: "Writing code",
          since: Date.now(),
        },
      },
    };
    expect(update.type).toBe("state_update");
    expect(update.agents.sisyphus.action).toBe("coding");
  });
});
