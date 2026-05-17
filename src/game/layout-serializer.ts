import type { OfficeLayout, TileType, Seat, PlacedFurniture, Grid } from "./types.js";
import { getFurnitureEntry, footprintToBlockedTiles, footprintToSeatTiles } from "./furniture-catalog.js";
import { FLOOR_COLORS } from "./constants.js";

// ── Default layout generator ────────────────────────────────────────────────

/**
 * Creates a default 20×11 office layout with:
 *  - Border walls
 *  - Rest room zone (left side, cols 1-6)
 *  - Divider wall at col 7
 *  - Work area with desks and chairs (right side, cols 8-18)
 *  - Door at row 5 in the divider wall
 */
export function createDefaultLayout(
  cols: number = 20,
  rows: number = 11,
): OfficeLayout {
  // Build tile grid — all FLOOR_1 initially
  const tiles: TileType[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => "FLOOR_1" as TileType),
  );

  // Border walls
  for (let r = 0; r < rows; r++) {
    tiles[r][0] = "WALL";
    tiles[r][cols - 1] = "WALL";
  }
  for (let c = 0; c < cols; c++) {
    tiles[0][c] = "WALL";
    tiles[rows - 1][c] = "WALL";
  }

  // Divider wall at col 7 — separates rest room (left) from work area (right)
  const DIVIDER_COL = 7;
  const DOOR_ROW = 5; // opening in the divider
  for (let r = 1; r < rows - 1; r++) {
    if (r !== DOOR_ROW) {
      tiles[r][DIVIDER_COL] = "WALL";
    }
  }

  // Rest room floor variant (softer color)
  for (let r = 1; r < rows - 1; r++) {
    for (let c = 1; c < DIVIDER_COL; c++) {
      if (tiles[r][c] === "FLOOR_1") {
        tiles[r][c] = "FLOOR_2";
      }
    }
  }

  // Furniture placements
  const furniture: PlacedFurniture[] = [];

  // Desks with chairs in the work area
  // Desk positions: col 9, every other row starting from row 2
  const deskRows = [2, 4, 6, 8];
  for (let i = 0; i < deskRows.length; i++) {
    const row = deskRows[i];
    // Desk at (col=9, row)
    furniture.push({
      id: `desk-${i}`,
      type: "desk",
      col: 9,
      row,
      direction: 0,
    });
    // Chair above desk (seat)
    furniture.push({
      id: `chair-${i}`,
      type: "chair",
      col: 9,
      row: row - 1,
      direction: 0,
    });
  }

  // Rest room chairs (sleeping spots)
  for (let i = 0; i < 3; i++) {
    furniture.push({
      id: `rest-chair-${i}`,
      type: "chair",
      col: 2 + i * 2,
      row: 1 + i * 3,
      direction: 3,
    });
  }

  return {
    cols,
    rows,
    tiles,
    furniture,
    tileColors: { ...FLOOR_COLORS },
  };
}

// ── Tile map extraction ─────────────────────────────────────────────────────

/** Returns the tile grid from the layout (shallow copy of rows). */
export function layoutToTileMap(layout: OfficeLayout): Grid {
  return layout.tiles.map((row) => [...row]);
}

// ── Seat extraction ─────────────────────────────────────────────────────────

export function layoutToSeats(layout: OfficeLayout, startId: number = 0): Seat[] {
  const seats: Seat[] = [];
  let nextId = startId;
  for (const placed of layout.furniture) {
    const entry = getFurnitureEntry(placed.type);
    if (!entry) continue;

    const placedSeats = footprintToSeatTiles(entry, {
      col: placed.col,
      row: placed.row,
    });

    for (const seat of placedSeats) {
      seats.push({ ...seat, id: nextId++ });
    }
  }
  return seats;
}

// ── Blocked tiles extraction ────────────────────────────────────────────────

export function layoutToBlockedTiles(layout: OfficeLayout): Set<string> {
  const blocked = new Set<string>();
  for (const placed of layout.furniture) {
    const entry = getFurnitureEntry(placed.type);
    if (!entry) continue;

    const entryBlocked = footprintToBlockedTiles(entry, {
      col: placed.col,
      row: placed.row,
    });
    for (const key of entryBlocked) {
      blocked.add(key);
    }
  }
  return blocked;
}

// ── JSON serialization ──────────────────────────────────────────────────────

export function serializeLayout(layout: OfficeLayout): string {
  return JSON.stringify(layout);
}

export function deserializeLayout(json: string): OfficeLayout {
  const data = JSON.parse(json);
  if (!data || typeof data !== "object") {
    throw new Error("Invalid layout JSON: not an object");
  }
  if (typeof data.cols !== "number" || typeof data.rows !== "number") {
    throw new Error("Invalid layout: missing cols/rows");
  }
  if (!Array.isArray(data.tiles)) {
    throw new Error("Invalid layout: tiles must be an array");
  }
  // Provide defaults for optional fields
  return {
    cols: data.cols,
    rows: data.rows,
    tiles: data.tiles,
    furniture: Array.isArray(data.furniture) ? data.furniture : [],
    tileColors: data.tileColors && typeof data.tileColors === "object" ? data.tileColors : {},
  };
}
