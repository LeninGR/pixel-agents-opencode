import { describe, it, expect } from "vitest";
import {
  isTileType,
  isDirection,
  isCharacterState,
  type TileType,
  type Direction,
  type OfficeLayout,
  type Character,
  type CharacterState,
  type Seat,
  type FurnitureInstance,
  type ServerMessage,
  type PlacedFurniture,
  type Tile,
} from "../types.js";

describe("TileType guard", () => {
  it("accepts valid floor tile types", () => {
    const valid: string[] = ["WALL", "VOID", "FLOOR_1", "FLOOR_5", "FLOOR_9"];
    for (const v of valid) {
      expect(isTileType(v)).toBe(true);
    }
  });

  it("rejects invalid tile types", () => {
    expect(isTileType("GRASS")).toBe(false);
    expect(isTileType("FLOOR_10")).toBe(false);
    expect(isTileType("floor_1")).toBe(false);
    expect(isTileType("")).toBe(false);
    expect(isTileType(42)).toBe(false);
    expect(isTileType(null)).toBe(false);
    expect(isTileType(undefined)).toBe(false);
  });
});

describe("Direction constants", () => {
  it("are mutually distinct integers 0-3", () => {
    const dirs = [0, 1, 2, 3] as const;
    for (const d of dirs) {
      expect(isDirection(d)).toBe(true);
    }
  });

  it("rejects non-direction values", () => {
    expect(isDirection(4)).toBe(false);
    expect(isDirection(-1)).toBe(false);
    expect(isDirection("DOWN")).toBe(false);
    expect(isDirection(null)).toBe(false);
  });
});

describe("ServerMessage union discrimination", () => {
  it("identifies layout messages", () => {
    const layoutMsg: ServerMessage = {
      type: "layout",
      layout: {
        cols: 20,
        rows: 11,
        tiles: [],
        furniture: [],
        tileColors: {},
      },
    };
    expect(layoutMsg.type).toBe("layout");
    expect(layoutMsg.layout).toBeDefined();
    // Narrowing by discriminant
    if (layoutMsg.type === "layout") {
      expect(layoutMsg.layout.cols).toBe(20);
    }
  });

  it("identifies agent_spawn messages", () => {
    const spawnMsg: ServerMessage = {
      type: "agent_spawn",
      id: "agent-1",
      palette: [255, 0, 0],
      seatId: 0,
    };
    expect(spawnMsg.type).toBe("agent_spawn");
    if (spawnMsg.type === "agent_spawn") {
      expect(spawnMsg.id).toBe("agent-1");
    }
  });

  it("differentiates message types via discriminant", () => {
    const idle: ServerMessage = { type: "agent_idle", id: "a" };
    const active: ServerMessage = {
      type: "agent_active",
      id: "a",
      seatId: 0,
    };
    expect(idle.type).not.toBe(active.type);
  });
});

describe("CharacterState types", () => {
  it("supports all required states as string literals", () => {
    const states: CharacterState[] = ["idle", "walk", "work"];
    for (const s of states) {
      expect(["idle", "walk", "work"]).toContain(s);
    }
  });

  it("rejects invalid character states", () => {
    expect(isCharacterState("idle")).toBe(true);
    expect(isCharacterState("walk")).toBe(true);
    expect(isCharacterState("work")).toBe(true);
    expect(isCharacterState("running")).toBe(false);
    expect(isCharacterState("")).toBe(false);
    expect(isCharacterState(123)).toBe(false);
  });
});

describe("ServerMessage edge cases", () => {
  it("handles agent_remove with minimal fields", () => {
    const msg: ServerMessage = { type: "agent_remove", id: "agent-2" };
    expect(msg.type).toBe("agent_remove");
    if (msg.type === "agent_remove") {
      expect(msg.id).toBe("agent-2");
    }
  });

  it("handles subagent_spawn with required fields", () => {
    const msg: ServerMessage = {
      type: "subagent_spawn",
      parentId: "parent-1",
      toolId: "task-abc",
      id: "sub-1",
    };
    if (msg.type === "subagent_spawn") {
      expect(msg.parentId).toBe("parent-1");
      expect(msg.toolId).toBe("task-abc");
    }
  });

  it("handles sound_play with done sound", () => {
    const msg: ServerMessage = { type: "sound_play", sound: "done" };
    if (msg.type === "sound_play") {
      expect(msg.sound).toBe("done");
    }
  });
});
