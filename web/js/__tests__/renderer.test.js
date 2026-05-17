import { describe, it, expect } from "vitest";

// Dynamic import — the module exports don't exist yet (RED phase)
describe("generateCharacterSprites (Task 3.6)", () => {
  it("exports generateCharacterSprites as a function", async () => {
    const mod = await import("../renderer.js");
    expect(typeof mod.generateCharacterSprites).toBe("function");
  });

  it("returns walk sprites: 4 directions × 4 frames of 16×16 pixels", async () => {
    const { generateCharacterSprites } = await import("../renderer.js");
    const sprites = generateCharacterSprites([
      "#f4c08e", "#3d2b1f", "#4a90d9", "#2c3e50", "#f1c40f", "#2c3e50",
    ]);

    expect(sprites.walk).toBeDefined();
    expect(sprites.walk.length).toBe(4); // 4 directions

    for (let dir = 0; dir < 4; dir++) {
      const dirFrames = sprites.walk[dir];
      expect(dirFrames.length).toBe(4); // 4 frames per direction

      for (let f = 0; f < 4; f++) {
        const frame = dirFrames[f];
        expect(frame.pixels).toBeDefined();
        expect(frame.pixels.length).toBe(16); // 16 rows

        for (let r = 0; r < 16; r++) {
          expect(frame.pixels[r].length).toBe(16); // 16 cols
          // At least some non-null pixels (character occupies space)
          const nonNull = frame.pixels[r].filter((c) => c !== null);
          if (r >= 1 && r <= 11) {
            // Character body rows should have pixels
            expect(
              nonNull.length,
              `direction ${dir} frame ${f} row ${r} should have visible pixels`,
            ).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  it("returns idle sprites: 4 directions × 2 frames", async () => {
    const { generateCharacterSprites } = await import("../renderer.js");
    const sprites = generateCharacterSprites([
      "#f4c08e", "#3d2b1f", "#4a90d9", "#2c3e50", "#f1c40f", "#2c3e50",
    ]);

    expect(sprites.idle).toBeDefined();
    expect(sprites.idle.length).toBe(4);

    for (let dir = 0; dir < 4; dir++) {
      expect(sprites.idle[dir].length).toBe(2);
      for (let f = 0; f < 2; f++) {
        const frame = sprites.idle[dir][f];
        expect(frame.pixels.length).toBe(16);
      }
    }
  });

  it("returns work/type sprites: 4 directions × 2 frames", async () => {
    const { generateCharacterSprites } = await import("../renderer.js");
    const sprites = generateCharacterSprites([
      "#f4c08e", "#3d2b1f", "#4a90d9", "#2c3e50", "#f1c40f", "#2c3e50",
    ]);

    expect(sprites.work).toBeDefined();
    expect(sprites.work.length).toBe(4);

    for (let dir = 0; dir < 4; dir++) {
      expect(sprites.work[dir].length).toBe(2);
      for (let f = 0; f < 2; f++) {
        const frame = sprites.work[dir][f];
        expect(frame.pixels.length).toBe(16);
      }
    }
  });

  it("uses the provided palette colors in sprites", async () => {
    const { generateCharacterSprites } = await import("../renderer.js");
    const palette = [
      "#ff0000", "#00ff00", "#0000ff", "#ffffff", "#000000", "#888888",
    ];
    const sprites = generateCharacterSprites(palette);

    // Check that skin color (#ff0000 — first palette entry) appears in the sprite
    const walkDown = sprites.walk[0][0].pixels;
    let foundSkin = false;
    for (const row of walkDown) {
      if (row.includes(palette[0])) {
        foundSkin = true;
        break;
      }
    }
    expect(foundSkin).toBe(true);

    // Check that shirt color appears
    let foundShirt = false;
    for (const row of walkDown) {
      if (row.includes(palette[2])) {
        foundShirt = true;
        break;
      }
    }
    expect(foundShirt).toBe(true);
  });

  it("handles empty/null palette with fallback defaults", async () => {
    const { generateCharacterSprites } = await import("../renderer.js");

    // Empty array → should still produce valid sprites with defaults
    const sprites1 = generateCharacterSprites([]);
    expect(sprites1.walk.length).toBe(4);
    // Should have non-null pixels using default colors
    const frame = sprites1.walk[0][0].pixels;
    let hasPixels = false;
    for (const row of frame) {
      if (row.some((c) => c !== null)) {
        hasPixels = true;
        break;
      }
    }
    expect(hasPixels).toBe(true);

    // null → shouldn't crash, produce valid sprites
    const sprites2 = generateCharacterSprites(null);
    expect(sprites2.walk.length).toBe(4);
  });

  it("consecutive walk frames differ (proving animation)", async () => {
    const { generateCharacterSprites } = await import("../renderer.js");
    const palette = [
      "#f4c08e", "#3d2b1f", "#4a90d9", "#2c3e50", "#f1c40f", "#2c3e50",
    ];
    const sprites = generateCharacterSprites(palette);

    // Walk frames 0 and 1 for DOWN direction should differ (bob + feet animation)
    const f0 = JSON.stringify(sprites.walk[0][0].pixels);
    const f1 = JSON.stringify(sprites.walk[0][1].pixels);
    expect(f0).not.toBe(f1);
  });

  it("up-direction sprites differ from down-direction (back view)", async () => {
    const { generateCharacterSprites } = await import("../renderer.js");
    const palette = [
      "#f4c08e", "#3d2b1f", "#4a90d9", "#2c3e50", "#f1c40f", "#2c3e50",
    ];
    const sprites = generateCharacterSprites(palette);

    // Down (0) should have more skin pixels than Up (3) which is back view
    const downFrame = sprites.walk[0][0].pixels;
    const upFrame = sprites.walk[3][0].pixels;

    const skinColor = palette[0];
    let downSkin = 0;
    let upSkin = 0;

    for (let r = 0; r < 16; r++) {
      for (let c = 0; c < 16; c++) {
        if (downFrame[r][c] === skinColor) downSkin++;
        if (upFrame[r][c] === skinColor) upSkin++;
      }
    }

    // Up (back) view should have fewer skin pixels (face not visible)
    expect(upSkin).toBeLessThan(downSkin);
  });
});
