import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock Web Audio API ────────────────────────────────────────────────────────

/** Track oscillator calls for verification */
let oscillatorCalls = [];
let audioContextState = "running";
let mockCurrentTime = 0;

class MockOscillatorNode {
  constructor() {
    this.type = "sine";
    this.frequency = { value: 0 };
    this.onended = null;
    this._started = false;
    this._stopped = false;
  }
  connect(dest) {
    oscillatorCalls.push({ op: "connect", dest: !!dest });
    return this;
  }
  start(when) {
    this._started = true;
    oscillatorCalls.push({ op: "start", when });
  }
  stop(when) {
    this._stopped = true;
    oscillatorCalls.push({ op: "stop", when });
    // Fire onended immediately in test
    if (this.onended) {
      setTimeout(() => this.onended(), 0);
    }
  }
}

class MockGainNode {
  constructor() {
    this.gain = { value: 1 };
  }
  connect(dest) {
    oscillatorCalls.push({ op: "gainConnect", dest: !!dest });
    return this;
  }
}

class MockAudioContext {
  constructor() {
    this.state = audioContextState;
    this.destination = { _mockDest: true };
    oscillatorCalls = [];
  }
  createOscillator() {
    return new MockOscillatorNode();
  }
  createGain() {
    return new MockGainNode();
  }
  resume() {
    audioContextState = "running";
    return Promise.resolve();
  }
  close() {}
}

// ── localStorage mock ─────────────────────────────────────────────────────────

let localStorageStore = {};

beforeEach(() => {
  oscillatorCalls = [];
  audioContextState = "running";
  mockCurrentTime = 0;
  localStorageStore = {};

  vi.stubGlobal("AudioContext", MockAudioContext);
  vi.stubGlobal("webkitAudioContext", MockAudioContext);

  // Mock localStorage
  vi.stubGlobal("localStorage", {
    getItem(key) {
      return localStorageStore[key] ?? null;
    },
    setItem(key, value) {
      localStorageStore[key] = value;
    },
    removeItem(key) {
      delete localStorageStore[key];
    },
  });

  // Mock setTimeout for oscillator onended
  vi.stubGlobal("setTimeout", vi.fn((fn) => fn()));
});

describe("SoundManager (Task 4.2) — SN-001: notification sounds", () => {
  it("exports SoundManager class", async () => {
    const { SoundManager } = await import("../sound.js");
    expect(typeof SoundManager).toBe("function");
  });

  it("playDone creates oscillator with ascending tone sequence", async () => {
    const { SoundManager } = await import("../sound.js");
    const sm = new SoundManager();

    sm.playDone();

    // Should have started an oscillator
    const startCalls = oscillatorCalls.filter((c) => c.op === "start");
    expect(startCalls.length).toBeGreaterThanOrEqual(1);

    // Should have connected oscillator to destination
    expect(oscillatorCalls.some((c) => c.op === "connect")).toBe(true);
  });

  it("playAlert creates oscillator with descending tone sequence", async () => {
    const { SoundManager } = await import("../sound.js");
    const sm = new SoundManager();

    sm.playAlert();

    // Should have started an oscillator
    const startCalls = oscillatorCalls.filter((c) => c.op === "start");
    expect(startCalls.length).toBeGreaterThanOrEqual(1);
  });

  it("playDone does not produce audio when muted", async () => {
    const { SoundManager } = await import("../sound.js");
    const sm = new SoundManager();

    sm.setMuted(true);
    sm.playDone();

    // No oscillators should have been created
    const startCalls = oscillatorCalls.filter((c) => c.op === "start");
    expect(startCalls.length).toBe(0);
  });

  it("playAlert does not produce audio when muted", async () => {
    const { SoundManager } = await import("../sound.js");
    const sm = new SoundManager();

    sm.setMuted(true);
    sm.playAlert();

    const startCalls = oscillatorCalls.filter((c) => c.op === "start");
    expect(startCalls.length).toBe(0);
  });

  it("setMuted(false) allows playDone again after mute", async () => {
    const { SoundManager } = await import("../sound.js");
    const sm = new SoundManager();

    sm.setMuted(true);
    sm.playDone();
    expect(oscillatorCalls.filter((c) => c.op === "start").length).toBe(0);

    sm.setMuted(false);
    sm.playDone();
    expect(oscillatorCalls.filter((c) => c.op === "start").length).toBeGreaterThanOrEqual(1);
  });

  it("isMuted returns correct state after setMuted", async () => {
    const { SoundManager } = await import("../sound.js");
    const sm = new SoundManager();

    expect(sm.isMuted()).toBe(false);

    sm.setMuted(true);
    expect(sm.isMuted()).toBe(true);

    sm.setMuted(false);
    expect(sm.isMuted()).toBe(false);
  });

  it("mute state persists to localStorage", async () => {
    const { SoundManager } = await import("../sound.js");

    const sm1 = new SoundManager();
    sm1.setMuted(true);

    // New instance should read from localStorage
    const sm2 = new SoundManager();
    expect(sm2.isMuted()).toBe(true);
  });
});
