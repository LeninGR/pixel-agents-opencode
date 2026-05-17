import type { Character, CharacterState, Direction, Seat } from "./types.js";
import { TILE_SIZE, WALK_SPEED } from "./constants.js";

// ── Create ──────────────────────────────────────────────────────────────────

export function createCharacter(
  id: string,
  palette: string[],
  seat: Seat,
): Character {
  return {
    id,
    col: seat.col,
    row: seat.row,
    state: "idle",
    path: [],
    moveProgress: 0,
    palette,
    direction: seat.direction,
    frame: 0,
  };
}

// ── Path assignment ─────────────────────────────────────────────────────────

/**
 * Assign a BFS path to the character. The first element is assumed to be the
 * current position and is consumed. Sets state to "walk" if there are remaining
 * steps.
 */
export function assignPath(ch: Character, path: [number, number][]): void {
  // Strip current position if it matches the first element
  const remaining = [...path];
  if (
    remaining.length > 0 &&
    remaining[0][0] === ch.row &&
    remaining[0][1] === ch.col
  ) {
    remaining.shift();
  }

  ch.path = remaining;
  ch.moveProgress = 0;

  if (remaining.length > 0) {
    ch.state = "walk";
  } else {
    ch.state = "idle";
  }
}

// ── Update (per-frame tick) ─────────────────────────────────────────────────

function inferDirection(
  fromRow: number,
  fromCol: number,
  toRow: number,
  toCol: number,
): Direction {
  if (toRow > fromRow) return 0; // DOWN
  if (toRow < fromRow) return 3; // UP
  if (toCol < fromCol) return 1; // LEFT
  return 2; // RIGHT
}

export function updateCharacter(ch: Character, dt: number): void {
  if (ch.state !== "walk") return;

  ch.moveProgress += WALK_SPEED * dt;

  while (ch.moveProgress >= TILE_SIZE && ch.path.length > 0) {
    ch.moveProgress -= TILE_SIZE;
    const [nextRow, nextCol] = ch.path.shift()!;

    ch.direction = inferDirection(ch.row, ch.col, nextRow, nextCol);
    ch.row = nextRow;
    ch.col = nextCol;

    // Cycle animation frame
    ch.frame = (ch.frame + 1) % 4;
  }

  // Path complete
  if (ch.path.length === 0) {
    ch.state = "idle";
    ch.moveProgress = 0;
  }
}
