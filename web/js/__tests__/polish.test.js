import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock context for dissolve rendering tests ─────────────────────────────────

function createMockCtx() {
  const calls = [];
  return {
    ctx: {
      fillStyle: "",
      font: "",
      fillText(text, x, y) {
        calls.push({ op: "fillText", text, x, y, fillStyle: this.fillStyle });
      },
      fillRect() {},
      clearRect() {},
      canvas: { width: 800, height: 600 },
    },
    calls() {
      return calls;
    },
  };
}

beforeEach(() => {
  // Mock setTimeout for particle lifetime
  vi.stubGlobal("setTimeout", vi.fn((fn) => fn()));
});

// ── Dissolve Effect ───────────────────────────────────────────────────────────

describe("DissolveEffect (Task 4.4) — Matrix dissolve on despawn", () => {
  it("exports DissolveEffect class", async () => {
    const { DissolveEffect } = await import("../dissolve-effect.js");
    expect(typeof DissolveEffect).toBe("function");
  });

  it("start creates particles at the given grid position", async () => {
    const { DissolveEffect } = await import("../dissolve-effect.js");
    const effect = new DissolveEffect();

    effect.start(3, 2, ["#f00", "#0f0", "#00f"]);

    // Should be active after start
    expect(effect.isActive()).toBe(true);
  });

  it("update advances particle lifecycles and eventually expires", async () => {
    const { DissolveEffect } = await import("../dissolve-effect.js");
    const effect = new DissolveEffect();

    effect.start(1, 1, ["#aaa", "#bbb"]);

    // Update for enough time to expire all particles
    // Particles max life = 2.0 seconds
    for (let i = 0; i < 20; i++) {
      effect.update(0.15);
    }

    expect(effect.isActive()).toBe(false);
  });

  it("render draws particles as text characters on canvas", async () => {
    const { DissolveEffect } = await import("../dissolve-effect.js");
    const effect = new DissolveEffect();
    const { ctx, calls } = createMockCtx();

    effect.start(3, 2, ["#0f0", "#fff", "#000"]);
    effect.update(0.1);
    effect.render(ctx, { x: 0, y: 0, zoom: 2 });

    // Should have drawn some text (the matrix characters)
    const textCalls = calls().filter((c) => c.op === "fillText");
    expect(textCalls.length).toBeGreaterThanOrEqual(1);
  });

  it("render does nothing when not active", async () => {
    const { DissolveEffect } = await import("../dissolve-effect.js");
    const effect = new DissolveEffect();
    const { ctx, calls } = createMockCtx();

    effect.render(ctx, { x: 0, y: 0, zoom: 2 });

    const textCalls = calls().filter((c) => c.op === "fillText");
    expect(textCalls.length).toBe(0);
  });

  it("multiple starts create independent particle bursts", async () => {
    const { DissolveEffect } = await import("../dissolve-effect.js");
    const effect = new DissolveEffect();

    effect.start(0, 0, ["#fff"]);
    effect.start(5, 5, ["#000"]);

    // Both should contribute to active state
    expect(effect.isActive()).toBe(true);

    // Update past both lifetimes
    for (let i = 0; i < 20; i++) {
      effect.update(0.15);
    }

    expect(effect.isActive()).toBe(false);
  });
});

// ── Furniture Sprites ─────────────────────────────────────────────────────────

describe("Furniture Sprites (Task 4.4) — procedural furniture for editor", () => {
  it("exports generateFurnitureSprite function", async () => {
    const { generateFurnitureSprite } = await import("../furniture-sprites.js");
    expect(typeof generateFurnitureSprite).toBe("function");
  });

  it("desk sprite produces non-empty pixel grid", async () => {
    const { generateFurnitureSprite } = await import("../furniture-sprites.js");

    const sprite = generateFurnitureSprite("desk");

    expect(sprite).toBeDefined();
    expect(Array.isArray(sprite.pixels)).toBe(true);
    expect(sprite.pixels.length).toBeGreaterThan(0);
    expect(sprite.pixels[0].length).toBeGreaterThan(0);

    // Desk should have meaningful content (not empty/blank)
    const anyColor = sprite.pixels.flat().some((c) => c !== null && c !== undefined && c !== "transparent");
    expect(anyColor).toBe(true);
  });

  it("chair sprite produces non-empty pixel grid different from desk", async () => {
    const { generateFurnitureSprite } = await import("../furniture-sprites.js");

    const chairSprite = generateFurnitureSprite("chair");
    const deskSprite = generateFurnitureSprite("desk");

    expect(chairSprite.pixels.length).toBeGreaterThan(0);
    // Chair and desk should have different dimensions or different pixel content
    // (even if same grid size, the pixel data should differ)
    const chairData = JSON.stringify(chairSprite.pixels);
    const deskData = JSON.stringify(deskSprite.pixels);
    expect(chairData).not.toBe(deskData);
  });

  it("wall sprite produces non-empty pixel grid", async () => {
    const { generateFurnitureSprite } = await import("../furniture-sprites.js");

    const sprite = generateFurnitureSprite("wall");

    expect(sprite).toBeDefined();
    expect(sprite.pixels.length).toBeGreaterThan(0);

    const anyColor = sprite.pixels.flat().some((c) => c !== null);
    expect(anyColor).toBe(true);
  });

  it("returns null for unknown furniture type", async () => {
    const { generateFurnitureSprite } = await import("../furniture-sprites.js");

    const sprite = generateFurnitureSprite("bookshelf");
    expect(sprite).toBeNull();
  });

  it("sprite pixels are 2D array of color strings", async () => {
    const { generateFurnitureSprite } = await import("../furniture-sprites.js");

    const sprite = generateFurnitureSprite("desk");

    // Each row should be an array
    for (const row of sprite.pixels) {
      expect(Array.isArray(row)).toBe(true);
    }

    // All colors should be strings or null
    for (const color of sprite.pixels.flat()) {
      expect(color === null || typeof color === "string").toBe(true);
    }
  });
});
