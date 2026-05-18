import { describe, it, expect, beforeEach } from "vitest";
import {
  createCharacter,
  updateCharacter,
  assignPath,
} from "../characters.js";
import type { Character, Seat } from "../types.js";
import { WALK_SPEED, TILE_SIZE } from "../constants.js";

function makeSeat(overrides: Partial<Seat> = {}): Seat {
  return { id: 0, row: 3, col: 5, direction: 0, ...overrides };
}

describe("createCharacter", () => {
  it("initializes character at seat position with idle state", () => {
    const ch = createCharacter("agent-1", "test", ["#ff0000", "#00ff00"], makeSeat());
    expect(ch.id).toBe("agent-1");
    expect(ch.col).toBe(5);
    expect(ch.row).toBe(3);
    expect(ch.state).toBe("idle");
    expect(ch.direction).toBe(0);
    expect(ch.frame).toBe(0);
    expect(ch.moveProgress).toBe(0);
    expect(ch.path).toEqual([]);
    expect(ch.palette).toEqual(["#ff0000", "#00ff00"]);
  });

  it("starts in idle state regardless of seat", () => {
    const ch = createCharacter("test", "test", [], makeSeat({ row: 7, col: 2, direction: 2 }));
    expect(ch.state).toBe("idle");
    expect(ch.direction).toBe(2);
  });
});

describe("assignPath", () => {
  it("sets path and transitions to walk state", () => {
    const ch = createCharacter("a", "test", [], makeSeat());
    assignPath(ch, [
      [3, 5],
      [3, 6],
      [3, 7],
    ]);
    expect(ch.state).toBe("walk");
    expect(ch.path).toEqual([
      [3, 6],
      [3, 7],
    ]);
    expect(ch.moveProgress).toBe(0);
  });

  it("stays idle if path has only current position", () => {
    const ch = createCharacter("a", "test", [], makeSeat());
    assignPath(ch, [[3, 5]]);
    expect(ch.state).toBe("idle");
    expect(ch.path).toEqual([]);
  });
});

describe("updateCharacter — movement", () => {
  let ch: Character;

  beforeEach(() => {
    ch = createCharacter("agent", "test", ["#ff0000"], makeSeat({ row: 3, col: 5 }));
    assignPath(ch, [
      [3, 5],
      [3, 6],
      [3, 8], // skip one col — BFS would never do this but test multi-tile
    ]);
  });

  it("advances moveProgress by WALK_SPEED * dt", () => {
    const dt = 0.2;
    updateCharacter(ch, dt);
    expect(ch.moveProgress).toBeCloseTo(WALK_SPEED * dt);
  });

  it("moves to next tile when progress >= TILE_SIZE", () => {
    // Enough dt to complete one tile (TILE_SIZE / WALK_SPEED = 16/48 ≈ 0.333s)
    const dt = 0.35;
    updateCharacter(ch, dt);
    // Should have reached the next tile: [3,6]
    expect(ch.col).toBe(6);
    expect(ch.row).toBe(3);
    // Remaining progress should carry over
    expect(ch.moveProgress).toBeCloseTo(WALK_SPEED * dt - TILE_SIZE);
  });

  it("returns to idle when path is complete", () => {
    // Path: (3,5) → (3,6) → (3,8)
    // Need enough time for both moves: 2 tiles * 16px = 32px, at 48px/s = 0.667s
    const dt = 1.0;
    updateCharacter(ch, dt);
    expect(ch.state).toBe("idle");
    expect(ch.col).toBe(8);
    expect(ch.row).toBe(3);
    expect(ch.path).toEqual([]);
    expect(ch.moveProgress).toBe(0);
  });

  it("updates direction based on movement", () => {
    // Create character and assign a downward path
    const ch2 = createCharacter("b", "test", [], makeSeat({ row: 3, col: 5 }));
    assignPath(ch2, [
      [3, 5],
      [4, 5], // move down
    ]);
    updateCharacter(ch2, 0.5);
    expect(ch2.direction).toBe(0); // DOWN
    expect(ch2.row).toBe(4);
  });

  it("no-op update when idle with no path", () => {
    const idle = createCharacter("idle", "test", [], makeSeat());
    const colBefore = idle.col;
    const rowBefore = idle.row;
    updateCharacter(idle, 1.0);
    expect(idle.col).toBe(colBefore);
    expect(idle.row).toBe(rowBefore);
    expect(idle.state).toBe("idle");
  });
});

describe("updateCharacter — directional movement", () => {
  it("sets direction to LEFT when moving to lower col", () => {
    const ch = createCharacter("d", "test", [], makeSeat({ row: 3, col: 5 }));
    assignPath(ch, [[3, 5], [3, 4]]);
    updateCharacter(ch, 0.5);
    expect(ch.direction).toBe(1); // LEFT
    expect(ch.col).toBe(4);
  });

  it("sets direction to RIGHT when moving to higher col", () => {
    const ch = createCharacter("d", "test", [], makeSeat({ row: 3, col: 5 }));
    assignPath(ch, [[3, 5], [3, 7]]);
    updateCharacter(ch, 0.5);
    expect(ch.direction).toBe(2); // RIGHT
    expect(ch.col).toBe(7);
  });

  it("sets direction to UP when moving to lower row", () => {
    const ch = createCharacter("d", "test", [], makeSeat({ row: 5, col: 5 }));
    assignPath(ch, [[5, 5], [4, 5]]);
    updateCharacter(ch, 0.5);
    expect(ch.direction).toBe(3); // UP
    expect(ch.row).toBe(4);
  });
});

describe("updateCharacter — animation frame", () => {
  it("cycles frame on each tile transition", () => {
    const ch = createCharacter("e", "test", [], makeSeat({ row: 1, col: 1 }));
    // Path moves right 3 tiles
    assignPath(ch, [[1, 1], [1, 2], [1, 3], [1, 4]]);
    expect(ch.frame).toBe(0);
    // dt enough to complete 1 tile
    updateCharacter(ch, 0.35); // tile 2
    expect(ch.frame).toBe(1);
    updateCharacter(ch, 0.35); // tile 3
    expect(ch.frame).toBe(2);
    updateCharacter(ch, 0.35); // tile 4
    expect(ch.frame).toBe(3);
  });
});

describe("updateCharacter — FSM transitions", () => {
  it("IDLE → WALK when path assigned with at least one step", () => {
    const ch = createCharacter("c", "test", [], makeSeat());
    expect(ch.state).toBe("idle");
    assignPath(ch, [
      [3, 5],
      [3, 6],
    ]);
    expect(ch.state).toBe("walk");
  });

  it("WALK → IDLE when path fully consumed", () => {
    const ch = createCharacter("c", "test", [], makeSeat());
    assignPath(ch, [
      [3, 5],
      [3, 6],
    ]);
    // One tile at 48px/s, TILE_SIZE=16px → ~0.333s
    updateCharacter(ch, 0.4);
    expect(ch.state).toBe("idle");
  });
});
