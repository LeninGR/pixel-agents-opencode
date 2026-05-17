// ── Tile types ──────────────────────────────────────────────────────────────

export type TileType = "WALL" | "VOID" | `FLOOR_${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9}`;

const TILE_TYPE_RE = /^(WALL|VOID|FLOOR_[1-9])$/;

export function isTileType(value: unknown): value is TileType {
  return typeof value === "string" && TILE_TYPE_RE.test(value);
}

// ── Grid position ───────────────────────────────────────────────────────────

export interface Tile {
  col: number;
  row: number;
}

// ── Direction ───────────────────────────────────────────────────────────────

export type Direction = 0 | 1 | 2 | 3;

export function isDirection(value: unknown): value is Direction {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 3;
}

// ── Character state ─────────────────────────────────────────────────────────

export type CharacterState = "idle" | "walk" | "work";

const VALID_CHARACTER_STATES = new Set<string>(["idle", "walk", "work"]);

export function isCharacterState(value: unknown): value is CharacterState {
  return typeof value === "string" && VALID_CHARACTER_STATES.has(value);
}

// ── Furniture ───────────────────────────────────────────────────────────────

export interface FurnitureInstance {
  id: string;
  type: string;
  col: number;
  row: number;
  direction: Direction;
}

export interface PlacedFurniture {
  id: string;
  type: string;
  col: number;
  row: number;
  direction: Direction;
}

// ── Seat ────────────────────────────────────────────────────────────────────

export interface Seat {
  id: number;
  col: number;
  row: number;
  direction: Direction;
}

// ── Office Layout ───────────────────────────────────────────────────────────

export interface OfficeLayout {
  cols: number;
  rows: number;
  tiles: TileType[][];
  furniture: PlacedFurniture[];
  tileColors: Record<string, string>;
}

// ── Character ───────────────────────────────────────────────────────────────

export interface Character {
  id: string;
  col: number;
  row: number;
  state: CharacterState;
  path: [number, number][];
  moveProgress: number;
  palette: string[];
  direction: Direction;
  frame: number;
}

// ── Sprite data ─────────────────────────────────────────────────────────────

export interface SpriteFrame {
  pixels: string[][];
}

export type SpriteData = SpriteFrame[][];

// ── Server messages (domain events, no I/O) ─────────────────────────────────

export type ServerMessage =
  | { type: "layout"; layout: OfficeLayout }
  | { type: "agent_spawn"; id: string; palette: number[]; seatId?: number }
  | { type: "agent_remove"; id: string }
  | { type: "agent_active"; id: string; seatId: number }
  | { type: "agent_idle"; id: string }
  | { type: "agent_tool"; id: string; tool: string }
  | { type: "subagent_spawn"; parentId: string; toolId: string; id: string }
  | { type: "subagent_remove"; parentId: string; toolId: string }
  | { type: "agent_bubble"; id: string; bubble: "waiting" | "permission" }
  | { type: "sound_play"; sound: "done" | "alert" };

// ── Grid ────────────────────────────────────────────────────────────────────

export type Grid = TileType[][];
