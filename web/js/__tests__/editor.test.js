import { describe, it, expect, beforeEach } from "vitest";

// Default test layout: 5×3 grid, all FLOOR_1
function makeTestLayout(cols = 5, rows = 3) {
  const tiles = [];
  for (let r = 0; r < rows; r++) {
    tiles.push(Array.from({ length: cols }, () => "FLOOR_1"));
  }
  return {
    cols,
    rows,
    tiles,
    furniture: [],
    tileColors: {
      FLOOR_1: "#d4c8a8",
      FLOOR_2: "#c4b898",
      FLOOR_3: "#b4a888",
      FLOOR_4: "#a49878",
      FLOOR_5: "#948868",
      FLOOR_6: "#847858",
      FLOOR_7: "#746848",
      FLOOR_8: "#645838",
      FLOOR_9: "#544828",
    },
  };
}

describe("LayoutEditor (Task 4.1) — LE-001: edit mode & tools", () => {
  it("exports LayoutEditor class", async () => {
    const { LayoutEditor } = await import("../editor.js");
    expect(typeof LayoutEditor).toBe("function");
  });

  it("starts in view mode with editMode=false", async () => {
    const { LayoutEditor } = await import("../editor.js");
    const layout = makeTestLayout();
    const editor = new LayoutEditor(layout);

    expect(editor.editMode).toBe(false);
    expect(editor.currentTool).toBe("floor_1");
  });

  it("toggleEdit switches editMode on/off", async () => {
    const { LayoutEditor } = await import("../editor.js");
    const layout = makeTestLayout();
    const editor = new LayoutEditor(layout);

    expect(editor.editMode).toBe(false);

    editor.toggleEdit();
    expect(editor.editMode).toBe(true);

    editor.toggleEdit();
    expect(editor.editMode).toBe(false);
  });

  it("setTool changes active tool", async () => {
    const { LayoutEditor } = await import("../editor.js");
    const layout = makeTestLayout();
    const editor = new LayoutEditor(layout);

    editor.setTool("wall");
    expect(editor.currentTool).toBe("wall");

    editor.setTool("desk");
    expect(editor.currentTool).toBe("desk");

    editor.setTool("chair");
    expect(editor.currentTool).toBe("chair");

    editor.setTool("erase");
    expect(editor.currentTool).toBe("erase");

    editor.setTool("floor_3");
    expect(editor.currentTool).toBe("floor_3");
  });

  it("gridToTile converts pixel/mouse coords to grid (col,row)", async () => {
    const { LayoutEditor } = await import("../editor.js");
    const layout = makeTestLayout();
    const editor = new LayoutEditor(layout);

    // At zoom 2, TILE_SIZE = 16 * 2 = 32px per tile
    // (0,0) in screen → (0,0) in grid
    const tile = editor.gridToTile(40, 40, { x: 0, y: 0, zoom: 2 });
    expect(tile.col).toBe(1);
    expect(tile.row).toBe(1);
  });
});

describe("LayoutEditor (Task 4.1) — LE-001: tool application", () => {
  it("applyTool with wall sets tile to WALL", async () => {
    const { LayoutEditor } = await import("../editor.js");
    const layout = makeTestLayout();
    const editor = new LayoutEditor(layout);

    editor.setTool("wall");
    editor.applyTool(1, 2);

    const modifiedLayout = editor.getLayout();
    expect(modifiedLayout.tiles[2][1]).toBe("WALL");
  });

  it("applyTool with floor_3 sets tile to FLOOR_3", async () => {
    const { LayoutEditor } = await import("../editor.js");
    const layout = makeTestLayout();
    const editor = new LayoutEditor(layout);

    editor.setTool("floor_3");
    editor.applyTool(2, 0);

    const modifiedLayout = editor.getLayout();
    expect(modifiedLayout.tiles[0][2]).toBe("FLOOR_3");
  });

  it("applyTool with erase resets tile to FLOOR_1", async () => {
    const { LayoutEditor } = await import("../editor.js");
    const layout = makeTestLayout();
    const editor = new LayoutEditor(layout);

    // First set it to WALL, then erase
    editor.setTool("wall");
    editor.applyTool(1, 1);

    editor.setTool("erase");
    editor.applyTool(1, 1);

    const modifiedLayout = editor.getLayout();
    expect(modifiedLayout.tiles[1][1]).toBe("FLOOR_1");
  });

  it("applyTool with desk adds furniture entry", async () => {
    const { LayoutEditor } = await import("../editor.js");
    const layout = makeTestLayout();
    const editor = new LayoutEditor(layout);

    editor.setTool("desk");
    editor.applyTool(2, 1);

    const modifiedLayout = editor.getLayout();
    expect(modifiedLayout.furniture.length).toBeGreaterThanOrEqual(1);

    const placed = modifiedLayout.furniture[modifiedLayout.furniture.length - 1];
    expect(placed.type).toBe("desk");
    expect(placed.col).toBe(2);
    expect(placed.row).toBe(1);
  });

  it("applyTool with chair adds furniture entry", async () => {
    const { LayoutEditor } = await import("../editor.js");
    const layout = makeTestLayout();
    const editor = new LayoutEditor(layout);

    editor.setTool("chair");
    editor.applyTool(3, 0);

    const modifiedLayout = editor.getLayout();
    expect(modifiedLayout.furniture.length).toBeGreaterThanOrEqual(1);

    const placed = modifiedLayout.furniture[modifiedLayout.furniture.length - 1];
    expect(placed.type).toBe("chair");
    expect(placed.col).toBe(3);
    expect(placed.row).toBe(0);
  });

  it("applyTool does nothing outside grid bounds", async () => {
    const { LayoutEditor } = await import("../editor.js");
    const layout = makeTestLayout(5, 3);
    const editor = new LayoutEditor(layout);

    editor.setTool("wall");
    // Negative col
    expect(() => editor.applyTool(-1, 0)).not.toThrow();
    // Beyond cols
    expect(() => editor.applyTool(5, 0)).not.toThrow();
    // Beyond rows
    expect(() => editor.applyTool(0, 3)).not.toThrow();

    // Layout should be unchanged (no new wall)
    const modifiedLayout = editor.getLayout();
    const wallCount = modifiedLayout.tiles.flat().filter((t) => t === "WALL").length;
    expect(wallCount).toBe(0);
  });
});

describe("LayoutEditor (Task 4.1) — LE-002: undo/redo", () => {
  it("undo restores layout to previous state after one edit", async () => {
    const { LayoutEditor } = await import("../editor.js");
    const layout = makeTestLayout();
    const editor = new LayoutEditor(layout);

    // Save original
    const originalTiles = JSON.stringify(editor.getLayout().tiles);

    // Make an edit
    editor.setTool("wall");
    editor.applyTool(0, 0);

    expect(editor.getLayout().tiles[0][0]).toBe("WALL");

    // Undo
    editor.undo();

    expect(editor.getLayout().tiles[0][0]).toBe("FLOOR_1");
    expect(JSON.stringify(editor.getLayout().tiles)).toBe(originalTiles);
  });

  it("redo restores forward state after undo", async () => {
    const { LayoutEditor } = await import("../editor.js");
    const layout = makeTestLayout();
    const editor = new LayoutEditor(layout);

    editor.setTool("wall");
    editor.applyTool(0, 0);
    const afterEdit = JSON.stringify(editor.getLayout().tiles);

    editor.undo();
    expect(editor.getLayout().tiles[0][0]).toBe("FLOOR_1");

    editor.redo();
    expect(editor.getLayout().tiles[0][0]).toBe("WALL");
    expect(JSON.stringify(editor.getLayout().tiles)).toBe(afterEdit);
  });

  it("undo stack supports ≥20 operations", async () => {
    const { LayoutEditor } = await import("../editor.js");
    // 5×5 grid so we have 25 distinct cells
    const layout = makeTestLayout(5, 5);
    const editor = new LayoutEditor(layout);

    // Make 22 edits on distinct cells (5x5 = 25, so 22 is feasible)
    let edits = 0;
    for (let c = 0; c < 5 && edits < 22; c++) {
      for (let r = 0; r < 5 && edits < 22; r++) {
        editor.setTool("wall");
        editor.applyTool(c, r);
        edits++;
      }
    }

    // Undo 20 times
    for (let i = 0; i < 20; i++) {
      editor.undo();
    }

    // After undoing 20 of 22 edits, only 2 walls should remain
    const walls = editor.getLayout().tiles.flat().filter((t) => t === "WALL").length;
    expect(walls).toBe(2);
  });
});

describe("LayoutEditor (Task 4.1) — LE-003: export/import", () => {
  it("exportLayout produces valid JSON matching current state", async () => {
    const { LayoutEditor } = await import("../editor.js");
    const layout = makeTestLayout();
    const editor = new LayoutEditor(layout);

    // Make some edits
    editor.setTool("wall");
    editor.applyTool(0, 0);
    editor.setTool("floor_5");
    editor.applyTool(1, 1);

    const json = editor.exportLayout();
    const parsed = JSON.parse(json);

    expect(parsed.cols).toBe(5);
    expect(parsed.rows).toBe(3);
    expect(parsed.tiles[0][0]).toBe("WALL");
    expect(parsed.tiles[1][1]).toBe("FLOOR_5");
    expect(parsed.tiles[0][1]).toBe("FLOOR_1");
  });

  it("importLayout loads JSON and replaces current layout", async () => {
    const { LayoutEditor } = await import("../editor.js");
    const layout = makeTestLayout();
    const editor = new LayoutEditor(layout);

    // Make an edit that should be overwritten
    editor.setTool("wall");
    editor.applyTool(0, 0);

    const importJSON = JSON.stringify({
      cols: 3,
      rows: 2,
      tiles: [
        ["WALL", "WALL", "WALL"],
        ["FLOOR_1", "FLOOR_2", "FLOOR_1"],
      ],
      furniture: [{ type: "desk", col: 1, row: 0 }],
      tileColors: { FLOOR_1: "#ccc", FLOOR_2: "#aaa" },
    });

    editor.importLayout(importJSON);

    const result = editor.getLayout();
    expect(result.cols).toBe(3);
    expect(result.rows).toBe(2);
    expect(result.tiles[0][0]).toBe("WALL");
    expect(result.tiles[1][1]).toBe("FLOOR_2");
    expect(result.furniture.length).toBe(1);
  });

  it("importLayout rejects malformed JSON gracefully", async () => {
    const { LayoutEditor } = await import("../editor.js");
    const layout = makeTestLayout();
    const editor = new LayoutEditor(layout);

    expect(() => editor.importLayout("{ broken }")).toThrow();
    // Layout should remain unchanged
    const result = editor.getLayout();
    expect(result.cols).toBe(5);
  });

  it("getLayout returns a deep copy (not reference to internal state)", async () => {
    const { LayoutEditor } = await import("../editor.js");
    const layout = makeTestLayout();
    const editor = new LayoutEditor(layout);

    const copy1 = editor.getLayout();
    const copy2 = editor.getLayout();

    // Modify copy1 — should not affect internal state or copy2
    copy1.tiles[0][0] = "VOID";
    expect(editor.getLayout().tiles[0][0]).toBe("FLOOR_1");
    expect(copy2.tiles[0][0]).toBe("FLOOR_1");
  });
});
