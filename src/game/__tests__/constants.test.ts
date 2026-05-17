import { describe, it, expect } from "vitest";
import {
  TILE_SIZE,
  WALK_SPEED,
  MAX_DELTA,
} from "../constants.js";

describe("Game constants", () => {
  it("TILE_SIZE is 16 pixels", () => {
    expect(TILE_SIZE).toBe(16);
  });

  it("WALK_SPEED is 48 pixels per second", () => {
    expect(WALK_SPEED).toBe(48);
  });

  it("MAX_DELTA caps frame delta at 0.1 seconds", () => {
    expect(MAX_DELTA).toBe(0.1);
  });

  it("constants are positive numbers", () => {
    expect(TILE_SIZE).toBeGreaterThan(0);
    expect(WALK_SPEED).toBeGreaterThan(0);
    expect(MAX_DELTA).toBeGreaterThan(0);
  });

  it("walk speed is a multiple of tile size for smooth movement", () => {
    expect(WALK_SPEED % TILE_SIZE).toBe(0);
  });
});

// Separate describe for the derived const to pin the invariant
describe("Movement invariants", () => {
  it("tiles per second is a clean ratio", () => {
    const tilesPerSecond = WALK_SPEED / TILE_SIZE;
    expect(tilesPerSecond).toBe(3);
  });
});
