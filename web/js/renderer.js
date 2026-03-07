const AGENT_PALETTES = {
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

const DEFAULT_PALETTE = {
  skin: "#f4c08e",
  hair: "#3d2b1f",
  shirt: "#7f8c8d",
  pants: "#2c3e50",
  accent: "#bdc3c7",
  eye: "#2c3e50",
};

function getPalette(agentName) {
  return AGENT_PALETTES[agentName] || DEFAULT_PALETTE;
}

function drawPixel(ctx, x, y, color, scale) {
  ctx.fillStyle = color;
  ctx.fillRect(x * scale, y * scale, scale, scale);
}

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

  const hairPixels = getHairPixels(palette, breathOffset);
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

function getHairPixels(palette, breathOffset) {
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
      drawPixel(ctx, 5, 3 + bo, "#f1c40f", scale);
      drawPixel(ctx, 10, 3 + bo, "#f1c40f", scale);
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
      const auraColors = ["#ff6b35", "#ff8c00", "#ffd700"];
      drawPixel(ctx, 2, 4 + bo, auraColors[fireFrame % 3], scale);
      drawPixel(ctx, 3, 3 + bo, auraColors[(fireFrame + 1) % 3], scale);
      drawPixel(ctx, 13, 4 + bo, auraColors[(fireFrame + 2) % 3], scale);
      drawPixel(ctx, 12, 5 + bo, auraColors[fireFrame % 3], scale);
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
      drawPixel(ctx, 1, 6 + bo, "#8B7355", scale);
      drawPixel(ctx, 2, 6 + bo, "#8B7355", scale);
      drawPixel(ctx, 1, 7 + bo, "#8B7355", scale);
      drawPixel(ctx, 1, 5 + bo, "#f1c40f", scale);
      drawPixel(ctx, 2, 5 + bo, "#f1c40f", scale);
      drawPixel(ctx, 1, 4 + bo, "#8B7355", scale);
      drawPixel(ctx, 2, 4 + bo, "#8B7355", scale);
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
      for (let x = 6; x <= 8; x++) {
        for (let y = 0; y <= 2; y++) {
          const colorIndex = (x + y + frame) % 2;
          drawPixel(ctx, x, y + bo, globeColors[colorIndex], scale);
        }
      }
      break;
    }

    case "comedy_mask": {
      drawPixel(ctx, 13, 2 + bo, "#f1c40f", scale);
      drawPixel(ctx, 14, 2 + bo, "#f1c40f", scale);
      drawPixel(ctx, 13, 3 + bo, "#f1c40f", scale);
      drawPixel(ctx, 14, 3 + bo, "#f1c40f", scale);
      drawPixel(ctx, 13, 4 + bo, "#f1c40f", scale);
      drawPixel(ctx, 14, 4 + bo, "#f1c40f", scale);
      drawPixel(ctx, 13, 3 + bo, "#2c2c54", scale);
      drawPixel(ctx, 13, 4 + bo, "#2c2c54", scale);
      break;
    }

    case "zzz": {
      const zPhase = Math.floor(frame / 4) % 3;
      const zColor = "#8e99a4";
      if (zPhase >= 0) {
        drawPixel(ctx, 13, 3 + bo, zColor, scale);
        drawPixel(ctx, 14, 2 + bo, zColor, scale);
        drawPixel(ctx, 14, 3 + bo, zColor, scale);
      }
      if (zPhase >= 1) {
        drawPixel(ctx, 14, 0 + bo, zColor, scale);
        drawPixel(ctx, 15, 0 + bo, zColor, scale);
        drawPixel(ctx, 15, 1 + bo, zColor, scale);
        drawPixel(ctx, 14, 1 + bo, zColor, scale);
      }
      break;
    }
  }
}

const ACTION_ACCESSORIES = {
  idle: ["zzz"],
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

window.PixelRenderer = {
  drawAgent,
  getPalette,
  AGENT_PALETTES,
};
