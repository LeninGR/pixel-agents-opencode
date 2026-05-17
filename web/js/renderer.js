// ── Palettes ──────────────────────────────────────────────────────────────────

export const AGENT_PALETTES = {
  sisyphus: {
    skin: "#f4c08e",
    hair: "#3d2b1f",
    shirt: "#4a90d9",
    pants: "#2c3e50",
    accent: "#f1c40f",
    eye: "#2c3e50",
  },
  oracle: {
    skin: "#e8c89e",
    hair: "#d4d4d4",
    shirt: "#9b59b6",
    pants: "#4a235a",
    accent: "#e8daef",
    eye: "#4a235a",
  },
  librarian: {
    skin: "#d4a574",
    hair: "#8b4513",
    shirt: "#8b6914",
    pants: "#5d4e37",
    accent: "#daa520",
    eye: "#3d2b1f",
  },
  explore: {
    skin: "#f4c08e",
    hair: "#c0392b",
    shirt: "#27ae60",
    pants: "#6d4c41",
    accent: "#2ecc71",
    eye: "#1a5e2a",
  },
  prometheus: {
    skin: "#f4c08e",
    hair: "#e67e22",
    shirt: "#e67e22",
    pants: "#7f4a23",
    accent: "#f39c12",
    eye: "#c0392b",
  },
  metis: {
    skin: "#e0c8a8",
    hair: "#1a1a2e",
    shirt: "#1abc9c",
    pants: "#16a085",
    accent: "#76d7c4",
    eye: "#0e6655",
  },
  momus: {
    skin: "#f4c08e",
    hair: "#2c2c54",
    shirt: "#e74c3c",
    pants: "#2c2c54",
    accent: "#ff6b6b",
    eye: "#922b21",
  },
  atlas: {
    skin: "#d4a574",
    hair: "#1c1c1c",
    shirt: "#34495e",
    pants: "#2c3e50",
    accent: "#5dade2",
    eye: "#1b2631",
  },
  hephaestus: {
    skin: "#d4a574",
    hair: "#4a2800",
    shirt: "#d35400",
    pants: "#6e3300",
    accent: "#f39c12",
    eye: "#4a2800",
  },
};

export const DEFAULT_PALETTE = {
  skin: "#f4c08e",
  hair: "#3d2b1f",
  shirt: "#7f8c8d",
  pants: "#2c3e50",
  accent: "#bdc3c7",
  eye: "#2c3e50",
};

export function getPalette(agentName) {
  return AGENT_PALETTES[agentName] || DEFAULT_PALETTE;
}

// ── Canvas-based pixel drawing (backward compat) ─────────────────────────────

function drawPixel(ctx, x, y, color, scale) {
  ctx.fillStyle = color;
  ctx.fillRect(x * scale, y * scale, scale, scale);
}

// ── Buffer-based pixel drawing (for sprite generation) ──────────────────────

/** Create a width×height pixel buffer filled with null */
export function createPixelBuffer(width, height) {
  return Array.from({ length: height }, () =>
    Array.from({ length: width }, () => null),
  );
}

/** Set a pixel in the buffer if within bounds */
function setBufPixel(buf, x, y, color) {
  if (y >= 0 && y < buf.length && x >= 0 && x < buf[0].length) {
    buf[y][x] = color;
  }
}

// ── Hair pixel positions ─────────────────────────────────────────────────────

function getHairPixels(breathOffset) {
  return [
    { x: 5, y: 1 + breathOffset },
    { x: 6, y: 1 + breathOffset },
    { x: 7, y: 1 + breathOffset },
    { x: 8, y: 1 + breathOffset },
    { x: 9, y: 1 + breathOffset },
    { x: 10, y: 1 + breathOffset },
    { x: 4, y: 2 + breathOffset },
    { x: 11, y: 2 + breathOffset },
    { x: 4, y: 3 + breathOffset },
    { x: 11, y: 3 + breathOffset },
  ];
}

// ── Character drawing to buffer ──────────────────────────────────────────────

function drawBaseCharacterToBuffer(buf, palette, frame, action, direction) {
  const isIdle = !action || action === "idle";
  // Walk bob: frames 0,2 = neutral, frames 1,3 = bounce up
  const bobOffset = isIdle ? 0 : (frame % 2 === 0 ? 0 : -1);
  const breathOffset = bobOffset;

  // Direction offset: for left/right, shift x slightly
  let xShift = 0;
  if (direction === 1) xShift = -1; // LEFT: shift left
  if (direction === 2) xShift = 1; // RIGHT: shift right
  // direction 3 (UP) is back view — handled differently below

  const isUp = direction === 3;

  if (!isUp) {
    // ── FRONT VIEW (directions 0,1,2) ─────────────────────────────────────────

    // Face / skin
    const skinRows = [
      { y: 2 + breathOffset, spans: [[5, 10]] },
      { y: 3 + breathOffset, spans: [[4, 11]] },
      { y: 4 + breathOffset, spans: [[4, 11]] },
      { y: 5 + breathOffset, spans: [[4, 11]] },
      { y: 6 + breathOffset, spans: [[5, 10]] },
    ];

    for (const row of skinRows) {
      for (const [from, to] of row.spans) {
        for (let x = from; x <= to; x++) {
          setBufPixel(buf, x + xShift, row.y, palette.skin);
        }
      }
    }

    // Hair
    const hairPixels = getHairPixels(breathOffset);
    for (const hp of hairPixels) {
      setBufPixel(buf, hp.x + xShift, hp.y, palette.hair);
    }

    // Eyes (direction-dependent)
    // DOWN (0): both eyes visible
    // LEFT (1): left eye slightly offset
    // RIGHT (2): right eye slightly offset
    if (direction === 0 || direction === 1) {
      setBufPixel(buf, 6 + xShift, 4 + breathOffset, palette.eye);
    }
    if (direction === 0 || direction === 2) {
      setBufPixel(buf, 9 + xShift, 4 + breathOffset, palette.eye);
    }

    // Blink (only every 30 frames is a blink, sprite gen uses small frames)
    const blinkFrame = frame % 30 === 0;
    if (blinkFrame) {
      setBufPixel(buf, 6 + xShift, 4 + breathOffset, palette.skin);
      setBufPixel(buf, 9 + xShift, 4 + breathOffset, palette.skin);
    }

    // Mouth
    const mouthColor = "#c4956a";
    if (isIdle) {
      const yawnCycle = Math.floor(frame / 6) % 5;
      const yawnWidths = [1, 2, 3, 2, 1];
      const w = yawnWidths[yawnCycle];
      const mouthX = 8 - Math.floor(w / 2);
      for (let i = 0; i < w; i++) {
        setBufPixel(buf, mouthX + i + xShift, 6 + breathOffset, mouthColor);
      }
      if (w >= 3) {
        setBufPixel(buf, mouthX + xShift, 5 + breathOffset, mouthColor);
        setBufPixel(buf, mouthX + w - 1 + xShift, 5 + breathOffset, mouthColor);
      }
    } else {
      setBufPixel(buf, 8 + xShift, 6 + breathOffset, mouthColor);
    }

    // Arms (skin)
    setBufPixel(buf, 3 + xShift, 9 + breathOffset, palette.skin);
    setBufPixel(buf, 12 + xShift, 9 + breathOffset, palette.skin);
    setBufPixel(buf, 3 + xShift, 10 + breathOffset, palette.skin);
    setBufPixel(buf, 12 + xShift, 10 + breathOffset, palette.skin);
  } else {
    // ── BACK VIEW (direction 3: UP) ────────────────────────────────────────────
    // Hair covers most of the back, with just the body visible

    // Hair — full back of head
    const backHairRows = [
      { y: 1 + breathOffset, from: 5, to: 10 },
      { y: 2 + breathOffset, from: 4, to: 11 },
      { y: 3 + breathOffset, from: 4, to: 11 },
      { y: 4 + breathOffset, from: 4, to: 11 },
      { y: 5 + breathOffset, from: 5, to: 10 },
    ];
    for (const row of backHairRows) {
      for (let x = row.from; x <= row.to; x++) {
        setBufPixel(buf, x, row.y, palette.hair);
      }
    }

    // Small skin visible at neck sides
    setBufPixel(buf, 4, 6 + breathOffset, palette.skin);
    setBufPixel(buf, 11, 6 + breathOffset, palette.skin);
  }

  // ── Body (shared between front and back view) ─────────────────────────────

  const bodyY = 7 + breathOffset;

  // Shirt
  for (let x = 4; x <= 11; x++) {
    setBufPixel(buf, x + xShift, bodyY, palette.shirt);
    setBufPixel(buf, x + xShift, bodyY + 1, palette.shirt);
    setBufPixel(buf, x + xShift, bodyY + 2, palette.shirt);
  }

  // Pants
  for (let x = 4; x <= 11; x++) {
    setBufPixel(buf, x + xShift, bodyY + 3, palette.pants);
    setBufPixel(buf, x + xShift, bodyY + 4, palette.pants);
  }

  // Feet
  const footSpread = isIdle
    ? [5, 6, 9, 10] // idle: feet together
    : frame % 2 === 0
      ? [5, 6, 9, 10] // walk frame 0,2
      : [4, 6, 9, 11]; // walk frame 1,3: stride

  for (const fx of footSpread) {
    setBufPixel(buf, fx + xShift, bodyY + 5, palette.pants);
  }

  // Arms
  if (!isIdle) {
    // Walk arms swing
    const armSwing = frame % 2 === 0 ? 1 : -1;
    setBufPixel(buf, 3 + xShift, bodyY + 1 + armSwing, palette.skin);
    setBufPixel(buf, 12 + xShift, bodyY + 1 - armSwing, palette.skin);
    setBufPixel(buf, 3 + xShift, bodyY + 2 + armSwing, palette.skin);
    setBufPixel(buf, 12 + xShift, bodyY + 2 - armSwing, palette.skin);
  } else {
    setBufPixel(buf, 3 + xShift, bodyY + 1, palette.skin);
    setBufPixel(buf, 12 + xShift, bodyY + 1, palette.skin);
    setBufPixel(buf, 3 + xShift, bodyY + 2, palette.skin);
    setBufPixel(buf, 12 + xShift, bodyY + 2, palette.skin);
  }
}

// ── Accessory drawing to buffer ─────────────────────────────────────────────

function drawAccessoryToBuffer(buf, accessoryType, palette, frame, breathOffset, direction) {
  const bo = breathOffset || 0;
  const xShift = direction === 1 ? -1 : direction === 2 ? 1 : 0;
  const isUp = direction === 3;

  // Skip face-level accessories for back view
  if (isUp) {
    // Only body-level accessories visible from behind
    switch (accessoryType) {
      case "boulder":
        setBufPixel(buf, 1 + xShift, 10 + bo, "#7f8c8d");
        setBufPixel(buf, 2 + xShift, 10 + bo, "#6c757d");
        setBufPixel(buf, 1 + xShift, 11 + bo, "#6c757d");
        setBufPixel(buf, 2 + xShift, 9 + bo, "#7f8c8d");
        break;
      case "forge_apron":
        for (let y = 7; y <= 9; y++) {
          setBufPixel(buf, 5 + xShift, y + bo, "#8B4513");
          setBufPixel(buf, 10 + xShift, y + bo, "#8B4513");
        }
        setBufPixel(buf, 7 + xShift, 6 + bo, "#8B4513");
        setBufPixel(buf, 8 + xShift, 6 + bo, "#8B4513");
        break;
      case "shoulder_globe":
        setBufPixel(buf, 1 + xShift, 9 + bo, "#7f8c8d");
        break;
    }
    return;
  }

  // ── Front/side view accessories ─────────────────────────────────────────

  switch (accessoryType) {
    case "baton": {
      const swing = Math.sin((frame * Math.PI) / 6) * 2;
      const batonX = 13 + Math.round(swing);
      setBufPixel(buf, batonX + xShift, 6 + bo, palette.accent);
      setBufPixel(buf, batonX + xShift, 7 + bo, palette.accent);
      setBufPixel(buf, batonX + 1 + xShift, 5 + bo, palette.accent);
      setBufPixel(buf, batonX + 1 + xShift, 4 + bo, "#ffffff");
      break;
    }

    case "laptop": {
      for (let x = 5; x <= 10; x++) {
        setBufPixel(buf, x + xShift, 10 + bo, "#333333");
        setBufPixel(buf, x + xShift, 11 + bo, "#555555");
      }
      for (let x = 6; x <= 9; x++) {
        setBufPixel(buf, x + xShift, 10 + bo, "#4a90d9");
      }
      break;
    }

    case "crystal_ball": {
      const glow = frame % 4 < 2 ? "#c39bd3" : "#d7bde2";
      setBufPixel(buf, 13 + xShift, 8 + bo, glow);
      setBufPixel(buf, 14 + xShift, 8 + bo, glow);
      setBufPixel(buf, 13 + xShift, 9 + bo, glow);
      setBufPixel(buf, 14 + xShift, 9 + bo, glow);
      setBufPixel(buf, 13 + xShift, 10 + bo, "#7d6b7d");
      setBufPixel(buf, 14 + xShift, 10 + bo, "#7d6b7d");
      break;
    }

    case "glasses": {
      setBufPixel(buf, 5 + xShift, 4 + bo, "#c0c0c0");
      setBufPixel(buf, 6 + xShift, 3 + bo, "#c0c0c0");
      setBufPixel(buf, 7 + xShift, 4 + bo, "#c0c0c0");
      setBufPixel(buf, 8 + xShift, 4 + bo, "#c0c0c0");
      setBufPixel(buf, 9 + xShift, 3 + bo, "#c0c0c0");
      setBufPixel(buf, 10 + xShift, 4 + bo, "#c0c0c0");
      break;
    }

    case "book": {
      const pageFlip = frame % 6 < 3;
      setBufPixel(buf, 13 + xShift, 7 + bo, "#8b4513");
      setBufPixel(buf, 14 + xShift, 7 + bo, "#8b4513");
      setBufPixel(buf, 13 + xShift, 8 + bo, pageFlip ? "#f5f5dc" : "#fffacd");
      setBufPixel(buf, 14 + xShift, 8 + bo, pageFlip ? "#fffacd" : "#f5f5dc");
      setBufPixel(buf, 13 + xShift, 9 + bo, "#8b4513");
      setBufPixel(buf, 14 + xShift, 9 + bo, "#8b4513");
      break;
    }

    case "magnifying_glass": {
      const mgX = 13 + (frame % 4 < 2 ? 0 : 1);
      setBufPixel(buf, mgX + xShift, 7 + bo, "#c0c0c0");
      setBufPixel(buf, mgX + 1 + xShift, 7 + bo, "#c0c0c0");
      setBufPixel(buf, mgX + xShift, 8 + bo, "#c0c0c0");
      setBufPixel(buf, mgX + 1 + xShift, 8 + bo, "#87ceeb");
      setBufPixel(buf, mgX - 1 + xShift, 9 + bo, "#c0c0c0");
      break;
    }

    case "binoculars": {
      setBufPixel(buf, 5 + xShift, 3 + bo, "#333");
      setBufPixel(buf, 6 + xShift, 3 + bo, "#333");
      setBufPixel(buf, 9 + xShift, 3 + bo, "#333");
      setBufPixel(buf, 10 + xShift, 3 + bo, "#333");
      setBufPixel(buf, 7 + xShift, 4 + bo, "#555");
      setBufPixel(buf, 8 + xShift, 4 + bo, "#555");
      break;
    }

    case "scroll": {
      setBufPixel(buf, 13 + xShift, 7 + bo, "#daa520");
      setBufPixel(buf, 14 + xShift, 7 + bo, "#daa520");
      setBufPixel(buf, 13 + xShift, 8 + bo, "#f5f5dc");
      setBufPixel(buf, 14 + xShift, 8 + bo, "#f5f5dc");
      setBufPixel(buf, 13 + xShift, 9 + bo, "#f5f5dc");
      setBufPixel(buf, 14 + xShift, 9 + bo, "#f5f5dc");
      setBufPixel(buf, 13 + xShift, 10 + bo, "#daa520");
      setBufPixel(buf, 14 + xShift, 10 + bo, "#daa520");
      break;
    }

    case "torch": {
      const flicker = frame % 3;
      const fireColors = ["#ff6b35", "#ff8c00", "#ffd700"];
      setBufPixel(buf, 1 + xShift, 6 + bo, "#8b4513");
      setBufPixel(buf, 1 + xShift, 7 + bo, "#8b4513");
      setBufPixel(buf, 1 + xShift, 5 + bo, fireColors[flicker]);
      setBufPixel(buf, 0 + xShift, 4 + bo, fireColors[(flicker + 1) % 3]);
      setBufPixel(buf, 2 + xShift, 4 + bo, fireColors[(flicker + 2) % 3]);
      setBufPixel(buf, 1 + xShift, 3 + bo, fireColors[(flicker + 1) % 3]);
      break;
    }

    case "notepad": {
      setBufPixel(buf, 13 + xShift, 7 + bo, "#f5f5dc");
      setBufPixel(buf, 14 + xShift, 7 + bo, "#f5f5dc");
      setBufPixel(buf, 13 + xShift, 8 + bo, "#f5f5dc");
      setBufPixel(buf, 14 + xShift, 8 + bo, "#f5f5dc");
      setBufPixel(buf, 13 + xShift, 9 + bo, "#f5f5dc");
      setBufPixel(buf, 14 + xShift, 9 + bo, "#f5f5dc");
      setBufPixel(buf, 13 + xShift, 7 + bo, "#333");
      break;
    }

    case "question_mark": {
      const qVis = frame % 8 < 5;
      if (qVis) {
        setBufPixel(buf, 3 + xShift, 0 + bo, palette.accent);
        setBufPixel(buf, 4 + xShift, 0 + bo, palette.accent);
        setBufPixel(buf, 4 + xShift, 1 + bo, palette.accent);
        setBufPixel(buf, 3 + xShift, 2 + bo, palette.accent);
      }
      break;
    }

    case "red_pen": {
      setBufPixel(buf, 13 + xShift, 8 + bo, "#e74c3c");
      setBufPixel(buf, 14 + xShift, 9 + bo, "#e74c3c");
      setBufPixel(buf, 15 + xShift, 10 + bo, "#c0392b");
      break;
    }

    case "checklist": {
      setBufPixel(buf, 1 + xShift, 6 + bo, "#f5f5dc");
      setBufPixel(buf, 2 + xShift, 6 + bo, "#f5f5dc");
      setBufPixel(buf, 1 + xShift, 7 + bo, "#f5f5dc");
      setBufPixel(buf, 2 + xShift, 7 + bo, "#f5f5dc");
      setBufPixel(buf, 1 + xShift, 8 + bo, "#f5f5dc");
      setBufPixel(buf, 2 + xShift, 8 + bo, "#f5f5dc");
      setBufPixel(buf, 1 + xShift, 6 + bo, "#27ae60");
      setBufPixel(buf, 1 + xShift, 7 + bo, "#27ae60");
      break;
    }

    case "mask": {
      setBufPixel(buf, 4 + xShift, 4 + bo, "#c0392b");
      setBufPixel(buf, 11 + xShift, 4 + bo, "#c0392b");
      break;
    }

    case "globe": {
      setBufPixel(buf, 1 + xShift, 7 + bo, "#3498db");
      setBufPixel(buf, 2 + xShift, 7 + bo, "#27ae60");
      setBufPixel(buf, 1 + xShift, 8 + bo, "#27ae60");
      setBufPixel(buf, 2 + xShift, 8 + bo, "#3498db");
      setBufPixel(buf, 1 + xShift, 9 + bo, "#7f8c8d");
      setBufPixel(buf, 2 + xShift, 9 + bo, "#7f8c8d");
      break;
    }

    case "hammer": {
      const hammerSwing = frame % 4;
      const hY = hammerSwing < 2 ? 5 : 6;
      setBufPixel(buf, 13 + xShift, hY + bo, "#7f8c8d");
      setBufPixel(buf, 13 + xShift, hY + 1 + bo, "#8b4513");
      setBufPixel(buf, 13 + xShift, hY + 2 + bo, "#8b4513");
      setBufPixel(buf, 12 + xShift, hY + bo, "#7f8c8d");
      setBufPixel(buf, 14 + xShift, hY + bo, "#7f8c8d");
      break;
    }

    case "sparks": {
      const sparkVis = frame % 3 === 0;
      if (sparkVis) {
        const sparkColors = ["#f39c12", "#f1c40f", "#e67e22"];
        setBufPixel(buf, 14 + xShift, 5 + bo, sparkColors[frame % 3]);
        setBufPixel(buf, 12 + xShift, 4 + bo, sparkColors[(frame + 1) % 3]);
        setBufPixel(buf, 15 + xShift, 6 + bo, sparkColors[(frame + 2) % 3]);
      }
      break;
    }

    case "lightbulb": {
      const on = frame % 6 < 4;
      if (on) {
        setBufPixel(buf, 12 + xShift, 1 + bo, "#f1c40f");
        setBufPixel(buf, 13 + xShift, 1 + bo, "#f1c40f");
        setBufPixel(buf, 12 + xShift, 2 + bo, "#f1c40f");
        setBufPixel(buf, 13 + xShift, 2 + bo, "#f1c40f");
        setBufPixel(buf, 12 + xShift, 3 + bo, "#bdc3c7");
      }
      break;
    }

    case "thought_bubble": {
      const tbVis = frame % 8 < 6;
      if (tbVis) {
        setBufPixel(buf, 13 + xShift, 1 + bo, "#ffffff");
        setBufPixel(buf, 14 + xShift, 1 + bo, "#ffffff");
        setBufPixel(buf, 15 + xShift, 1 + bo, "#ffffff");
        setBufPixel(buf, 13 + xShift, 2 + bo, "#ffffff");
        setBufPixel(buf, 14 + xShift, 2 + bo, "#ffffff");
        setBufPixel(buf, 15 + xShift, 2 + bo, "#ffffff");
        setBufPixel(buf, 12 + xShift, 3 + bo, "#ffffff");
        setBufPixel(buf, 11 + xShift, 4 + bo, "#cccccc");
      }
      break;
    }

    case "boulder": {
      setBufPixel(buf, 1 + xShift, 10 + bo, "#7f8c8d");
      setBufPixel(buf, 2 + xShift, 10 + bo, "#6c757d");
      setBufPixel(buf, 1 + xShift, 11 + bo, "#6c757d");
      setBufPixel(buf, 2 + xShift, 9 + bo, "#7f8c8d");
      break;
    }

    case "laurel_wreath": {
      setBufPixel(buf, 4 + xShift, 1 + bo, "#27ae60");
      setBufPixel(buf, 5 + xShift, 0 + bo, "#daa520");
      setBufPixel(buf, 10 + xShift, 0 + bo, "#daa520");
      setBufPixel(buf, 11 + xShift, 1 + bo, "#27ae60");
      break;
    }

    case "fire_aura": {
      const fireFrame = frame % 4;
      const auraColors = ["#b34a25", "#b36200", "#b39700"];
      setBufPixel(buf, 3 + xShift, 4 + bo, auraColors[fireFrame % 3]);
      setBufPixel(buf, 3 + xShift, 5 + bo, auraColors[(fireFrame + 1) % 3]);
      break;
    }

    case "explorer_hat": {
      for (let x = 4; x <= 11; x++) {
        setBufPixel(buf, x + xShift, 0 + bo, "#6d4c41");
      }
      for (let x = 6; x <= 9; x++) {
        setBufPixel(buf, x + xShift, 1 + bo, "#6d4c41");
      }
      break;
    }

    case "owl": {
      setBufPixel(buf, 0 + xShift, 3 + bo, "#8B7355");
      setBufPixel(buf, 2 + xShift, 3 + bo, "#8B7355");
      setBufPixel(buf, 0 + xShift, 4 + bo, "#f1c40f");
      setBufPixel(buf, 2 + xShift, 4 + bo, "#f1c40f");
      setBufPixel(buf, 1 + xShift, 4 + bo, "#8B7355");
      setBufPixel(buf, 0 + xShift, 5 + bo, "#8B7355");
      setBufPixel(buf, 1 + xShift, 5 + bo, "#A0896C");
      setBufPixel(buf, 2 + xShift, 5 + bo, "#8B7355");
      setBufPixel(buf, 1 + xShift, 6 + bo, "#8B7355");
      break;
    }

    case "forge_apron": {
      for (let y = 7; y <= 9; y++) {
        setBufPixel(buf, 5 + xShift, y + bo, "#8B4513");
        setBufPixel(buf, 10 + xShift, y + bo, "#8B4513");
      }
      setBufPixel(buf, 7 + xShift, 6 + bo, "#8B4513");
      setBufPixel(buf, 8 + xShift, 6 + bo, "#8B4513");
      break;
    }

    case "shoulder_globe": {
      const globeColors = ["#3498db", "#27ae60"];
      for (let x = 0; x <= 2; x++) {
        for (let y = 6; y <= 8; y++) {
          const colorIndex = (x + y + frame) % 2;
          setBufPixel(buf, x + xShift, y + bo, globeColors[colorIndex]);
        }
      }
      setBufPixel(buf, 1 + xShift, 9 + bo, "#7f8c8d");
      break;
    }

    case "comedy_mask": {
      setBufPixel(buf, 0 + xShift, 2 + bo, "#f1c40f");
      setBufPixel(buf, 1 + xShift, 2 + bo, "#f1c40f");
      setBufPixel(buf, 2 + xShift, 2 + bo, "#f1c40f");
      setBufPixel(buf, 0 + xShift, 3 + bo, "#2c2c54");
      setBufPixel(buf, 1 + xShift, 3 + bo, "#f1c40f");
      setBufPixel(buf, 2 + xShift, 3 + bo, "#2c2c54");
      setBufPixel(buf, 0 + xShift, 4 + bo, "#f1c40f");
      setBufPixel(buf, 1 + xShift, 4 + bo, "#c0392b");
      setBufPixel(buf, 2 + xShift, 4 + bo, "#f1c40f");
      break;
    }
  }
}

// ── Palette normalization ────────────────────────────────────────────────────

/**
 * Convert a palette array [skin, hair, shirt, pants, accent, eye] or object
 * {skin, hair, ...} into a named-object palette for internal use.
 */
function toPaletteObj(palette) {
  if (palette && !Array.isArray(palette) && typeof palette.skin === "string") {
    return palette;
  }
  const arr = Array.isArray(palette) ? palette : [];
  return {
    skin: arr[0] || "#f4c08e",
    hair: arr[1] || "#3d2b1f",
    shirt: arr[2] || "#7f8c8d",
    pants: arr[3] || "#2c3e50",
    accent: arr[4] || "#bdc3c7",
    eye: arr[5] || "#2c3e50",
  };
}

// ── Sprite generation (NEW — the core of Task 3.6) ──────────────────────────

/**
 * Generate multi-directional sprite data for a character.
 *
 * Returns:
 *   walk: 4 directions × 4 frames each (16 × 16 pixel grids)
 *   idle: 4 directions × 2 frames each
 *   work: 4 directions × 2 frames each
 *
 * Directions: 0=DOWN, 1=LEFT, 2=RIGHT, 3=UP
 * Palette: [skin, hair, shirt, pants, accent, eye] or {skin, hair, ...} object
 */
export function generateCharacterSprites(palette) {
  const p = toPaletteObj(palette);
  const DIRS = 4;
  const WALK_FRAMES = 4;
  const IDLE_FRAMES = 2;

  const walk = [];
  const idle = [];
  const work = [];

  for (let dir = 0; dir < DIRS; dir++) {
    const walkDir = [];
    const idleDir = [];
    const workDir = [];

    for (let f = 0; f < WALK_FRAMES; f++) {
      const buf = createPixelBuffer(16, 16);
      drawBaseCharacterToBuffer(buf, p, f, "walk", dir);
      walkDir.push({ pixels: buf });
    }

    for (let f = 0; f < IDLE_FRAMES; f++) {
      const buf = createPixelBuffer(16, 16);
      drawBaseCharacterToBuffer(buf, p, f, "idle", dir);
      idleDir.push({ pixels: buf });
    }

    for (let f = 0; f < IDLE_FRAMES; f++) {
      const buf = createPixelBuffer(16, 16);
      drawBaseCharacterToBuffer(buf, p, f, "work", dir);
      workDir.push({ pixels: buf });
    }

    walk.push(walkDir);
    idle.push(idleDir);
    work.push(workDir);
  }

  return { walk, idle, work };
}

// ── Canvas-based renderer (backward compat: info.html, legacy browser) ───────

function drawBaseCharacter(ctx, palette, scale, frame, action) {
  const isIdle = !action || action === "idle";
  const breathOffset = isIdle ? 0 : (frame % 2 === 0 ? 0 : -1);

  const skinRows = [
    { y: 2 + breathOffset, pixels: [[5, 6, 7, 8, 9, 10]] },
    { y: 3 + breathOffset, pixels: [[4, 5, 6, 7, 8, 9, 10, 11]] },
    { y: 4 + breathOffset, pixels: [[4, 5, 6, 7, 8, 9, 10, 11]] },
    { y: 5 + breathOffset, pixels: [[4, 5, 6, 7, 8, 9, 10, 11]] },
    { y: 6 + breathOffset, pixels: [[5, 6, 7, 8, 9, 10]] },
  ];

  for (const row of skinRows) {
    for (const span of row.pixels) {
      for (const x of span) {
        drawPixel(ctx, x, row.y, palette.skin, scale);
      }
    }
  }

  const hairPixels = getHairPixels(breathOffset);
  for (const hp of hairPixels) {
    drawPixel(ctx, hp.x, hp.y, palette.hair, scale);
  }

  drawPixel(ctx, 6, 4 + breathOffset, palette.eye, scale);
  drawPixel(ctx, 9, 4 + breathOffset, palette.eye, scale);

  const blinkFrame = frame % 30 === 0;
  if (blinkFrame) {
    drawPixel(ctx, 6, 4 + breathOffset, palette.skin, scale);
    drawPixel(ctx, 9, 4 + breathOffset, palette.skin, scale);
  }

  const mouthColor = "#c4956a";
  if (isIdle) {
    const yawnCycle = Math.floor(frame / 6) % 5;
    const yawnWidths = [1, 2, 3, 2, 1];
    const w = yawnWidths[yawnCycle];
    const mouthX = 8 - Math.floor(w / 2);
    for (let i = 0; i < w; i++) {
      drawPixel(ctx, mouthX + i, 6 + breathOffset, mouthColor, scale);
    }
    if (w >= 3) {
      drawPixel(ctx, mouthX, 5 + breathOffset, mouthColor, scale);
      drawPixel(ctx, mouthX + w - 1, 5 + breathOffset, mouthColor, scale);
    }
  } else {
    drawPixel(ctx, 8, 6 + breathOffset, mouthColor, scale);
  }

  const bodyY = 7 + breathOffset;
  for (let x = 4; x <= 11; x++) {
    drawPixel(ctx, x, bodyY, palette.shirt, scale);
    drawPixel(ctx, x, bodyY + 1, palette.shirt, scale);
    drawPixel(ctx, x, bodyY + 2, palette.shirt, scale);
  }

  for (let x = 4; x <= 11; x++) {
    drawPixel(ctx, x, bodyY + 3, palette.pants, scale);
    drawPixel(ctx, x, bodyY + 4, palette.pants, scale);
  }

  drawPixel(ctx, 5, bodyY + 5, palette.pants, scale);
  drawPixel(ctx, 6, bodyY + 5, palette.pants, scale);
  drawPixel(ctx, 9, bodyY + 5, palette.pants, scale);
  drawPixel(ctx, 10, bodyY + 5, palette.pants, scale);

  drawPixel(ctx, 3, bodyY + 1, palette.skin, scale);
  drawPixel(ctx, 12, bodyY + 1, palette.skin, scale);
  drawPixel(ctx, 3, bodyY + 2, palette.skin, scale);
  drawPixel(ctx, 12, bodyY + 2, palette.skin, scale);
}

function drawAccessory(ctx, accessoryType, palette, scale, frame, breathOffset) {
  const bo = breathOffset || 0;

  switch (accessoryType) {
    case "baton": {
      const swing = Math.sin((frame * Math.PI) / 6) * 2;
      const batonX = 13 + Math.round(swing);
      drawPixel(ctx, batonX, 6 + bo, palette.accent, scale);
      drawPixel(ctx, batonX, 7 + bo, palette.accent, scale);
      drawPixel(ctx, batonX + 1, 5 + bo, palette.accent, scale);
      drawPixel(ctx, batonX + 1, 4 + bo, "#ffffff", scale);
      break;
    }

    case "laptop": {
      for (let x = 5; x <= 10; x++) {
        drawPixel(ctx, x, 10 + bo, "#333333", scale);
        drawPixel(ctx, x, 11 + bo, "#555555", scale);
      }
      for (let x = 6; x <= 9; x++) {
        drawPixel(ctx, x, 10 + bo, "#4a90d9", scale);
      }
      break;
    }

    case "crystal_ball": {
      const glow = frame % 4 < 2 ? "#c39bd3" : "#d7bde2";
      drawPixel(ctx, 13, 8 + bo, glow, scale);
      drawPixel(ctx, 14, 8 + bo, glow, scale);
      drawPixel(ctx, 13, 9 + bo, glow, scale);
      drawPixel(ctx, 14, 9 + bo, glow, scale);
      drawPixel(ctx, 13, 10 + bo, "#7d6b7d", scale);
      drawPixel(ctx, 14, 10 + bo, "#7d6b7d", scale);
      break;
    }

    case "glasses": {
      drawPixel(ctx, 5, 4 + bo, "#c0c0c0", scale);
      drawPixel(ctx, 6, 3 + bo, "#c0c0c0", scale);
      drawPixel(ctx, 7, 4 + bo, "#c0c0c0", scale);
      drawPixel(ctx, 8, 4 + bo, "#c0c0c0", scale);
      drawPixel(ctx, 9, 3 + bo, "#c0c0c0", scale);
      drawPixel(ctx, 10, 4 + bo, "#c0c0c0", scale);
      break;
    }

    case "book": {
      const pageFlip = frame % 6 < 3;
      drawPixel(ctx, 13, 7 + bo, "#8b4513", scale);
      drawPixel(ctx, 14, 7 + bo, "#8b4513", scale);
      drawPixel(ctx, 13, 8 + bo, pageFlip ? "#f5f5dc" : "#fffacd", scale);
      drawPixel(ctx, 14, 8 + bo, pageFlip ? "#fffacd" : "#f5f5dc", scale);
      drawPixel(ctx, 13, 9 + bo, "#8b4513", scale);
      drawPixel(ctx, 14, 9 + bo, "#8b4513", scale);
      break;
    }

    case "magnifying_glass": {
      const mgX = 13 + (frame % 4 < 2 ? 0 : 1);
      drawPixel(ctx, mgX, 7 + bo, "#c0c0c0", scale);
      drawPixel(ctx, mgX + 1, 7 + bo, "#c0c0c0", scale);
      drawPixel(ctx, mgX, 8 + bo, "#c0c0c0", scale);
      drawPixel(ctx, mgX + 1, 8 + bo, "#87ceeb", scale);
      drawPixel(ctx, mgX - 1, 9 + bo, "#c0c0c0", scale);
      break;
    }

    case "binoculars": {
      drawPixel(ctx, 5, 3 + bo, "#333", scale);
      drawPixel(ctx, 6, 3 + bo, "#333", scale);
      drawPixel(ctx, 9, 3 + bo, "#333", scale);
      drawPixel(ctx, 10, 3 + bo, "#333", scale);
      drawPixel(ctx, 7, 4 + bo, "#555", scale);
      drawPixel(ctx, 8, 4 + bo, "#555", scale);
      break;
    }

    case "scroll": {
      drawPixel(ctx, 13, 7 + bo, "#daa520", scale);
      drawPixel(ctx, 14, 7 + bo, "#daa520", scale);
      drawPixel(ctx, 13, 8 + bo, "#f5f5dc", scale);
      drawPixel(ctx, 14, 8 + bo, "#f5f5dc", scale);
      drawPixel(ctx, 13, 9 + bo, "#f5f5dc", scale);
      drawPixel(ctx, 14, 9 + bo, "#f5f5dc", scale);
      drawPixel(ctx, 13, 10 + bo, "#daa520", scale);
      drawPixel(ctx, 14, 10 + bo, "#daa520", scale);
      break;
    }

    case "torch": {
      const flicker = frame % 3;
      const fireColors = ["#ff6b35", "#ff8c00", "#ffd700"];
      drawPixel(ctx, 1, 6 + bo, "#8b4513", scale);
      drawPixel(ctx, 1, 7 + bo, "#8b4513", scale);
      drawPixel(ctx, 1, 5 + bo, fireColors[flicker], scale);
      drawPixel(ctx, 0, 4 + bo, fireColors[(flicker + 1) % 3], scale);
      drawPixel(ctx, 2, 4 + bo, fireColors[(flicker + 2) % 3], scale);
      drawPixel(ctx, 1, 3 + bo, fireColors[(flicker + 1) % 3], scale);
      break;
    }

    case "notepad": {
      drawPixel(ctx, 13, 7 + bo, "#f5f5dc", scale);
      drawPixel(ctx, 14, 7 + bo, "#f5f5dc", scale);
      drawPixel(ctx, 13, 8 + bo, "#f5f5dc", scale);
      drawPixel(ctx, 14, 8 + bo, "#f5f5dc", scale);
      drawPixel(ctx, 13, 9 + bo, "#f5f5dc", scale);
      drawPixel(ctx, 14, 9 + bo, "#f5f5dc", scale);
      drawPixel(ctx, 13, 7 + bo, "#333", scale);
      break;
    }

    case "question_mark": {
      const qVis = frame % 8 < 5;
      if (qVis) {
        drawPixel(ctx, 3, 0 + bo, palette.accent, scale);
        drawPixel(ctx, 4, 0 + bo, palette.accent, scale);
        drawPixel(ctx, 4, 1 + bo, palette.accent, scale);
        drawPixel(ctx, 3, 2 + bo, palette.accent, scale);
      }
      break;
    }

    case "red_pen": {
      drawPixel(ctx, 13, 8 + bo, "#e74c3c", scale);
      drawPixel(ctx, 14, 9 + bo, "#e74c3c", scale);
      drawPixel(ctx, 15, 10 + bo, "#c0392b", scale);
      break;
    }

    case "checklist": {
      drawPixel(ctx, 1, 6 + bo, "#f5f5dc", scale);
      drawPixel(ctx, 2, 6 + bo, "#f5f5dc", scale);
      drawPixel(ctx, 1, 7 + bo, "#f5f5dc", scale);
      drawPixel(ctx, 2, 7 + bo, "#f5f5dc", scale);
      drawPixel(ctx, 1, 8 + bo, "#f5f5dc", scale);
      drawPixel(ctx, 2, 8 + bo, "#f5f5dc", scale);
      drawPixel(ctx, 1, 6 + bo, "#27ae60", scale);
      drawPixel(ctx, 1, 7 + bo, "#27ae60", scale);
      break;
    }

    case "mask": {
      drawPixel(ctx, 4, 4 + bo, "#c0392b", scale);
      drawPixel(ctx, 11, 4 + bo, "#c0392b", scale);
      break;
    }

    case "globe": {
      drawPixel(ctx, 1, 7 + bo, "#3498db", scale);
      drawPixel(ctx, 2, 7 + bo, "#27ae60", scale);
      drawPixel(ctx, 1, 8 + bo, "#27ae60", scale);
      drawPixel(ctx, 2, 8 + bo, "#3498db", scale);
      drawPixel(ctx, 1, 9 + bo, "#7f8c8d", scale);
      drawPixel(ctx, 2, 9 + bo, "#7f8c8d", scale);
      break;
    }

    case "hammer": {
      const hammerSwing = frame % 4;
      const hY = hammerSwing < 2 ? 5 : 6;
      drawPixel(ctx, 13, hY + bo, "#7f8c8d", scale);
      drawPixel(ctx, 13, hY + 1 + bo, "#8b4513", scale);
      drawPixel(ctx, 13, hY + 2 + bo, "#8b4513", scale);
      drawPixel(ctx, 12, hY + bo, "#7f8c8d", scale);
      drawPixel(ctx, 14, hY + bo, "#7f8c8d", scale);
      break;
    }

    case "sparks": {
      const sparkVis = frame % 3 === 0;
      if (sparkVis) {
        const sparkColors = ["#f39c12", "#f1c40f", "#e67e22"];
        drawPixel(ctx, 14, 5 + bo, sparkColors[frame % 3], scale);
        drawPixel(ctx, 12, 4 + bo, sparkColors[(frame + 1) % 3], scale);
        drawPixel(ctx, 15, 6 + bo, sparkColors[(frame + 2) % 3], scale);
      }
      break;
    }

    case "lightbulb": {
      const on = frame % 6 < 4;
      if (on) {
        drawPixel(ctx, 12, 1 + bo, "#f1c40f", scale);
        drawPixel(ctx, 13, 1 + bo, "#f1c40f", scale);
        drawPixel(ctx, 12, 2 + bo, "#f1c40f", scale);
        drawPixel(ctx, 13, 2 + bo, "#f1c40f", scale);
        drawPixel(ctx, 12, 3 + bo, "#bdc3c7", scale);
      }
      break;
    }

    case "thought_bubble": {
      const tbVis = frame % 8 < 6;
      if (tbVis) {
        drawPixel(ctx, 13, 1 + bo, "#ffffff", scale);
        drawPixel(ctx, 14, 1 + bo, "#ffffff", scale);
        drawPixel(ctx, 15, 1 + bo, "#ffffff", scale);
        drawPixel(ctx, 13, 2 + bo, "#ffffff", scale);
        drawPixel(ctx, 14, 2 + bo, "#ffffff", scale);
        drawPixel(ctx, 15, 2 + bo, "#ffffff", scale);
        drawPixel(ctx, 12, 3 + bo, "#ffffff", scale);
        drawPixel(ctx, 11, 4 + bo, "#cccccc", scale);
      }
      break;
    }

    case "boulder": {
      drawPixel(ctx, 1, 10 + bo, "#7f8c8d", scale);
      drawPixel(ctx, 2, 10 + bo, "#6c757d", scale);
      drawPixel(ctx, 1, 11 + bo, "#6c757d", scale);
      drawPixel(ctx, 2, 9 + bo, "#7f8c8d", scale);
      break;
    }

    case "laurel_wreath": {
      drawPixel(ctx, 4, 1 + bo, "#27ae60", scale);
      drawPixel(ctx, 5, 0 + bo, "#daa520", scale);
      drawPixel(ctx, 10, 0 + bo, "#daa520", scale);
      drawPixel(ctx, 11, 1 + bo, "#27ae60", scale);
      break;
    }

    case "fire_aura": {
      const fireFrame = frame % 4;
      const auraColors = ["#b34a25", "#b36200", "#b39700"];
      drawPixel(ctx, 3, 4 + bo, auraColors[fireFrame % 3], scale);
      drawPixel(ctx, 3, 5 + bo, auraColors[(fireFrame + 1) % 3], scale);
      break;
    }

    case "explorer_hat": {
      for (let x = 4; x <= 11; x++) {
        drawPixel(ctx, x, 0 + bo, "#6d4c41", scale);
      }
      for (let x = 6; x <= 9; x++) {
        drawPixel(ctx, x, 1 + bo, "#6d4c41", scale);
      }
      break;
    }

    case "owl": {
      drawPixel(ctx, 0, 3 + bo, "#8B7355", scale);
      drawPixel(ctx, 2, 3 + bo, "#8B7355", scale);
      drawPixel(ctx, 0, 4 + bo, "#f1c40f", scale);
      drawPixel(ctx, 2, 4 + bo, "#f1c40f", scale);
      drawPixel(ctx, 1, 4 + bo, "#8B7355", scale);
      drawPixel(ctx, 0, 5 + bo, "#8B7355", scale);
      drawPixel(ctx, 1, 5 + bo, "#A0896C", scale);
      drawPixel(ctx, 2, 5 + bo, "#8B7355", scale);
      drawPixel(ctx, 1, 6 + bo, "#8B7355", scale);
      break;
    }

    case "forge_apron": {
      for (let y = 7; y <= 9; y++) {
        drawPixel(ctx, 5, y + bo, "#8B4513", scale);
        drawPixel(ctx, 10, y + bo, "#8B4513", scale);
      }
      drawPixel(ctx, 7, 6 + bo, "#8B4513", scale);
      drawPixel(ctx, 8, 6 + bo, "#8B4513", scale);
      break;
    }

    case "shoulder_globe": {
      const globeColors = ["#3498db", "#27ae60"];
      for (let x = 0; x <= 2; x++) {
        for (let y = 6; y <= 8; y++) {
          const colorIndex = (x + y + frame) % 2;
          drawPixel(ctx, x, y + bo, globeColors[colorIndex], scale);
        }
      }
      drawPixel(ctx, 1, 9 + bo, "#7f8c8d", scale);
      break;
    }

    case "comedy_mask": {
      drawPixel(ctx, 0, 2 + bo, "#f1c40f", scale);
      drawPixel(ctx, 1, 2 + bo, "#f1c40f", scale);
      drawPixel(ctx, 2, 2 + bo, "#f1c40f", scale);
      drawPixel(ctx, 0, 3 + bo, "#2c2c54", scale);
      drawPixel(ctx, 1, 3 + bo, "#f1c40f", scale);
      drawPixel(ctx, 2, 3 + bo, "#2c2c54", scale);
      drawPixel(ctx, 0, 4 + bo, "#f1c40f", scale);
      drawPixel(ctx, 1, 4 + bo, "#c0392b", scale);
      drawPixel(ctx, 2, 4 + bo, "#f1c40f", scale);
      break;
    }
  }
}

const ACTION_ACCESSORIES = {
  thinking: ["thought_bubble"],
  coding: ["laptop"],
  reading: ["book"],
  searching: ["magnifying_glass"],
  running: ["laptop"],
  orchestrating: ["baton"],
  reviewing: ["red_pen", "checklist"],
  planning: ["scroll"],
  crafting: ["hammer", "sparks"],
};

const AGENT_IDENTITY_ACCESSORIES = {
  sisyphus: ["boulder"],
  oracle: ["glasses", "laurel_wreath"],
  librarian: ["glasses"],
  explore: ["explorer_hat"],
  prometheus: ["torch", "fire_aura"],
  metis: ["owl"],
  momus: ["mask", "comedy_mask"],
  atlas: ["shoulder_globe"],
  hephaestus: ["forge_apron"],
};

function drawAgent(ctx, agentName, action, frame, canvasSize) {
  const gridSize = 16;
  const scale = Math.floor(canvasSize / gridSize);

  ctx.clearRect(0, 0, canvasSize, canvasSize);

  const palette = getPalette(agentName);
  const isIdle = !action || action === "idle";
  const breathOffset = isIdle ? 0 : (frame % 2 === 0 ? 0 : -1);

  drawBaseCharacter(ctx, palette, scale, frame, action);

  const identityAccessories = AGENT_IDENTITY_ACCESSORIES[agentName] || [];
  for (const acc of identityAccessories) {
    drawAccessory(ctx, acc, palette, scale, frame, breathOffset);
  }

  const actionAccessories = ACTION_ACCESSORIES[action] || [];
  for (const acc of actionAccessories) {
    drawAccessory(ctx, acc, palette, scale, frame, breathOffset);
  }
}

// ── Backward-compatible window export ────────────────────────────────────────
if (typeof window !== "undefined") {
  window.PixelRenderer = {
    drawAgent,
    getPalette,
    generateCharacterSprites,
    AGENT_PALETTES,
  };
}
