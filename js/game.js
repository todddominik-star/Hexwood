// Hexwood - engine, rules, rendering and UI.
'use strict';

// ================================================================ setup
const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');
let VW = 0, VH = 0, DPR = 1, TS = 44;
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  VW = window.innerWidth; VH = window.innerHeight;
  cv.width = Math.round(VW * DPR); cv.height = Math.round(VH * DPR);
  cv.style.width = VW + 'px'; cv.style.height = VH + 'px';
  TS = Math.max(32, Math.floor(Math.min(VW, VH) / 9.5));
}
window.addEventListener('resize', resize);
resize();

const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };

// ================================================================ maps
const SOLID_TILES = new Set(['#', 'w', 'D', 'T', 'B', 'b', 'R', 'h', 'O', 'H', '~', 'x']);
const MAPS = {};
function addMap(id, rows, dark) {
  MAPS[id] = { id, rows: rows.map(r => r.split('')), w: rows[0].length, h: rows.length, objs: OBJECTS.filter(o => o.map === id), solid: null };
  MAPS[id].objs.forEach(o => { o.tw = o.tw || 1; o.th = o.th || 1; if (o.solid === undefined) o.solid = true; o.layer = o.layer || 'normal'; });
}
addMap('hut', HUT_MAP);
addMap('cellar', CELLAR_MAP);
addMap('out', buildOutdoor());

// ================================================================ state
const SAVE_KEY = 'hexwood_save_v1';
let S = null;
function newState() {
  return {
    ver: 1, map: 'hut', px: 3.5, py: 3.5, dir: 1,
    flags: {}, inv: {}, pouch: [], pages: {}, late: {}, revealed: {}, lanterns: {}, freed: {},
    zones: { hut: 1, cellar: 1, grove: 1, stones: 1, yard: 1, meadow: 1, brook: 1, hollow: 1 },
    clues: [], curios: {}, gifts: {}, maxCharge: 3, time: 0,
  };
}
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { } }
function loadSave() { try { const t = localStorage.getItem(SAVE_KEY); return t ? JSON.parse(t) : null; } catch (e) { return null; } }

// display copies of zone gray values (animate toward S.zones)
const zoneDisp = {};

// runtime
let creatures = [];
let particles = [];
let lightT = 0;            // seconds of Light remaining
let seeker = null;         // { t, done }
let chain = null;          // chipmunk chain sequence
let fade = 0, fadeDir = 0, fadeCb = null;
let curZone = null;
let started = false;
let paused = true;         // true while dialog/panel/title is up

// ================================================================ G: helpers used by data.js
const G = {
  flag: (k) => !!S.flags[k],
  setFlag(k) { S.flags[k] = true; rebuildSolids(); save(); },
  has: (k, n = 1) => (S.inv[k] || 0) >= n,
  count: (k) => S.inv[k] || 0,
  give(k, n = 1) { S.inv[k] = (S.inv[k] || 0) + n; toast(`${ITEMS[k].icon} ${ITEMS[k].name}${n > 1 ? ' ×' + n : ''}`); blip(); save(); },
  take(k, n = 1) { S.inv[k] = Math.max(0, (S.inv[k] || 0) - n); if (!S.inv[k]) delete S.inv[k]; save(); },
  say: (lines, cb) => say(lines, cb),
  choice: (q, opts, cb) => choice(q, opts, cb),
  chime: (n) => chime(n),
  lightActive: () => lightT > 0,
  setZone(id, g) {
    if (S.zones[id] === g) return;
    const was = S.zones[id];
    S.zones[id] = g;
    if (g === 0 && was > 0) {
      const z = allZones().find(z => z.id === id);
      setTimeout(() => { chime(3); toast(`🌈 Color returns to ${z ? z.name : 'this place'}!`, 3500); }, 500);
    }
    save();
  },
  goMap(map, x, y) {
    startFade(() => { S.map = map; S.px = x; S.py = y; curZone = null; spawnCreatures(); save(); });
  },
  freeFairy() {
    G.setFlag('fairyFree');
    chime(2);
    burst(6.5, 1.5, '#fff3b0', 30);
    G.setZone('hut', 0.5);
    say(['You climb the stool and lift down the jar. The lid twists free...',
      'A tiny fairy tumbles out, stretching her wings.',
      'FENNEL: Oh, thank you, thank you! I\'ve been stuck in there since the hex fell.',
      'FENNEL: The hex took the color from everything. Old Moss\'s spellbook could mend it, but first you need to find it.',
      'FENNEL: I\'m too small to lift much, but I know a thing or two. Come talk to me whenever you\'re stuck.']);
  },
  talkFairy() { talkFairy(); },
  openStation(st) { openStation(st); },
  openBureau() { openBureau(); },
  orbsNeedingCharge: () => S.pouch.some(p => SPELL_ITEMS[p.type].shape === 'orb' && p.charges < S.maxCharge),
  recharge() {
    S.pouch.forEach(p => { if (SPELL_ITEMS[p.type].shape === 'orb') p.charges = S.maxCharge; });
    chime(2); burst(11.5, 5, '#ffd27a', 20); save();
    say(['You hold your orbs near the embers. They drink in the warmth and glow brightly again.']);
  },
  lanternAct(id) {
    if (S.lanterns[id]) return { label: 'Look at the lantern', fn: () => say(['The old lantern burns warm and bright.']) };
    if (lightT > 0) return { label: 'Kindle the lantern', fn: () => kindle(id) };
    return { label: 'Look at the lantern', fn: () => say(['An old lantern post, cold and dark. If only you had some light...']) };
  },
  curio(id) {
    S.curios[id] = true; chime(3); save();
    const it = ITEMS[id];
    say([`You found a curio: ${it.icon} ${it.name}!`, it.desc, '(Curios are kept in your Journal.)']);
  },
  hollowCheck() {
    if (G.flag('acornTaken') && G.flag('hollowWisp')) {
      resolveClue('chipmunks');
      G.setZone('hollow', 0);
    }
  },
};

// ================================================================ zones
function allZones() { return [].concat(ZONES.hut, ZONES.cellar, ZONES.out); }
function zoneAt(map, x, y) {
  const list = ZONES[map];
  for (const z of list) { const r = z.rect; if (x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3]) return z; }
  return list[list.length - 1];
}
function zoneDark(z) {
  if (!z || !z.dark) return false;
  if (z.id === 'cellar') return true;
  return !G.flag('groveLit');
}
// gray amount for a tile, splotchy as a zone restores
function tileGray(map, tx, ty) {
  const z = zoneAt(map, tx, ty);
  const zg = zoneDisp[z.id] !== undefined ? zoneDisp[z.id] : 1;
  if (zg <= 0.001) return 0;
  if (zg >= 0.999) return 1;
  const r = 1 - zg, h = hash(tx, ty);
  return clamp((h * 0.6 + 0.2 - r) * 4 + 0.5, 0, 1);
}

// ================================================================ solidity / pathing
function objVisible(o) {
  if (o.vis && !o.vis()) return false;
  if (o.secret && !S.revealed[o.id]) return false;
  return true;
}
function rebuildSolids() {
  for (const id in MAPS) {
    const m = MAPS[id];
    m.solid = new Uint8Array(m.w * m.h);
    m.objs.forEach(o => {
      if (!o.solid || o.layer === 'wall') return;
      if (o.vis && !o.vis()) return;
      for (let y = o.ty; y < o.ty + o.th; y++) for (let x = o.tx; x < o.tx + o.tw; x++) m.solid[y * m.w + x] = 1;
    });
  }
}
function solidAt(map, tx, ty) {
  const m = MAPS[map];
  if (tx < 0 || ty < 0 || tx >= m.w || ty >= m.h) return true;
  const c = m.rows[ty][tx];
  if (c === 'x') return !(S.revealed.hollowgate && G.flag('chainChip'));
  if (SOLID_TILES.has(c)) return true;
  return m.solid && m.solid[ty * m.w + tx] === 1;
}
function boxFree(map, x, y, r) {
  for (let ty = Math.floor(y - r); ty <= Math.floor(y + r); ty++)
    for (let tx = Math.floor(x - r); tx <= Math.floor(x + r); tx++)
      if (solidAt(map, tx, ty)) return false;
  return true;
}
function findPath(map, sx, sy, gx, gy) {
  const m = MAPS[map];
  sx = Math.floor(sx); sy = Math.floor(sy); gx = Math.floor(gx); gy = Math.floor(gy);
  const prev = new Int32Array(m.w * m.h).fill(-1);
  const start = sy * m.w + sx, goal = gy * m.w + gx;
  const q = [start]; prev[start] = start;
  while (q.length) {
    const c = q.shift();
    if (c === goal) break;
    const cx = c % m.w, cy = (c / m.w) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h) continue;
      const n = ny * m.w + nx;
      if (prev[n] !== -1) continue;
      if (n !== goal && solidAt(map, nx, ny)) continue;
      prev[n] = c; q.push(n);
    }
  }
  if (prev[goal] === -1) return null;
  const path = [];
  for (let c = goal; c !== start; c = prev[c]) path.push({ x: c % m.w + 0.5, y: ((c / m.w) | 0) + 0.5 });
  return path.reverse();
}

// ================================================================ creatures
function spawnCreatures() {
  creatures = CREATURES.filter(d => d.map === S.map).map(d => {
    const c = { def: d, id: d.id, x: d.x, y: d.y, hx: d.x, hy: d.y, mode: S.freed[d.id] ? 'free' : 'hexed', t: Math.random() * 10, tx: d.x, ty: d.y, path: null, gone: false, face: 1 };
    if (d.lead && G.flag(d.lead.flag)) { c.hx = c.x = d.lead.x; c.hy = c.y = d.lead.y; }
    if (d.species === 'chipmunk' && G.flag('chipsInHollow')) {
      const i = CREATURES.filter(k => k.species === 'chipmunk').indexOf(d);
      c.hx = c.x = 2.6 + (i % 3) * 1.4; c.hy = c.y = 2.6 + Math.floor(i / 3) * 1.6;
    }
    if (d.lead && S.freed[d.id] && !G.flag(d.lead.flag)) { c.mode = 'lead'; }
    return c;
  });
}
function speciesName(s) { return { chipmunk: 'chipmunk', butterfly: 'butterfly', bunny: 'bunny', frog: 'frog', firefly: 'firefly' }[s]; }

function unhex(c) {
  const d = c.def;
  S.freed[d.id] = true;
  burst(c.x, c.y, '#fff6c8', 26);
  burst(c.x, c.y, '#d9b8ff', 14);
  sparkleSound();
  c.mode = 'free';
  toast(`✨ Freed a ${speciesName(d.species)}!`);
  const lines = [];
  if (d.reward) { G.give(d.reward.item, d.reward.n); lines.push(`The hex bursts like a bubble, and a ${speciesName(d.species)} blinks up at you.`, d.reward.text); }
  if (d.lead) { c.mode = 'lead'; lines.push('The bunny looks back at you and hops a few steps, as if asking you to follow.'); }
  if (lines.length) say(lines);
  save();
  // zone challenge: free every hexed creature
  if (FREE_ALL_ZONES.includes(d.zone)) {
    const all = CREATURES.filter(k => k.zone === d.zone);
    if (all.every(k => S.freed[k.id])) G.setZone(d.zone, 0);
  }
  // secret chain: six chipmunks (no hint until it completes)
  const chips = CREATURES.filter(k => k.species === 'chipmunk');
  if (!G.flag('chainChip') && chips.every(k => S.freed[k.id])) setTimeout(startChain, lines.length ? 50 : 900);
}

function startChain() {
  S.flags.chainChip = true; rebuildSolids(); save();
  addClue('chipmunks');
  chime(4);
  toast('🎐 Something stirs in the forest...', 3500);
  const chips = creatures.filter(c => c.def.species === 'chipmunk');
  chips.forEach((c, i) => {
    const d = Math.hypot(c.x - S.px, c.y - S.py);
    if (d > 9) {
      const spot = spotNear(S.px, S.py, 5 + i * 0.3, i);
      c.x = spot.x; c.y = spot.y;
    }
    c.mode = 'gather'; c.path = findPath('out', c.x, c.y, S.px, S.py);
  });
  chain = { phase: 'gather', t: 0 };
}
function spotNear(x, y, r, seed) {
  for (let k = 0; k < 40; k++) {
    const a = seed * 1.7 + k * 0.9, rr = r - k * 0.08;
    const sx = x + Math.cos(a) * rr, sy = y + Math.sin(a) * rr;
    if (!solidAt('out', Math.floor(sx), Math.floor(sy)) && findPath('out', sx, sy, x, y)) return { x: Math.floor(sx) + 0.5, y: Math.floor(sy) + 0.5 };
  }
  return { x, y };
}
const HOLLOW_DOOR = { x: 8.5, y: 4.5 };
function updateChain(dt) {
  if (!chain) return;
  if (S.map !== 'out') { finishChain(); return; }
  chain.t += dt;
  const chips = creatures.filter(c => c.def.species === 'chipmunk');
  if (chain.phase === 'gather') {
    const near = chips.every(c => Math.hypot(c.x - S.px, c.y - S.py) < 2.2);
    if (near || chain.t > 6) {
      chain.phase = 'note';
      burst(S.px, S.py - 1.5, '#fffbe0', 30);
      chime(3);
      say(['The six chipmunks gather around your feet, chattering all at once.',
        'A little note drifts down out of the sky and lands in your hands. It reads:',
        '"' + CLUES.chipmunks + '"',
        '(The clue is saved in your Journal.)'], () => {
        chain.phase = 'lead'; chain.t = 0;
        chips.forEach(c => { c.mode = 'chainlead'; c.path = findPath('out', c.x, c.y, HOLLOW_DOOR.x, HOLLOW_DOOR.y); });
      });
    }
  } else if (chain.phase === 'lead') {
    const arrived = chips.filter(c => c.mode === 'chainlead' && c.path && c.path.length === 0);
    if (arrived.length === chips.length || chain.t > 90) {
      chain.phase = 'vanish'; chain.t = 0;
      chips.forEach((c, i) => { c.mode = 'vanish'; c.vt = i * 0.35; });
    }
  } else if (chain.phase === 'vanish') {
    if (chips.every(c => c.gone)) finishChain();
  }
}
function finishChain() {
  S.flags.chipsInHollow = true; rebuildSolids(); save();
  chain = null;
  spawnCreatures();
}

function updateCreatures(dt) {
  const leadWait = (c) => Math.hypot(c.x - S.px, c.y - S.py) > 5.5;
  for (const c of creatures) {
    c.t += dt;
    if (c.gone) continue;
    const sp = c.def.species;
    if (c.mode === 'hexed') {
      c.x = c.hx + Math.sin(c.t * 0.7) * 0.25; c.y = c.hy + Math.cos(c.t * 0.5) * 0.15;
      continue;
    }
    if (c.mode === 'gather') { followPath(c, dt, 3.2, () => Math.hypot(c.x - S.px, c.y - S.py) < 1.6); continue; }
    if (c.mode === 'chainlead') { if (!leadWait(c)) followPath(c, dt, 2.6); continue; }
    if (c.mode === 'vanish') {
      c.vt -= dt;
      if (c.vt <= 0) {
        const tx = 7.5, ty = 4.5;
        const dx = tx - c.x, dy = ty - c.y, d = Math.hypot(dx, dy);
        if (d < 0.2) { c.gone = true; burst(tx, ty, '#e8ffd8', 12); blip(1500); }
        else { c.x += dx / d * Math.min(d, 3 * dt); c.y += dy / d * Math.min(d, 3 * dt); c.face = dx < 0 ? -1 : 1; }
      }
      continue;
    }
    if (c.mode === 'lead') {
      const L = c.def.lead;
      if (!c.path) c.path = findPath(S.map, c.x, c.y, L.x, L.y) || [];
      if (!leadWait(c)) followPath(c, dt, 2.4);
      if (c.path.length === 0) {
        c.mode = 'free'; c.hx = L.x; c.hy = L.y; G.setFlag(L.flag);
        burst(L.x, L.y, '#fff6c8', 20); chime(2);
      }
      continue;
    }
    // free: gentle wander near home
    if (sp === 'butterfly' || sp === 'firefly') {
      c.x = c.hx + Math.sin(c.t * 0.6) * 1.6 + Math.sin(c.t * 1.7) * 0.3;
      c.y = c.hy + Math.cos(c.t * 0.45) * 1.1;
      c.face = Math.cos(c.t * 0.6) > 0 ? 1 : -1;
      continue;
    }
    if (!c.wt || c.wt < c.t) {
      c.wt = c.t + 1.5 + Math.random() * 3;
      const tx = c.hx + (Math.random() - 0.5) * 3, ty = c.hy + (Math.random() - 0.5) * 3;
      if (!solidAt(S.map, Math.floor(tx), Math.floor(ty)) && !(c.def.species === 'chipmunk' && G.flag('chipsInHollow') && !inHollow(tx, ty))) { c.tx = tx; c.ty = ty; }
    }
    const dx = c.tx - c.x, dy = c.ty - c.y, d = Math.hypot(dx, dy);
    if (d > 0.05) {
      const st = Math.min(d, 1.4 * dt);
      const nx = c.x + dx / d * st, ny = c.y + dy / d * st;
      if (boxFree(S.map, nx, ny, 0.2)) { c.x = nx; c.y = ny; } else c.tx = c.x, c.ty = c.y;
      c.face = dx < 0 ? -1 : 1;
    }
  }
}
function inHollow(x, y) { return x > 2.2 && x < 6.8 && y > 2.2 && y < 5.8; }
function followPath(c, dt, speed, stopFn) {
  if (stopFn && stopFn()) return;
  if (!c.path || !c.path.length) return;
  const p = c.path[0];
  const dx = p.x - c.x, dy = p.y - c.y, d = Math.hypot(dx, dy);
  const st = speed * dt;
  if (d <= st) { c.x = p.x; c.y = p.y; c.path.shift(); }
  else { c.x += dx / d * st; c.y += dy / d * st; }
  if (Math.abs(dx) > 0.01) c.face = dx < 0 ? -1 : 1;
  if (c.mode === 'gather' && !c.path.length) c.path = findPath(S.map, c.x, c.y, S.px, S.py) || [];
}

// ================================================================ lanterns, clues, pages
function kindle(id) {
  S.lanterns[id] = true;
  const o = MAPS.out.objs.find(o => o.id === id);
  burst(o.tx + 0.5, o.ty + 0.3, '#ffd27a', 24);
  chime(1);
  addLateEffect('lantern');
  save();
  if (['lantern1', 'lantern2', 'lantern3'].every(k => S.lanterns[k])) {
    S.flags.groveLit = true;
    G.setZone('grove', 0);
    say(['The third lantern catches. All at once the shadows lift from the grove.']);
  } else {
    const n = ['lantern1', 'lantern2', 'lantern3'].filter(k => S.lanterns[k]).length;
    say([`The old lantern flickers to life. (${n} of 3 lanterns lit)`]);
  }
}
function addLateEffect(k) {
  if (S.late[k]) return;
  S.late[k] = true; save();
  setTimeout(() => toast('📖 Spellbook updated', 2500), 900);
}
function addClue(id) {
  if (S.clues.find(c => c.id === id)) return;
  S.clues.push({ id, text: CLUES[id], done: false }); save();
}
function resolveClue(id) {
  const c = S.clues.find(c => c.id === id);
  if (c && !c.done) { c.done = true; save(); setTimeout(() => { chime(4); toast('📜 Clue solved!', 3000); }, 700); }
}
function revealPage(p) {
  const pg = S.pages[p];
  if (!pg || pg.cast) return false;
  pg.cast = true; save();
  return true;
}
function uncastCount() { return PAGE_ORDER.filter(p => p !== 'write' && S.pages[p] && !S.pages[p].cast).length; }

// ================================================================ spells
function useSpell(i) {
  const item = S.pouch[i];
  if (!item) return;
  const def = SPELL_ITEMS[item.type];
  closePanel();
  if (item.type === 'writepowder') return castWrite(i);
  if (item.charges <= 0) { say([`Your ${def.name} is dark. Recharge it at the hut hearth.`]); return; }
  if (item.type === 'lightorb') {
    item.charges--; lightT = 60; chime(1);
    burst(S.px, S.py, '#fff0a8', 20);
    if (revealPage('light')) learned('light');
    save();
  } else if (item.type === 'seekerorb') {
    item.charges--; seeker = { t: 0 }; blip(600);
    save();
  }
}
function learned(p) {
  const pg = PAGES[p];
  chime(4);
  say([`✨ The spell's name glows on its page: ${pg.name}!`, ...pg.effects.map(e => '• ' + e), '(Written into your Spellbook.)']);
}
function castWrite(i) {
  const next = PAGE_ORDER.find(p => !S.pages[p]);
  if (!next) { say(['The powder sparkles on a blank page... but no words come yet.', '(More spells are coming in the next version of Hexwood!)']); return; }
  if (uncastCount() >= 3) { say(['The book feels heavy and full. Cast some of the spells already written before writing another.']); return; }
  if (!G.has('wisp')) { say(['Write needs a Wisp Feather to cast. They are rare... keep an eye out.']); return; }
  S.pouch.splice(i, 1);
  G.take('wisp');
  S.pages[next] = { cast: false };
  const first = revealPage('write');
  chime(3);
  burst(S.px, S.py, '#e6d6ff', 30);
  const lines = ['You scatter the Write Powder over a blank page and lay the Wisp Feather on top.',
    'The feather melts into light, and words begin to write themselves...',
    `A new formula: "${PAGES[next].unknown}".`];
  if (first) lines.push(`✨ The first spell's name glows on its page: Write!`);
  say(lines, () => {
    toast('📖 Spellbook updated', 2500);
    if (S.map === 'hut' && S.zones.hut > 0) G.setZone('hut', 0);
  });
  save();
}
function finishSeeker() {
  const found = [];
  MAPS[S.map].objs.forEach(o => {
    if (!o.secret || S.revealed[o.id]) return;
    if (o.vis && !o.vis()) return;
    const d = Math.hypot(o.tx + 0.5 - S.px, o.ty + 0.5 - S.py);
    if (d <= 3.6) { S.revealed[o.id] = true; found.push(o); burst(o.tx + 0.5, o.ty + 0.5, '#bfe9ff', 26); }
  });
  rebuildSolids();
  const first = revealPage('seeker');
  if (found.length) { chime(3); toast('🔮 Something hidden is revealed!', 3000); }
  else toast('🔮 Nothing hidden here.', 2200);
  if (first) setTimeout(() => learned('seeker'), found.length ? 600 : 300);
  if (found.some(o => o.id === 'hollowgate')) setTimeout(() => say(['The hedge was only pretending! A narrow gap opens between the leaves.']), 700);
  save();
}

// ================================================================ fairy
function fairyStage() {
  if (!G.flag('bookFound')) return 1;
  if (!S.pages.write || !S.pages.write.cast) return 2;
  if (!S.pages.light || !S.pages.light.cast) return 3;
  if (!G.flag('keyTaken')) return 4;
  if (!G.flag('doorOpen')) return 5;
  if (!S.pages.seeker) return 6;
  if (!S.pages.seeker.cast) return 7;
  return 8;
}
const FAIRY = {
  1: { want: 'honeycake', ask: ['FENNEL: I\'m so hungry... Is there anything sweet in the cupboard? Those doors are far too heavy for me.'],
    hint: ['FENNEL: The bureau! Old Moss locked his spellbook in there.', 'FENNEL: He always said: "From high to low, as light falls." And he hid little marks on things... something high, something in the middle, something low. Look closely!'] },
  2: { want: 'dew', ask: ['FENNEL: I\'m parched. There\'s a thimble of dew on the windowsill, but it\'s heavier than I am.'],
    hint: ['FENNEL: Your book\'s first page tells you what to gather. Grind the inkberries at the mortar, then put everything together at the workbench.', 'FENNEL: To cast it, open your Pouch. It will use the Wisp Feather from the bureau.'] },
  3: { want: 'button', ask: ['FENNEL: Ooh, that brass button in the sewing basket! It\'s so shiny. Could you bring it to me?'],
    hint: ['FENNEL: For the new spell you need a candle stub and a sunstone. Something in this hut keeps time with a warm stone...', 'FENNEL: Join them at the workbench, then bring me the Dim Orb. I\'ll enchant it for you.'] },
  4: { hint: ['FENNEL: Light! Now we can see things properly.', 'FENNEL: Have you noticed that rug is a bit lumpy? And the cellar has been pitch dark for ages.'] },
  5: { hint: ['FENNEL: The door key! Go on, open the door!'] },
  6: { hint: ['FENNEL: The whole forest is hexed, just like the hut was. Walk right up to a hexed creature and your book can set it free.',
    'FENNEL: And if you have a Wisp Feather, you can Write another spell. Ash from the hearth, ink, and a quill, same as before.'] },
  7: { hint: ['FENNEL: That clear orb spell needs a shimmer petal and river glass. Flowers in the meadow, glass by the brook, maybe?', 'FENNEL: Bring me the Clear Orb when it\'s joined.'] },
  8: { hint: ['FENNEL: Watch for shimmers and glows out there. Something is always hiding.', 'FENNEL: And come back to the hearth to recharge your orbs.'] },
};
function talkFairy() {
  const canEnchant = RECIPES.some(r => r.station === 'fairy' && S.pages[r.page]);
  const talk = () => {
    const st = fairyStage();
    const f = FAIRY[st];
    let lines = f.hint.slice();
    if (st === 8 && !G.flag('groveLit')) lines.push('FENNEL: The birch grove is so dark... I bet those old lanterns could still be lit.');
    if (f.want && !S.gifts[st]) {
      if (G.has(f.want)) {
        G.take(f.want); S.gifts[st] = true; save();
        burst(6.5, 3.5, '#fff3b0', 16); blip(1400);
        lines = [`You give Fennel the ${ITEMS[f.want].name}.`, 'FENNEL: Oh! For me? You\'re a treasure.', ...f.hint];
      } else lines = f.ask;
    }
    say(lines);
  };
  if (canEnchant) choice('FENNEL: What can I do for you?', ['Talk', 'Enchant something'], i => i === 0 ? talk() : openStation('fairy'));
  else talk();
}

// ================================================================ input
const keys = {};
let joy = null;
window.addEventListener('keydown', e => {
  keys[e.key.toLowerCase()] = true;
  if (!started) return;
  const k = e.key.toLowerCase();
  if (k === ' ' || k === 'e' || k === 'enter') { e.preventDefault(); if (dlg.open) advance(); else if (!panelOpen()) doAct(); }
  if (k === 'escape') closePanel();
  if (!dlg.open) {
    if (k === 'b' && G.flag('bookFound')) openPanel('book');
    if (k === 'i') openPanel('satchel');
    if (k === 'p' && G.flag('bookFound')) openPanel('pouch');
    if (k === 'j' && G.flag('bookFound')) openPanel('journal');
  }
});
window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
cv.addEventListener('pointerdown', e => {
  audioInit();
  if (dlg.open) { advance(); return; }
  joy = { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: e.clientX, y: e.clientY };
  cv.setPointerCapture(e.pointerId);
});
cv.addEventListener('pointermove', e => { if (joy && e.pointerId === joy.id) { joy.x = e.clientX; joy.y = e.clientY; } });
const endJoy = e => { if (joy && e.pointerId === joy.id) joy = null; };
cv.addEventListener('pointerup', endJoy);
cv.addEventListener('pointercancel', endJoy);

function moveInput() {
  let mx = 0, my = 0;
  if (keys['arrowleft'] || keys['a']) mx -= 1;
  if (keys['arrowright'] || keys['d']) mx += 1;
  if (keys['arrowup'] || keys['w']) my -= 1;
  if (keys['arrowdown'] || keys['s']) my += 1;
  if (joy) {
    const dx = joy.x - joy.ox, dy = joy.y - joy.oy, d = Math.hypot(dx, dy);
    if (d > 8) { const m = Math.min(1, d / 45); mx = dx / d * m; my = dy / d * m; }
  }
  const d = Math.hypot(mx, my);
  if (d > 1) { mx /= d; my /= d; }
  return [mx, my];
}

// ================================================================ interaction
let actTarget = null;
function findAct() {
  if (seeker) return null;
  const m = MAPS[S.map];
  let best = null, bd = 1e9;
  for (const o of m.objs) {
    if (!objVisible(o)) continue;
    const a = o.act();
    if (!a) continue;
    const nx = clamp(S.px, o.tx, o.tx + o.tw), ny = clamp(S.py, o.ty, o.ty + o.th);
    let d = Math.hypot(S.px - nx, S.py - ny);
    if (!o.solid && o.layer !== 'floor') d -= 0.15; // pickups and the fairy win ties
    if (d < 0.75 && d < bd) { bd = d; best = a; }
  }
  for (const c of creatures) {
    if (c.mode !== 'hexed') continue;
    const d = Math.hypot(S.px - c.x, S.py - c.y);
    if (d < 1.25 && d - 0.4 < bd) { bd = d - 0.4; best = { label: `Unhex the ${speciesName(c.def.species)}`, fn: () => unhex(c) }; }
  }
  return best;
}
function doAct() { if (actTarget && !paused) { audioInit(); const t = actTarget; t.fn(); rebuildSolids(); } }
$('act').addEventListener('click', (e) => { e.stopPropagation(); doAct(); });

// ================================================================ dialog
const dlg = { open: false, lines: [], cb: null };
function say(lines, cb) {
  if (!Array.isArray(lines)) lines = [lines];
  if (dlg.open) { dlg.lines.push(...lines); if (cb) { const old = dlg.cb; dlg.cb = () => { old && old(); cb(); }; } return; }
  dlg.open = true; dlg.lines = lines.slice(); dlg.cb = cb || null;
  $('dialog').classList.add('show');
  $('dchoices').innerHTML = '';
  showLine();
}
function showLine() {
  const t = dlg.lines[0] || '';
  const m = t.match(/^([A-Z]+):\s(.*)$/);
  $('dtext').innerHTML = m ? `<b>${m[1][0] + m[1].slice(1).toLowerCase()}</b> ${esc(m[2])}` : esc(t);
  $('dmore').style.display = 'block';
}
function esc(s) { return String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }
function advance() {
  if (!dlg.open || dlg.choosing) return;
  dlg.lines.shift();
  if (dlg.lines.length) { showLine(); return; }
  dlg.open = false;
  $('dialog').classList.remove('show');
  const cb = dlg.cb; dlg.cb = null;
  if (cb) cb();
}
function choice(q, opts, cb) {
  const go = () => {
    dlg.open = true; dlg.choosing = true; dlg.lines = [q];
    $('dialog').classList.add('show');
    showLine(); $('dmore').style.display = 'none';
    const box = $('dchoices'); box.innerHTML = '';
    opts.forEach((o, i) => {
      const b = document.createElement('button'); b.textContent = o;
      b.addEventListener('click', ev => {
        ev.stopPropagation();
        dlg.open = false; dlg.choosing = false; box.innerHTML = '';
        $('dialog').classList.remove('show'); cb(i);
      });
      box.appendChild(b);
    });
  };
  if (dlg.open) { const old = dlg.cb; dlg.cb = () => { old && old(); go(); }; } else go();
}
$('dialog').addEventListener('pointerdown', e => { e.stopPropagation(); audioInit(); if (!dlg.choosing) advance(); });

// ================================================================ toasts
function toast(text, ms = 2200) {
  const el = document.createElement('div');
  el.className = 'toast'; el.textContent = text;
  $('toasts').appendChild(el);
  setTimeout(() => el.classList.add('out'), ms);
  setTimeout(() => el.remove(), ms + 600);
}

// ================================================================ panels
function panelOpen() { return $('panel').classList.contains('show'); }
function closePanel() { $('panel').classList.remove('show'); }
$('pclose').addEventListener('click', e => { e.stopPropagation(); closePanel(); });
$('panel').addEventListener('pointerdown', e => e.stopPropagation());
document.querySelectorAll('#topbar button').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); audioInit(); if (!dlg.open) openPanel(b.dataset.p); }));

function openPanel(kind) {
  const body = $('pbody');
  let title = '', html = '';
  if (kind === 'satchel') {
    title = '🎒 Satchel';
    const groups = [['ingredient', 'Ingredients'], ['worked', 'Worked'], ['trinket', 'Trinkets'], ['tool', 'Tools']];
    let any = false;
    groups.forEach(([k, label]) => {
      const items = Object.keys(S.inv).filter(id => ITEMS[id] && ITEMS[id].kind === k && S.inv[id] > 0);
      if (!items.length) return;
      any = true;
      html += `<h3>${label}</h3><div class="grid">` + items.map(id =>
        `<div class="item"><span class="ic">${ITEMS[id].icon}</span><span class="nm">${ITEMS[id].name}${S.inv[id] > 1 ? ' ×' + S.inv[id] : ''}</span><span class="ds">${ITEMS[id].desc}</span></div>`).join('') + '</div>';
    });
    if (!any) html = '<p class="muted">Empty. Look closely at things to find what you need.</p>';
  } else if (kind === 'pouch') {
    title = '👝 Spell Pouch';
    if (!S.pouch.length) html = '<p class="muted">No spells ready. Craft them from the formulas in your Spellbook.</p>';
    html += S.pouch.map((p, i) => {
      const d = SPELL_ITEMS[p.type];
      const known = S.pages[d.page] && S.pages[d.page].cast;
      const nm = known ? d.name : (d.shape === 'orb' ? 'Unknown Orb' : 'Unknown Powder');
      const ch = d.shape === 'orb' ? `<span class="charges">${'●'.repeat(p.charges)}${'○'.repeat(Math.max(0, S.maxCharge - p.charges))}</span>` : '<span class="charges">single use</span>';
      return `<div class="spell"><span class="ic">${d.icon}</span><span class="nm">${nm}<br>${ch}</span><button data-use="${i}">Use</button></div>`;
    }).join('');
    html += `<p class="muted small">${SHAPES.powder}. ${SHAPES.orb}.</p>`;
  } else if (kind === 'book') {
    title = '📖 Spellbook';
    PAGE_ORDER.forEach((p, n) => {
      const st = S.pages[p];
      if (!st) return;
      const pg = PAGES[p];
      html += `<div class="page"><div class="pn">Page ${n + 1}</div><h3>${st.cast ? pg.name : '???'}</h3><div class="muted">${st.cast ? '' : pg.unknown + ' — cast it to learn its name.'}</div>` +
        `<div class="shape">${SHAPES[pg.shape]}</div><h4>Formula</h4><ul>${pg.formula.map(f => `<li>${f}</li>`).join('')}</ul>`;
      if (st.cast) {
        const eff = pg.effects.slice();
        Object.keys(LATE_EFFECTS).forEach(k => { if (S.late[k] && LATE_EFFECTS[k].page === p) eff.push('✦ ' + LATE_EFFECTS[k].text); });
        html += `<h4>Effects</h4><ul>${eff.map(f => `<li>${f}</li>`).join('')}</ul>`;
      }
      html += '</div>';
    });
    html += `<p class="muted small">The remaining pages are blank. Uncast formulas: ${uncastCount()} of 3.</p>`;
  } else if (kind === 'journal') {
    title = '📜 Journal';
    html += '<h3>Clues</h3>';
    html += S.clues.length ? S.clues.map(c => `<div class="clue ${c.done ? 'done' : ''}">${c.done ? '✔ ' : ''}${esc(c.text)}</div>`).join('') : '<p class="muted">No clues yet.</p>';
    html += '<h3>Curios</h3><div class="grid">';
    Object.keys(ITEMS).filter(k => ITEMS[k].kind === 'curio').forEach(k => {
      html += S.curios[k] ? `<div class="item"><span class="ic">${ITEMS[k].icon}</span><span class="nm">${ITEMS[k].name}</span><span class="ds">${ITEMS[k].desc}</span></div>`
        : '<div class="item unknown"><span class="ic">❔</span><span class="nm">???</span></div>';
    });
    html += '</div>';
    const freed = Object.keys(S.freed).length;
    html += `<h3>Creatures freed</h3><p>${freed} of ${CREATURES.length}</p>`;
  }
  $('ptitle').textContent = title;
  body.innerHTML = html;
  body.querySelectorAll('[data-use]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); useSpell(+b.dataset.use); }));
  $('panel').classList.add('show');
}

function openStation(st) {
  const list = RECIPES.filter(r => r.station === st && S.pages[r.page]);
  let html = '';
  if (!list.length) html = '<p class="muted">Nothing you know how to make here yet.</p>';
  list.forEach(r => {
    const ok = Object.keys(r.needs).every(k => G.has(k, r.needs[k]));
    const out = r.makes ? ITEMS[r.makes] : SPELL_ITEMS[r.spell];
    const known = r.spell ? (S.pages[r.page].cast ? out.name : (out.shape === 'orb' ? 'an unknown orb' : 'an unknown powder')) : out.name;
    html += `<div class="recipe"><div class="out">${out.icon} ${r.verb} → ${known}</div><div class="needs">` +
      Object.keys(r.needs).map(k => `<span class="${G.has(k, r.needs[k]) ? 'have' : 'miss'}">${ITEMS[k].icon} ${ITEMS[k].name} ${G.count(k)}/${r.needs[k]}</span>`).join('') +
      `</div><button data-make="${r.id}" ${ok ? '' : 'disabled'}>${r.verb}</button></div>`;
  });
  $('ptitle').textContent = (st === 'fairy' ? '🧚 ' : st === 'mortar' ? '🥣 ' : '🔨 ') + STATION_NAMES[st];
  $('pbody').innerHTML = html;
  $('pbody').querySelectorAll('[data-make]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); make(b.dataset.make); }));
  $('panel').classList.add('show');
}
function make(id) {
  const r = RECIPES.find(r => r.id === id);
  if (!Object.keys(r.needs).every(k => G.has(k, r.needs[k]))) return;
  if (r.spell && S.pouch.length >= 6) { closePanel(); say(['Your pouch is full.']); return; }
  Object.keys(r.needs).forEach(k => G.take(k, r.needs[k]));
  closePanel();
  if (r.makes) { G.give(r.makes); say([r.station === 'mortar' ? `Grind, grind, grind... you make ${ITEMS[r.makes].name}.` : `You carefully join them into a ${ITEMS[r.makes].name}.`]); }
  else {
    const d = SPELL_ITEMS[r.spell];
    S.pouch.push({ type: r.spell, charges: d.charges || 1 });
    chime(2); save();
    const nm = S.pages[r.page].cast ? d.name : (d.shape === 'orb' ? 'an unknown orb' : 'an unknown powder');
    const lines = r.station === 'fairy'
      ? ['Fennel circles it three times, trailing fairy dust. It begins to glow from the inside.', `${d.icon} You put ${nm} in your Spell Pouch.`]
      : [`You work everything together on the bench into ${nm}.`, `${d.icon} It goes into your Spell Pouch. Open the Pouch to cast it.`];
    say(lines);
  }
  if (S.map === 'hut') burst(S.px, S.py - 0.5, '#fff3b0', 12);
}

// ---------------------------------------------------------------- bureau dial puzzle
const DIAL = ['🌙', '⭐', '🍃', '🌰'];
const DIAL_ANSWER = [0, 2, 3];
let dialVals = [1, 0, 1];
function openBureau() {
  let html = '<p>A heavy bureau with one locked drawer. Three little brass dials sit above the keyhole.</p><p class="plaque">"From high to low, as light falls."</p><div class="dials">';
  dialVals.forEach((v, i) => { html += `<button class="dial" data-dial="${i}">${DIAL[v]}</button>`; });
  html += '</div><button id="trydrawer" class="wide">Try the drawer</button>';
  $('ptitle').textContent = '🗄️ The Bureau';
  $('pbody').innerHTML = html;
  $('pbody').querySelectorAll('[data-dial]').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation(); const i = +b.dataset.dial; dialVals[i] = (dialVals[i] + 1) % DIAL.length; b.textContent = DIAL[dialVals[i]]; blip(900 + i * 150);
  }));
  $('trydrawer').addEventListener('click', e => {
    e.stopPropagation();
    if (dialVals.every((v, i) => v === DIAL_ANSWER[i])) {
      closePanel();
      S.flags.bookFound = true; S.pages.write = { cast: false };
      chime(4); burst(11, 7.5, '#fff3b0', 30);
      S.inv.wisp = (S.inv.wisp || 0) + 1;
      save(); refreshHud();
      say(['Click! The drawer slides open.', 'Inside: an old leather spellbook, and a single glowing feather.',
        'You take the 📖 Spellbook and a 💫 Wisp Feather.',
        'The book falls open to its first page. "A spell for writing magic," it says, with a list of ingredients.',
        '(Tap 📖 at the top of the screen to read your Spellbook.)']);
    } else { blip(300); toast('The drawer won\'t budge.'); }
  });
  $('panel').classList.add('show');
}

// ================================================================ audio
let AC = null;
function audioInit() {
  if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { } }
  if (AC && AC.state === 'suspended') AC.resume();
}
function tone(f, delay, dur, type = 'sine', vol = 0.12) {
  if (!AC) return;
  const t = AC.currentTime + delay;
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + dur + 0.05);
}
function chime(n = 1) {
  const sets = { 1: [880, 1318], 2: [659, 880, 1318], 3: [523, 659, 784, 1047], 4: [523, 659, 784, 1047, 1319, 1568] };
  (sets[n] || sets[1]).forEach((f, i) => { tone(f, i * 0.11, 1.1, 'sine', 0.1); tone(f * 2, i * 0.11, 0.5, 'triangle', 0.025); });
}
function blip(f = 1200) { tone(f, 0, 0.12, 'triangle', 0.06); }
function sparkleSound() { [1568, 1976, 2349, 2637].forEach((f, i) => tone(f, i * 0.05, 0.3, 'sine', 0.05)); }

// ================================================================ particles
function burst(x, y, color, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = 0.5 + Math.random() * 2.2;
    particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 0.5, life: 0.8 + Math.random() * 0.8, max: 1.6, color, r: 0.04 + Math.random() * 0.05 });
  }
}

// ================================================================ update
let last = performance.now(), saveT = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (started) update(dt);
  render(now / 1000);
  requestAnimationFrame(frame);
}
function update(dt) {
  paused = dlg.open || panelOpen() || fade > 0.5;
  S.time += dt;
  for (const z of allZones()) {
    const t = S.zones[z.id];
    if (zoneDisp[z.id] === undefined) zoneDisp[z.id] = t;
    zoneDisp[z.id] += (t - zoneDisp[z.id]) * Math.min(1, dt * 0.9);
    if (Math.abs(zoneDisp[z.id] - t) < 0.002) zoneDisp[z.id] = t;
  }
  if (lightT > 0) lightT = Math.max(0, lightT - dt);
  if (seeker) { seeker.t += dt; if (seeker.t > 2.2) { seeker = null; finishSeeker(); } }
  if (fadeDir) {
    fade += fadeDir * dt * 4;
    if (fadeDir > 0 && fade >= 1) { fade = 1; fadeDir = -1; if (fadeCb) { fadeCb(); fadeCb = null; } }
    if (fadeDir < 0 && fade <= 0) { fade = 0; fadeDir = 0; }
  }
  if (!paused && !seeker) {
    const [mx, my] = moveInput();
    if (mx || my) {
      const sp = 3.6 * dt, r = 0.3;
      const nx = S.px + mx * sp, ny = S.py + my * sp;
      if (boxFree(S.map, nx, S.py, r)) S.px = nx;
      if (boxFree(S.map, S.px, ny, r)) S.py = ny;
      if (Math.abs(mx) > 0.2) S.dir = mx < 0 ? -1 : 1;
      S.walk = (S.walk || 0) + dt * 9;
    }
  }
  updateCreatures(dt);
  updateChain(dt);
  particles.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.94; p.vy *= 0.94; p.life -= dt; });
  particles = particles.filter(p => p.life > 0);
  // zone entry
  const z = zoneAt(S.map, Math.floor(S.px), Math.floor(S.py));
  if (z !== curZone) { curZone = z; showZoneName(z.name); }
  actTarget = paused ? null : findAct();
  refreshHud();
  saveT += dt; if (saveT > 5) { saveT = 0; save(); }
}
function showZoneName(n) {
  const el = $('zonename'); el.textContent = n; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
}
function startFade(cb) { fadeDir = 1; fadeCb = cb; }

let hudCache = '';
function refreshHud() {
  const label = actTarget ? actTarget.label : '';
  const st = `${label}|${G.flag('bookFound')}|${Math.ceil(lightT)}|${seeker ? 1 : 0}`;
  if (st === hudCache) return;
  hudCache = st;
  const a = $('act');
  if (label) { a.textContent = label; a.classList.add('show'); } else a.classList.remove('show');
  document.querySelectorAll('#topbar [data-p]').forEach(b => { b.style.display = (b.dataset.p === 'satchel' || G.flag('bookFound')) ? '' : 'none'; });
  let s = '';
  if (lightT > 0) s += `<span>🌕 Light ${Math.ceil(lightT)}s</span>`;
  if (seeker) s += '<span>🔮 Seeking...</span>';
  $('status').innerHTML = s;
}

// ================================================================ render
let camX = 0, camY = 0;
function render(t) {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = '#1d1a24'; ctx.fillRect(0, 0, VW, VH);
  if (!S) return;
  const m = MAPS[S.map];
  // camera
  const mw = m.w * TS, mh = m.h * TS;
  let cx = S.px * TS - VW / 2, cy = S.py * TS - VH / 2;
  cx = mw <= VW ? (mw - VW) / 2 : clamp(cx, 0, mw - VW);
  cy = mh <= VH ? (mh - VH) / 2 : clamp(cy, -40, mh - VH + 40);
  camX = cx; camY = cy;
  const x0 = Math.max(0, Math.floor(cx / TS)), y0 = Math.max(0, Math.floor(cy / TS));
  const x1 = Math.min(m.w - 1, Math.ceil((cx + VW) / TS)), y1 = Math.min(m.h - 1, Math.ceil((cy + VH) / TS));
  const sx = (x) => x * TS - camX, sy = (y) => y * TS - camY;

  // ground
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) drawTile(m, x, y, sx(x), sy(y), tileGray(S.map, x, y), t);
  // floor objects, wall objects
  m.objs.forEach(o => { if (o.layer === 'floor' && objVisible(o)) drawObj(o, t); });
  m.objs.forEach(o => { if (o.layer === 'wall' && objVisible(o)) drawObj(o, t); });
  // sorted sprites
  const list = [];
  m.objs.forEach(o => { if (o.layer === 'normal' && objVisible(o) && o.draw !== 'none') list.push({ y: o.ty + o.th, f: () => drawObj(o, t) }); });
  // trees as sprites so the hero can walk "behind" canopies
  for (let y = y0; y <= y1 + 1 && y < m.h; y++) for (let x = x0; x <= x1; x++) {
    const c = m.rows[y][x];
    if (c === 'T' || c === 'B') list.push({ y: y + 0.95, f: () => drawTree(c, sx(x), sy(y), tileGray(S.map, x, y), x, y, t) });
  }
  creatures.forEach(c => { if (!c.gone) list.push({ y: c.y + 0.2, f: () => drawCreature(c, t) }); });
  list.push({ y: S.py + 0.3, f: () => drawHero(t) });
  list.sort((a, b) => a.y - b.y).forEach(i => i.f());

  // particles
  particles.forEach(p => {
    ctx.globalAlpha = clamp(p.life / 0.6, 0, 1);
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(sx(p.x), sy(p.y), p.r * TS, 0, 7); ctx.fill();
  });
  ctx.globalAlpha = 1;

  // darkness
  drawDarkness(m, x0, y0, x1, y1, sx, sy, t);

  // tells: secret shimmer, hexed eyes in the dark
  m.objs.forEach(o => {
    if (!o.secret || S.revealed[o.id] || (o.vis && !o.vis())) return;
    const ph = (t * 1.3 + hash(o.tx, o.ty) * 6) % 3;
    if (ph < 1.4) {
      const a = Math.sin(ph / 1.4 * Math.PI);
      for (let k = 0; k < 3; k++) {
        const px = sx(o.tx + 0.5 + Math.sin(t * 2 + k * 2.1) * 0.25), py = sy(o.ty + 0.5 + Math.cos(t * 1.7 + k * 2.1) * 0.2);
        star(px, py, TS * 0.09 * a, `rgba(220,240,255,${0.85 * a})`);
      }
    }
  });
  creatures.forEach(c => {
    if (c.mode !== 'hexed') return;
    const z = zoneAt(S.map, Math.floor(c.x), Math.floor(c.y));
    if (!zoneDark(z)) return;
    ctx.fillStyle = `rgba(200,150,255,${0.5 + 0.3 * Math.sin(t * 3)})`;
    ctx.beginPath(); ctx.arc(sx(c.x) - TS * 0.1, sy(c.y) - TS * 0.08, TS * 0.04, 0, 7); ctx.arc(sx(c.x) + TS * 0.1, sy(c.y) - TS * 0.08, TS * 0.04, 0, 7); ctx.fill();
  });

  // seeker sweep
  if (seeker) {
    const k = clamp(seeker.t / 2.0, 0, 1);
    const px = sx(S.px), py = sy(S.py);
    ctx.strokeStyle = `rgba(170,220,255,${0.6 * (1 - k * 0.5)})`; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(px, py, 3.6 * TS * k, 0, 7); ctx.stroke();
    const a = seeker.t * 3.2;
    const g = ctx.createRadialGradient(px, py, 0, px, py, 3.6 * TS);
    g.addColorStop(0, 'rgba(190,230,255,0.35)'); g.addColorStop(1, 'rgba(190,230,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(px, py); ctx.arc(px, py, 3.6 * TS, a, a + 0.7); ctx.closePath(); ctx.fill();
  }

  // joystick
  if (joy && !paused) {
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(joy.ox, joy.oy, 45, 0, 7); ctx.stroke();
    const dx = joy.x - joy.ox, dy = joy.y - joy.oy, d = Math.hypot(dx, dy), k = d > 45 ? 45 / d : 1;
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath(); ctx.arc(joy.ox + dx * k, joy.oy + dy * k, 18, 0, 7); ctx.fill();
  }
  if (fade > 0) { ctx.fillStyle = `rgba(20,16,28,${fade})`; ctx.fillRect(0, 0, VW, VH); }
}

function drawDarkness(m, x0, y0, x1, y1, sx, sy, t) {
  const sources = [{ x: S.px, y: S.py, r: lightT > 0 ? 4.4 : 1.5 }];
  if (S.map === 'out') ['lantern1', 'lantern2', 'lantern3'].forEach(id => {
    if (!S.lanterns[id]) return;
    const o = m.objs.find(o => o.id === id); sources.push({ x: o.tx + 0.5, y: o.ty + 0.5, r: 3.2 + Math.sin(t * 5 + o.tx) * 0.1 });
  });
  const half = TS / 2;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (!zoneDark(zoneAt(S.map, x, y))) continue;
    for (let qy = 0; qy < 2; qy++) for (let qx = 0; qx < 2; qx++) {
      const cxp = x + qx * 0.5 + 0.25, cyp = y + qy * 0.5 + 0.25;
      let lit = 0;
      for (const s of sources) { const d = Math.hypot(cxp - s.x, cyp - s.y); lit = Math.max(lit, clamp((s.r - d) / (s.r * 0.55), 0, 1)); }
      const a = 0.93 * (1 - lit);
      if (a <= 0.01) continue;
      ctx.fillStyle = `rgba(12,10,22,${a})`;
      ctx.fillRect(Math.floor(sx(x) + qx * half), Math.floor(sy(y) + qy * half), Math.ceil(half) + 1, Math.ceil(half) + 1);
    }
  }
}

// ---------------------------------------------------------------- color
const _rgb = {};
function rgbOf(hex) {
  if (_rgb[hex]) return _rgb[hex];
  const h = hex.replace('#', '');
  return (_rgb[hex] = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]);
}
function C(hex, g, a) {
  const [r, gg, b] = rgbOf(hex);
  const l = 0.3 * r + 0.59 * gg + 0.11 * b;
  const d = 1 - 0.12 * g;
  const R = (r + (l - r) * g) * d, Gg = (gg + (l - gg) * g) * d, B = (b + (l - b) * g) * d;
  return a === undefined ? `rgb(${R | 0},${Gg | 0},${B | 0})` : `rgba(${R | 0},${Gg | 0},${B | 0},${a})`;
}
function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }
function circ(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); }
function star(x, y, r, col) {
  ctx.fillStyle = col; ctx.beginPath();
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rad = i % 2 ? r * 0.35 : r; ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad); }
  ctx.closePath(); ctx.fill();
}

// ---------------------------------------------------------------- tiles
function drawGrass(x, y, g, tx, ty) {
  ctx.fillStyle = C('#9bd47f', g); ctx.fillRect(x, y, TS + 1, TS + 1);
  const h = hash(tx, ty);
  ctx.fillStyle = C('#86c56d', g);
  for (let i = 0; i < 3; i++) { const hx = hash(tx + i * 3.1, ty + 7), hy = hash(tx + 5, ty + i * 2.3); ctx.fillRect(x + hx * TS * 0.85, y + hy * TS * 0.85, TS * 0.08, TS * 0.12); }
  if (h > 0.8) { ctx.fillStyle = C('#b3e294', g); circ(x + TS * 0.6, y + TS * 0.4, TS * 0.12); ctx.fill(); }
}
function drawTile(m, tx, ty, x, y, g, t) {
  const c = m.rows[ty][tx];
  switch (c) {
    case '.': {
      ctx.fillStyle = C('#e2bf92', g); ctx.fillRect(x, y, TS + 1, TS + 1);
      ctx.fillStyle = C('#cfa679', g); ctx.fillRect(x, y + TS * 0.48, TS + 1, 2);
      if ((tx + ty) % 2) ctx.fillRect(x + TS * 0.5, y, 2, TS * 0.48); else ctx.fillRect(x + TS * 0.25, y + TS * 0.5, 2, TS * 0.5);
      break;
    }
    case '#': case 'D': {
      ctx.fillStyle = C('#a7795a', g); ctx.fillRect(x, y, TS + 1, TS + 1);
      ctx.fillStyle = C('#8e6448', g); for (let i = 1; i < 4; i++) ctx.fillRect(x, y + TS * i / 4, TS + 1, 2);
      if (ty === m.h - 1 || ty === 0) { ctx.fillStyle = C('#7a543b', g); ctx.fillRect(x, ty === 0 ? y + TS - 5 : y, TS + 1, 5); }
      break;
    }
    case 'w': {
      ctx.fillStyle = C('#a7795a', g); ctx.fillRect(x, y, TS + 1, TS + 1);
      ctx.fillStyle = C('#cfeaff', g); rr(x + TS * 0.15, y + TS * 0.15, TS * 0.7, TS * 0.6, 4); ctx.fill();
      ctx.fillStyle = C('#ffffff', g, 0.5); ctx.fillRect(x + TS * 0.2, y + TS * 0.2, TS * 0.15, TS * 0.5);
      ctx.fillStyle = C('#7a543b', g); ctx.fillRect(x + TS * 0.48, y + TS * 0.15, 3, TS * 0.6); ctx.fillRect(x + TS * 0.15, y + TS * 0.43, TS * 0.7, 3);
      ctx.fillRect(x, y + TS - 5, TS + 1, 5);
      break;
    }
    case ',': case 'T': case 'B': case 'H': drawGrass(x, y, g, tx, ty); break;
    case ':': {
      drawGrass(x, y, g, tx, ty);
      const cols = ['#f7a8c8', '#ffe37a', '#c9b3ff', '#ffffff'];
      for (let i = 0; i < 3; i++) {
        const fx = x + (0.2 + hash(tx * 3 + i, ty) * 0.6) * TS, fy = y + (0.2 + hash(tx, ty * 3 + i) * 0.6) * TS;
        ctx.fillStyle = C(cols[(tx + ty + i) % 4], g); circ(fx, fy, TS * 0.07); ctx.fill();
        ctx.fillStyle = C('#ffd34d', g); circ(fx, fy, TS * 0.025); ctx.fill();
      }
      break;
    }
    case '=': {
      ctx.fillStyle = C('#e8d3a6', g); ctx.fillRect(x, y, TS + 1, TS + 1);
      ctx.fillStyle = C('#d6bf8e', g);
      for (let i = 0; i < 3; i++) { circ(x + hash(tx + i, ty * 2) * TS, y + hash(tx * 2, ty + i) * TS, TS * 0.05); ctx.fill(); }
      break;
    }
    case '~': case 'o': {
      ctx.fillStyle = C('#86c8ea', g); ctx.fillRect(x, y, TS + 1, TS + 1);
      ctx.strokeStyle = C('#b8e2f7', g); ctx.lineWidth = 2;
      const off = Math.sin(t * 1.5 + tx * 0.8) * TS * 0.08;
      ctx.beginPath(); ctx.moveTo(x + TS * 0.1 + off, y + TS * 0.35); ctx.quadraticCurveTo(x + TS * 0.3 + off, y + TS * 0.25, x + TS * 0.5 + off, y + TS * 0.35); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + TS * 0.45 - off, y + TS * 0.72); ctx.quadraticCurveTo(x + TS * 0.65 - off, y + TS * 0.62, x + TS * 0.85 - off, y + TS * 0.72); ctx.stroke();
      if (c === 'o') { ctx.fillStyle = C('#cfc8bd', g); rr(x + TS * 0.14, y + TS * 0.18, TS * 0.72, TS * 0.64, TS * 0.3); ctx.fill(); ctx.fillStyle = C('#e2ddd4', g); rr(x + TS * 0.22, y + TS * 0.22, TS * 0.45, TS * 0.3, TS * 0.15); ctx.fill(); }
      break;
    }
    case 'b': {
      drawGrass(x, y, g, tx, ty);
      ctx.fillStyle = C('#5aa65a', g); circ(x + TS * 0.5, y + TS * 0.55, TS * 0.42); ctx.fill();
      ctx.fillStyle = C('#71bd6a', g); circ(x + TS * 0.38, y + TS * 0.45, TS * 0.2); ctx.fill();
      if (hash(tx, ty) > 0.5) { ctx.fillStyle = C('#ff9fb8', g); circ(x + TS * 0.62, y + TS * 0.4, TS * 0.06); ctx.fill(); circ(x + TS * 0.45, y + TS * 0.7, TS * 0.05); ctx.fill(); }
      break;
    }
    case 'R': {
      drawGrass(x, y, g, tx, ty);
      ctx.fillStyle = C('#a9a39b', g); rr(x + TS * 0.12, y + TS * 0.25, TS * 0.76, TS * 0.62, TS * 0.25); ctx.fill();
      ctx.fillStyle = C('#c7c2ba', g); rr(x + TS * 0.22, y + TS * 0.3, TS * 0.4, TS * 0.22, TS * 0.1); ctx.fill();
      break;
    }
    case 'h': case 'x': {
      const open = c === 'x' && S.revealed.hollowgate && G.flag('chainChip');
      if (open) { drawGrass(x, y, g, tx, ty); ctx.fillStyle = C('#3f8a47', g); ctx.fillRect(x, y, TS * 0.15, TS); ctx.fillRect(x + TS * 0.85, y, TS * 0.15, TS); break; }
      ctx.fillStyle = C('#3f8a47', g); ctx.fillRect(x, y, TS + 1, TS + 1);
      ctx.fillStyle = C('#53a35a', g);
      for (let i = 0; i < 4; i++) { circ(x + (i % 2 ? 0.7 : 0.3) * TS, y + (i < 2 ? 0.3 : 0.7) * TS, TS * 0.22); ctx.fill(); }
      break;
    }
    case 'O': {
      drawGrass(x, y, g, tx, ty);
      ctx.fillStyle = C('#8c8a95', g, 0.35); ctx.beginPath(); ctx.ellipse(x + TS * 0.5, y + TS * 0.9, TS * 0.35, TS * 0.1, 0, 0, 7); ctx.fill();
      ctx.fillStyle = C('#9d9aa8', g); rr(x + TS * 0.22, y - TS * 0.35, TS * 0.56, TS * 1.2, TS * 0.2); ctx.fill();
      ctx.fillStyle = C('#b9b6c4', g); rr(x + TS * 0.3, y - TS * 0.28, TS * 0.18, TS * 0.9, TS * 0.08); ctx.fill();
      ctx.strokeStyle = C('#7ec8e6', g, 0.6); ctx.lineWidth = 2; circ(x + TS * 0.52, y + TS * 0.15, TS * 0.1); ctx.stroke();
      break;
    }
    default: drawGrass(x, y, g, tx, ty);
  }
}
function drawTree(c, x, y, g, tx, ty, t) {
  const sway = Math.sin(t * 0.8 + tx * 0.7 + ty) * TS * 0.02;
  ctx.fillStyle = 'rgba(30,40,30,0.18)'; ctx.beginPath(); ctx.ellipse(x + TS * 0.5, y + TS * 0.85, TS * 0.45, TS * 0.15, 0, 0, 7); ctx.fill();
  if (c === 'B') {
    ctx.fillStyle = C('#f2efe8', g); ctx.fillRect(x + TS * 0.42, y + TS * 0.1, TS * 0.16, TS * 0.8);
    ctx.fillStyle = C('#4a4a4a', g); ctx.fillRect(x + TS * 0.42, y + TS * 0.4, TS * 0.08, 2); ctx.fillRect(x + TS * 0.5, y + TS * 0.62, TS * 0.08, 2);
    ctx.fillStyle = C('#8fcc72', g); circ(x + TS * 0.5 + sway, y - TS * 0.05, TS * 0.42); ctx.fill();
    ctx.fillStyle = C('#ade08e', g); circ(x + TS * 0.38 + sway, y - TS * 0.15, TS * 0.18); ctx.fill();
  } else {
    ctx.fillStyle = C('#8a5a3c', g); ctx.fillRect(x + TS * 0.4, y + TS * 0.3, TS * 0.2, TS * 0.6);
    ctx.fillStyle = C('#4f9a57', g); circ(x + TS * 0.5 + sway, y - TS * 0.02, TS * 0.55); ctx.fill();
    ctx.fillStyle = C('#62b064', g); circ(x + TS * 0.35 + sway, y - TS * 0.15, TS * 0.28); ctx.fill();
    ctx.fillStyle = C('#7cc677', g); circ(x + TS * 0.3 + sway, y - TS * 0.22, TS * 0.12); ctx.fill();
  }
}

// ---------------------------------------------------------------- objects
function drawObj(o, t) {
  const x = o.tx * TS - camX, y = o.ty * TS - camY, w = o.tw * TS, h = o.th * TS;
  const g = tileGray(S.map, o.tx, o.ty + o.th - 1);
  const f = DRAW[o.draw];
  if (f) f(o, x, y, w, h, g, t);
}
const DRAW = {
  bed(o, x, y, w, h, g) {
    ctx.fillStyle = C('#8a5a3c', g); rr(x + 4, y + 4, w - 8, h - 6, 6); ctx.fill();
    ctx.fillStyle = C('#f4f1ea', g); rr(x + 8, y + 8, w - 16, h * 0.28, 6); ctx.fill();
    ctx.fillStyle = C('#e88fa7', g); rr(x + 8, y + h * 0.4, w - 16, h * 0.52, 6); ctx.fill();
    ctx.fillStyle = C('#f6c3d1', g); for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { rr(x + 14 + i * (w - 28) / 3, y + h * 0.46 + j * h * 0.22, (w - 28) / 3 - 4, h * 0.18, 3); ctx.fill(); }
  },
  nightstand(o, x, y, w, h, g) {
    ctx.fillStyle = C('#9b6b49', g); rr(x + 6, y + 8, w - 12, h - 12, 4); ctx.fill();
    ctx.fillStyle = C('#7f5539', g); ctx.fillRect(x + 10, y + h * 0.5, w - 20, 3);
    ctx.fillStyle = C('#e7c36a', g); circ(x + w / 2, y + h * 0.65, 3); ctx.fill();
  },
  shelf(o, x, y, w, h, g, t) {
    ctx.fillStyle = C('#8e6448', g); ctx.fillRect(x + 2, y + 2, w - 4, h * 0.3);
    ctx.fillStyle = C('#7a543b', g); ctx.fillRect(x + 2, y + h * 0.3, w - 4, 5);
    ctx.fillStyle = C('#b0d0c8', g); rr(x + w * 0.1, y - h * 0.15, w * 0.12, h * 0.42, 3); ctx.fill();
    ctx.fillStyle = C('#d9a0b6', g); rr(x + w * 0.75, y - h * 0.1, w * 0.13, h * 0.36, 3); ctx.fill();
    if (!G.flag('fairyFree')) {
      ctx.fillStyle = 'rgba(220,235,245,0.55)'; rr(x + w * 0.38, y - h * 0.45, w * 0.24, h * 0.72, 8); ctx.fill();
      ctx.fillStyle = C('#9b6b49', g); ctx.fillRect(x + w * 0.37, y - h * 0.5, w * 0.26, 5);
      const a = 0.25 + 0.15 * Math.sin(t * 2);
      ctx.fillStyle = `rgba(255,240,170,${a})`; circ(x + w * 0.5, y - h * 0.1, TS * 0.12); ctx.fill();
    }
  },
  painting(o, x, y, w, h, g) {
    ctx.fillStyle = C('#c99a3e', g); ctx.fillRect(x + w * 0.12, y + h * 0.12, w * 0.76, h * 0.66);
    ctx.fillStyle = C('#bfe3ff', g); ctx.fillRect(x + w * 0.18, y + h * 0.18, w * 0.64, h * 0.3);
    ctx.fillStyle = C('#8fcf7a', g); ctx.fillRect(x + w * 0.18, y + h * 0.46, w * 0.64, h * 0.26);
    ctx.fillStyle = C('#ffd34d', g); circ(x + w * 0.7, y + h * 0.3, w * 0.07); ctx.fill();
    ctx.fillStyle = C('#e6b422', 0); circ(x + w * 0.25, y + h * 0.66, w * 0.035); ctx.fill();
  },
  sill(o, x, y, w, h, g) {
    ctx.fillStyle = C('#9b6b49', g); rr(x + 4, y + 2, w - 8, h * 0.55, 4); ctx.fill();
    if (!G.flag('dewTaken')) { ctx.fillStyle = C('#c0c4cc', g); rr(x + w * 0.4, y + h * 0.05, w * 0.2, h * 0.25, 3); ctx.fill(); ctx.fillStyle = C('#9fd6ff', g); circ(x + w * 0.5, y + h * 0.06, w * 0.07); ctx.fill(); }
    ctx.fillStyle = C('#e88fa7', g); circ(x + w * 0.2, y + h * 0.15, w * 0.1); ctx.fill();
  },
  clock(o, x, y, w, h, g) {
    ctx.fillStyle = C('#7a543b', g); rr(x + w * 0.2, y - h * 0.5, w * 0.6, h * 1.4, 6); ctx.fill();
    ctx.fillStyle = C('#f4efe2', g); circ(x + w * 0.5, y - h * 0.15, w * 0.22); ctx.fill();
    ctx.strokeStyle = C('#333333', g); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + w * 0.5, y - h * 0.15); ctx.lineTo(x + w * 0.5, y - h * 0.3); ctx.moveTo(x + w * 0.5, y - h * 0.15); ctx.lineTo(x + w * 0.6, y - h * 0.1); ctx.stroke();
    ctx.fillStyle = C('#cfe6ff', g, 0.5); rr(x + w * 0.3, y + h * 0.2, w * 0.4, h * 0.55, 3); ctx.fill();
    if (!G.flag('sunTaken')) { ctx.fillStyle = C('#ffd34d', g); circ(x + w * 0.5, y + h * 0.6, w * 0.1); ctx.fill(); }
  },
  hearth(o, x, y, w, h, g, t) {
    ctx.fillStyle = C('#a9a39b', g); rr(x + 2, y + 2, w - 4, h - 4, 6); ctx.fill();
    ctx.fillStyle = C('#3a2e2a', g); rr(x + w * 0.2, y + h * 0.25, w * 0.6, h * 0.55, 8); ctx.fill();
    const f = 0.8 + 0.2 * Math.sin(t * 9);
    ctx.fillStyle = C('#ff9a3c', g * 0.6); ctx.beginPath(); ctx.ellipse(x + w * 0.5, y + h * 0.66, w * 0.18 * f, h * 0.12 * f, 0, 0, 7); ctx.fill();
    ctx.fillStyle = C('#ffd27a', g * 0.6); ctx.beginPath(); ctx.ellipse(x + w * 0.5, y + h * 0.68, w * 0.09 * f, h * 0.07 * f, 0, 0, 7); ctx.fill();
  },
  table(o, x, y, w, h, g) {
    ctx.fillStyle = C('#9b6b49', g); rr(x + 2, y + 6, w - 4, h - 10, 8); ctx.fill();
    ctx.fillStyle = C('#b5835d', g); rr(x + 6, y + 9, w - 12, h * 0.3, 6); ctx.fill();
  },
  bowl(o, x, y, w, h, g) {
    ctx.fillStyle = C('#9b6b49', g); rr(x - 2, y + 6, w * 0.6, h - 10, 8); ctx.fill();
    ctx.fillStyle = C('#e9e3d6', g); ctx.beginPath(); ctx.ellipse(x + w * 0.45, y + h * 0.45, w * 0.3, h * 0.16, 0, 0, 7); ctx.fill();
    if (!G.flag('berriesTaken')) { ctx.fillStyle = C('#4b3a8c', g); [[0.35, 0.4], [0.5, 0.38], [0.45, 0.47], [0.58, 0.45]].forEach(([a, b]) => { circ(x + w * a, y + h * b, w * 0.06); ctx.fill(); }); }
  },
  fairy(o, x, y, w, h, g, t) {
    const fx = x + w * 0.5 + Math.sin(t * 1.3) * w * 0.15, fy = y + h * 0.4 + Math.sin(t * 2.6) * h * 0.08;
    const gl = ctx.createRadialGradient(fx, fy, 0, fx, fy, TS * 0.45);
    gl.addColorStop(0, 'rgba(255,245,180,0.55)'); gl.addColorStop(1, 'rgba(255,245,180,0)');
    ctx.fillStyle = gl; circ(fx, fy, TS * 0.45); ctx.fill();
    const flap = Math.abs(Math.sin(t * 18));
    ctx.fillStyle = 'rgba(205,238,254,0.85)';
    ctx.beginPath(); ctx.ellipse(fx - TS * 0.09, fy - TS * 0.04, TS * 0.1 * (0.4 + flap * 0.6), TS * 0.06, -0.4, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(fx + TS * 0.09, fy - TS * 0.04, TS * 0.1 * (0.4 + flap * 0.6), TS * 0.06, 0.4, 0, 7); ctx.fill();
    ctx.fillStyle = '#a6e3a1'; rr(fx - TS * 0.04, fy - TS * 0.02, TS * 0.08, TS * 0.12, 3); ctx.fill();
    ctx.fillStyle = '#ffe1c4'; circ(fx, fy - TS * 0.06, TS * 0.045); ctx.fill();
    ctx.fillStyle = '#f2a65a'; circ(fx, fy - TS * 0.09, TS * 0.04); ctx.fill();
  },
  mortar(o, x, y, w, h, g) {
    ctx.fillStyle = C('#9b6b49', g); rr(x + 4, y + h * 0.35, w - 8, h * 0.6, 4); ctx.fill();
    ctx.fillStyle = C('#b9b4ad', g); ctx.beginPath(); ctx.ellipse(x + w / 2, y + h * 0.35, w * 0.3, h * 0.2, 0, 0, 7); ctx.fill();
    ctx.fillStyle = C('#77736d', g); ctx.beginPath(); ctx.ellipse(x + w / 2, y + h * 0.32, w * 0.2, h * 0.1, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = C('#d8d3cc', g); ctx.lineWidth = TS * 0.09; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x + w * 0.5, y + h * 0.3); ctx.lineTo(x + w * 0.75, y + h * 0.02); ctx.stroke(); ctx.lineCap = 'butt';
  },
  bench(o, x, y, w, h, g) {
    ctx.fillStyle = C('#7f5539', g); ctx.fillRect(x + 6, y + h * 0.5, 6, h * 0.45); ctx.fillRect(x + w - 12, y + h * 0.5, 6, h * 0.45);
    ctx.fillStyle = C('#a9764f', g); rr(x + 2, y + h * 0.15, w - 4, h * 0.45, 4); ctx.fill();
    ctx.fillStyle = C('#c99a6e', g); ctx.fillRect(x + 6, y + h * 0.2, w - 12, 3);
    ctx.fillStyle = C('#8c8c96', g); ctx.fillRect(x + w * 0.6, y + h * 0.25, w * 0.18, 5); ctx.fillStyle = C('#7f5539', g); ctx.fillRect(x + w * 0.52, y + h * 0.24, w * 0.09, 7);
  },
  rug(o, x, y, w, h, g) {
    ctx.fillStyle = C('#c9758c', g); ctx.beginPath(); ctx.ellipse(x + w / 2, y + h / 2, w * 0.48, h * 0.45, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = C('#f2d27a', g); ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x + w / 2, y + h / 2, w * 0.4, h * 0.36, 0, 0, 7); ctx.stroke();
    ctx.fillStyle = C('#e8a2b4', g); ctx.beginPath(); ctx.ellipse(x + w / 2, y + h / 2, w * 0.22, h * 0.2, 0, 0, 7); ctx.fill();
    ctx.fillStyle = C('#8a5a3c', g); circ(x + w * 0.5, y + h * 0.88, TS * 0.06); ctx.fill();
  },
  rugrolled(o, x, y, w, h, g) {
    ctx.fillStyle = C('#c9758c', g); rr(x + w * 0.2, y + 4, w * 0.5, h - 8, w * 0.25); ctx.fill();
    ctx.strokeStyle = C('#f2d27a', g); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + w * 0.45, y + 6); ctx.lineTo(x + w * 0.45, y + h - 6); ctx.stroke();
  },
  trapdoor(o, x, y, w, h, g) {
    ctx.fillStyle = C('#7a543b', g); rr(x + 2, y + h * 0.15, w - 4, h * 0.7, 4); ctx.fill();
    ctx.fillStyle = C('#5f412d', g); for (let i = 1; i < 4; i++) ctx.fillRect(x + 4, y + h * 0.15 + i * h * 0.17, w - 8, 2);
    ctx.strokeStyle = C('#3a3a3a', g); ctx.lineWidth = 3; circ(x + w / 2, y + h * 0.5, TS * 0.1); ctx.stroke();
  },
  bureau(o, x, y, w, h, g) {
    ctx.fillStyle = C('#8a5a3c', g); rr(x + 2, y - h * 0.3, w - 4, h * 1.2, 6); ctx.fill();
    ctx.fillStyle = C('#a9764f', g); for (let i = 0; i < 3; i++) { rr(x + 7, y - h * 0.22 + i * h * 0.36, w - 14, h * 0.3, 3); ctx.fill(); }
    ctx.fillStyle = C('#e7c36a', g); for (let i = 0; i < 3; i++) { circ(x + w / 2, y - h * 0.07 + i * h * 0.36, 3); ctx.fill(); }
    if (!G.flag('bookFound')) { ctx.fillStyle = C('#c99a3e', g); for (let i = 0; i < 3; i++) { circ(x + w * 0.35 + i * w * 0.15, y - h * 0.28, 4); ctx.fill(); } }
  },
  cupboard(o, x, y, w, h, g) {
    ctx.fillStyle = C('#9b6b49', g); rr(x + 3, y - h * 0.35, w - 6, h * 1.25, 4); ctx.fill();
    ctx.fillStyle = C('#b5835d', g); rr(x + 7, y - h * 0.28, w / 2 - 9, h * 1.1, 3); ctx.fill(); rr(x + w / 2 + 2, y - h * 0.28, w / 2 - 9, h * 1.1, 3); ctx.fill();
    ctx.fillStyle = C('#e7c36a', g); circ(x + w / 2 - 4, y + h * 0.3, 2.5); ctx.fill(); circ(x + w / 2 + 4, y + h * 0.3, 2.5); ctx.fill();
  },
  vase(o, x, y, w, h, g) {
    ctx.fillStyle = C('#6fa3c9', g); ctx.beginPath(); ctx.ellipse(x + w / 2, y + h * 0.62, w * 0.22, h * 0.28, 0, 0, 7); ctx.fill();
    ctx.fillRect(x + w * 0.42, y + h * 0.22, w * 0.16, h * 0.2);
    if (!G.flag('quillsTaken')) { ctx.fillStyle = C('#ffffff', g); ctx.beginPath(); ctx.ellipse(x + w * 0.42, y + h * 0.05, w * 0.06, h * 0.22, -0.3, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(x + w * 0.6, y + h * 0.02, w * 0.06, h * 0.24, 0.3, 0, 7); ctx.fill(); }
  },
  basket(o, x, y, w, h, g) {
    ctx.fillStyle = C('#c99a5e', g); rr(x + w * 0.15, y + h * 0.4, w * 0.7, h * 0.45, 8); ctx.fill();
    ctx.strokeStyle = C('#a87a42', g); ctx.lineWidth = 2; for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x + w * 0.15 + i * w * 0.175, y + h * 0.42); ctx.lineTo(x + w * 0.15 + i * w * 0.175, y + h * 0.83); ctx.stroke(); }
    ctx.fillStyle = C('#e88fa7', g); circ(x + w * 0.38, y + h * 0.38, w * 0.1); ctx.fill(); ctx.fillStyle = C('#7fb3e8', g); circ(x + w * 0.6, y + h * 0.36, w * 0.09); ctx.fill();
  },
  door(o, x, y, w, h, g) {
    const open = G.flag('doorOpen');
    ctx.fillStyle = open ? C('#cfe9b8', g) : C('#7a543b', g); rr(x + w * 0.12, y + 2, w * 0.76, h - 2, 6); ctx.fill();
    if (!open) { ctx.fillStyle = C('#5f412d', g); ctx.fillRect(x + w * 0.48, y + 4, 2, h - 6); ctx.fillStyle = C('#e7c36a', g); circ(x + w * 0.7, y + h * 0.55, 3); ctx.fill(); }
  },
  stairs(o, x, y, w, h, g) {
    ctx.fillStyle = C('#8e6448', g); for (let i = 0; i < 4; i++) { ctx.fillRect(x + 4, y + i * h / 4 + 2, w - 8, h / 4 - 3); }
    ctx.fillStyle = 'rgba(255,240,200,0.25)'; ctx.fillRect(x + 4, y + 2, w - 8, h / 4 - 3);
  },
  jars(o, x, y, w, h, g) {
    ctx.fillStyle = C('#7a543b', g); ctx.fillRect(x + 2, y + h * 0.7, w - 4, 5);
    ['#a8c97a', '#d9a066', '#9fb3d9', '#c9a0d9'].forEach((c, i) => { ctx.fillStyle = C(c, g); rr(x + 6 + i * (w - 12) / 4, y + h * 0.3, (w - 12) / 4 - 4, h * 0.4, 3); ctx.fill(); });
  },
  keyhook(o, x, y, w, h, g) {
    ctx.fillStyle = C('#555555', g); ctx.fillRect(x + w * 0.48, y + h * 0.4, 3, h * 0.2);
    ctx.strokeStyle = C('#8a8a8a', g); ctx.lineWidth = 3; circ(x + w * 0.5, y + h * 0.7, TS * 0.07); ctx.stroke();
    ctx.fillStyle = C('#8a8a8a', g); ctx.fillRect(x + w * 0.48, y + h * 0.75, 3, h * 0.25);
  },
  crate(o, x, y, w, h, g) {
    ctx.fillStyle = C('#b08a5a', g); rr(x + 4, y + 4, w - 8, h - 8, 3); ctx.fill();
    ctx.strokeStyle = C('#8a6a40', g); ctx.lineWidth = 3; ctx.strokeRect(x + 7, y + 7, w - 14, h - 14); ctx.beginPath(); ctx.moveTo(x + 7, y + 7); ctx.lineTo(x + w - 7, y + h - 7); ctx.stroke();
    ctx.fillStyle = C('#e8cf7a', g); ctx.fillRect(x + 8, y + 2, w - 16, 5);
  },
  hutx(o, x, y, w, h, g) {
    ctx.fillStyle = 'rgba(30,40,30,0.2)'; ctx.beginPath(); ctx.ellipse(x + w / 2, y + h - 4, w * 0.55, h * 0.15, 0, 0, 7); ctx.fill();
    ctx.fillStyle = C('#d9c3a0', g); rr(x + w * 0.08, y + h * 0.35, w * 0.84, h * 0.65, 6); ctx.fill();
    ctx.fillStyle = C('#a0566b', g); ctx.beginPath(); ctx.moveTo(x - w * 0.04, y + h * 0.42); ctx.lineTo(x + w * 0.5, y - h * 0.25); ctx.lineTo(x + w * 1.04, y + h * 0.42); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C('#bf6f84', g); ctx.beginPath(); ctx.moveTo(x + w * 0.1, y + h * 0.35); ctx.lineTo(x + w * 0.5, y - h * 0.15); ctx.lineTo(x + w * 0.3, y + h * 0.35); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C('#a9a39b', g); ctx.fillRect(x + w * 0.7, y - h * 0.1, w * 0.1, h * 0.3);
    const open = G.flag('doorOpen');
    ctx.fillStyle = C(open ? '#3a2e2a' : '#7a543b', g); rr(x + w * 0.36, y + h * 0.62, w * 0.2, h * 0.38, 5); ctx.fill();
    ctx.fillStyle = C('#cfeaff', g); rr(x + w * 0.66, y + h * 0.55, w * 0.16, h * 0.18, 3); ctx.fill(); rr(x + w * 0.14, y + h * 0.55, w * 0.14, h * 0.18, 3); ctx.fill();
  },
  lantern(o, x, y, w, h, g, t) {
    const lit = S.lanterns[o.id];
    ctx.fillStyle = C('#4a4a52', lit ? 0 : g); ctx.fillRect(x + w * 0.46, y - h * 0.3, w * 0.08, h * 1.15);
    ctx.fillStyle = C('#5c5c66', lit ? 0 : g); rr(x + w * 0.3, y - h * 0.55, w * 0.4, h * 0.38, 4); ctx.fill();
    if (lit) { const gl = ctx.createRadialGradient(x + w / 2, y - h * 0.36, 0, x + w / 2, y - h * 0.36, TS * 0.6); gl.addColorStop(0, 'rgba(255,215,120,0.9)'); gl.addColorStop(1, 'rgba(255,215,120,0)'); ctx.fillStyle = gl; circ(x + w / 2, y - h * 0.36, TS * 0.6); ctx.fill(); }
    ctx.fillStyle = lit ? '#ffe39a' : C('#8a8a96', g); rr(x + w * 0.36, y - h * 0.48, w * 0.28, h * 0.24, 3); ctx.fill();
  },
  berrybush(o, x, y, w, h, g) {
    ctx.fillStyle = C('#4f9a57', g); circ(x + w / 2, y + h * 0.55, w * 0.44); ctx.fill();
    ctx.fillStyle = C('#4b3a8c', g); [[0.3, 0.45], [0.55, 0.35], [0.65, 0.6], [0.4, 0.7], [0.5, 0.52]].forEach(([a, b]) => { circ(x + w * a, y + h * b, w * 0.07); ctx.fill(); });
  },
  shimmerflower(o, x, y, w, h, g, t) {
    ctx.strokeStyle = C('#4f9a57', g); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + w / 2, y + h * 0.9); ctx.lineTo(x + w / 2, y + h * 0.45); ctx.stroke();
    const hue = (t * 60) % 360;
    for (let i = 0; i < 5; i++) { const a = i * 1.256 + t * 0.4; ctx.fillStyle = `hsla(${(hue + i * 40) % 360},80%,80%,${1 - g * 0.6})`; circ(x + w / 2 + Math.cos(a) * w * 0.13, y + h * 0.4 + Math.sin(a) * w * 0.13, w * 0.1); ctx.fill(); }
    ctx.fillStyle = '#fff6c8'; circ(x + w / 2, y + h * 0.4, w * 0.06); ctx.fill();
  },
  pickup(o, x, y, w, h, g, t) {
    const b = Math.sin(t * 3 + o.tx) * TS * 0.05;
    ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.beginPath(); ctx.ellipse(x + w / 2, y + h * 0.75, w * 0.2, h * 0.07, 0, 0, 7); ctx.fill();
    ctx.font = `${Math.round(TS * 0.5)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(o.icon, x + w / 2, y + h * 0.5 + b);
    if (Math.sin(t * 2.3 + o.ty) > 0.6) star(x + w * 0.75, y + h * 0.25 + b, TS * 0.07, 'rgba(255,255,230,0.9)');
  },
  well(o, x, y, w, h, g) {
    ctx.fillStyle = C('#a9a39b', g); circ(x + w / 2, y + h * 0.55, w * 0.42); ctx.fill();
    ctx.fillStyle = C('#3c5a78', g); circ(x + w / 2, y + h * 0.55, w * 0.27); ctx.fill();
    ctx.fillStyle = C('#8a5a3c', g); ctx.fillRect(x + w * 0.1, y - h * 0.2, 4, h * 0.6); ctx.fillRect(x + w * 0.86, y - h * 0.2, 4, h * 0.6);
    ctx.fillStyle = C('#a0566b', g); ctx.fillRect(x + w * 0.02, y - h * 0.3, w * 0.96, h * 0.15);
  },
};

// ---------------------------------------------------------------- creatures & hero
function drawCreature(c, t) {
  const x = c.x * TS - camX, y = c.y * TS - camY;
  const s = TS;
  if (c.mode === 'hexed') {
    const wob = Math.sin(t * 2 + c.x) * 0.05;
    ctx.fillStyle = 'rgba(40,20,60,0.25)'; ctx.beginPath(); ctx.ellipse(x, y + s * 0.25, s * 0.28, s * 0.08, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#6e5a86'; ctx.beginPath(); ctx.ellipse(x, y, s * (0.27 + wob), s * (0.25 - wob), 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#8b74a6';
    for (let i = 0; i < 6; i++) { const a = i * 1.047 + t * 0.5; circ(x + Math.cos(a) * s * 0.24, y + Math.sin(a) * s * 0.21, s * 0.07); ctx.fill(); }
    ctx.strokeStyle = 'rgba(210,170,255,0.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, s * 0.12, t * 2, t * 2 + 4); ctx.stroke();
    ctx.fillStyle = '#e8d8ff'; circ(x - s * 0.1, y - s * 0.08, s * 0.045); ctx.fill(); circ(x + s * 0.1, y - s * 0.08, s * 0.045); ctx.fill();
    ctx.fillStyle = '#3a2a4a'; circ(x - s * 0.1, y - s * 0.07, s * 0.022); ctx.fill(); circ(x + s * 0.1, y - s * 0.07, s * 0.022); ctx.fill();
    ctx.strokeStyle = '#3a2a4a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y + s * 0.08, s * 0.06, 3.6, 5.8); ctx.stroke();
    return;
  }
  const sp = c.def.species, f = c.face;
  ctx.save(); ctx.translate(x, y); ctx.scale(f, 1);
  if (sp === 'butterfly') {
    const flap = Math.abs(Math.sin(t * 10 + c.x));
    ctx.fillStyle = '#ffb3d9'; ctx.beginPath(); ctx.ellipse(-s * 0.1, -s * 0.05, s * 0.12 * (0.3 + flap * 0.7), s * 0.1, -0.4, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(s * 0.1, -s * 0.05, s * 0.12 * (0.3 + flap * 0.7), s * 0.1, 0.4, 0, 7); ctx.fill();
    ctx.fillStyle = '#ff8fc4'; ctx.beginPath(); ctx.ellipse(-s * 0.08, s * 0.06, s * 0.07 * (0.3 + flap * 0.7), s * 0.06, 0.3, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(s * 0.08, s * 0.06, s * 0.07 * (0.3 + flap * 0.7), s * 0.06, -0.3, 0, 7); ctx.fill();
    ctx.fillStyle = '#5a4060'; rr(-s * 0.02, -s * 0.12, s * 0.04, s * 0.22, 2); ctx.fill();
  } else if (sp === 'firefly') {
    const gl = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 0.35); gl.addColorStop(0, 'rgba(255,250,150,0.8)'); gl.addColorStop(1, 'rgba(255,250,150,0)');
    ctx.fillStyle = gl; circ(0, 0, s * 0.35); ctx.fill();
    ctx.fillStyle = '#5a5040'; circ(0, -s * 0.03, s * 0.05); ctx.fill(); ctx.fillStyle = '#fffaa0'; circ(0, s * 0.05, s * 0.06); ctx.fill();
  } else if (sp === 'frog') {
    const hop = Math.abs(Math.sin(c.t * 3)) * s * 0.05;
    ctx.fillStyle = '#7fd36b'; ctx.beginPath(); ctx.ellipse(0, s * 0.05 - hop, s * 0.22, s * 0.16, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffffff'; circ(-s * 0.09, -s * 0.09 - hop, s * 0.06); ctx.fill(); circ(s * 0.09, -s * 0.09 - hop, s * 0.06); ctx.fill();
    ctx.fillStyle = '#222'; circ(-s * 0.09, -s * 0.09 - hop, s * 0.03); ctx.fill(); circ(s * 0.09, -s * 0.09 - hop, s * 0.03); ctx.fill();
  } else if (sp === 'bunny') {
    const hop = Math.abs(Math.sin(c.t * 5)) * s * 0.06;
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.beginPath(); ctx.ellipse(0, s * 0.22, s * 0.2, s * 0.06, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#f4f0ea'; ctx.beginPath(); ctx.ellipse(0, s * 0.06 - hop, s * 0.2, s * 0.15, 0, 0, 7); ctx.fill();
    circ(s * 0.13, -s * 0.06 - hop, s * 0.1); ctx.fill();
    ctx.beginPath(); ctx.ellipse(s * 0.1, -s * 0.24 - hop, s * 0.035, s * 0.11, -0.2, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(s * 0.17, -s * 0.23 - hop, s * 0.035, s * 0.11, 0.2, 0, 7); ctx.fill();
    ctx.fillStyle = '#f7b3c4'; circ(s * 0.22, -s * 0.05 - hop, s * 0.02); ctx.fill();
    ctx.fillStyle = '#333'; circ(s * 0.16, -s * 0.08 - hop, s * 0.018); ctx.fill();
    ctx.fillStyle = '#ffffff'; circ(-s * 0.19, s * 0.04 - hop, s * 0.05); ctx.fill();
  } else { // chipmunk
    const hop = Math.abs(Math.sin(c.t * 7)) * s * 0.04;
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.beginPath(); ctx.ellipse(0, s * 0.2, s * 0.17, s * 0.05, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#b8743f'; ctx.beginPath(); ctx.ellipse(-s * 0.17, -s * 0.06 - hop, s * 0.06, s * 0.16, -0.5, 0, 7); ctx.fill();
    ctx.fillStyle = '#c98a55'; ctx.beginPath(); ctx.ellipse(0, s * 0.06 - hop, s * 0.15, s * 0.12, 0, 0, 7); ctx.fill();
    circ(s * 0.11, -s * 0.04 - hop, s * 0.085); ctx.fill();
    ctx.fillStyle = '#5a3a22'; ctx.fillRect(-s * 0.08, -s * 0.02 - hop, s * 0.14, s * 0.025);
    ctx.fillStyle = '#f3e2c8'; ctx.beginPath(); ctx.ellipse(s * 0.02, s * 0.1 - hop, s * 0.08, s * 0.05, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#222'; circ(s * 0.14, -s * 0.06 - hop, s * 0.018); ctx.fill();
  }
  ctx.restore();
}
function drawHero(t) {
  const x = S.px * TS - camX, y = S.py * TS - camY, s = TS;
  const moving = joy || keys['arrowleft'] || keys['arrowright'] || keys['arrowup'] || keys['arrowdown'] || keys['a'] || keys['d'] || keys['w'] || keys['s'];
  const bob = moving && !paused ? Math.abs(Math.sin((S.walk || 0))) * s * 0.04 : 0;
  if (lightT > 0) {
    const gl = ctx.createRadialGradient(x, y, 0, x, y, s * 1.2);
    gl.addColorStop(0, 'rgba(255,240,170,0.35)'); gl.addColorStop(1, 'rgba(255,240,170,0)');
    ctx.fillStyle = gl; circ(x, y, s * 1.2); ctx.fill();
  }
  ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(x, y + s * 0.3, s * 0.24, s * 0.07, 0, 0, 7); ctx.fill();
  ctx.save(); ctx.translate(x, y - bob); ctx.scale(S.dir, 1);
  // robe
  ctx.fillStyle = '#7b6fd6'; ctx.beginPath(); ctx.moveTo(-s * 0.22, s * 0.28); ctx.quadraticCurveTo(-s * 0.18, -s * 0.05, 0, -s * 0.08); ctx.quadraticCurveTo(s * 0.18, -s * 0.05, s * 0.22, s * 0.28); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#9a90e8'; ctx.fillRect(-s * 0.2, s * 0.2, s * 0.4, s * 0.05);
  // face
  ctx.fillStyle = '#f6d7b0'; circ(0, -s * 0.15, s * 0.14); ctx.fill();
  ctx.fillStyle = '#3a2a2a'; circ(s * 0.05, -s * 0.15, s * 0.02); ctx.fill();
  ctx.fillStyle = '#f2a0a0'; circ(s * 0.08, -s * 0.1, s * 0.025); ctx.fill();
  // hat
  ctx.fillStyle = '#5b4fb6'; ctx.beginPath(); ctx.ellipse(0, -s * 0.24, s * 0.22, s * 0.06, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-s * 0.13, -s * 0.25); ctx.lineTo(-s * 0.05, -s * 0.62); ctx.lineTo(s * 0.13, -s * 0.25); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffd34d'; star(-s * 0.02, -s * 0.38, s * 0.05, '#ffd34d');
  // book on hip once found
  if (G.flag('bookFound')) { ctx.fillStyle = '#8a4a3c'; rr(-s * 0.26, s * 0.02, s * 0.12, s * 0.15, 2); ctx.fill(); ctx.fillStyle = '#ffd34d'; ctx.fillRect(-s * 0.21, s * 0.05, s * 0.02, s * 0.09); }
  ctx.restore();
  if (seeker) {
    ctx.fillStyle = 'rgba(190,230,255,0.9)'; circ(x + Math.cos(seeker.t * 3.2) * s * 0.3, y - s * 0.1 + Math.sin(seeker.t * 3.2) * s * 0.15, s * 0.1); ctx.fill();
  }
}

// ================================================================ title / start
function startGame(fresh) {
  if (fresh) {
    S = newState();
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { }
  } else {
    S = Object.assign(newState(), loadSave());
  }
  // repair chain state from a save made mid-sequence
  if (S.flags.chainChip) { S.flags.chipsInHollow = true; if (!S.clues.find(c => c.id === 'chipmunks')) S.clues.push({ id: 'chipmunks', text: CLUES.chipmunks, done: false }); }
  for (const k in S.zones) zoneDisp[k] = S.zones[k];
  rebuildSolids(); spawnCreatures();
  $('title').classList.add('hide');
  started = true; hudCache = '';
  audioInit();
  if (fresh) {
    say(['You wake up in your little hut.',
      'Everything is... gray. The quilt, the walls, even the light through the window.',
      'Something glows faintly, up on the high shelf.',
      '(Slide your finger anywhere on the screen to walk. When you are close to something, a button appears. Tap it to look or use.)']);
  } else toast('Welcome back to Hexwood');
  save();
}
$('btnNew').addEventListener('click', () => {
  if (loadSave() && !confirm('Start a new game? Your saved game will be replaced.')) return;
  startGame(true);
});
$('btnCont').addEventListener('click', () => startGame(false));
if (!loadSave()) $('btnCont').style.display = 'none';
$('ver').textContent = VERSION;

requestAnimationFrame(frame);
