import { describe, it, expect } from "vitest";
import { isWalkable, findPath } from "../tile-map.js";
import type { OfficeLayout, Tile, TileType } from "../types.js";

function makeLayout(
  rows: number,
  cols: number,
  blocked: Tile[] = [],
): OfficeLayout {
  const tiles = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, (): TileType => "FLOOR_1"),
  ) as TileType[][];
  // Mark blocked tiles as WALL
  for (const { row, col } of blocked) {
    if (row >= 0 && row < rows && col >= 0 && col < cols) {
      tiles[row][col] = "WALL";
    }
  }
  return {
    cols,
    rows,
    tiles,
    furniture: [],
    tileColors: {},
  };
}

const ALL_WALKABLE: Set<string> = new Set();

describe("isWalkable", () => {
  it("returns true for a floor tile in open space", () => {
    const blocked = new Set<string>(["1,1"]);
    // (0,0) is not blocked, is within bounds, is floor
    expect(isWalkable({ row: 0, col: 0 }, { rows: 10, cols: 10, tiles: makeLayout(10, 10).tiles }, blocked)).toBe(true);
  });

  it("returns false for a WALL tile type", () => {
    const layout = makeLayout(10, 10, [{ row: 0, col: 0 }]);
    expect(isWalkable({ row: 0, col: 0 }, layout, ALL_WALKABLE)).toBe(false);
  });

  it("returns false for a tile in the blocked set (furniture footprint)", () => {
    const layout = makeLayout(10, 10);
    const blocked = new Set<string>(["2,3"]);
    expect(isWalkable({ row: 2, col: 3 }, layout, blocked)).toBe(false);
  });

  it("returns true for blocked tile when it is the own seat", () => {
    const layout = makeLayout(10, 10);
    const blocked = new Set<string>(["2,3"]);
    // Own seat should be walkable even if blocked by furniture
    expect(isWalkable({ row: 2, col: 3 }, layout, blocked, { row: 2, col: 3 })).toBe(true);
  });

  it("returns false for out-of-bounds coordinates", () => {
    const layout = makeLayout(10, 10);
    expect(isWalkable({ row: -1, col: 0 }, layout, ALL_WALKABLE)).toBe(false);
    expect(isWalkable({ row: 0, col: 10 }, layout, ALL_WALKABLE)).toBe(false);
    expect(isWalkable({ row: 10, col: 0 }, layout, ALL_WALKABLE)).toBe(false);
  });

  it("returns false for VOID tiles", () => {
    const layout = makeLayout(5, 5);
    layout.tiles[1][1] = "VOID";
    expect(isWalkable({ row: 1, col: 1 }, layout, ALL_WALKABLE)).toBe(false);
  });
});

describe("findPath (BFS 4-connected)", () => {
  it("finds shortest path in open 5×5 grid", () => {
    const layout = makeLayout(5, 5);
    const path = findPath({ row: 0, col: 0 }, { row: 2, col: 2 }, layout);
    expect(path.length).toBeGreaterThan(0);
    // BFS should give Manhattan-optimal path
    expect(path.length).toBe(5); // (0,0)→(0,1)→(0,2)→(1,2)→(2,2) = 5 steps
    expect(path[0]).toEqual([0, 0]); // includes start
    expect(path[path.length - 1]).toEqual([2, 2]); // ends at goal
  });

  it("avoids wall tiles", () => {
    // 3×3 with a wall at (1,1) — must go around
    const layout = makeLayout(3, 3, [{ row: 1, col: 1 }]);
    const path = findPath({ row: 0, col: 0 }, { row: 2, col: 2 }, layout);
    expect(path.length).toBeGreaterThan(0);
    // Should NOT go through (1,1)
    const midCoord = JSON.stringify([1, 1]);
    for (const step of path) {
      expect(JSON.stringify(step)).not.toBe(midCoord);
    }
  });

  it("returns empty array when no path exists (fully enclosed goal)", () => {
    // 3×3 with walls surrounding the goal at (1,1)
    const blocked: Tile[] = [
      { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 },
      { row: 1, col: 0 }, { row: 1, col: 2 },
      { row: 2, col: 0 }, { row: 2, col: 1 }, { row: 2, col: 2 },
    ];
    const layout = makeLayout(3, 3, blocked);
    // Start is in one of the blocked cells — let's make start walkable
    layout.tiles[1][1] = "FLOOR_1";
    // Goal is outside — unreachable since all surrounding are walls
    const path = findPath({ row: 1, col: 1 }, { row: 0, col: 0 }, layout);
    // Goal (0,0) is WALL so no path should exist
    expect(path).toEqual([]);
  });

  it("returns single-element path when start equals goal", () => {
    const layout = makeLayout(5, 5);
    const path = findPath({ row: 3, col: 3 }, { row: 3, col: 3 }, layout);
    expect(path).toEqual([[3, 3]]);
  });

  it("path steps are adjacent (Manhattan distance = 1)", () => {
    const layout = makeLayout(10, 10);
    const path = findPath({ row: 0, col: 0 }, { row: 9, col: 9 }, layout);
    expect(path.length).toBeGreaterThan(1);
    for (let i = 1; i < path.length; i++) {
      const [pr, pc] = path[i - 1];
      const [cr, cc] = path[i];
      const dist = Math.abs(pr - cr) + Math.abs(pc - cc);
      expect(dist).toBe(1);
    }
  });
});
