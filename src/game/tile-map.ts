import type { OfficeLayout, Tile, TileType, Grid } from "./types.js";

// ── Helpers ─────────────────────────────────────────────────────────────────

type LayoutLike = Pick<OfficeLayout, "rows" | "cols"> & { tiles: Grid };

function tileKey(row: number, col: number): string {
  return `${row},${col}`;
}

function inBounds(row: number, col: number, layout: LayoutLike): boolean {
  return row >= 0 && row < layout.rows && col >= 0 && col < layout.cols;
}

function tileIsBlocked(tile: TileType): boolean {
  return tile === "WALL" || tile === "VOID";
}

// ── Walkability ─────────────────────────────────────────────────────────────

export function isWalkable(
  tile: Tile,
  layout: LayoutLike,
  blockedTiles: Set<string>,
  ownSeat?: Tile,
): boolean {
  const { row, col } = tile;
  if (!inBounds(row, col, layout)) return false;

  const terrain = layout.tiles[row][col];
  if (tileIsBlocked(terrain)) return false;

  // Own seat is always walkable, even if in furniture footprint
  if (ownSeat && ownSeat.row === row && ownSeat.col === col) return true;

  if (blockedTiles.has(tileKey(row, col))) return false;

  return true;
}

// ── BFS Pathfinding (4-connected) ───────────────────────────────────────────

const EMPTY_BLOCKED: Set<string> = new Set();

/**
 * BFS shortest path on a 4-connected grid.
 *
 * @param blocked  Optional set of tile keys ("row,col") blocked by furniture
 *                 footprints. Walls/VOID are always blocked from the layout.
 * @returns Array of [row, col] including start and goal, or [] if unreachable.
 */
export function findPath(
  start: Tile,
  end: Tile,
  layout: LayoutLike,
  blocked: Set<string> = EMPTY_BLOCKED,
): [number, number][] {
  // Quick check: goal is walkable
  if (!isWalkable(end, layout, blocked)) return [];
  if (!isWalkable(start, layout, blocked)) return [];

  if (start.row === end.row && start.col === end.col) {
    return [[start.row, start.col]];
  }

  const queue: Tile[] = [start];
  const visited = new Set<string>();
  const parent = new Map<string, string | null>();
  const startKey = tileKey(start.row, start.col);
  const goalKey = tileKey(end.row, end.col);

  visited.add(startKey);
  parent.set(startKey, null);

  // 4-connected neighbors: up, down, left, right
  const DIRS: [number, number][] = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const curKey = tileKey(current.row, current.col);

    if (curKey === goalKey) {
      // Reconstruct path
      const path: [number, number][] = [];
      let key: string | null = goalKey;
      while (key !== null) {
        const [r, c] = key.split(",").map(Number);
        path.unshift([r, c]);
        key = parent.get(key) ?? null;
      }
      return path;
    }

    for (const [dr, dc] of DIRS) {
      const nr = current.row + dr;
      const nc = current.col + dc;
      const nKey = tileKey(nr, nc);

      if (visited.has(nKey)) continue;
      if (!isWalkable({ row: nr, col: nc }, layout, blocked)) continue;

      visited.add(nKey);
      parent.set(nKey, curKey);
      queue.push({ row: nr, col: nc });
    }
  }

  // No path found
  return [];
}
