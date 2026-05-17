// ── Procedural Furniture Sprites ──────────────────────────────────────────────
//
// Generates pixel-art sprite data for furniture types used in the editor palette.
// Each sprite is a 2D pixel grid (pixels[r][c] = color string | null).
// Dimensions: desk 4×3, chair 2×2, wall 2×2 (consistent 16px tile footprint).

const COLOR = {
  deskTop: "#8B4513",     // SaddleBrown — wooden desk surface
  deskLeg: "#5D3A1A",     // Dark wood — desk legs
  deskEdge: "#A0522D",    // Sienna — edge highlight
  chairSeat: "#4A90D9",   // Blue — office chair seat
  chairBack: "#2C6FB5",   // Darker blue — chair back
  chairArm: "#3A7BC8",    // Medium blue — arm highlight
  wallFill: "#4A4A4A",    // Dark gray — wall fill
  wallOutline: "#2C2C2C", // Darker gray — wall outline
};

/**
 * Generate pixel data for a furniture sprite.
 *
 * @param {string} type — "desk" | "chair" | "wall"
 * @returns {{pixels: (string|null)[][]} | null} — sprite data or null if unknown type
 */
export function generateFurnitureSprite(type) {
  switch (type) {
    case "desk":
      return deskSprite();
    case "chair":
      return chairSprite();
    case "wall":
      return wallSprite();
    default:
      return null;
  }
}

/**
 * Desk sprite: 4×3 pixel grid.
 * ┌──────────┐
 * │ ████████ │  top surface (brown with edge highlight)
 * │ ██    ██ │  legs (dark wood)
 * │ ██    ██ │  legs (dark wood)
 * └──────────┘
 *  Desk viewed from above — rectangular surface with leg supports
 */
function deskSprite() {
  const pixels = [
    [COLOR.deskEdge, COLOR.deskTop, COLOR.deskTop,    COLOR.deskEdge],
    [COLOR.deskLeg,  null,         null,              COLOR.deskLeg],
    [COLOR.deskLeg,  null,         null,              COLOR.deskLeg],
  ];
  return { pixels };
}

/**
 * Chair sprite: 2×2 pixel grid.
 * ┌──────┐
 * │ ████ │  seat back (darker)
 * │ ████ │  seat base (lighter)
 * └──────┘
 * Chair viewed from the side/front — compact office chair
 */
function chairSprite() {
  const pixels = [
    [COLOR.chairBack, COLOR.chairBack],
    [COLOR.chairSeat, COLOR.chairSeat],
  ];
  return { pixels };
}

/**
 * Wall sprite: 2×2 pixel grid.
 * ┌──────┐
 * │ ████ │  solid block
 * │ ████ │  solid block
 * └──────┘
 * Wall segment — fully filled with outline at edges
 */
function wallSprite() {
  const pixels = [
    [COLOR.wallOutline, COLOR.wallOutline],
    [COLOR.wallFill,    COLOR.wallFill],
  ];
  return { pixels };
}
