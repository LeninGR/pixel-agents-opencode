// ── Delta-time clamping ─────────────────────────────────────────────────────

const MAX_DELTA = 0.1; // seconds — max allowed dt per frame

/**
 * Clamp delta time to prevent spiral-of-death on tab blur / long frames.
 * Negative or NaN deltas are treated as 0.
 *
 * @param {number} dt — seconds since last frame
 * @returns {number} — clamped dt (0 to MAX_DELTA)
 */
export function clampDelta(dt) {
  if (typeof dt !== "number" || dt !== dt) return 0; // NaN check
  if (dt <= 0) return 0;
  if (dt > MAX_DELTA) return MAX_DELTA;
  return dt;
}

// ── Game loop ─────────────────────────────────────────────────────────────────

/**
 * Start a fixed-timestep game loop using requestAnimationFrame.
 *
 * @param {(dt: number) => void} update — called with clamped dt each frame
 * @param {(ctx: CanvasRenderingContext2D, dt: number) => void} render — called after update
 * @returns {() => void} stop — cancels the loop
 */
export function startGameLoop(update, render, getCtx) {
  let rafId = 0;
  let lastTime = 0;
  let running = true;
  let firstFrame = true;

  function frame(timestamp) {
    if (!running) return;

    // Skip first frame (need at least 2 frames for dt)
    if (firstFrame) {
      lastTime = timestamp;
      firstFrame = false;
      rafId = requestAnimationFrame(frame);
      return;
    }

    const dtMs = timestamp - lastTime;
    lastTime = timestamp;

    const dt = clampDelta(dtMs / 1000);

    // Update phase (game logic)
    if (dt > 0) {
      update(dt);
    }

    // Render phase (after update)
    if (getCtx) {
      const ctx = getCtx();
      if (ctx) {
        render(ctx, dt);
      }
    } else {
      render(null, dt);
    }

    // Schedule next frame
    rafId = requestAnimationFrame(frame);
  }

  rafId = requestAnimationFrame(frame);

  return function stop() {
    running = false;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
  };
}
