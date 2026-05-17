import { describe, it, expect } from "vitest";

// Dynamic import — module doesn't exist yet (RED phase)
describe("SpriteCache (Task 3.1)", () => {
  it("exports SpriteCache class", async () => {
    const { SpriteCache } = await import("../sprites.js");
    expect(typeof SpriteCache).toBe("function");
    const cache = new SpriteCache();
    expect(cache).toBeDefined();
    expect(typeof cache.get).toBe("function");
    expect(typeof cache.set).toBe("function");
  });

  it("get returns null on first call for uncached sprite", async () => {
    const { SpriteCache } = await import("../sprites.js");
    const cache = new SpriteCache();

    const mockSprite = {
      pixels: Array.from({ length: 16 }, (_, r) =>
        Array.from({ length: 16 }, (_, c) =>
          r < 8 ? "#ff0000" : "#00ff00",
        ),
      ),
    };

    // No cached entry yet
    expect(cache.get(mockSprite, 2)).toBeNull();
  });

  it("set and get: caches and returns offscreen canvas at zoom level", async () => {
    const { SpriteCache } = await import("../sprites.js");
    const cache = new SpriteCache();

    const mockSprite = {
      pixels: Array.from({ length: 16 }, (_, r) =>
        Array.from({ length: 16 }, (_, c) =>
          r < 8 ? "#ff0000" : "#00ff00",
        ),
      ),
    };

    cache.set(mockSprite, 2);
    const cached = cache.get(mockSprite, 2);

    expect(cached).not.toBeNull();
    // Should be a canvas-like object with correct dimensions
    expect(typeof cached.width).toBe("number");
    expect(typeof cached.height).toBe("number");
    expect(cached.width).toBe(16 * 2); // 16px * zoom
    expect(cached.height).toBe(16 * 2);
    // Should have a getContext method
    expect(typeof cached.getContext).toBe("function");
  });

  it("different zoom levels are cached separately", async () => {
    const { SpriteCache } = await import("../sprites.js");
    const cache = new SpriteCache();

    const mockSprite = {
      pixels: Array.from({ length: 16 }, () =>
        Array.from({ length: 16 }, () => "#ccc"),
      ),
    };

    cache.set(mockSprite, 3);
    cache.set(mockSprite, 5);

    const z3 = cache.get(mockSprite, 3);
    const z5 = cache.get(mockSprite, 5);

    expect(z3).not.toBeNull();
    expect(z5).not.toBeNull();
    expect(z3.width).toBe(16 * 3);
    expect(z5.width).toBe(16 * 5);
    // Different zoom = different canvases
    expect(z3).not.toBe(z5);
  });

  it("cache key uses sprite identity — different sprite objects at same zoom get different entries", async () => {
    const { SpriteCache } = await import("../sprites.js");
    const cache = new SpriteCache();

    const spriteA = {
      pixels: Array.from({ length: 16 }, () =>
        Array.from({ length: 16 }, () => "#aaa"),
      ),
    };
    const spriteB = {
      pixels: Array.from({ length: 16 }, () =>
        Array.from({ length: 16 }, () => "#bbb"),
      ),
    };

    cache.set(spriteA, 2);
    cache.set(spriteB, 2);

    const ca = cache.get(spriteA, 2);
    const cb = cache.get(spriteB, 2);
    expect(ca).not.toBeNull();
    expect(cb).not.toBeNull();
    expect(ca).not.toBe(cb);
  });

  it("clear removes all cached entries", async () => {
    const { SpriteCache } = await import("../sprites.js");
    const cache = new SpriteCache();

    const sprite = {
      pixels: Array.from({ length: 16 }, () =>
        Array.from({ length: 16 }, () => "#ccc"),
      ),
    };

    cache.set(sprite, 2);
    cache.set(sprite, 4);
    expect(cache.get(sprite, 2)).not.toBeNull();
    expect(cache.get(sprite, 4)).not.toBeNull();

    cache.clear();

    expect(cache.get(sprite, 2)).toBeNull();
    expect(cache.get(sprite, 4)).toBeNull();
  });

  it("has returns true for cached sprite+zoom, false for missing", async () => {
    const { SpriteCache } = await import("../sprites.js");
    const cache = new SpriteCache();

    const sprite = {
      pixels: Array.from({ length: 16 }, () =>
        Array.from({ length: 16 }, () => "#ccc"),
      ),
    };

    expect(cache.has(sprite, 2)).toBe(false);
    cache.set(sprite, 2);
    expect(cache.has(sprite, 2)).toBe(true);
    expect(cache.has(sprite, 3)).toBe(false); // different zoom
  });
});
