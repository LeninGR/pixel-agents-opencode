import { describe, it, expect } from "vitest";
import {
  FURNITURE_CATALOG,
  getFurnitureEntry,
  footprintToBlockedTiles,
  footprintToSeatTiles,
} from "../furniture-catalog.js";
import type { FurnitureCatalogEntry, Tile } from "../types.js";

describe("Furniture catalog entries", () => {
  it("has at least 3 entry types (desk, chair, wall)", () => {
    const ids = FURNITURE_CATALOG.map((e) => e.id);
    expect(ids).toContain("desk");
    expect(ids).toContain("chair");
    expect(ids).toContain("wall");
  });

  it("desk has 2 seats", () => {
    const desk = getFurnitureEntry("desk");
    expect(desk).toBeDefined();
    expect(desk!.seats).toHaveLength(2);
  });

  it("chair has 1 blocked tile and 1 seat", () => {
    const chair = getFurnitureEntry("chair");
    expect(chair).toBeDefined();
    expect(chair!.footprint).toHaveLength(1);
    expect(chair!.seats).toHaveLength(1);
  });

  it("wall blocks at least 1 tile", () => {
    const wall = getFurnitureEntry("wall");
    expect(wall).toBeDefined();
    expect(wall!.footprint.length).toBeGreaterThanOrEqual(1);
  });

  it("getFurnitureEntry returns undefined for unknown id", () => {
    expect(getFurnitureEntry("nonexistent")).toBeUndefined();
  });

  it("all entries have required fields", () => {
    for (const entry of FURNITURE_CATALOG) {
      expect(entry.id).toBeTruthy();
      expect(entry.name).toBeTruthy();
      expect(entry.category).toBeTruthy();
      expect(Array.isArray(entry.footprint)).toBe(true);
      expect(Array.isArray(entry.seats)).toBe(true);
      if (entry.footprint.length > 0) {
        const fp = entry.footprint[0];
        expect(typeof fp.row).toBe("number");
        expect(typeof fp.col).toBe("number");
      }
    }
  });
});

describe("footprintToBlockedTiles", () => {
  it("converts furniture footprint at origin to correct blocked keys", () => {
    const entry: FurnitureCatalogEntry = {
      id: "test",
      name: "Test",
      category: "furniture",
      footprint: [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 1, col: 0 },
      ],
      seats: [],
    };
    const blocked = footprintToBlockedTiles(entry, { col: 5, row: 3 });
    expect(blocked.has("3,5")).toBe(true);
    expect(blocked.has("3,6")).toBe(true);
    expect(blocked.has("4,5")).toBe(true);
    expect(blocked.size).toBe(3);
  });

  it("returns empty set for empty footprint", () => {
    const blocked = footprintToBlockedTiles(
      { id: "x", name: "x", category: "furniture", footprint: [], seats: [] },
      { col: 0, row: 0 },
    );
    expect(blocked.size).toBe(0);
  });
});

describe("footprintToSeatTiles", () => {
  it("converts seat offsets to absolute tile positions", () => {
    const entry: FurnitureCatalogEntry = {
      id: "test",
      name: "Test",
      category: "furniture",
      footprint: [],
      seats: [
        { row: 0, col: -1 },
        { row: 0, col: 1 },
      ],
    };
    const seats = footprintToSeatTiles(entry, { col: 5, row: 3 });
    expect(seats).toHaveLength(2);
    expect(seats[0]).toEqual({ id: 0, row: 3, col: 4, direction: 2 }); // left of furniture → faces RIGHT
    expect(seats[1]).toEqual({ id: 1, row: 3, col: 6, direction: 1 }); // right of furniture → faces LEFT
  });

  it("infers UP direction for seats below furniture", () => {
    const entry: FurnitureCatalogEntry = {
      id: "test",
      name: "Test",
      category: "furniture",
      footprint: [],
      seats: [{ row: 1, col: 0 }],
    };
    const seats = footprintToSeatTiles(entry, { col: 2, row: 2 });
    expect(seats[0]).toEqual({ id: 0, row: 3, col: 2, direction: 3 }); // below → faces UP
  });

  it("infers DOWN direction for seats above furniture", () => {
    const entry: FurnitureCatalogEntry = {
      id: "test",
      name: "Test",
      category: "furniture",
      footprint: [],
      seats: [{ row: -1, col: 0 }],
    };
    const seats = footprintToSeatTiles(entry, { col: 2, row: 2 });
    expect(seats[0]).toEqual({ id: 0, row: 1, col: 2, direction: 0 }); // above → faces DOWN
  });
});
