import type {
  OfficeLayout,
  Character,
  Seat,
  ServerMessage,
  Grid,
  Tile,
} from "./types.js";
import {
  layoutToTileMap,
  layoutToSeats,
  layoutToBlockedTiles,
} from "./layout-serializer.js";
import { createCharacter, updateCharacter } from "./characters.js";
import { isWalkable } from "./tile-map.js";

// ── Subscriber type ─────────────────────────────────────────────────────────

type Listener = (msg: ServerMessage) => void;

// ── OfficeState ─────────────────────────────────────────────────────────────

export class OfficeState {
  readonly layout: OfficeLayout;
  readonly tileMap: Grid;
  readonly seats: Seat[];
  readonly blockedTiles: Set<string>;

  readonly characters = new Map<string, Character>();
  private subagentMap = new Map<string, string>(); // subId → parentId

  private listeners = new Set<Listener>();

  constructor(layout: OfficeLayout) {
    this.layout = layout;
    this.tileMap = layoutToTileMap(layout);
    this.seats = layoutToSeats(layout);
    this.blockedTiles = layoutToBlockedTiles(layout);
  }

  // ── Agent lifecycle ─────────────────────────────────────────────────────

  addAgent(
    id: string,
    name: string,
    palette: string[],
    seatId?: number,
  ): Character {
    const seat = this.resolveSeat(seatId);
    const ch = createCharacter(id, name, palette, seat);
    this.characters.set(id, ch);
    this.broadcast({
      type: "agent_spawn",
      id,
      name,
      palette,
      seatId: seat.id,
      col: ch.col,
      row: ch.row,
    });
    return ch;
  }

  removeAgent(id: string): void {
    if (!this.characters.has(id)) return;
    this.characters.delete(id);
    this.broadcast({ type: "agent_remove", id });
  }

  setAgentActive(id: string, seatId: number): void {
    this.broadcast({ type: "agent_active", id, seatId });
  }

  setAgentInactive(id: string): void {
    this.broadcast({ type: "agent_idle", id });
  }

  // ── Sub-agents ──────────────────────────────────────────────────────────

  addSubagent(parentId: string, toolId: string): Character | null {
    const parent = this.characters.get(parentId);
    if (!parent) return null;

    const subId = `sub-${parentId}-${toolId}`;

    // Find adjacent walkable tile
    const adjTile = this.findAdjacentWalkable(parent.row, parent.col);
    if (!adjTile) return null;

    const seat: Seat = {
      id: -1,
      row: adjTile.row,
      col: adjTile.col,
      direction: parent.direction,
    };

    const subName = `${parent.name}-sub`;
    const sub = createCharacter(subId, subName, [...parent.palette], seat);
    this.characters.set(subId, sub);
    this.subagentMap.set(subId, parentId);

    this.broadcast({
      type: "subagent_spawn",
      parentId,
      toolId,
      id: subId,
      name: subName,
    });

    return sub;
  }

  removeSubagent(parentId: string, toolId: string): void {
    const subId = `sub-${parentId}-${toolId}`;
    if (!this.characters.has(subId)) return;

    this.characters.delete(subId);
    this.subagentMap.delete(subId);

    this.broadcast({
      type: "subagent_remove",
      parentId,
      toolId,
    });
  }

  // ── Tick ────────────────────────────────────────────────────────────────

  update(dt: number): void {
    for (const ch of this.characters.values()) {
      updateCharacter(ch, dt);
    }
  }

  // ── Observer ────────────────────────────────────────────────────────────

  subscribe(callback: Listener): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // ── Internal ────────────────────────────────────────────────────────────

  private broadcast(msg: ServerMessage): void {
    for (const listener of this.listeners) {
      try {
        listener(msg);
      } catch {
        // Swallow listener errors
      }
    }
  }

  /**
   * Resolves a seat ID to an actual seat. If the seat is blocked or invalid,
   * finds the nearest walkable tile via BFS.
   */
  private resolveSeat(requestedId?: number): Seat {
    let seat: Seat | undefined;

    if (requestedId !== undefined) {
      seat = this.seats.find((s) => s.id === requestedId);
    }

    // Auto-assign first available seat
    if (!seat && this.seats.length > 0) {
      seat = this.seats[0];
    }

    // If no seats at all, place at (1,1) — should not happen with valid layout
    if (!seat) {
      return { id: -1, row: 1, col: 1, direction: 0 };
    }

    // Check if seat tile is walkable. If blocked, find nearest walkable tile.
    const seatTile: Tile = { row: seat.row, col: seat.col };
    if (isWalkable(seatTile, this.layout, this.blockedTiles, seatTile)) {
      return seat;
    }

    const nearest = this.findNearestWalkable(seat.row, seat.col);
    if (nearest) {
      return { ...seat, row: nearest.row, col: nearest.col };
    }

    return seat;
  }

  /**
   * BFS to find the nearest walkable tile from (startRow, startCol).
   */
  private findNearestWalkable(
    startRow: number,
    startCol: number,
  ): Tile | null {
    const queue: Tile[] = [{ row: startRow, col: startCol }];
    const visited = new Set<string>();
    const key = (r: number, c: number) => `${r},${c}`;
    visited.add(key(startRow, startCol));

    const DIRS: [number, number][] = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ];

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (isWalkable(current, this.layout, this.blockedTiles)) {
        return current;
      }

      for (const [dr, dc] of DIRS) {
        const nr = current.row + dr;
        const nc = current.col + dc;
        const nk = key(nr, nc);
        if (visited.has(nk)) continue;
        // Only explore in-bounds tiles (don't need walkability for exploration)
        if (
          nr < 0 ||
          nr >= this.layout.rows ||
          nc < 0 ||
          nc >= this.layout.cols
        )
          continue;
        visited.add(nk);
        queue.push({ row: nr, col: nc });
      }
    }

    return null;
  }

  /**
   * Find an adjacent walkable tile (4-connected) from the given position.
   */
  private findAdjacentWalkable(row: number, col: number): Tile | null {
    const candidates: Tile[] = [
      { row: row - 1, col },
      { row: row + 1, col },
      { row, col: col - 1 },
      { row, col: col + 1 },
    ];

    for (const tile of candidates) {
      if (isWalkable(tile, this.layout, this.blockedTiles)) {
        return tile;
      }
    }

    // Fallback to BFS if no immediate adjacent tile is available
    return this.findNearestWalkable(row, col);
  }
}
