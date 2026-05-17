// ── Sound Manager ──────────────────────────────────────────────────────────────
//
// Web Audio API notification sounds for the virtual office.
// SN-001: done-chime (ascending tones, ≤200ms) and alert (descending tones)
// SN-002: mute/unmute toggle persisted across sessions via localStorage

const STORAGE_KEY = "pixel-agents-muted";

/**
 * Manages Web Audio notification sounds with a mute toggle.
 * Mute state is persisted to localStorage.
 */
export class SoundManager {
  /** @type {AudioContext|null} */
  #ctx = null;
  /** @type {boolean} */
  #muted = false;

  constructor() {
    // Read mute state from localStorage
    try {
      if (typeof localStorage !== "undefined") {
        const stored = localStorage.getItem(STORAGE_KEY);
        this.#muted = stored === "true";
      }
    } catch {
      this.#muted = false;
    }

    // Initialize AudioContext lazily (browser policy: must be after user gesture)
    this.#ensureContext();
  }

  /** Get or create an AudioContext */
  #ensureContext() {
    if (this.#ctx) return;
    try {
      const Ctor = typeof AudioContext !== "undefined"
        ? AudioContext
        : typeof webkitAudioContext !== "undefined"
          ? webkitAudioContext
          : null;
      if (Ctor) {
        this.#ctx = new Ctor();
      }
    } catch {
      this.#ctx = null;
    }
  }

  /**
   * Play the "done" chime — ascending tone sequence (≤200ms)
   * Used for session_complete / work done notifications.
   */
  playDone() {
    if (this.#muted || !this.#ctx) return;

    // Resume context if suspended (browser autoplay policy)
    if (this.#ctx.state === "suspended") {
      this.#ctx.resume();
    }

    const now = this.#ctx.currentTime;
    // Two ascending tones: E5 (659.25 Hz) → G5 (783.99 Hz)
    const notes = [659.25, 783.99];
    const noteDuration = 0.08; // 80ms each, total 160ms < 200ms

    notes.forEach((freq, i) => {
      this.#playTone(freq, now + i * noteDuration, noteDuration);
    });
  }

  /**
   * Play the "alert" chime — descending tone sequence
   * Used for attention-needed notifications.
   */
  playAlert() {
    if (this.#muted || !this.#ctx) return;

    if (this.#ctx.state === "suspended") {
      this.#ctx.resume();
    }

    const now = this.#ctx.currentTime;
    // Descending tones: A5 (880 Hz) → E5 (659.25 Hz)
    const notes = [880, 659.25];
    const noteDuration = 0.08;

    notes.forEach((freq, i) => {
      this.#playTone(freq, now + i * noteDuration, noteDuration);
    });
  }

  /**
   * Internal: play a single tone at given frequency and time.
   * @param {number} freq — frequency in Hz
   * @param {number} when — start time in AudioContext time
   * @param {number} duration — note duration in seconds
   */
  #playTone(freq, when, duration) {
    const osc = this.#ctx.createOscillator();
    const gain = this.#ctx.createGain();

    osc.type = "sine";
    osc.frequency.value = freq;

    // Gentle volume to avoid startling users
    gain.gain.value = 0.15;

    osc.connect(gain);
    gain.connect(this.#ctx.destination);

    osc.start(when);
    osc.stop(when + duration);

    // Clean up after note ends
    osc.onended = () => {
      osc.disconnect?.();
      gain.disconnect?.();
    };
  }

  /**
   * Set or unset the mute flag and persist to localStorage.
   * @param {boolean} muted
   */
  setMuted(muted) {
    this.#muted = !!muted;
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(STORAGE_KEY, this.#muted ? "true" : "false");
      }
    } catch {
      // localStorage unavailable (e.g., Node)
    }
  }

  /**
   * Check whether sounds are currently muted.
   * @returns {boolean}
   */
  isMuted() {
    return this.#muted;
  }
}
