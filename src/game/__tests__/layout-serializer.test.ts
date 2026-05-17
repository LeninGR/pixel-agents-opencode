import { describe, it, expect } from "vitest";
import {
  createDefaultLayout,
  layoutToTileMap,
  layoutToSeats,
  layoutToBlockedTiles,
  serializeLayout,
  deserializeLayout,
} from "../layout-serializer.js";
import { isWalkable } from "../tile-map.js";
import type { OfficeLayout, Seat } from "../types.js";

describe("createDefaultLayout", () => {
  it("creates a 20×11 grid", () => {
    const layout = createDefaultLayout(20, 11);
    expect(layout.cols).toBe(20);
    expect(layout.rows).toBe(11);
    expect(layout.tiles).toHaveLength(11);
    expect(layout.tiles[0]).toHaveLength(20);
  });

  it("has walls on outer border", () => {
    const layout = createDefaultLayout(20, 11);
    // Top row all WALL
    for (let c = 0; c < 20; c++) {
      expect(layout.tiles[0][c]).toBe("WALL");
    }
    // Bottom row all WALL
    for (let c = 0; c < 20; c++) {
      expect(layout.tiles[10][c]).toBe("WALL");
    }
    // Left column WALL
    for (let r = 0; r < 11; r++) {
      expect(layout.tiles[r][0]).toBe("WALL");
    }
    // Right column WALL
    for (let r = 0; r < 11; r++) {
      expect(layout.tiles[r][19]).toBe("WALL");
    }
  });

  it("has a distinct rest room area with walkable floor tiles", () => {
    const layout = createDefaultLayout(20, 11);
    // Rest room is in the left portion (cols 1-7, rows 1-9 with a wall divider)
    // The area should have at least some FLOOR tiles
    let restRoomFloorCount = 0;
    for (let r = 1; r < 10; r++) {
      for (let c = 1; c < 7; c++) {
        if (layout.tiles[r][c]?.startsWith("FLOOR")) {
          restRoomFloorCount++;
        }
      }
    }
    expect(restRoomFloorCount).toBeGreaterThan(0);
  });

  it("has furniture placements with desk and chair", () => {
    const layout = createDefaultLayout(20, 11);
    expect(layout.furniture.length).toBeGreaterThan(0);
    const desks = layout.furniture.filter((f) => f.type === "desk");
    const chairs = layout.furniture.filter((f) => f.type === "chair");
    expect(desks.length).toBeGreaterThan(0);
    expect(chairs.length).toBeGreaterThan(0);
  });
});

describe("layoutToTileMap", () => {
  it("returns a copy of the tile grid", () => {
    const layout = createDefaultLayout(20, 11);
    const tileMap = layoutToTileMap(layout);
    expect(tileMap).toEqual(layout.tiles);
    // Should be a different reference
    tileMap[1][1] = "VOID";
    expect(layout.tiles[1][1]).toBe("FLOOR_2"); // original unchanged
  });
});

describe("layoutToSeats", () => {
  it("extracts seats from default layout furniture", () => {
    const layout = createDefaultLayout(20, 11);
    const seats = layoutToSeats(layout);
    expect(seats.length).toBeGreaterThan(0);
    // Each seat should have id, row, col, direction
    for (const seat of seats) {
      expect(typeof seat.id).toBe("number");
      expect(typeof seat.row).toBe("number");
      expect(typeof seat.col).toBe("number");
      expect([0, 1, 2, 3]).toContain(seat.direction);
    }
  });

  it("returns empty array for furniture-less layout", () => {
    const empty: OfficeLayout = {
      cols: 5,
      rows: 5,
      tiles: Array.from({ length: 5 }, () =>
        Array.from({ length: 5 }, () => "FLOOR_1" as const),
      ),
      furniture: [],
      tileColors: {},
    };
    expect(layoutToSeats(empty)).toEqual([]);
  });
});

describe("layoutToBlockedTiles", () => {
  it("produces blocked tiles from furniture footprints", () => {
    const layout = createDefaultLayout(20, 11);
    const blocked = layoutToBlockedTiles(layout);
    expect(blocked.size).toBeGreaterThan(0);
    // All keys should be "row,col" format
    for (const key of blocked) {
      expect(key).toMatch(/^\d+,\d+$/);
    }
  });

  it("returns empty set when no furniture", () => {
    const empty: OfficeLayout = {
      cols: 5,
      rows: 5,
      tiles: [],
      furniture: [],
      tileColors: {},
    };
    expect(layoutToBlockedTiles(empty).size).toBe(0);
  });
});

describe("JSON round-trip", () => {
  it("serializes and deserializes to identical layout data", () => {
    const original = createDefaultLayout(20, 11);
    const json = serializeLayout(original);
    expect(typeof json).toBe("string");
    const parsed = JSON.parse(json);
    expect(parsed.cols).toBe(20);

    const restored = deserializeLayout(json);
    expect(restored.cols).toBe(original.cols);
    expect(restored.rows).toBe(original.rows);
    expect(restored.tiles).toEqual(original.tiles);
    expect(restored.furniture).toEqual(original.furniture);
    expect(restored.tileColors).toEqual(original.tileColors);
  });

  it("deserializeLayout validates required fields", () => {
    expect(() => deserializeLayout("invalid")).toThrow();
    expect(() => deserializeLayout("{}")).toThrow();
  });
});
