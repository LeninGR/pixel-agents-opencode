import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("GameLoop (Task 3.4)", () => {
  it("exports clampDelta function", async () => {
    const { clampDelta } = await import("../game-loop.js");
    expect(typeof clampDelta).toBe("function");
  });

  it("clampDelta caps dt at 0.1s", async () => {
    const { clampDelta } = await import("../game-loop.js");

    expect(clampDelta(0)).toBe(0);
    expect(clampDelta(0.016)).toBe(0.016); // Normal frame
    expect(clampDelta(0.05)).toBe(0.05);
    expect(clampDelta(0.1)).toBe(0.1);
    expect(clampDelta(0.15)).toBe(0.1); // Clamped
    expect(clampDelta(0.5)).toBe(0.1); // Large spike → capped
    expect(clampDelta(1.0)).toBe(0.1);
    expect(clampDelta(-0.1)).toBe(0); // Negative → 0
  });

  it("clampDelta handles NaN and Infinity", async () => {
    const { clampDelta } = await import("../game-loop.js");
    expect(clampDelta(NaN)).toBe(0);
    expect(clampDelta(Infinity)).toBe(0.1);
  });

  it("exports startGameLoop function", async () => {
    const { startGameLoop } = await import("../game-loop.js");
    expect(typeof startGameLoop).toBe("function");
  });

  it("startGameLoop calls update before render each frame", async () => {
    // Mock requestAnimationFrame
    let rafCallback = null;
    let rafId = 1;
    const rafMock = vi.fn((cb) => {
      rafCallback = cb;
      return rafId++;
    });
    const cafMock = vi.fn();
    vi.stubGlobal("requestAnimationFrame", rafMock);
    vi.stubGlobal("cancelAnimationFrame", cafMock);

    const { startGameLoop } = await import("../game-loop.js");

    const updateFn = vi.fn();
    const renderFn = vi.fn();
    // Track order of calls
    const callOrder = [];
    const trackedUpdate = (dt) => {
      callOrder.push("update");
      updateFn(dt);
    };
    const trackedRender = () => {
      callOrder.push("render");
      renderFn();
    };

    const stop = startGameLoop(trackedUpdate, trackedRender);

    // First frame: rafCallback should have been registered
    expect(rafMock).toHaveBeenCalledTimes(1);

    // Simulate a frame
    rafCallback(0);
    // After first frame, update should NOT be called (no dt yet)
    // On second frame, dt is computed
    rafCallback(16); // 16ms later

    // update + render should have been called
    expect(updateFn).toHaveBeenCalled();
    expect(renderFn).toHaveBeenCalled();

    // Verify order: update before render
    const updateIdx = callOrder.indexOf("update");
    const renderIdx = callOrder.indexOf("render");
    expect(updateIdx).toBeLessThan(renderIdx);

    // Cleanup
    stop();
    vi.unstubAllGlobals();
  });

  it("stop function cancels animation frame", async () => {
    let rafId = 1;
    const cafMock = vi.fn();
    vi.stubGlobal("requestAnimationFrame", vi.fn(() => rafId++));
    vi.stubGlobal("cancelAnimationFrame", cafMock);

    const { startGameLoop } = await import("../game-loop.js");
    const stop = startGameLoop(vi.fn(), vi.fn());

    expect(typeof stop).toBe("function");
    stop();

    expect(cafMock).toHaveBeenCalled();

    vi.unstubAllGlobals();
  });
});
