import { renderTiles } from "./tile-renderer.js";
import { generateFurnitureSprite } from "./furniture-sprites.js";
import { getCharacterSprite, drawSprite } from "./character-sprites.js";

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
 *   2. Furniture sprites
 *   3. Characters (sorted by Y = higher row → drawn later → on top)
 *   4. Dissolve particles
 *   5. Bubbles / name labels (top)
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

  // ── 2. Furniture sprites ─────────────────────────────────────────────────
  if (layout && layout.furniture && layout.furniture.length > 0) {
    for (const placed of layout.furniture) {
      renderFurniture(ctx, placed, cam);
    }
  }

  // ── 3. Characters (z-sorted by Y position) ──────────────────────────────
  if (characters && characters.size > 0) {
    // Collect and sort by row (Y-axis). Lower row = further back = drawn first.
    const charList = Array.from(characters.values());
    charList.sort((a, b) => a.row - b.row);

    for (const ch of charList) {
      renderCharacter(ctx, ch, cam);
    }
  }

  // ── 4. Dissolve particles ───────────────────────────────────────────────
  // Use either the state's dissolveEffect or the module-scoped fallback
  const dissolve = dissolveEffect || _dissolveEffect;
  if (dissolve && dissolve.isActive()) {
    dissolve.render(ctx, cam);
  }

  // ── 5. Bubbles / name labels (drawn on top of everything) ───────────────
  if (bubbles && bubbles.length > 0) {
    for (const bubble of bubbles) {
      renderBubble(ctx, bubble, cam);
    }
  }
}

// ── Furniture rendering ──────────────────────────────────────────────────────

/** Multi-tile sizes for furniture types (tiles wide × tiles tall). */
const FURNITURE_SIZE = {
  desk:  { w: 2, h: 1 },
  chair: { w: 1, h: 1 },
  wall:  { w: 1, h: 1 },
};

/**
 * Render a furniture sprite across its full footprint.
 * Desks span 2 tiles horizontally, chairs 1 tile, walls 1 tile.
 */
function renderFurniture(ctx, placed, cam) {
  const sprite = generateFurnitureSprite(placed.type);
  if (!sprite || !sprite.pixels) return;

  const tilePx = TILE_SIZE * cam.zoom;
  const size = FURNITURE_SIZE[placed.type] || { w: 1, h: 1 };
  const totalW = tilePx * size.w;
  const totalH = tilePx * size.h;
  const screenX = placed.col * tilePx - cam.x;
  const screenY = placed.row * tilePx - cam.y;

  const rows = sprite.pixels.length;
  const cols = sprite.pixels[0].length;

  // Scale each sprite pixel to fill the total footprint area
  const pxW = totalW / cols;
  const pxH = totalH / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const color = sprite.pixels[r][c];
      if (!color) continue;

      ctx.fillStyle = color;
      ctx.fillRect(
        Math.round(screenX + c * pxW),
        Math.round(screenY + r * pxH),
        Math.ceil(pxW),
        Math.ceil(pxH),
      );
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

  const palette = ch.palette;
  if (!palette || !Array.isArray(palette)) return;

  const spriteData = getCharacterSprite(palette);
  const frame = (ch.frame || 0) % 60;
  // Alternate between idle and walk frames
  const sprite = frame % 20 < 10 ? spriteData.idle : spriteData.walk1;

  // Sprite is 16 wide × 32 tall. Draw feet at bottom of tile.
  const pxSize = tilePx / 16;
  const spriteW = 16 * pxSize;
  const spriteH = 32 * pxSize;
  const drawX = screenX;
  const drawY = screenY + tilePx - spriteH; // feet at bottom of tile

  drawSprite(ctx, sprite, drawX, drawY, pxSize);

  // ── Name label ────────────────────────────────────────────────────────
  const name = ch.name || formatAgentName(ch.id);
  const fontSize = Math.max(8, tilePx * 0.15);
  ctx.font = `bold ${fontSize}px monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  // Position label just above the head (head starts ~row 2 of 32-row sprite)
  const labelY = drawY + pxSize * 2 - 2;
  const labelW = (ctx.measureText ? ctx.measureText(name).width : name.length * fontSize * 0.6) + 6;

  ctx.fillStyle = "rgba(0,0,0,0.65)";
  ctx.fillRect(screenX + spriteW / 2 - labelW / 2, labelY - fontSize - 2, labelW, fontSize + 4);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(name, screenX + spriteW / 2, labelY);
}

/**
 * Format a session ID into a readable display name.
 * @param {string} id
 * @returns {string}
 */
function formatAgentName(id) {
  if (!id) return "???";
  // If it contains a known agent name pattern (kebab-case or dot-separated), use last part
  const parts = id.split(/[-.]/);
  if (parts.length >= 2) {
    const lastPart = parts[parts.length - 1];
    // If last part looks like a short hash, use the meaningful part
    if (/^[a-f0-9]{6,}$/i.test(lastPart) && parts.length >= 3) {
      return parts.slice(0, -1).join("-").substring(0, 18);
    }
    return id.substring(0, 20);
  }
  return id.substring(0, 16);
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
