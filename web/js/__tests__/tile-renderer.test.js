import { describe, it, expect } from "vitest";

const TILE_SIZE = 16;

// Mock canvas context for TileRenderer tests
function createMockCtx() {
  const fills = [];
  const rects = [];
  return {
    ctx: {
      fillStyle: "",
      fillRect(x, y, w, h) {
        rects.push({ x, y, w, h });
        fills.push(this.fillStyle);
      },
      strokeStyle: "",
      strokeRect(x, y, w, h) {
        rects.push({ x, y, w, h });
      },
      lineWidth: 1,
      beginPath() {},
      moveTo(_x, _y) {},
      lineTo(_x, _y) {},
      rect(x, y, w, h) {},
      fill() {},
      stroke() {},
    },
    fills() {
      return fills;
    },
    rects() {
      return rects;
    },
  };
}

function tilePx(zoom) {
  return TILE_SIZE * zoom;
}

// Default layout for testing
function makeLayout(cols, rows) {
  const tiles = [];
  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
      row.push("FLOOR_1");
    }
    tiles.push(row);
  }
  return {
    cols,
    rows,
    tiles,
    furniture: [],
    tileColors: {
      FLOOR_1: "#d4c8a8",
      FLOOR_2: "#c4b898",
      WALL: "#6b5e4a",
    },
  };
}

describe("renderTiles (Task 3.2)", () => {
  it("exports renderTiles function", async () => {
    const { renderTiles } = await import("../tile-renderer.js");
    expect(typeof renderTiles).toBe("function");
  });

  it("renders correct number of tiles for a full layout", async () => {
    const { renderTiles } = await import("../tile-renderer.js");
    const layout = makeLayout(10, 5);
    const { ctx, rects } = createMockCtx();
    const camera = { x: 0, y: 0, zoom: 2 };

    renderTiles(ctx, layout, camera);

    // Each tile is a fillRect call — 10×5 = 50 tiles
    const tp = tilePx(camera.zoom);
    const tileRects = rects().filter((r) => r.w === tp && r.h === tp);
    expect(tileRects.length).toBe(50);
  });

  it("uses correct tile colors from layout.tileColors", async () => {
    const { renderTiles } = await import("../tile-renderer.js");
    const layout = makeLayout(3, 2);
    layout.tiles = [
      ["FLOOR_1", "FLOOR_2", "WALL"],
      ["FLOOR_1", "FLOOR_1", "FLOOR_2"],
    ];
    layout.tileColors = {
      FLOOR_1: "#aaa",
      FLOOR_2: "#bbb",
      WALL: "#ccc",
    };
    const { ctx, fills } = createMockCtx();
    const camera = { x: 0, y: 0, zoom: 1 };

    renderTiles(ctx, layout, camera);

    const allColors = fills();
    expect(allColors).toContain("#aaa");
    expect(allColors).toContain("#bbb");
    expect(allColors).toContain("#ccc");
  });

  it("applies camera offset to tile rendering", async () => {
    const { renderTiles } = await import("../tile-renderer.js");
    const layout = makeLayout(4, 3);
    const { ctx, rects } = createMockCtx();
    const camera = { x: 10, y: 5, zoom: 2 };

    renderTiles(ctx, layout, camera);

    const tp = tilePx(camera.zoom);
    const tileRects = rects().filter((r) => r.w === tp && r.h === tp);
    expect(tileRects.length).toBe(12); // 4×3
    // First tile at (0,0) with camera offset
    expect(tileRects[0].x).toBe(0 * tilePx(camera.zoom) - camera.x);
    expect(tileRects[0].y).toBe(0 * tilePx(camera.zoom) - camera.y);
  });

  it("draws seat indicators for furniture with seats", async () => {
    const { renderTiles } = await import("../tile-renderer.js");
    const layout = makeLayout(10, 10);
    layout.furniture = [
      { id: "chair-0", type: "chair", col: 5, row: 5, direction: 0 },
    ];
    const { ctx, rects } = createMockCtx();
    const camera = { x: 0, y: 0, zoom: 2 };

    renderTiles(ctx, layout, camera);

    const tp = tilePx(camera.zoom);
    const allRects = rects();
    // Tile rects: 10×10 = 100, plus furniture footprint rects of same size
    const tileRects = allRects.filter((r) => r.w === tp && r.h === tp);
    expect(tileRects.length).toBe(101); // 100 tiles + 1 furniture footprint
    // Seat indicator: should have some rects that are NOT tile-sized
    const seatRects = allRects.filter((r) => r.w !== tp || r.h !== tp);
    expect(seatRects.length).toBeGreaterThan(0);
  });
});
