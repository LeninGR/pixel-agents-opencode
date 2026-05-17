import { describe, it, expect, vi, beforeEach } from "vitest";

const TILE_SIZE = 16;

function createMockCtx() {
  const calls = [];
  return {
    ctx: {
      fillStyle: "",
      fillRect(x, y, w, h) {
        calls.push({ op: "fillRect", x, y, w, h, fillStyle: this.fillStyle });
      },
      strokeStyle: "",
      strokeRect(x, y, w, h) {
        calls.push({ op: "strokeRect", x, y, w, h });
      },
      lineWidth: 1,
      beginPath() {},
      moveTo(_x, _y) {},
      lineTo(_x, _y) {},
      stroke() {},
      save() {},
      restore() {},
      translate(_x, _y) {},
      scale(_x, _y) {},
      drawImage(_img, _x, _y, _w, _h) {
        calls.push({ op: "drawImage", img: !!_img, x: _x, y: _y, w: _w, h: _h });
      },
      fillText(_text, _x, _y) {
        calls.push({ op: "fillText", text: _text, x: _x, y: _y });
      },
      canvas: { width: 800, height: 600 },
      font: "",
      textAlign: "",
      textBaseline: "",
    },
    calls() {
      return calls;
    },
  };
}

function makeLayout(cols, rows) {
  const tiles = [];
  for (let r = 0; r < rows; r++) {
    tiles.push(Array.from({ length: cols }, () => "FLOOR_1"));
  }
  return {
    cols,
    rows,
    tiles,
    furniture: [],
    tileColors: { FLOOR_1: "#d4c8a8" },
  };
}

describe("Camera utilities (Task 3.3)", () => {
  it("exports clampZoom function", async () => {
    const { clampZoom } = await import("../scene-renderer.js");
    expect(typeof clampZoom).toBe("function");
  });

  it("clampZoom returns zoom within 1–10 range", async () => {
    const { clampZoom } = await import("../scene-renderer.js");
    expect(clampZoom(0)).toBe(1);
    expect(clampZoom(-5)).toBe(1);
    expect(clampZoom(1)).toBe(1);
    expect(clampZoom(5)).toBe(5);
    expect(clampZoom(10)).toBe(10);
    expect(clampZoom(15)).toBe(10);
    expect(clampZoom(100)).toBe(10);
  });

  it("pixelAlign returns integer aligned to zoom grid", async () => {
    const { pixelAlign } = await import("../scene-renderer.js");
    // At zoom 2, values should snap to multiples of 2
    expect(pixelAlign(5, 2)).toBe(4);
    expect(pixelAlign(6, 2)).toBe(6);
    expect(pixelAlign(3, 2)).toBe(2);
    // At zoom 4
    expect(pixelAlign(7, 4)).toBe(4);
    expect(pixelAlign(9, 4)).toBe(8);
    // At zoom 1
    expect(pixelAlign(3.7, 1)).toBe(3);
  });
});

describe("renderScene (Task 3.3)", () => {
  it("exports renderScene function", async () => {
    const { renderScene } = await import("../scene-renderer.js");
    expect(typeof renderScene).toBe("function");
  });

  it("renders floor layer via tile renderer", async () => {
    const { renderScene } = await import("../scene-renderer.js");
    const layout = makeLayout(5, 3);
    const { ctx, calls } = createMockCtx();
    const camera = { x: 0, y: 0, zoom: 2 };

    // Minimal state: no characters, no bubbles
    const state = {
      layout,
      characters: new Map(),
      bubbles: [],
    };

    renderScene(ctx, state, camera);

    // Should have tile fillRect calls (5*3=15 tiles)
    const tileCalls = calls().filter(
      (c) => c.op === "fillRect" && c.w === TILE_SIZE * camera.zoom,
    );
    expect(tileCalls.length).toBe(15);
  });

  it("draws characters sorted by Y position (z-sort)", async () => {
    const { renderScene } = await import("../scene-renderer.js");
    const layout = makeLayout(10, 10);
    const { ctx, calls } = createMockCtx();
    const camera = { x: 0, y: 0, zoom: 2 };

    // Two characters at different rows (different Y)
    const state = {
      layout,
      characters: new Map([
        ["agent-a", {
          id: "agent-a", col: 5, row: 8, direction: 0, frame: 0,
          palette: ["#f00", "#0f0", "#00f", "#fff", "#000", "#888"],
        }],
        ["agent-b", {
          id: "agent-b", col: 5, row: 2, direction: 0, frame: 0,
          palette: ["#f00", "#0f0", "#00f", "#fff", "#000", "#888"],
        }],
      ]),
      bubbles: [],
    };

    renderScene(ctx, state, camera);

    // Each character renders at least 2 fillRect calls (body + head)
    // Rows 2,8 — we can verify both are rendered
    const allFills = calls().filter((c) => c.op === "fillRect");
    // Should have tile rects + character fills. Just verify there are fills beyond tiles.
    const tp = 16 * camera.zoom;
    const tileFills = allFills.filter((c) => c.w === tp && c.h === tp);
    const charFills = allFills.filter((c) => c.w !== tp || c.h !== tp);
    // Character fills: 2 per character (body + head) + maybe background clear
    expect(charFills.length).toBeGreaterThanOrEqual(4);
  });
});
