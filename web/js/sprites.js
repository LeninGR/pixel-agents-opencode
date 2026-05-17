// ── Canvas factory (cross-platform: browser + Node) ──────────────────────────

/**
 * Create an offscreen canvas-like object.
 * In browser: uses OffscreenCanvas or document.createElement('canvas')
 * In Node/vitest: returns a duck-typed canvas mock
 */
function createOffscreenCanvas(width, height) {
  // OffscreenCanvas (modern browsers)
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(width, height);
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  // Browser fallback
  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  // Node/vitest: duck-typed canvas mock
  const ctx = {
    fillStyle: "",
    fillRect(_x, _y, _w, _h) {},
    clearRect(_x, _y, _w, _h) {},
    getImageData(_x, _y, _w, _h) {
      return { data: new Uint8ClampedArray(_w * _h * 4) };
    },
    putImageData(_data, _x, _y) {},
  };

  return {
    width,
    height,
    getContext(_type) {
      return ctx;
    },
  };
}

// ── Sprite cache key ─────────────────────────────────────────────────────────

function cacheKey(sprite, zoom) {
  // Use sprite identity (reference) + zoom
  return [sprite, zoom];
}

// ── SpriteCache ───────────────────────────────────────────────────────────────

/**
 * Cache of offscreen canvases keyed by (sprite data reference, zoom level).
 * Prevents per-frame procedural sprite generation.
 */
export class SpriteCache {
  /** @type {Map<string, object>} */
  #store = new Map();
  /** @type {WeakMap<object, number>} */
  #idMap = new WeakMap();
  #nextId = 0;

  /** Get a unique string key for a sprite object reference */
  #refKey(sprite) {
    if (!this.#idMap.has(sprite)) {
      this.#idMap.set(sprite, ++this.#nextId);
    }
    return String(this.#idMap.get(sprite));
  }

  /**
   * Retrieve a cached offscreen canvas for the given sprite at the given zoom.
   * @param {object} sprite — SpriteFrame with `pixels` (2D array of color strings)
   * @param {number} zoom — integer zoom level (1-10)
   * @returns {object|null} — offscreen canvas-like object, or null if not cached
   */
  get(sprite, zoom) {
    const key = `${this.#refKey(sprite)}:${zoom}`;
    return this.#store.get(key) ?? null;
  }

  /**
   * Generate and cache an offscreen canvas for the given sprite at the given zoom.
   * @param {object} sprite — SpriteFrame with `pixels` (2D array)
   * @param {number} zoom — integer zoom level
   */
  set(sprite, zoom) {
    const key = `${this.#refKey(sprite)}:${zoom}`;
    if (this.#store.has(key)) return;

    const pixels = sprite.pixels;
    const rows = pixels.length;
    const cols = rows > 0 ? pixels[0].length : 0;
    const canvas = createOffscreenCanvas(cols * zoom, rows * zoom);
    const ctx = canvas.getContext("2d");

    // Draw the pixel grid scaled by zoom
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const color = pixels[r][c];
        if (color !== null && color !== undefined) {
          ctx.fillStyle = color;
          ctx.fillRect(c * zoom, r * zoom, zoom, zoom);
        }
      }
    }

    this.#store.set(key, canvas);
  }

  /**
   * Check if a sprite+zoom combination is cached.
   * @param {object} sprite
   * @param {number} zoom
   * @returns {boolean}
   */
  has(sprite, zoom) {
    const key = `${this.#refKey(sprite)}:${zoom}`;
    return this.#store.has(key);
  }

  /**
   * Remove all cached entries.
   */
  clear() {
    this.#store.clear();
  }
}

// ── Sprite data generator (convenience, delegates to renderer) ────────────────

/**
 * Generate directional sprite data for a character using the renderer.
 * In browser, delegates to window.PixelRenderer.generateCharacterSprites.
 * Returns {walk, idle, work} where each is 4 directions × N frames.
 *
 * @param {string[]|object} palette — palette array or object
 * @returns {{walk: object[][], idle: object[][], work: object[][]}}
 */
export function generateSpriteData(palette) {
  // Use global renderer if in browser
  if (
    typeof window !== "undefined" &&
    window.PixelRenderer &&
    window.PixelRenderer.generateCharacterSprites
  ) {
    return window.PixelRenderer.generateCharacterSprites(palette);
  }
  // In tests, import the renderer directly
  // (tests should import generateCharacterSprites from renderer.js directly)
  throw new Error(
    "generateSpriteData requires window.PixelRenderer.generateCharacterSprites (renderer.js must be loaded first)",
  );
}
