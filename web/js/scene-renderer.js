import { renderTiles } from "./tile-renderer.js";

const TILE_SIZE = 16;

/** @type {import("./dissolve-effect.js").DissolveEffect|null} */
let _dissolveEffect = null;

// ── Camera utilities ─────────────────────────────────────────────────────────

/**
 * Clamp zoom level to integer range [1, 10].
 * @param {number} zoom
 * @returns {number}
 */
export function clampZoom(zoom) {
  const z = Math.round(zoom);
  if (z < 1) return 1;
  if (z > 10) return 10;
  return z;
}

/**
 * Align a coordinate to the pixel grid for the current zoom level.
 * Prevents sub-pixel rendering artifacts.
 * @param {number} value
 * @param {number} zoom
 * @returns {number}
 */
export function pixelAlign(value, zoom) {
  return Math.floor(value / zoom) * zoom;
}

// ── Scene renderer ───────────────────────────────────────────────────────────

/**
 * Composite all layers onto the canvas in z-order:
 *   1. Floor tiles (bottom)
 *   2. Furniture
 *   3. Characters (sorted by Y = higher row → drawn later → on top)
 *   4. Dissolve particles (between characters and UI)
 *   5. Bubbles / UI (top)
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} state — { layout, characters: Map<string, object>, bubbles: object[], dissolveEffect? }
 * @param {object} camera — { x, y, zoom }
 */
export function renderScene(ctx, state, camera) {
  const { layout, characters, bubbles, dissolveEffect } = state;
  const zoom = clampZoom(camera.zoom);
  const cam = { x: camera.x, y: camera.y, zoom };

  // Clear canvas
  ctx.fillStyle = "#0d1117";
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // ── 1. Floor tiles ──────────────────────────────────────────────────────
  renderTiles(ctx, layout, cam);

  // ── 2. Characters (z-sorted by Y position) ──────────────────────────────
  if (characters && characters.size > 0) {
    // Collect and sort by row (Y-axis). Lower row = further back = drawn first.
    const charList = Array.from(characters.values());
    charList.sort((a, b) => a.row - b.row);

    for (const ch of charList) {
      renderCharacter(ctx, ch, cam);
    }
  }

  // ── 3. Dissolve particles ───────────────────────────────────────────────
  // Use either the state's dissolveEffect or the module-scoped fallback
  const dissolve = dissolveEffect || _dissolveEffect;
  if (dissolve && dissolve.isActive()) {
    dissolve.render(ctx, cam);
  }

  // ── 4. Bubbles / UI (drawn on top of everything) ────────────────────────
  if (bubbles && bubbles.length > 0) {
    for (const bubble of bubbles) {
      renderBubble(ctx, bubble, cam);
    }
  }
}

// ── Character rendering ──────────────────────────────────────────────────────

/**
 * Render a single character at its tile position on the canvas.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} ch — { id, col, row, direction, frame, palette }
 * @param {object} cam — { x, y, zoom }
 */
function renderCharacter(ctx, ch, cam) {
  const tilePx = TILE_SIZE * cam.zoom;
  const screenX = ch.col * tilePx - cam.x;
  const screenY = ch.row * tilePx - cam.y;

  // Try to use cached sprite from SpriteCache (if available)
  // In the full integration, the scene renderer will use the sprite cache.
  // For now, draw a colored rectangle placeholder for the character.
  const palette = ch.palette;
  const shirtColor = (typeof palette === "object" && !Array.isArray(palette))
    ? (palette.shirt || "#7f8c8d")
    : (Array.isArray(palette) ? (palette[2] || "#7f8c8d") : "#7f8c8d");

  // Body rectangle
  const bodyHeight = tilePx * 0.7;
  const bodyY = screenY + tilePx * 0.15;
  ctx.fillStyle = shirtColor;
  ctx.fillRect(screenX + tilePx * 0.15, bodyY, tilePx * 0.7, bodyHeight);

  // Head circle (approximated as rect in pixel style)
  const headSize = tilePx * 0.4;
  const skinColor = (typeof palette === "object" && !Array.isArray(palette))
    ? (palette.skin || "#f4c08e")
    : (Array.isArray(palette) ? (palette[0] || "#f4c08e") : "#f4c08e");
  ctx.fillStyle = skinColor;
  ctx.fillRect(
    screenX + tilePx * 0.25,
    screenY - headSize * 0.3,
    headSize * 1.2,
    headSize,
  );
}

// ── Bubble rendering ─────────────────────────────────────────────────────────

/**
 * Render a text bubble above a character.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} bubble — { id, col, row, text }
 * @param {object} cam — { x, y, zoom }
 */
function renderBubble(ctx, bubble, cam) {
  const tilePx = TILE_SIZE * cam.zoom;
  const screenX = bubble.col * tilePx - cam.x;
  const screenY = bubble.row * tilePx - cam.y;

  // Bubble background
  const bubbleY = screenY - tilePx * 0.6;
  ctx.fillStyle = "rgba(28,33,40,0.9)";
  ctx.fillRect(screenX - tilePx * 0.5, bubbleY, tilePx * 2, tilePx * 0.5);

  // Bubble text
  ctx.fillStyle = "#e6edf3";
  ctx.font = `${Math.max(8, tilePx * 0.15)}px monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(
    bubble.text || "",
    screenX + tilePx * 0.5,
    bubbleY + tilePx * 0.25,
  );
}

// ── Dissolve effect integration ───────────────────────────────────────────────

/**
 * Set the dissolve effect instance to be used during scene rendering.
 * Called by the app when agent_remove fires to trigger the dissolve animation.
 * @param {import("./dissolve-effect.js").DissolveEffect|null} effect
 */
export function setDissolveEffect(effect) {
  _dissolveEffect = effect;
}
