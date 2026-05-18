// ── Office Furniture Sprites ─────────────────────────────────────────────────
//
// Desk: 32×16 px spanning 2 tiles — large laptop, keyboard, mouse, plant
// Chair: 16×16 px — office chair
// Wall: 8×8 px — subtle texture (currently unused; walls are solid color)

const C = {
  // ── Desk surface ───────────────────────────────────────────────────────
  deskTop:    "#c8b078",   // warm wood
  deskDark:   "#a89060",   // shadow edge
  deskLight:  "#d8c898",   // highlight

  // ── Laptop ────────────────────────────────────────────────────────────
  lapBody:    "#1a1a1a",   // laptop base
  lapLid:     "#2a2a2a",   // lid frame
  screen:     "#4df0ff",   // BRIGHT CYAN — unmistakable screen
  screenDark: "#1a8a9a",   // screen shadow edge
  bezel:      "#0a0a0a",   // screen bezel
  hinge:      "#444444",   // hinge line

  // ── Keyboard ──────────────────────────────────────────────────────────
  keyArea:    "#333333",
  keyRow1:    "#555555",
  keyRow2:    "#4a4a4a",
  trackpad:   "#666666",

  // ── Accessories ───────────────────────────────────────────────────────
  mouse:      "#444444",
  mouseBtn:   "#555555",
  plantPot:   "#cc6633",
  plantGreen: "#44aa44",
  plantDark:  "#338833",
  mug:        "#ffffff",
  mugInside:  "#332211",

  // ── Chair ─────────────────────────────────────────────────────────────
  chBack:     "#3366aa",
  chSeat:     "#4488cc",
  chFrame:    "#1a1a1a",
  chArm:      "#555555",
  chWheel:    "#888888",
  chHub:      "#bbbbbb",

  // ── Wall ──────────────────────────────────────────────────────────────
  brick1:     "#cc6633",
  brick2:     "#aa5533",
  brick3:     "#884422",
  mortar:     "#d4c4a8",
};

export function generateFurnitureSprite(type) {
  switch (type) {
    case "desk":  return deskSprite();
    case "chair": return chairSprite();
    case "wall":  return wallSprite();
    default:      return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DESK — 32×16 px, 2 tiles wide
// Layout: laptop (cols 10-21), keyboard (cols 12-19), plant (cols 4-6),
//          mug (cols 26-27), mouse (cols 24-25), wood surface background
// ═══════════════════════════════════════════════════════════════════════════

function deskSprite() {
  const D = C;
  const _ = null;
  const pixels = [
    // 0        1        2        3        4        5        6        7        8        9       10       11       12       13       14       15       16       17       18       19       20       21       22       23       24       25       26       27       28       29       30       31
    [  _,_,_,_,_,_,_,_,  _,_,_,_,  _,_,_,_,  _,_,_,_,  _,_,_,_,  _,_,_,_,  _,_,_,_,  _,_,_,_  ], // r0
    [  _,_,_,_,_,_,_,_,  _,_,_,_,  _,_,_,_,  _,_,_,_,  D.bezel,D.bezel,D.bezel,D.bezel,D.bezel,D.bezel,D.bezel,_,_,_,_,  _,_,_,_,  _,_,_,_  ], // r1  bezel top
    [  _,_,_,_,_,_,_,_,  _,_,_,_,  D.plantDark,_,_,  _,_,_,_,  D.bezel,D.screen,D.screen,D.screen,D.screen,D.screen,D.bezel,_,_,_,_,  _,_,D.mug,_,  _,_,_,_  ], // r2  screen + plant + mug
    [  _,_,_,_,_,D.plantDark,D.plantGreen,_,  _,_,_,_,  D.plantGreen,_,_,  _,_,_,_,  D.bezel,D.screen,D.screen,D.screen,D.screen,D.screen,D.bezel,_,_,_,D.mouse,  D.mug,D.mug,D.mug,  _,_,_,_  ], // r3  screen + plant
    [  _,_,_,_,_,D.plantPot,D.plantPot,_,  _,_,_,_,  _,_,_,_,  _,_,_,_,  D.bezel,D.screenDark,D.screenDark,D.screenDark,D.screenDark,D.screenDark,D.bezel,_,_,_,D.mouse,D.mouse,D.mug,D.mugInside,D.mug,  _,_,_,_  ], // r4  screen bottom
    [  _,_,_,_,_,_,_,_,  _,_,_,_,  _,_,_,_,  _,_,_,_,  D.lapLid,D.lapLid,D.lapLid,D.lapLid,D.lapLid,D.lapLid,D.lapLid,_,_,_,D.mouseBtn,_,_,_,_,  _,_,_,_  ], // r5  hinge
    [  D.deskTop,_,_,D.deskLight,  _,_,_,_,  _,_,_,_,  _,_,_,_,  D.lapBody,D.keyArea,D.keyArea,D.keyArea,D.keyArea,D.lapBody,_,_,_,_,  _,_,_,_,  _,_,D.deskLight,_  ], // r6  keyboard row1
    [  D.deskTop,D.deskTop,_,_,  _,_,_,_,  _,_,_,_,  _,_,_,_,  D.lapBody,D.keyRow1,D.keyRow1,D.keyRow1,D.keyRow1,D.lapBody,_,_,_,_,  _,_,_,_,  _,_,_,_  ], // r7  kb highlights
    [  D.deskTop,D.deskTop,D.deskTop,_,  _,_,_,_,  _,_,_,_,  _,_,_,_,  D.lapBody,D.keyRow2,D.keyRow2,D.keyRow2,D.keyRow2,D.lapBody,_,_,_,_,  _,_,_,_,  _,_,_,_  ], // r8  kb row2
    [  D.deskTop,D.deskTop,D.deskTop,D.deskTop,  _,_,_,_,  _,_,_,_,  _,_,_,_,  D.lapBody,D.trackpad,D.trackpad,D.trackpad,D.trackpad,D.lapBody,_,_,_,_,  _,_,_,_,  _,_,_,_  ], // r9  trackpad
    [  D.deskDark,D.deskTop,D.deskTop,D.deskTop,  _,_,_,_,  _,_,_,_,  _,_,_,_,  D.lapBody,D.lapBody,D.lapBody,D.lapBody,D.lapBody,D.lapBody,_,_,_,_,  _,_,_,_,  _,_,_,_  ], // r10 laptop base
    [  D.deskDark,D.deskDark,D.deskTop,D.deskTop,  _,_,_,_,  _,_,_,_,  _,_,_,_,  _,_,_,_,  _,_,_,_,  _,_,_,_,  _,_,_,_,  _,_,_,_  ], // r11 wood
    [  D.deskLight,D.deskDark,D.deskDark,D.deskTop,  _,_,_,_,  _,_,_,_,  _,_,_,_,  _,_,_,_,  _,_,_,_,  _,_,_,_,  _,_,_,_,  _,_,_,_  ], // r12
    [  _,D.deskLight,D.deskDark,D.deskDark,  _,_,_,_,  _,_,_,_,  _,_,_,_,  _,_,_,_,  _,_,_,_,  _,_,_,_,  _,_,_,_,  _,_,_,_  ], // r13
    [  _,_,D.deskLight,D.deskDark,  _,_,_,_,  _,_,_,_,  _,_,_,_,  _,_,_,_,  _,_,_,_,  _,_,_,_,  _,_,_,_,  _,_,_,_  ], // r14
    [  _,_,_,_,  _,_,_,_,  _,_,_,_,  _,_,_,_,  _,_,_,_,  _,_,_,_,  _,_,_,_,  _,_,_,_,  _,_,_,_  ], // r15
  ];
  return { pixels };
}

// ═══════════════════════════════════════════════════════════════════════════
// CHAIR — 16×16 px, 1 tile
// ═══════════════════════════════════════════════════════════════════════════

function chairSprite() {
  const D = C;
  const _ = null;
  const pixels = [
    [  _,_,_,_,  _,_,_,_,  _,_,_,_,  _,_,_,_  ], // r0
    [  _,_,_,_,  _,_,D.chFrame,D.chFrame,D.chFrame,D.chFrame,D.chFrame,D.chFrame,_,_,_,_,_  ], // r1
    [  _,_,_,_,  D.chFrame,D.chBack,D.chBack,D.chBack,D.chBack,D.chBack,D.chBack,D.chFrame,_,_,_,_  ], // r2
    [  _,_,_,D.chFrame,D.chBack,D.chBack,D.chBack,D.chBack,D.chBack,D.chBack,D.chBack,D.chBack,D.chFrame,_,_,_  ], // r3
    [  _,_,D.chFrame,D.chBack,D.chBack,D.chBack,D.chBack,D.chBack,D.chBack,D.chBack,D.chBack,D.chBack,D.chFrame,D.chFrame,_,_  ], // r4
    [  _,D.chArm,D.chFrame,D.chBack,D.chBack,D.chBack,D.chBack,D.chBack,D.chBack,D.chBack,D.chBack,D.chBack,D.chFrame,D.chArm,_  ], // r5
    [  D.chArm,D.chArm,D.chArm,D.chSeat,D.chSeat,D.chSeat,D.chSeat,D.chSeat,D.chSeat,D.chSeat,D.chSeat,D.chSeat,D.chArm,D.chArm,D.chArm  ], // r6 seat
    [  _,D.chArm,D.chSeat,D.chSeat,D.chSeat,D.chSeat,D.chSeat,D.chSeat,D.chSeat,D.chSeat,D.chSeat,D.chSeat,D.chSeat,D.chSeat,D.chArm,_  ], // r7
    [  _,_,D.chFrame,D.chSeat,D.chSeat,D.chSeat,D.chSeat,D.chSeat,D.chSeat,D.chSeat,D.chSeat,D.chSeat,D.chSeat,D.chSeat,D.chFrame,_,_  ], // r8
    [  _,_,_,D.chFrame,D.chFrame,D.chFrame,D.chFrame,D.chFrame,D.chFrame,D.chFrame,D.chFrame,D.chFrame,D.chFrame,D.chFrame,_,_,_  ], // r9
    [  _,_,_,_,_,D.chFrame,_,D.chFrame,_,D.chFrame,_,D.chFrame,_,D.chFrame,_,_,_  ], // r10 column
    [  _,_,_,_,D.chWheel,_,D.chWheel,_,D.chWheel,_,D.chWheel,_,D.chWheel,_,_,_,_  ], // r11 spokes
    [  _,_,_,D.chWheel,D.chHub,D.chWheel,D.chHub,D.chWheel,D.chHub,D.chWheel,D.chHub,D.chWheel,D.chHub,D.chWheel,_,_,_  ], // r12 wheels
    [  _,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_  ], // r13
    [  _,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_  ], // r14
    [  _,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_  ], // r15
  ];
  return { pixels };
}

// ═══════════════════════════════════════════════════════════════════════════
// WALL — 8×8 px (unused; walls use solid color)
// ═══════════════════════════════════════════════════════════════════════════

function wallSprite() {
  const D = C;
  const _ = null;
  const pixels = [
    [D.brick1, D.brick1, D.mortar, D.brick2, D.brick2, D.mortar, D.brick1, D.brick1],
    [D.brick1, D.brick1, D.mortar, D.brick2, D.brick2, D.mortar, D.brick1, D.brick1],
    [D.mortar, D.mortar, D.mortar, D.mortar, D.mortar, D.mortar, D.mortar, D.mortar],
    [D.brick2, D.brick2, D.mortar, D.brick3, D.brick3, D.mortar, D.brick2, D.brick2],
    [D.brick2, D.brick2, D.mortar, D.brick3, D.brick3, D.mortar, D.brick2, D.brick2],
    [D.mortar, D.mortar, D.mortar, D.mortar, D.mortar, D.mortar, D.mortar, D.mortar],
    [D.brick3, D.brick3, D.mortar, D.brick1, D.brick1, D.mortar, D.brick3, D.brick3],
    [D.brick3, D.brick3, D.mortar, D.brick1, D.brick1, D.mortar, D.brick3, D.brick3],
  ];
  return { pixels };
}
