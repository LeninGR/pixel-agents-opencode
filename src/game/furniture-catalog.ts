import type { FurnitureCatalogEntry, Tile, Seat } from "./types.js";
import { type Direction } from "./types.js";

// ── Catalog ─────────────────────────────────────────────────────────────────

export const FURNITURE_CATALOG: FurnitureCatalogEntry[] = [
  {
    id: "desk",
    name: "Desk",
    category: "furniture",
    // Desk occupies 2 tiles horizontally
    footprint: [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
    ],
    // Two seats: one above-left, one below-right (opposite sides)
    seats: [
      { row: -1, col: 0 },
      { row: 1, col: 1 },
    ],
  },
  {
    id: "chair",
    name: "Chair",
    category: "furniture",
    // Chair occupies 1 tile
    footprint: [{ row: 0, col: 0 }],
    seats: [{ row: 0, col: 0 }],
  },
  {
    id: "wall",
    name: "Wall segment",
    category: "wall",
    // Wall is 1 tile
    footprint: [{ row: 0, col: 0 }],
    seats: [],
  },
];

// ── Lookup ──────────────────────────────────────────────────────────────────

export function getFurnitureEntry(
  id: string,
): FurnitureCatalogEntry | undefined {
  return FURNITURE_CATALOG.find((e) => e.id === id);
}

// ── Footprint conversion ────────────────────────────────────────────────────

/**
 * Convert a furniture entry's relative footprint to absolute blocked tile keys.
 * Keys are `"row,col"` strings for Set-based lookups.
 */
export function footprintToBlockedTiles(
  entry: FurnitureCatalogEntry,
  origin: Tile,
): Set<string> {
  const blocked = new Set<string>();
  for (const offset of entry.footprint) {
    const row = origin.row + offset.row;
    const col = origin.col + offset.col;
    blocked.add(`${row},${col}`);
  }
  return blocked;
}

/**
 * Convert a furniture entry's relative seat offsets to absolute Seat objects.
 */
/**
 * Convert a furniture entry's relative seat offsets to absolute Seat objects.
 * Direction is inferred from the offset: seats face toward the furniture.
 */
export function footprintToSeatTiles(
  entry: FurnitureCatalogEntry,
  origin: Tile,
): Seat[] {
  const seats: Seat[] = [];
  let seatId = 0;
  for (const offset of entry.seats) {
    const row = origin.row + offset.row;
    const col = origin.col + offset.col;
    // Infer direction: seat faces toward the furniture
    let direction: Direction;
    if (offset.col < 0) {
      direction = 2; // RIGHT — seat is left, faces right toward furniture
    } else if (offset.col > 0) {
      direction = 1; // LEFT — seat is right, faces left toward furniture
    } else if (offset.row < 0) {
      direction = 0; // DOWN — seat is above, faces down toward furniture
    } else {
      direction = 3; // UP — seat is below, faces up toward furniture
    }
    seats.push({ id: seatId++, row, col, direction });
  }
  return seats;
}
