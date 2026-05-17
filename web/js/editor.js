// ── Layout Editor ─────────────────────────────────────────────────────────────
//
// LE-001: View/edit mode toggle, tools (wall, floor variants, desk, chair, erase)
// LE-002: Undo/redo stack (≥20 operations) with full layout snapshots
// LE-003: Export/import layout as JSON

const TILE_SIZE = 16;
const MAX_UNDO = 30; // Exceeds spec minimum of 20

/**
 * Deep clone a layout object to avoid reference sharing.
 * @param {object} layout
 * @returns {object}
 */
function cloneLayout(layout) {
  return {
    cols: layout.cols,
    rows: layout.rows,
    tiles: layout.tiles.map((row) => [...row]),
    furniture: layout.furniture.map((f) => ({ ...f })),
    tileColors: { ...layout.tileColors },
  };
}

/**
 * Interactive layout editor for the virtual office.
 * Manages tools, tile painting, furniture placement, undo/redo, and serialization.
 */
export class LayoutEditor {
  /** @type {object} — current layout state */
  #layout;
  /** @type {object[]} — undo snapshot stack */
  #undoStack = [];
  /** @type {object[]} — redo snapshot stack */
  #redoStack = [];
  /** @type {boolean} */
  #editMode = false;
  /** @type {string} */
  #currentTool = "floor_1";

  /**
   * @param {object} layout — initial OfficeLayout
   */
  constructor(layout) {
    this.#layout = cloneLayout(layout);
  }

  // ── Public properties (read access for UI) ──────────────────────────────────

  get editMode() {
    return this.#editMode;
  }

  get currentTool() {
    return this.#currentTool;
  }

  // ── Mode toggling ───────────────────────────────────────────────────────────

  /** Toggle between view mode and edit mode. */
  toggleEdit() {
    this.#editMode = !this.#editMode;
  }

  // ── Tool selection ──────────────────────────────────────────────────────────

  /**
   * Set the active tool for click-to-place.
   * @param {string} tool — "wall" | "floor_1".."floor_9" | "desk" | "chair" | "erase"
   */
  setTool(tool) {
    this.#currentTool = tool;
  }

  // ── Grid math ───────────────────────────────────────────────────────────────

  /**
   * Convert screen pixel coordinates to grid tile (col, row).
   * @param {number} pixelX — mouse X in canvas space
   * @param {number} pixelY — mouse Y in canvas space
   * @param {object} camera — { x, y, zoom }
   * @returns {{col: number, row: number}}
   */
  gridToTile(pixelX, pixelY, camera) {
    const zoom = camera.zoom || 2;
    const tilePx = TILE_SIZE * zoom;

    const worldX = pixelX + camera.x;
    const worldY = pixelY + camera.y;

    const col = Math.floor(worldX / tilePx);
    const row = Math.floor(worldY / tilePx);

    return { col, row };
  }

  // ── Tool application ────────────────────────────────────────────────────────

  /**
   * Apply the current tool at the given grid position.
   * Does nothing if coords are out of bounds.
   * @param {number} col
   * @param {number} row
   */
  applyTool(col, row) {
    const { cols, rows, tiles } = this.#layout;

    // Bounds check
    if (col < 0 || col >= cols || row < 0 || row >= rows) return;

    // Push current state to undo stack before modifying
    this.#pushUndo();

    // Clear redo stack (new action invalidates forward history)
    this.#redoStack.length = 0;

    const tool = this.#currentTool;

    // Tile-painting tools
    if (tool === "wall") {
      tiles[row][col] = "WALL";
    } else if (tool.startsWith("floor_")) {
      const n = tool.slice(6); // "floor_3" → "3"
      tiles[row][col] = `FLOOR_${n}`;
    } else if (tool === "erase") {
      tiles[row][col] = "FLOOR_1";
    } else if (tool === "desk" || tool === "chair") {
      // Furniture placement
      this.#layout.furniture.push({
        type: tool,
        col,
        row,
      });
    }
  }

  // ── Undo/Redo ───────────────────────────────────────────────────────────────

  /** Push current layout as undo snapshot (before modification). */
  #pushUndo() {
    const snapshot = cloneLayout(this.#layout);
    this.#undoStack.push(snapshot);

    // Trim oldest if over capacity
    if (this.#undoStack.length > MAX_UNDO) {
      this.#undoStack.shift();
    }
  }

  /**
   * Undo the most recent tool application.
   * Restores the layout to its state before the last edit.
   */
  undo() {
    if (this.#undoStack.length === 0) return;

    // Push current state to redo stack
    this.#redoStack.push(cloneLayout(this.#layout));

    // Pop and restore undo snapshot
    const snapshot = this.#undoStack.pop();
    this.#layout = cloneLayout(snapshot);
  }

  /**
   * Redo the most recently undone action.
   * Restores the layout to its state before the undo.
   */
  redo() {
    if (this.#redoStack.length === 0) return;

    // Push current state to undo stack
    this.#undoStack.push(cloneLayout(this.#layout));

    // Pop and restore redo snapshot
    const snapshot = this.#redoStack.pop();
    this.#layout = cloneLayout(snapshot);
  }

  // ── Serialization ───────────────────────────────────────────────────────────

  /**
   * Get a deep copy of the current layout (for rendering or saving).
   * @returns {object}
   */
  getLayout() {
    return cloneLayout(this.#layout);
  }

  /**
   * Export the layout as a JSON string.
   * @returns {string}
   */
  exportLayout() {
    return JSON.stringify(this.#layout, null, 2);
  }

  /**
   * Import a layout from a JSON string, replacing the current layout.
   * @param {string} jsonStr
   * @throws {Error} if JSON is malformed or missing required fields
   */
  importLayout(jsonStr) {
    const parsed = JSON.parse(jsonStr);

    // Validate required structure
    if (
      typeof parsed.cols !== "number" ||
      typeof parsed.rows !== "number" ||
      !Array.isArray(parsed.tiles) ||
      !Array.isArray(parsed.furniture)
    ) {
      throw new Error("Invalid layout format: missing required fields (cols, rows, tiles, furniture)");
    }

    // Validate tile dimensions
    if (parsed.tiles.length !== parsed.rows) {
      throw new Error("Invalid layout: tile rows mismatch");
    }

    // Push current state to undo before import
    this.#pushUndo();
    this.#redoStack.length = 0;

    this.#layout = {
      cols: parsed.cols,
      rows: parsed.rows,
      tiles: parsed.tiles.map((r) => [...r]),
      furniture: parsed.furniture.map((f) => ({ ...f })),
      tileColors: { ...(parsed.tileColors || {}) },
    };
  }
}
