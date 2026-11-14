// Hexwood - painted sprites (trees, bushes, hedges).
// Each sprite is painted once into an offscreen canvas and reused. Gray versions
// for hexed areas are made from the color version, in 5 steps.
'use strict';

const SPR = {};
const LC = ['#2c5a33', '#3d7a3e', '#559a4a', '#74b85a', '#9ad370', '#c2e88e'];

function sprite(kind, variant, g) {
  const gq = Math.round(g * 4) / 4;
  const key = kind + '|' + variant + '|' + gq + '|' + TS + '|' + DPR;
  if (SPR[key]) return SPR[key];
  let c;
  if (gq > 0) {
    const base = sprite(kind, variant, 0);
    c = document.createElement('canvas'); c.width = base.width; c.height = base.height;
    const x = c.getContext('2d');
    x.filter = `grayscale(${gq}) brightness(${1 - 0.12 * gq})`;
    x.drawImage(base, 0, 0);
    if (x.filter === 'none' || x.filter === undefined) grayPixels(c, gq);
    c.ax = base.ax; c.ay = base.ay; c.cw = base.cw; c.ch = base.ch;
  } else c = makeSprite(kind, variant);
  return (SPR[key] = c);
}
function grayPixels(c, g) {
  const x = c.getContext('2d'), d = x.getImageData(0, 0, c.width, c.height), p = d.data;
  for (let i = 0; i < p.length; i += 4) {
    const l = 0.3 * p[i] + 0.59 * p[i + 1] + 0.11 * p[i + 2], k = 1 - 0.12 * g;
    p[i] = (p[i] + (l - p[i]) * g) * k; p[i + 1] = (p[i + 1] + (l - p[i + 1]) * g) * k; p[i + 2] = (p[i + 2] + (l - p[i + 2]) * g) * k;
  }
  x.putImageData(d, 0, 0);
}
// Sprite boxes are in "units"; k converts units to screen pixels.
const SPRITE_DEF = {
  oak:    { w: 160, h: 330, ax: 80, ay: 312, k: () => 1.5 * TS / 150, paint: (B, R) => paintOak(B, R) },
  pine:   { w: 160, h: 330, ax: 80, ay: 312, k: () => 1.5 * TS / 150, paint: (B, R) => paintPine(B, R) },
  birch:  { w: 160, h: 330, ax: 80, ay: 312, k: () => 1.35 * TS / 150, paint: (B, R) => paintBirch(B, R) },
  willow: { w: 160, h: 330, ax: 80, ay: 312, k: () => 1.5 * TS / 150, paint: (B, R) => paintWillow(B, R) },
  dead:   { w: 160, h: 330, ax: 80, ay: 312, k: () => 1.4 * TS / 150, paint: (B, R) => paintDead(B, R) },
  bush:   { w: 110, h: 100, ax: 55, ay: 88, k: () => 1.12 * TS / 100, paint: (B, R) => paintBush(B, R, 'plain') },
  flower: { w: 110, h: 100, ax: 55, ay: 88, k: () => 1.12 * TS / 100, paint: (B, R) => paintBush(B, R, 'flower') },
  berry:  { w: 110, h: 100, ax: 55, ay: 88, k: () => 1.12 * TS / 100, paint: (B, R) => paintBush(B, R, 'berry') },
  fern:   { w: 110, h: 100, ax: 55, ay: 88, k: () => 1.12 * TS / 100, paint: (B, R) => paintBush(B, R, 'fern') },
  bramble: { w: 110, h: 110, ax: 55, ay: 100, k: () => 1.08 * TS / 100, paint: (B, R) => paintBramble(B, R) },
  hedge:  { w: 100, h: 140, ax: 0, ay: 130, k: () => TS / 100, paint: (B, R, v) => paintHedge(B, R, v) },
};
function makeSprite(kind, variant) {
  const d = SPRITE_DEF[kind], k = d.k();
  const c = document.createElement('canvas');
  c.width = Math.ceil(d.w * k * DPR); c.height = Math.ceil(d.h * k * DPR);
  const B = c.getContext('2d');
  B.scale(k * DPR, k * DPR);
  d.paint(B, rng(1000 + variant * 97 + kind.length * 13), variant);
  c.ax = d.ax * k; c.ay = d.ay * k; c.cw = d.w * k; c.ch = d.h * k;
  return c;
}
// draw a sprite with its ground point at screen (x, y); sway leans the top a little
function drawSprite(kind, variant, g, x, y, sway) {
  const c = sprite(kind, variant, g);
  if (sway) {
    ctx.save(); ctx.translate(x, y); ctx.transform(1, 0, sway, 1, 0, 0);
    ctx.drawImage(c, -c.ax, -c.ay, c.cw, c.ch); ctx.restore();
  } else ctx.drawImage(c, x - c.ax, y - c.ay, c.cw, c.ch);
}

// ---------------------------------------------------------------- painting helpers
function pShadow(B, x, y, rx, ry) {
  const g = B.createRadialGradient(x, y, 0, x, y, rx);
  g.addColorStop(0, 'rgba(30,50,20,.42)'); g.addColorStop(1, 'rgba(30,50,20,0)');
  B.save(); B.scale(1, ry / rx); B.fillStyle = g; B.beginPath(); B.arc(x, y * rx / ry, rx, 0, 7); B.fill(); B.restore();
}
function pBlob(B, cx, cy, r, dark, mid, light) {
  const g = B.createRadialGradient(cx - r * .35, cy - r * .4, r * .1, cx, cy, r);
  g.addColorStop(0, light); g.addColorStop(.55, mid); g.addColorStop(1, dark);
  B.fillStyle = g; B.beginPath(); B.arc(cx, cy, r, 0, 7); B.fill();
}
function pLeaves(B, cx, cy, r, n, cols, R, size) {
  for (let i = 0; i < n; i++) {
    const a = R() * 6.28, d = Math.sqrt(R()) * r;
    const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d * 0.9, top = (y - cy) / r;
    B.fillStyle = cols[Math.max(0, Math.min(cols.length - 1, Math.round((1 - top) / 2 * (cols.length - 1) + (R() - .5) * 1.5)))];
    B.save(); B.translate(x, y); B.rotate(R() * 6.28); B.beginPath(); B.ellipse(0, 0, size * (.7 + R() * .6), size * .45, 0, 0, 7); B.fill(); B.restore();
  }
}
function pBark(B, x, y, w, h, base, dark, R) {
  const g = B.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, dark); g.addColorStop(.35, base); g.addColorStop(1, dark);
  B.fillStyle = g; B.beginPath(); B.moveTo(x - w * .25, y + h); B.quadraticCurveTo(x + w * .1, y + h * .75, x + w * .15, y);
  B.lineTo(x + w * .85, y); B.quadraticCurveTo(x + w * .9, y + h * .75, x + w * 1.25, y + h); B.fill();
  B.strokeStyle = 'rgba(30,15,5,.4)'; B.lineWidth = 1.5;
  for (let i = 0; i < 7; i++) { const bx = x + w * .25 + R() * w * .5, by = y + R() * h * .8; B.beginPath(); B.moveTo(bx, by); B.quadraticCurveTo(bx + 2, by + 8, bx, by + 16); B.stroke(); }
}
// trees are painted with their trunk base at (80, 312)
function paintOak(B, R) {
  const ox = 5, oy = -58;
  pShadow(B, ox + 75, oy + 370, 66, 13);
  pBark(B, ox + 62, oy + 250, 26, 120, '#8a5e3c', '#4e3220', R);
  const cl = [[75, 170, 62], [35, 200, 40], [115, 195, 44], [55, 130, 40], [100, 128, 40], [75, 230, 36]].map(([x, y, r]) => [x + (R() - .5) * 10, y + (R() - .5) * 10, r * (0.92 + R() * 0.14)]);
  cl.forEach(([x, y, r]) => pBlob(B, ox + x, oy + y, r, '#2c5a33', '#4f9346', '#7cc05e'));
  cl.slice(0, 5).forEach(([x, y, r]) => pLeaves(B, ox + x, oy + y, r * .95, 70, LC, R, 8));
}
function paintPine(B, R) {
  const ox = 5, oy = -58;
  pShadow(B, ox + 75, oy + 370, 44, 10);
  pBark(B, ox + 67, oy + 320, 16, 52, '#7a5232', '#45301c', R);
  const PC = ['#163a2c', '#1f4d36', '#2b6343', '#3d7a50', '#57955f'];
  for (let t = 0; t < 5; t++) {
    const top = oy + 70 + t * 45, base = top + 80, hw = 22 + t * 12 + R() * 4;
    const g = B.createLinearGradient(ox + 75 - hw, 0, ox + 75 + hw, 0);
    g.addColorStop(0, '#3d7a50'); g.addColorStop(.6, '#24543c'); g.addColorStop(1, '#163a2c'); B.fillStyle = g;
    B.beginPath(); B.moveTo(ox + 75, top);
    for (let k = 0; k <= 6; k++) { const f = k / 6; B.lineTo(ox + 75 - hw + f * hw * 2, base + (k % 2 ? -8 : 4)); }
    B.closePath(); B.fill();
    for (let i = 0; i < 40; i++) { const f = R(), y = top + f * (base - top), w = hw * f; const x = ox + 75 + (R() * 2 - 1) * w; B.strokeStyle = PC[(R() * 5) | 0]; B.lineWidth = 2; B.beginPath(); B.moveTo(x, y); B.lineTo(x + (x < ox + 75 ? -6 : 6), y + 5); B.stroke(); }
  }
}
function paintBirch(B, R) {
  const ox = 5, oy = -58;
  pShadow(B, ox + 75, oy + 370, 46, 10);
  const x = ox + 66;
  const g = B.createLinearGradient(x, 0, x + 18, 0);
  g.addColorStop(0, '#cfcabd'); g.addColorStop(.4, '#fbf9f2'); g.addColorStop(1, '#bdb8aa');
  B.fillStyle = g; B.beginPath(); B.moveTo(x, oy + 370); B.lineTo(x + 3, oy + 110); B.lineTo(x + 15, oy + 110); B.lineTo(x + 18, oy + 370); B.fill();
  B.fillStyle = '#2e2c28';
  for (let i = 0; i < 12; i++) { const y = oy + 130 + R() * 230, w = 4 + R() * 9; B.beginPath(); B.ellipse(x + 3 + R() * 12, y, w * .6, 1.6, 0, 0, 7); B.fill(); }
  const BL = ['#4f8a3e', '#6aa64c', '#8cc25e', '#b0db7c', '#d2ef9e'];
  [[75, 110, 44], [45, 140, 28], [105, 138, 28], [75, 70, 28]].forEach(([cx, cy, r]) => {
    B.globalAlpha = .92; pBlob(B, ox + cx, oy + cy, r, '#4f8a3e', '#7cb456', '#b5df84'); B.globalAlpha = 1;
    pLeaves(B, ox + cx, oy + cy, r, 60, BL, R, 6);
  });
}
function paintWillow(B, R) {
  const ox = 5, oy = -58;
  pShadow(B, ox + 75, oy + 370, 70, 14);
  pBark(B, ox + 62, oy + 240, 26, 130, '#7f5636', '#45301c', R);
  [[75, 170, 62], [30, 190, 38], [120, 190, 38]].forEach(([x, y, r]) => pBlob(B, ox + x, oy + y, r, '#2c5a33', '#4f9346', '#7cc05e'));
  for (let i = 0; i < 70; i++) {
    const x = ox + 18 + R() * 114, y0 = oy + 150 + R() * 40, len = 60 + R() * 90;
    B.strokeStyle = LC[1 + (R() * 4 | 0)]; B.lineWidth = 2.2;
    B.beginPath(); B.moveTo(x, y0); B.bezierCurveTo(x + 4, y0 + len * .4, x - 3, y0 + len * .7, x + 2, y0 + len); B.stroke();
    for (let j = 0; j < len; j += 7) { B.fillStyle = LC[2 + (R() * 3 | 0)]; B.beginPath(); B.ellipse(x + Math.sin(j * .1) * 2, y0 + j, 2.2, 4, 0, 0, 7); B.fill(); }
  }
}
function paintDead(B, R) {
  const ox = 5, oy = -58;
  pShadow(B, ox + 75, oy + 370, 38, 9);
  pBark(B, ox + 64, oy + 250, 22, 120, '#7a6a5a', '#3e342c', R);
  function br(x, y, a, len, w) {
    if (len < 8) return;
    const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len;
    const g = B.createLinearGradient(x, y, ex, ey); g.addColorStop(0, '#5e5246'); g.addColorStop(1, '#7a6a5a');
    B.strokeStyle = g; B.lineCap = 'round'; B.lineWidth = w;
    B.beginPath(); B.moveTo(x, y); B.quadraticCurveTo((x + ex) / 2 + (R() - .5) * 10, (y + ey) / 2, ex, ey); B.stroke();
    br(ex, ey, a - .45 - R() * .3, len * .68, w * .62); br(ex, ey, a + .35 + R() * .35, len * .62, w * .6);
  }
  br(ox + 75, oy + 255, -1.57, 55, 12); br(ox + 72, oy + 290, -2.5, 45, 7); br(ox + 79, oy + 300, -.6, 45, 7);
}
function paintBush(B, R, kind) {
  const ox = 5, oy = 5;
  pShadow(B, ox + 50, oy + 82, 44, 9);
  if (kind === 'fern') {
    for (let f = 0; f < 9; f++) {
      const a = -Math.PI / 2 + (f - 4) * .3, len = 55 + R() * 20;
      B.strokeStyle = '#3d7a3e'; B.lineWidth = 2;
      const ex = ox + 50 + Math.cos(a) * len, ey = oy + 80 + Math.sin(a) * len;
      B.beginPath(); B.moveTo(ox + 50, oy + 80); B.quadraticCurveTo(ox + 50 + Math.cos(a) * len * .5, oy + 80 + Math.sin(a) * len * .7, ex, ey); B.stroke();
      for (let i = 4; i < len; i += 5) {
        const t = i / len, x = ox + 50 + Math.cos(a) * i, y = oy + 80 + Math.sin(a) * i * (.85 + t * .15), s = (1 - t) * 9 + 2;
        B.fillStyle = LC[2 + ((i / 5 | 0) % 3)];
        B.beginPath(); B.ellipse(x - s * .6, y, s * .7, 2, a + 0.9, 0, 7); B.fill();
        B.beginPath(); B.ellipse(x + s * .6, y, s * .7, 2, a - 0.9 + 3.14, 0, 7); B.fill();
      }
    }
    return;
  }
  const cl = [[50, 52, 34], [25, 62, 22], [75, 62, 22], [50, 30, 20]];
  cl.forEach(([x, y, r]) => pBlob(B, ox + x, oy + y, r, '#2c5a33', '#4f9346', '#7cc05e'));
  cl.forEach(([x, y, r]) => pLeaves(B, ox + x, oy + y, r, 40, LC, R, 6));
  if (kind === 'berry') for (let i = 0; i < 14; i++) { const x = ox + 20 + R() * 60, y = oy + 25 + R() * 45; pBlob(B, x, y, 4.5, '#1e1640', '#3e2f7a', '#8a78d8'); }
  if (kind === 'flower') for (let i = 0; i < 12; i++) {
    const x = ox + 18 + R() * 64, y = oy + 22 + R() * 45, c = ['#f7a8c8', '#fff3b0', '#ffffff'][i % 3];
    for (let p = 0; p < 5; p++) { B.fillStyle = c; B.beginPath(); B.arc(x + Math.cos(p * 1.26) * 3.5, y + Math.sin(p * 1.26) * 3.5, 3, 0, 7); B.fill(); }
    B.fillStyle = '#e8a63a'; B.beginPath(); B.arc(x, y, 2, 0, 7); B.fill();
  }
}
function paintBramble(B, R) {
  pShadow(B, 55, 98, 46, 9);
  for (let i = 0; i < 26; i++) {
    const x0 = 15 + R() * 80, y0 = 98, cx = 10 + R() * 90, cy = 20 + R() * 60, x1 = 5 + R() * 100, y1 = 30 + R() * 60;
    B.strokeStyle = ['#3a2a22', '#5a3a2a', '#4a5a32'][i % 3]; B.lineWidth = 2 + R() * 1.5;
    B.beginPath(); B.moveTo(x0, y0); B.quadraticCurveTo(cx, cy, x1, y1); B.stroke();
    for (let k = 0; k < 3; k++) { const t = 0.3 + k * 0.25, px = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1, py = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y1;
      B.fillStyle = '#2a1e18'; B.beginPath(); B.moveTo(px, py); B.lineTo(px + 4, py - 3); B.lineTo(px + 1, py + 1); B.fill(); }
  }
  pLeaves(B, 55, 60, 40, 40, ['#2c4a2a', '#3d6a3a', '#4f7a42', '#5f8a4a'], R, 5);
  for (let i = 0; i < 6; i++) pBlob(B, 20 + R() * 70, 35 + R() * 45, 3.5, '#4a0f1a', '#8a1f2a', '#e05a6a');
}
// hedge block, one tile wide; variant bits: 1 = joins left, 2 = joins right
function paintHedge(B, R, v) {
  const L = v & 1, Rt = v & 2;
  const x0 = L ? 0 : 6, x1 = Rt ? 100 : 94;
  B.fillStyle = 'rgba(20,40,20,.35)'; B.fillRect(x0, 118, x1 - x0, 14);
  const g = B.createLinearGradient(0, 50, 0, 130); g.addColorStop(0, '#3d7a3e'); g.addColorStop(1, '#1f4428');
  B.fillStyle = g; B.beginPath(); B.moveTo(x0, 130); B.lineTo(x0, 60); B.lineTo(x1, 60); B.lineTo(x1, 130); B.fill();
  const xs = [L ? 0 : 20, 36, 64, Rt ? 100 : 80];
  xs.forEach((x, i) => pBlob(B, x, 56 + (i % 2) * 6, 26, '#2c5a33', '#4a8c44', '#74b85a'));
  xs.forEach(x => pLeaves(B, x, 56, 24, 34, LC, R, 5));
  for (let i = 0; i < 18; i++) { B.fillStyle = LC[(R() * 3) | 0]; B.beginPath(); B.ellipse(x0 + R() * (x1 - x0), 80 + R() * 40, 5, 2.5, R() * 3, 0, 7); B.fill(); }
}

// which painted tree stands on a map tile
function treeKind(c, x, y, m) {
  if (c === 'B') return 'birch';
  const h = hash(x * 1.3 + 2, y * 0.7 + 5);
  if (m.id === 'out') {
    if (x === 0 || y === 0 || x === m.w - 1 || y === m.h - 1) return h < 0.45 ? 'pine' : 'oak';
    if (y >= 22) return h < 0.4 ? 'willow' : h < 0.55 ? 'pine' : 'oak';
    if (y <= 10 && x <= 17) return h < 0.14 ? 'dead' : h < 0.32 ? 'pine' : 'oak';
  }
  return h < 0.08 ? 'dead' : h < 0.35 ? 'pine' : 'oak';
}
function bushKind(x, y) { const h = hash(x * 2.1 + 9, y * 1.7 + 3); return h < 0.45 ? 'bush' : h < 0.78 ? 'flower' : 'fern'; }
