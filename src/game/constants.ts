// ── Grid ───────────────────────────────────────────────────────────────────

/** Pixel size of each tile (16×16). */
export const TILE_SIZE = 16;

// ── Movement ────────────────────────────────────────────────────────────────

/** Character walk speed in pixels per second. */
export const WALK_SPEED = 48;

/** Maximum delta-time per frame to avoid spiral-of-death (seconds). */
export const MAX_DELTA = 0.1;

// ── Animation ───────────────────────────────────────────────────────────────

/** Frames per direction for walk cycle. */
export const WALK_FRAMES = 4;

/** Frames per direction for idle/type animation. */
export const IDLE_FRAMES = 2;

/** Total number of directions (DOWN, LEFT, RIGHT, UP). */
export const DIRECTION_COUNT = 4;

// ── Colors ──────────────────────────────────────────────────────────────────

/** Default tile color palette for floor types. */
export const FLOOR_COLORS: Record<string, string> = {
  FLOOR_1: "#d4c8a8",
  FLOOR_2: "#c4b898",
  FLOOR_3: "#b4a888",
  FLOOR_4: "#a49878",
  FLOOR_5: "#ccc4b4",
  FLOOR_6: "#bcc4a4",
  FLOOR_7: "#acc494",
  FLOOR_8: "#9cc484",
  FLOOR_9: "#e8e0d0",
};

/** Wall color. */
export const WALL_COLOR = "#6b5e4a";

/** Void / out-of-bounds color. */
export const VOID_COLOR = "#1a1a2e";

// ── Agent life cycle ────────────────────────────────────────────────────────

/** Minimum seconds an agent must live before despawn is allowed. */
export const MIN_AGENT_LIFETIME_S = 3;
