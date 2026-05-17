// ── Tile size constants ──────────────────────────────────────────────────────

const TILE_SIZE = 16; // pixels per tile

// ── Color helpers ────────────────────────────────────────────────────────────

/** Default tile colors fallback */
const DEFAULT_FLOOR_COLOR = "#d4c8a8";
const DEFAULT_WALL_COLOR = "#6b5e4a";
const GRID_COLOR = "rgba(0,0,0,0.08)";
const SEAT_INDICATOR_COLOR = "rgba(88,166,255,0.3)";
const FURNITURE_TINT = "rgba(0,0,0,0.1)";

/**
 * Render all floor tiles, grid overlay, furniture footprints, and seat
 * indicators onto the canvas context.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} layout — { cols, rows, tiles: string[][], furniture: PlacedFurniture[], tileColors: Record<string,string> }
 * @param {object} camera — { x: number, y: number, zoom: number }
 */
export function renderTiles(ctx, layout, camera) {
  const { cols, rows, tiles, furniture, tileColors } = layout;
  const { x: camX, y: camY, zoom } = camera;
  const tilePx = TILE_SIZE * zoom;

  // ── Floor tiles ──────────────────────────────────────────────────────────
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const tileType = tiles[r][c];
      const screenX = c * tilePx - camX;
      const screenY = r * tilePx - camY;

      // Get color from layout's tileColors, or fallback
      const color =
        (tileColors && tileColors[tileType]) ||
        (tileType === "WALL" ? DEFAULT_WALL_COLOR : DEFAULT_FLOOR_COLOR);

      ctx.fillStyle = color;
      ctx.fillRect(screenX, screenY, tilePx, tilePx);
    }
  }

  // ── Furniture footprints (dim overlay) ───────────────────────────────────
  if (furniture && furniture.length > 0) {
    for (const placed of furniture) {
      // Simple furniture footprint: single tile at placement
      const fx = placed.col * tilePx - camX;
      const fy = placed.row * tilePx - camY;

      ctx.fillStyle = FURNITURE_TINT;
      ctx.fillRect(fx, fy, tilePx, tilePx);
    }
  }

  // ── Seat indicators ─────────────────────────────────────────────────────
  if (furniture && furniture.length > 0) {
    for (const placed of furniture) {
      // Draw a small colored rectangle inside the tile for seats
      const fx = placed.col * tilePx - camX;
      const fy = placed.row * tilePx - camY;
      const indicatorSize = Math.max(2, Math.floor(tilePx / 4));

      ctx.fillStyle = SEAT_INDICATOR_COLOR;
      // Seat dot in the center of the tile
      const cx = fx + tilePx / 2 - indicatorSize / 2;
      const cy = fy + tilePx / 2 - indicatorSize / 2;
      ctx.fillRect(cx, cy, indicatorSize, indicatorSize);
    }
  }

  // ── Grid overlay ─────────────────────────────────────────────────────────
  // Only draw grid lines if zoom is high enough to see them
  if (zoom >= 2) {
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 0.5;

    // Vertical lines
    for (let c = 0; c <= cols; c++) {
      const x = c * tilePx - camX;
      ctx.beginPath();
      ctx.moveTo(x, -camY);
      ctx.lineTo(x, rows * tilePx - camY);
      ctx.stroke();
    }

    // Horizontal lines
    for (let r = 0; r <= rows; r++) {
      const y = r * tilePx - camY;
      ctx.beginPath();
      ctx.moveTo(-camX, y);
      ctx.lineTo(cols * tilePx - camX, y);
      ctx.stroke();
    }
  }
}
