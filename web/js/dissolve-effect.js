// ── Matrix Dissolve Effect ────────────────────────────────────────────────────
//
// Particle system that creates a "Matrix rain" dissolve animation when an
// agent despawns. Green characters fall downward from the agent's position.

const TILE_SIZE = 16;
const MATRIX_CHARS = "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃ0123456789ABCDEF";
const MAX_PARTICLE_LIFE = 2.0; // seconds
const FALL_SPEED_MIN = 20;
const FALL_SPEED_MAX = 80;
const PARTICLE_COUNT = 12;

/**
 * A single dissolve particle.
 * @typedef {object} Particle
 * @property {number} x — world X offset from origin
 * @property {number} y — world Y offset from origin
 * @property {string} char — matrix character to display
 * @property {number} life — remaining life in seconds
 * @property {number} maxLife — initial life for fade calculation
 * @property {number} speed — Y fall speed in px/s
 * @property {string} color — fill color
 */

/**
 * Matrix-style dissolve effect for agent despawn.
 * When started, spawns a burst of green characters that fall and fade out.
 */
export class DissolveEffect {
  /** @type {Particle[]} */
  #particles = [];

  /**
   * Start a dissolve burst at the given grid position.
   * @param {number} col — grid column of the dissolving agent
   * @param {number} row — grid row of the dissolving agent
   * @param {string[]} _palette — agent palette (reserved for color variation)
   */
  start(col, row, _palette) {
    // Center position in world coordinates
    const cx = col * TILE_SIZE + TILE_SIZE / 2;
    const cy = row * TILE_SIZE + TILE_SIZE / 2;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const life = 0.5 + Math.random() * 1.5; // 0.5–2.0 seconds
      this.#particles.push({
        x: cx + (Math.random() - 0.5) * TILE_SIZE * 2,
        y: cy + (Math.random() - 0.5) * TILE_SIZE,
        char: MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)],
        life,
        maxLife: life,
        speed: FALL_SPEED_MIN + Math.random() * (FALL_SPEED_MAX - FALL_SPEED_MIN),
        color: `rgb(0, ${180 + Math.floor(Math.random() * 75)}, 0)`, // Green variations
      });
    }
  }

  /**
   * Advance all particles by dt seconds. Removes expired particles.
   * @param {number} dt — delta time in seconds
   */
  update(dt) {
    this.#particles = this.#particles.filter((p) => p.life > 0);
    for (const p of this.#particles) {
      p.life -= dt;
      p.y += p.speed * dt;
    }
  }

  /**
   * Check if there are any active particles.
   * @returns {boolean}
   */
  isActive() {
    return this.#particles.length > 0;
  }

  /**
   * Render all active particles to the canvas.
   * @param {CanvasRenderingContext2D} ctx
   * @param {object} camera — { x, y, zoom }
   */
  render(ctx, camera) {
    if (this.#particles.length === 0) return;

    const zoom = camera.zoom || 2;

    for (const p of this.#particles) {
      // Fade alpha based on remaining life
      const alpha = Math.max(0, p.life / p.maxLife);
      const screenX = p.x * zoom - camera.x;
      const screenY = p.y * zoom - camera.y;

      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha;
      ctx.font = `${Math.max(8, TILE_SIZE * zoom * 0.6)}px monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(p.char, screenX, screenY);
    }

    // Reset global alpha for subsequent draws
    ctx.globalAlpha = 1;
  }
}
