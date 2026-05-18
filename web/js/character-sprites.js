// ── Character Sprite Data ──────────────────────────────────────────────────
//
// Human pixel-art characters, 16×32 pixels.
// Palette: [skin, hair, shirt, pants] tinted per agent.

function buildSprite(template, colors) {
  const [skin, hair, shirt, pants] = colors;
  const map = { S: skin, H: hair, T: shirt, P: pants, E: '#111', B: '#1a1a1a', W: '#fff', '.': null };
  return template.map((row) => [...row].map((ch) => map[ch] || null));
}

// ── 16×32 Human Template (every row exactly 16 chars) ─────────────────────
const HUMAN = [
  '................',
  '................',
  '......HHHH......',
  '.....HHHHHH.....',
  '....HSSSSSSH....',
  '....HSSSSSSH....',
  '....HSEWEESH....',
  '....HSSSSSSH....',
  '....HSSSSSSH....',
  '....HSSSSSSH....',
  '.....HSSSSH.....',
  '.....TTTTTT.....',
  '....TTTTTTTT....',
  '....TTTPPTTT....',
  '....TTTPPTTT....',
  '....TTTBBTTT....',
  '....TTTTTTTT....',
  '.....PPPPPP.....',
  '.....PPPPPP.....',
  '.....PPPPPP.....',
  '.....PP..PP.....',
  '.....PP..PP.....',
  '.....PP..PP.....',
  '.....BB..BB.....',
  '.....BB..BB.....',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
];

// Sprite cache: keyed by palette string
const spriteCache = new Map();

export function getCharacterSprite(palette) {
  const key = palette.join(',');
  const cached = spriteCache.get(key);
  if (cached) return cached;

  const skin  = palette[0] || '#f0c8a0';
  const hair  = palette[1] || '#4a3020';
  const shirt = palette[2] || '#5566aa';
  const pants = palette[3] || '#2a3040';
  const colors = [skin, hair, shirt, pants];

  const idle = buildSprite(HUMAN, colors);
  const walk1 = idle.map((row) => [...row]);
  // Slight leg shift for walk frame
  if (walk1[22]) { const r = walk1[22]; r[6] = r[5]; r[5] = null; }
  if (walk1[23]) { const r = walk1[23]; r[6] = r[5]; r[5] = null; }
  const result = { idle, walk1, walk2: idle };
  spriteCache.set(key, result);
  return result;
}

export function drawSprite(ctx, sprite, x, y, pxSize) {
  for (let r = 0; r < sprite.length; r++) {
    const row = sprite[r];
    for (let c = 0; c < row.length; c++) {
      const color = row[c];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x + c * pxSize, y + r * pxSize, Math.ceil(pxSize), Math.ceil(pxSize));
    }
  }
}
