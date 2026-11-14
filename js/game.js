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
const vnoise = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy; };

// ================================================================ maps
const SOLID_TILES = new Set(['#', 'w', 'D', 'T', 'B', 'b', 'R', 'h', 'O', 'H', '~', 'x', 'K', 't']);
const OUTDOOR = ['out', 'road', 'village'];
const MAPS = {};
function addMap(id, rows, dark) {
  MAPS[id] = { id, rows: rows.map(r => r.split('')), w: rows[0].length, h: rows.length, objs: OBJECTS.filter(o => o.map === id), solid: null };
  MAPS[id].objs.forEach(o => { o.tw = o.tw || 1; o.th = o.th || 1; if (o.solid === undefined) o.solid = true; o.layer = o.layer || 'normal'; });
}
addMap('hut', HUT_MAP);
addMap('cellar', CELLAR_MAP);
addMap('out', buildOutdoor());
addMap('road', buildRoad());
addMap('village', buildVillage());

// ================================================================ state
const SAVE_KEY = 'hexwood_save_v1';  // v2 keeps the same save slot
let S = null;
function newState() {
  return {
    ver: 1, map: 'hut', px: 3.5, py: 3.5, dir: 1,
    flags: {}, inv: {}, pouch: [], pages: {}, late: {}, revealed: {}, lanterns: {}, freed: {},
    zones: { hut: 1, cellar: 1, grove: 1, stones: 1, yard: 1, meadow: 1, brook: 1, hollow: 1, road: 1, village: 1, v_bakery: 1, v_home1: 1, v_smithy: 1, v_home2: 1 },
    cut: {}, visited: {},
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
let fairyRT = null;        // Fennel's position when she follows you outdoors

// ================================================================ G: helpers used by data.js
const G = {
  flag: (k) => k === 'fairyOutNow' ? !!S.fairyOut : !!S.flags[k],
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
    startFade(() => { S.map = map; S.px = x; S.py = y; curZone = null; if (!OUTDOOR.includes(map)) { S.fairyOut = false; fairyRT = null; } else if (fairyRT) { fairyRT = { x: x - 0.8, y: y - 0.8 }; }
      if (!S.visited[map]) { S.visited[map] = true; if (map === 'village') setTimeout(() => notice(`🏘️ Welcome to ${VILLAGE_NAME}. Every house is gray and hexed... but you can help.`), 1200); } spawnCreatures(); save(); });
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
  orbsNeedingCharge: () => S.pouch.some(p => SPELL_ITEMS[p.type].shape === 'orb' && p.charges < (p.max || S.maxCharge)),
  recharge() {
    S.pouch.forEach(p => { if (SPELL_ITEMS[p.type].shape === 'orb') p.charges = p.max || S.maxCharge; });
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
    notice(`${it.icon} You found a curio: ${it.name}! ${it.desc}`, 'journal');
  },
  burstAt(x, y, c) { burst(x, y, c, 24); },
  unbandedOrbs: () => S.pouch.filter(p => SPELL_ITEMS[p.type].shape === 'orb' && !p.band),
  visitShop(st) { visitShop(st); },
  openHome1() {
    S.flags.home1Open = true; rebuildSolids(); chime(3); burst(16, 11, '#c8f0a0', 30);
    G.setZone('v_home1', 0); spawnCreatures(); save();
    say(['You hack away the hexed vines. They curl up and crumble to dust.', 'The door swings open, and a family of squirrels scampers in from the trees. They chatter at you happily.']);
  },
  openHome2() {
    S.flags.home2Open = true; chime(3); burst(16, 17.5, '#fff3b0', 30);
    G.setZone('v_home2', 0); spawnCreatures(); save();
    say(['You hold your light to the window. The darkness inside shrinks back, then bursts like a soap bubble.',
      'Warm light fills Lantern Cottage... and here come the chipmunks from the hollow, all six of them, to move in!']);
  },
  openChest() {
    S.flags.chestOpen = true; chime(4); burst(7.5, 2.5, '#fff3b0', 30);
    S.inv.boots = 1; G.give('wisp'); save();
    resolveClue('birds');
    say(['The old chest creaks open. Inside: a pair of sturdy walking boots and a glowing Wisp Feather.', 'You pull the boots on. They fit perfectly, and your steps feel lighter.']);
  },
  hollowCheck() {
    if (G.flag('acornTaken') && G.flag('hollowWisp')) {
      resolveClue('chipmunks');
      G.setZone('hollow', 0);
    }
  },
};

// ================================================================ zones
function allZones() { return [].concat(ZONES.hut, ZONES.cellar, ZONES.out, ZONES.road, ZONES.village); }
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
  const r = 1 - zg, h = vnoise(tx / 3.2, ty / 3.2) * 0.75 + hash(tx, ty) * 0.25;
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
  if (c === 't') return !S.cut[map + ':' + tx + ',' + ty];
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
  creatures = CREATURES.filter(d => d.map === S.map && !(d.species === 'chipmunk' && G.flag('home2Open'))).map(d => {
    const c = { def: d, id: d.id, x: d.x, y: d.y, hx: d.x, hy: d.y, mode: S.freed[d.id] ? 'free' : 'hexed', t: Math.random() * 10, tx: d.x, ty: d.y, path: null, gone: false, face: 1 };
    if (d.lead && G.flag(d.lead.flag)) { c.hx = c.x = d.lead.x; c.hy = c.y = d.lead.y; }
    if (d.species === 'chipmunk' && G.flag('chipsInHollow')) {
      const i = CREATURES.filter(k => k.species === 'chipmunk').indexOf(d);
      c.hx = c.x = 2.6 + (i % 3) * 1.4; c.hy = c.y = 2.6 + Math.floor(i / 3) * 1.6;
    }
    if (d.lead && S.freed[d.id] && !G.flag(d.lead.flag)) { c.mode = 'lead'; }
    if (d.species === 'bird' && G.flag('chainBird')) c.gone = true;   // the songbirds now live by the library
    return c;
  });
  RESIDENTS.filter(r => r.map === S.map && r.when()).forEach(r => creatures.push({ def: r, id: r.id, x: r.x, y: r.y, hx: r.x, hy: r.y, mode: 'free', t: Math.random() * 10, tx: r.x, ty: r.y, face: 1, resident: true }));
}
function speciesName(s) { return { chipmunk: 'chipmunk', butterfly: 'butterfly', bunny: 'bunny', frog: 'frog', firefly: 'firefly', bird: 'songbird', mouse: 'mouse', squirrel: 'squirrel', badger: 'badger' }[s] || s; }

function unhex(c) {
  const d = c.def;
  S.freed[d.id] = true;
  burst(c.x, c.y, '#fff6c8', 26);
  burst(c.x, c.y, '#d9b8ff', 14);
  sparkleSound();
  c.mode = 'free';
  toast(`✨ Freed a ${speciesName(d.species)}!`);
  if (d.reward) { G.give(d.reward.item, d.reward.n); toast(`The ${speciesName(d.species)} blinks up at you. ${d.reward.text}`, 4000); }
  if (d.lead) { c.mode = 'lead'; toast('🐇 The bunny looks back at you and hops a few steps, as if asking you to follow.', 4500); }
  save();
  // zone challenge: free every hexed creature
  if (FREE_ALL_ZONES.includes(d.zone)) {
    const all = CREATURES.filter(k => k.zone === d.zone);
    if (all.every(k => S.freed[k.id])) G.setZone(d.zone, 0);
  }
  // secret chain: six chipmunks (no hint until it completes)
  const chips = CREATURES.filter(k => k.species === 'chipmunk');
  if (!G.flag('chainChip') && chips.every(k => S.freed[k.id])) setTimeout(startChain, 900);
  const birds = CREATURES.filter(k => k.species === 'bird');
  if (!G.flag('chainBird') && d.species === 'bird' && birds.every(k => S.freed[k.id])) setTimeout(startBirdChain, 900);
}

function startChain() {
  S.flags.chainChip = true; rebuildSolids(); save();
  addClue('chipmunks');
  chime(4);
  notice('🎐 Something stirs in the forest... six chipmunks come scampering toward you!');
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
function startBirdChain() {
  S.flags.chainBird = true; rebuildSolids(); save();
  addClue('birds');
  chime(4);
  notice('🎶 Three songbirds circle above you, singing together. A feather-light note drifts down: a new clue is in your Journal.', 'journal');
  creatures.filter(c => c.def.species === 'bird' && !c.resident).forEach((c, i) => { c.mode = 'fly'; c.flyTo = { x: 7.8 + i * 0.4, y: 5.3 }; });
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
      burst(S.px, S.py - 1.5, '#fffbe0', 30);
      chime(3);
      notice('📜 A little note drifts down out of the sky. A new clue is in your Journal. The chipmunks want you to follow!', 'journal');
      chain.phase = 'lead'; chain.t = 0;
      chips.forEach(c => { c.mode = 'chainlead'; c.path = findPath('out', c.x, c.y, HOLLOW_DOOR.x, HOLLOW_DOOR.y); });
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
    if (c.mode === 'fly') {
      const dx = c.flyTo.x - c.x, dy = c.flyTo.y - c.y, d = Math.hypot(dx, dy);
      if (d < 0.2) { c.gone = true; burst(c.x, c.y, '#fff6c8', 10); if (S.map === 'village' && !creatures.some(k => k.mode === 'fly' && !k.gone)) spawnCreatures(); }
      else { c.x += dx / d * Math.min(d, 4 * dt); c.y += dy / d * Math.min(d, 4 * dt); c.face = dx < 0 ? -1 : 1; }
      continue;
    }
    if (c.mode === 'lead') {
      const L = c.def.lead;
      if (!c.path) c.path = findPath(S.map, c.x, c.y, L.x, L.y) || [];
      if (!leadWait(c)) followPath(c, dt, 2.4);
      if (c.path.length === 0) {
        c.mode = 'free'; c.hx = L.x; c.hy = L.y; G.setFlag(L.flag);
        burst(L.x, L.y, '#fff6c8', 20); chime(2); toast('🐇 The bunny stops and sniffs at something in the grass.', 3500);
      }
      continue;
    }
    // free: gentle wander near home
    if (sp === 'butterfly' || sp === 'firefly' || sp === 'bird') {
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

// ================================================================ notices (non-blocking)
function notice(text, kind) {
  toast(text, 5000, 'notice');
  S.log = S.log || [];
  S.log.unshift(text); if (S.log.length > 40) S.log.pop();
  if (kind === 'book') S.newBook = true;
  if (kind === 'journal') S.newJournal = true;
  hudCache = ''; save();
}

// ================================================================ lanterns, clues, pages
function kindle(id) {
  S.lanterns[id] = true;
  const o = MAPS.out.objs.find(o => o.id === id);
  burst(o.tx + 0.5, o.ty + 0.3, '#ffd27a', 24);
  chime(1);
  addLateEffect('lantern');
  save();
  const n = ['lantern1', 'lantern2', 'lantern3'].filter(k => S.lanterns[k]).length;
  if (n === 3) {
    S.flags.groveLit = true;
    G.setZone('grove', 0);
    notice('🏮 The third lantern catches. The shadows lift from the grove.');
  } else toast(`🏮 The old lantern flickers to life (${n} of 3)`, 3000);
}
function addLateEffect(k) {
  if (S.late[k]) return;
  S.late[k] = true; S.lateNew = S.lateNew || {}; S.lateNew[k] = true;
  setTimeout(() => notice('📖 Your Spellbook wrote down something new about this spell.', 'book'), 900);
  save();
}
function addClue(id) {
  if (S.clues.find(c => c.id === id)) return;
  S.clues.push({ id, text: CLUES[id], done: false, isNew: true }); S.newJournal = true; save();
}
function resolveClue(id) {
  const c = S.clues.find(c => c.id === id);
  if (c && !c.done) { c.done = true; save(); setTimeout(() => { chime(4); notice('📜 Clue solved! It\'s checked off in your Journal.', 'journal'); }, 700); }
}
function revealPage(p) {
  const pg = S.pages[p];
  if (!pg || pg.cast) return false;
  pg.cast = true; pg.isNew = true; save();
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
  } else if (item.type === 'kindlecube') {
    const target = MAPS[S.map].objs.find(o => o.kindle && !G.flag(o.kindle) && Math.hypot(S.px - clamp(S.px, o.tx, o.tx + o.tw), S.py - clamp(S.py, o.ty, o.ty + o.th)) < 1.4);
    if (!target) { say(['You turn the warm cube over in your hand. Nothing nearby wants to burn forever.', '(Stand right beside something that needs a fire, then cast it.)']); return; }
    S.pouch.splice(i, 1);
    kindleBuilding(target);
    if (revealPage('kindle')) setTimeout(() => learned('kindle'), 1500);
  } else if (item.type === 'seekerorb') {
    item.charges--; seeker = { t: 0 }; blip(600);
    save();
  }
}
function kindleBuilding(o) {
  S.flags[o.kindle] = true; rebuildSolids(); save();
  chime(4); burst(o.tx + o.tw / 2, o.ty + o.th / 2, '#ffb04a', 36);
  if (o.id === 'bakery') {
    G.setZone('v_bakery', 0); spawnCreatures();
    say(['The cube flares in your hand and leaps into the oven. The bricks glow orange, and the fire settles in to stay.',
      'Warm bread smell drifts out the door... and two rabbits hop in from the meadow, already tying on aprons.',
      'ROSIE: Oh! An oven that never goes cold! Come in, come in. Bring me ingredients and I\'ll bake you something lovely.']);
  } else if (o.id === 'smithy') {
    G.setZone('v_smithy', 0); spawnCreatures();
    say(['The cube flies into the forge with a roar. White-hot coals bloom and settle into a steady, endless glow.',
      'A badger in a leather apron trundles up the street, sniffing the air.',
      'BRUNO: A proper forge again! Bring me iron-stone and I\'ll make you something useful. A bite of something sweet wouldn\'t hurt either.']);
  }
}
function visitShop(st) {
  const talk = {
    bakery: ['ROSIE: Bring me two inkberries and two wild strawberries, and I\'ll bake you a berry tart. Two apples makes a turnover.', 'ROSIE: Everyone in this village has a sweet tooth. Bruno most of all.'],
    smithy: G.flag('macheteGot')
      ? ['BRUNO: Two iron-stones and a tart, and I\'ll wrap one of your orbs in a silver band. Twice the magic it can hold.']
      : ['BRUNO: You\'ll want a machete for all these vines and brambles. Two iron-stones, a bit of dry bark for the handle, and one of Rosie\'s berry tarts.', 'BRUNO: Rusty red rocks along the old road are full of iron.'],
  }[st];
  choice(st === 'bakery' ? 'ROSIE: Hello, dear! What\'ll it be?' : 'BRUNO: Hmph. Hello. Need something?', ['Talk', 'Trade', 'Goodbye'], i => { if (i === 0) say(talk); else if (i === 1) openStation(st); });
}
function learned(p) {
  chime(4);
  notice(`✨ New spell learned: ${PAGES[p].name}! Read its page in your Spellbook.`, 'book');
}
function castWrite(i) {
  const next = PAGE_ORDER.find(p => !S.pages[p]);
  if (!next) { say(['The powder sparkles on a blank page... but no words come yet.', '(More spells are coming in the next version of Hexwood!)']); return; }
  if (uncastCount() >= 3) { say(['The book feels heavy and full. Cast some of the spells already written before writing another.']); return; }
  if (!G.has('wisp')) { say(['Write needs a Wisp Feather to cast. They are rare... keep an eye out.']); return; }
  S.pouch.splice(i, 1);
  G.take('wisp');
  S.pages[next] = { cast: false, isNew: true };
  const first = revealPage('write');
  chime(3);
  burst(S.px, S.py, '#e6d6ff', 30);
  notice(`✒️ The Wisp Feather melts into light and words write themselves: a new formula, "${PAGES[next].unknown}".`, 'book');
  if (first) setTimeout(() => notice('✨ New spell learned: Write! Read its page in your Spellbook.', 'book'), 1200);
  if (S.map === 'hut' && S.zones.hut > 0) setTimeout(() => G.setZone('hut', 0), 1500);
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
  if (found.some(o => o.id === 'hollowgate')) { chime(3); notice('🔮 The hedge was only pretending! A narrow gap opens between the leaves.'); }
  else if (found.length) { chime(3); toast('🔮 Something hidden is revealed!', 3000); }
  else toast('🔮 Nothing hidden here.', 2200);
  if (first) setTimeout(() => learned('seeker'), 800);
  save();
}

// ================================================================ Fennel
const TREATS = ['honeycake', 'dew', 'button', 'honey', 'strawberry', 'inkberry', 'apple', 'berrytart', 'turnover'];
function treatsHeld() { return TREATS.filter(k => G.has(k)); }
function objPos(id) { const o = OBJECTS.find(o => o.id === id); return { map: o.map, x: o.tx + o.tw / 2, y: o.ty + o.th / 2 }; }
function fennelPos() {
  if (OUTDOOR.includes(S.map) && S.fairyOut && fairyRT) return { map: S.map, x: fairyRT.x, y: fairyRT.y };
  return objPos('fairy');
}
// Requests she makes as you progress. Handing over the item earns a hint and kindness.
function pendingRequest() {
  if (!G.flag('fairyFree')) return null;
  const given = (k) => S.given && S.given[k];
  // a request counts as met if you ever gave her that item, however you gave it
  if (!G.flag('bookFound') && !given('honeycake')) return { item: 'honeycake', ask: 'FENNEL: I\'m so hungry... Is there anything sweet in the cupboard? Those doors are far too heavy for me.' };
  if (G.flag('bookFound') && !(S.pages.write && S.pages.write.cast) && !given('dew')) return { item: 'dew', ask: 'FENNEL: I\'m parched. There\'s a thimble of dew on the windowsill, but it\'s heavier than I am.' };
  if (S.pages.write && S.pages.write.cast && !(S.pages.light && S.pages.light.cast) && !given('button')) return { item: 'button', ask: 'FENNEL: Ooh, that brass button in the sewing basket! It\'s so shiny. Could you bring it to me?' };
  if (G.flag('keyTaken') && !G.flag('unhexKnown')) return { item: 'honey', ask: 'FENNEL: Old Moss kept a jar of wildflower honey in the cellar. Bring me a taste and I\'ll teach you something wonderful. Something you\'ll need out there.' };
  return null;
}
function teachUnhex() {
  S.flags.unhexKnown = true; save();
  chime(4); burst(S.px, S.py - 0.5, '#d9b8ff', 30);
  return ['FENNEL: Wildflower honey! Oh, that tastes like summer.',
    'Fennel takes your hand and draws a little looping shape in the air. Your fingertips tingle.',
    'FENNEL: That\'s the un-hexing touch. Walk up to any hexed creature and tap it, gently.'];
}
// Kindness is kept quietly. It is never shown as a number.
function giveTreat(k) {
  const req = pendingRequest();
  G.take(k); S.favor = (S.favor || 0) + 1;
  S.given = S.given || {}; S.cut = S.cut || {}; S.visited = S.visited || {};
  for (const z of allZones()) if (S.zones[z.id] === undefined) S.zones[z.id] = 1; S.given[k] = true;
  burst(fennelPos().x, fennelPos().y, '#fff3b0', 16); blip(1400); save();
  let lines = [`You give Fennel the ${ITEMS[k].name}.`];
  if (k === 'honey' && !G.flag('unhexKnown')) return lines.concat(teachUnhex());
  if (S.fennelWants && S.fennelWants === k) {
    S.fennelWants = null; save();
    return lines.concat([`FENNEL: ${ITEMS[k].name}! Oh, I feel sparkly again. Now, what did you want enchanted?`]);
  }
  if (req && req.item === k) return lines;  // the thank-you and hint follow
  const thanks = ['FENNEL: For me? You\'re a treasure.', 'FENNEL: Oh, how lovely! Thank you, friend.', 'FENNEL: Mmm! You always know just what I like.', 'FENNEL: You spoil me. I won\'t forget it!'];
  return lines.concat([thanks[(S.favor || 0) % thanks.length]]);
}
function talkFairy() {
  const opts = ['Ask for a hint'], acts = [hintFairy];
  if (treatsHeld().length) { opts.push('Give a treat'); acts.push(treatMenu); }
  if (RECIPES.some(r => r.station === 'fairy' && S.pages[r.page])) { opts.push('Enchant something'); acts.push(() => openStation('fairy')); }
  opts.push('Goodbye'); acts.push(() => { });
  choice('FENNEL: Hello, friend! What can I do for you?', opts, i => acts[i]());
}
function treatMenu() {
  const t = treatsHeld();
  choice('Which treat?', t.map(k => `${ITEMS[k].icon} ${ITEMS[k].name}`).concat(['Never mind']), i => {
    if (i >= t.length) return;
    const req = pendingRequest();
    if (req && req.item === t[i] && req.item !== 'honey') say(giveTreat(t[i]).concat(['FENNEL: Just what I was hoping for! Now, let me think...'], smartHint()));
    else say(giveTreat(t[i]));
  });
}
function hintFairy() {
  const req = pendingRequest();
  if (req) {
    if (G.has(req.item)) {
      const lines = giveTreat(req.item);
      say(req.item === 'honey' ? lines : lines.concat(['FENNEL: Oh! Just what I wanted. Now, let me think...'], smartHint()));
    } else say([req.ask]);
    return;
  }
  say(smartHint());
}
// When her sparkle runs out she asks for one particular treat.
function fennelTired() {
  if (!S.fennelWants) S.fennelWants = S.flags.doorOpen ? (hash(S.time | 0, 3) < 0.5 ? 'strawberry' : 'inkberry') : 'inkberry';
  save();
  const where = { strawberry: 'some wild strawberries from the meadow', inkberry: 'a few inkberries' }[S.fennelWants];
  return [`FENNEL: Oh... I'm so tired, my sparkle has gone all dim. If you brought me ${where}, I'm sure I'd perk right up.`];
}
function smartHint() {
  const T = [];
  const F = (k) => G.flag(k), has = G.has, pg = S.pages;
  const at = (id, text) => { const p = objPos(id); T.push({ map: p.map, x: p.x, y: p.y, text }); };
  const now = (text) => T.push({ map: null, text });
  const nextFormula = PAGE_ORDER.find(p => !pg[p]);
  if (!F('bookFound')) at('bureau', 'Old Moss locked his spellbook in the bureau. "From high to low, as light falls." He hid little marks on things. Something high, something in the middle, something low. Look closely!');
  // Write: only when there is a page to write and a feather to pay with
  if (pg.write && nextFormula && has('wisp')) {
    if (has('writepowder_dummy')) { }
    const powder = S.pouch.some(p => p.type === 'writepowder');
    if (powder) now('You have Write Powder in your Pouch. Open the Pouch and cast it. It will use your Wisp Feather.');
    else {
      if (!has('ash')) at('hearth', 'Write needs hearth ash. Scoop some from the hearth.');
      if (!has('berryink')) {
        if (G.count('inkberry') >= 2) at('mortar', 'Grind two inkberries at the mortar to make berry ink.');
        else if (!F('berriesTaken')) at('bowl', 'There are inkberries in the bowl on the table.');
        else at('berrybush', 'Inkberries grow on a bush in the sunny meadow.');
      }
      if (!has('quill')) { if (!F('quillsTaken')) at('vase', 'Goose quills! There are some in the vase.'); else if (!F('outQuill')) at('goosequill', 'Geese drop quills down by the brook.'); }
      if (has('ash') && has('berryink') && has('quill')) at('bench', 'You have everything for Write. Put it together at the workbench.');
    }
  }
  // Light
  if (pg.light && !S.pouch.some(p => p.type === 'lightorb')) {
    if (has('dimorb')) now('Bring the Dim Orb to me and choose "Enchant". That makes it a real spell.');
    else {
      if (!has('candle')) at('nightstand', 'For the orb spell, you need a candle stub. Try the nightstand drawer.');
      if (!has('sunstone')) at('clock', 'The new spell wants a sunstone. Something in this hut keeps time with a warm stone...');
      if (has('candle') && has('sunstone')) at('bench', 'Join the candle stub and the sunstone at the workbench into a Dim Orb.');
    }
  }
  if (S.pouch.some(p => p.type === 'lightorb') && !(pg.light && pg.light.cast)) now('Your new orb is in your Pouch. Try casting it!');
  // Cellar, honey, door
  if (pg.light && pg.light.cast) {
    if (!F('rugRolled')) at('rug', 'Have you noticed that rug is a bit lumpy?');
    if (!F('keyTaken')) at(F('rugRolled') && S.map !== 'cellar' ? 'trapdoor' : 'keyhook', 'The cellar has been dark for ages. Take your light down there and look along the walls.');
    if (!F('crateWisp') && F('rugRolled')) at('crate', 'There\'s an old crate in the cellar. Look inside it, with some light.');
    if (!F('honeyTaken') && F('keyTaken')) at('jars', 'Old Moss kept wildflower honey in the cellar jars.');
  }
  if (F('keyTaken') && !F('doorOpen')) at('door', 'You have the key! The front door is waiting.');
  const lightOrb = S.pouch.find(p => p.type === 'lightorb'), seekOrb = S.pouch.find(p => p.type === 'seekerorb');
  if ((lightOrb && lightOrb.charges === 0) || (seekOrb && seekOrb.charges === 0)) at('hearth', 'One of your orbs has gone dark. Recharge it at the hut hearth.');
  // Seeker
  if (pg.seeker && !seekOrb) {
    if (has('clearorb')) now('Bring me the Clear Orb and choose "Enchant".');
    else {
      if (!has('petaldust')) {
        if (has('petal')) at('mortar', 'Grind the shimmer petal at the mortar.');
        else if (!F('flowerTaken')) at('shimmerflower', 'A shimmering flower grows in the meadow, way over on the east side.');
      }
      if (!has('riverglass') && !F('glassTaken')) at('riverglass', 'Look for river glass along the brook bank.');
      if ((has('petaldust') || has('petal')) && has('riverglass')) at('bench', 'Join the petal dust and river glass at the workbench.');
    }
  }
  // Outdoors
  if (F('doorOpen')) {
    if (F('unhexKnown')) {
      CREATURES.forEach(c => { if (!S.freed[c.id]) { const z = allZones().find(z => z.id === c.zone); T.push({ map: c.map, x: c.x, y: c.y, text: `I can feel a hexed ${speciesName(c.species)} somewhere around ${z ? z.name : 'here'}.` }); } });
    }
    if (pg.light && pg.light.cast && !F('groveLit')) ['lantern1', 'lantern2', 'lantern3'].forEach(id => { if (!S.lanterns[id]) at(id, 'The birch grove has old lanterns. Stand close to one while your Light glows.'); });
    if (seekOrb) OBJECTS.forEach(o => { if (o.secret && !S.revealed[o.id] && (!o.vis || o.vis())) { const z = zoneAt(o.map, o.tx, o.ty); T.push({ map: o.map, x: o.tx + 0.5, y: o.ty + 0.5, text: `Something shimmers around ${z.name}. Try your Seeker Orb there.` }); } });
    if (F('bunnyLed') && !F('bellTaken')) at('bell', 'The bunny led you somewhere. Did you pick up what it found?');
    if (F('chipsInHollow') && S.revealed.hollowgate && (!F('acornTaken') || !F('hollowWisp'))) at('hollowwisp', 'The chipmunks have treasures in their hollow.');
  }
  // the road to town and the village
  if (F('doorOpen') && !S.visited.road) T.push({ map: 'out', x: 0.5, y: 17.5, text: `There's a path west from the yard. The old road leads to ${VILLAGE_NAME}. It's hexed too, poor thing.` });
  if (pg.kindle) {
    const need = ['bakeryLit', 'smithyLit'].filter(k => !F(k)).length;
    const have = S.pouch.filter(p => p.type === 'kindlecube').length + G.count('embercube');
    if (need > have) {
      if (has('embercube')) now('Bring me the Ember Cube and choose "Enchant".');
      else {
        if (!has('tinder')) { if (has('bark')) at('mortar', 'Grind the dry bark into tinder at the mortar.'); else T.push({ map: 'road', x: 5.5, y: 4.5, text: 'Dead trees along the old road have dry bark. Peel some for the Kindle spell.' }); }
        if (!has('ash')) at('hearth', 'Kindle needs a bit of hearth ash.');
        if (has('tinder') && has('ash')) at('bench', 'Join the ash and tinder at the workbench into an Ember Cube.');
      }
    }
    if (S.pouch.some(p => p.type === 'kindlecube')) {
      if (!F('bakeryLit')) at('bakery', 'The bakery oven in town is stone cold. Stand beside the bakery and cast your Kindle Cube.');
      if (!F('smithyLit')) at('smithy', 'The smithy\'s forge is cold. Stand beside it and cast a Kindle Cube.');
    }
  }
  if (S.visited.village && !F('home2Open')) at('home2', 'One cottage in town has windows so dark they swallow light. Your Light Orb might chase that out.');
  if (F('bakeryLit') && !has('berrytart') && (!F('macheteGot') || G.unbandedOrbs().length)) at('bakery', 'Rosie bakes berry tarts from two inkberries and two wild strawberries. Bruno loves them.');
  if (F('smithyLit') && G.count('ironstone') < 2 && (!F('macheteGot') || G.unbandedOrbs().length)) at('iron1', 'Bruno needs iron-stone. Look for the rusty red rocks on the old road.');
  if (F('smithyLit') && !F('macheteGot') && G.count('ironstone') >= 2 && has('berrytart')) at('smithy', 'You have what Bruno wants. Go see him about a machete!');
  if (has('machete')) {
    if (!F('home1Open')) at('home1', 'Bramble Cottage is buried in hexed vines. Your machete could clear them.');
    if (!F('weedsCut')) at('appletree', 'There\'s an apple tree on the old road, choked with weeds. Cut it free!');
    if (F('chainBird') && !F('chestOpen')) at('chest', 'The songbirds\' clue... brambles beside the library. Your machete can reach whatever is hiding there.');
  }
  if (!T.length) return ['FENNEL: Explore! Watch for shimmers and glows. Something is always hiding.', 'FENNEL: And bring me treats from your travels. Kindness makes my magic stronger.'];
  const fp = fennelPos();
  const dist = (t) => t.map === null ? -1 : t.map === S.map ? Math.hypot(t.x - S.px, t.y - S.py) : 60 + Math.hypot(t.x - fp.x, t.y - fp.y);
  T.sort((a, b) => dist(a) - dist(b));
  return ['FENNEL: ' + T[0].text];
}

// ================================================================ input
const keys = {};
let joy = null, down = null;
window.addEventListener('keydown', e => {
  keys[e.key.toLowerCase()] = true;
  if (!started) return;
  const k = e.key.toLowerCase();
  if (k === ' ' || k === 'e' || k === 'enter') { e.preventDefault(); if (dlg.open) advance(); else if (!panelOpen() && acts.length) doTarget(acts[0]); }
  if (k === 'escape') closePanel();
  if (!dlg.open) {
    if (k === 'b' && G.flag('bookFound')) openPanel('book');
    if (k === 'i') openPanel('satchel');
    if (k === 'p' && G.flag('bookFound')) openPanel('pouch');
    if (k === 'j' && G.flag('bookFound')) openPanel('journal');
  }
});
window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
window.addEventListener('keydown', e => { if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'w', 'a', 's', 'd'].includes(e.key.toLowerCase())) dismissByMove(); });
cv.addEventListener('pointerdown', e => {
  audioInit();
  down = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId };
  if (dlg.open) { if (!dismissByMove()) return; down.moveStart = true; }
  joy = { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: e.clientX, y: e.clientY };
  cv.setPointerCapture(e.pointerId);
});
cv.addEventListener('pointermove', e => { if (joy && e.pointerId === joy.id) { joy.x = e.clientX; joy.y = e.clientY; } });
const endJoy = e => {
  if (down && e.pointerId === down.id && e.type === 'pointerup') {
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y), dt = performance.now() - down.t;
    if (moved < 12 && dt < 450 && !down.moveStart) handleTap(e.clientX, e.clientY);
  }
  down = null;
  if (joy && e.pointerId === joy.id) joy = null;
};
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

// ================================================================ interaction: nearby things glow; tap them
let acts = [];
function findActs() {
  if (seeker) return [];
  const m = MAPS[S.map], out = [];
  for (const o of m.objs) {
    if (!objVisible(o)) continue;
    const a = o.act();
    if (!a) continue;
    const nx = clamp(S.px, o.tx, o.tx + o.tw), ny = clamp(S.py, o.ty, o.ty + o.th);
    let d = Math.hypot(S.px - nx, S.py - ny);
    if (o.id === 'fairy') { d = Math.hypot(S.px - (o.tx + 0.5), S.py - (o.ty + 0.4)) - 0.3; }
    if (d < 0.95) out.push({ d, a, x: o.tx, y: o.ty, w: o.tw, h: o.th, id: o.id });
  }
  for (let ty = Math.floor(S.py) - 1; ty <= Math.floor(S.py) + 1; ty++) for (let tx = Math.floor(S.px) - 1; tx <= Math.floor(S.px) + 1; tx++) {
    const c = m.rows[ty] && m.rows[ty][tx];
    if (c !== 'K' && c !== 't') continue;
    const key = S.map + ':' + tx + ',' + ty;
    if (c === 't' && S.cut[key]) continue;
    const d = Math.hypot(S.px - clamp(S.px, tx, tx + 1), S.py - clamp(S.py, ty, ty + 1));
    if (d >= 0.95) continue;
    let a;
    if (c === 'K') a = G.count('bark') < 3 ? { label: 'Peel some dry bark', fn: () => G.give('bark') } : { label: 'Look at the dead tree', fn: () => say(['A long-dead tree, its bark dry and papery. Shelf mushrooms grow in its cracks.']) };
    else a = G.has('machete') ? { label: 'Cut the thicket', fn: () => { S.cut[key] = true; burst(tx + 0.5, ty + 0.5, '#9ad370', 20); blip(500); save(); } }
      : { label: 'Look at the thicket', fn: () => say(['A thorny tangle of brambles. You\'d need a sharp blade to get through.']) };
    out.push({ d, a, x: tx, y: ty - (c === 'K' ? 0.6 : 0), w: 1, h: c === 'K' ? 1.6 : 1, id: key });
  }
  for (const c of creatures) {
    if (c.mode !== 'hexed') continue;
    const d = Math.hypot(S.px - c.x, S.py - c.y) - 0.3;
    if (d < 1.0) {
      const a = G.flag('unhexKnown') ? { label: `Unhex the ${speciesName(c.def.species)}`, fn: () => unhex(c) }
        : { label: 'Look at the creature', fn: () => say(['A little creature, wrapped in a gray hex. It looks miserable, but you don\'t know how to help it... yet.', 'Maybe Fennel knows something.']) };
      out.push({ d, a, x: c.x - 0.4, y: c.y - 0.45, w: 0.8, h: 0.8, id: c.id });
    }
  }
  out.sort((a, b) => a.d - b.d);
  return out.slice(0, 3);
}
function doTarget(t) { if (paused) return; audioInit(); t.a.fn(); rebuildSolids(); }
function handleTap(x, y) {
  if (dlg.open) { if (!dlg.choosing) advance(); return; }
  if (paused) return;
  for (const t of acts) if (t.pill && inRect(x, y, t.pill)) { doTarget(t); return; }
  for (const t of acts) if (t.box && inRect(x, y, t.box)) { doTarget(t); return; }
  // Fennel outdoors: only when you tap her
  if (OUTDOOR.includes(S.map) && S.fairyOut && fairyRT) {
    const fx = fairyRT.x * TS - camX, fy = fairyRT.y * TS - camY - TS * 0.1;
    if (Math.hypot(x - fx, y - fy) < TS * 0.7) { audioInit(); talkFairy(); }
  }
}
function inRect(x, y, r) { return x >= r.x && y >= r.y && x <= r.x + r.w && y <= r.y + r.h; }
function drawActs(t) {
  const fs = Math.round(clamp(TS * 0.32, 13, 17));
  ctx.font = `${fs}px Georgia, serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const placed = [];
  acts.forEach(a => {
    const x = a.x * TS - camX, y = a.y * TS - camY, w = a.w * TS, h = a.h * TS;
    const pulse = 0.5 + 0.5 * Math.sin(t * 4);
    ctx.save();
    ctx.shadowColor = 'rgba(255,230,140,0.9)'; ctx.shadowBlur = 8 + pulse * 8;
    ctx.strokeStyle = `rgba(255,236,160,${0.6 + 0.35 * pulse})`; ctx.lineWidth = 2.5;
    rr(x - 3, y - 3, w + 6, h + 6, 9); ctx.stroke();
    ctx.restore();
    const label = a.a.label;
    const tw = ctx.measureText(label).width + 22, ph = fs + 14;
    let px = clamp(x + w / 2 - tw / 2, 6, VW - tw - 6), py = y - ph - 6;
    if (py < 70) py = y + h + 6;
    for (const p of placed) if (Math.abs(p.y - py) < ph && px < p.x + p.w && px + tw > p.x) py = p.y - ph - 4;
    ctx.fillStyle = 'rgba(250,244,230,0.96)'; ctx.strokeStyle = '#c9a96e'; ctx.lineWidth = 2;
    rr(px, py, tw, ph, ph / 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#4a3a6a'; ctx.fillText(label, px + tw / 2, py + ph / 2 + 1);
    a.pill = { x: px - 4, y: py - 4, w: tw + 8, h: ph + 8 };
    a.box = { x: x - 8, y: y - 8, w: w + 16, h: h + 16 };
    placed.push({ x: px, y: py, w: tw });
  });
}

// ================================================================ dialog
const dlg = { open: false, lines: [], cb: null, shown: 0 };
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
  $('dmore').style.display = dlg.lines.length > 1 ? 'block' : 'none';
  dlg.shown = performance.now();
}
function esc(s) { return String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }
function lastPage() { return dlg.open && !dlg.choosing && dlg.lines.length <= 1; }
function dismissByMove() { if (lastPage() && performance.now() - dlg.shown > 250) { dlg.shown = 0; advance(); return true; } return false; }
function advance() {
  if (!dlg.open || dlg.choosing) return;
  if (performance.now() - dlg.shown < 300) return;
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
$('dialog').addEventListener('pointerdown', e => { e.stopPropagation(); audioInit(); });
$('dialog').addEventListener('click', e => { e.stopPropagation(); if (!dlg.choosing) advance(); });

// ================================================================ toasts
function toast(text, ms = 2200, cls) {
  const el = document.createElement('div');
  el.className = 'toast' + (cls ? ' ' + cls : ''); el.textContent = text;
  $('toasts').appendChild(el);
  while ($('toasts').children.length > 4) $('toasts').firstChild.remove();
  setTimeout(() => el.classList.add('out'), ms);
  setTimeout(() => el.remove(), ms + 600);
}

// ================================================================ panels
function panelOpen() { return $('panel').classList.contains('show'); }
function closePanel() { $('panel').classList.remove('show'); }
$('pclose').addEventListener('click', e => { e.stopPropagation(); closePanel(); });
$('panel').addEventListener('pointerdown', e => e.stopPropagation());
document.querySelectorAll('#topbar button').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); audioInit(); if (!dlg.open) openPanel(b.dataset.p); }));

function pageHtml(p, n, compact) {
  const st = S.pages[p], pg = PAGES[p];
  let html = `<div class="page${compact ? ' compact' : ''}"><div class="pn">Page ${n + 1}${st.isNew && !compact ? ' <span class="new">NEW</span>' : ''}</div><h3>${st.cast ? pg.name : '???'}</h3>` +
    (st.cast ? '' : `<div class="muted">${pg.unknown}. Cast it to learn its name.</div>`) +
    `<div class="shape">${SHAPES[pg.shape]}</div><h4>Formula</h4><ul>${pg.formula.map(f => `<li>${f}</li>`).join('')}</ul>`;
  if (st.cast && !compact) {
    const eff = pg.effects.map(e => `<li>${e}</li>`);
    Object.keys(LATE_EFFECTS).forEach(k => { if (S.late[k] && LATE_EFFECTS[k].page === p) eff.push(`<li>✦ ${LATE_EFFECTS[k].text}${S.lateNew && S.lateNew[k] ? ' <span class="new">NEW</span>' : ''}</li>`); });
    html += `<h4>Effects</h4><ul>${eff.join('')}</ul>`;
  }
  return html + '</div>';
}
function openPanel(kind) {
  const body = $('pbody');
  let title = '', html = '';
  if (kind === 'satchel') {
    title = '🎒 Satchel';
    const groups = [['ingredient', 'Ingredients'], ['worked', 'Worked'], ['trinket', 'Treats & Trinkets'], ['tool', 'Tools'], ['gear', 'Gear']];
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
      const nm = known ? d.name : ({ orb: 'Unknown Orb', powder: 'Unknown Powder', cube: 'Unknown Cube' }[d.shape]);
      const ch = d.shape === 'orb' ? `<span class="charges">${'●'.repeat(p.charges)}${'○'.repeat(Math.max(0, (p.max || S.maxCharge) - p.charges))}${p.band ? ' · silver band' : ''}</span>` : d.shape === 'cube' ? '<span class="charges">cast beside its target</span>' : '<span class="charges">single use</span>';
      return `<div class="spell"><span class="ic${p.band ? ' banded' : ''}">${d.icon}</span><span class="nm">${nm}<br>${ch}</span><button data-use="${i}">Cast</button></div>`;
    }).join('');
    html += `<p class="muted small">${SHAPES.powder}. ${SHAPES.orb}. ${SHAPES.cube}.</p>`;
  } else if (kind === 'book') {
    title = '📖 Spellbook';
    PAGE_ORDER.forEach((p, n) => { if (S.pages[p]) html += pageHtml(p, n); });
    html += `<p class="muted small">The remaining pages are blank. Uncast formulas: ${uncastCount()} of 3.</p>`;
    PAGE_ORDER.forEach(p => { if (S.pages[p]) delete S.pages[p].isNew; });
    S.lateNew = {}; S.newBook = false;
  } else if (kind === 'journal') {
    title = '📜 Journal';
    html += '<h3>Clues</h3>';
    html += S.clues.length ? S.clues.map(c => `<div class="clue ${c.done ? 'done' : ''}">${c.done ? '✔ ' : ''}${c.isNew ? '<span class="new">NEW</span> ' : ''}${esc(c.text)}</div>`).join('') : '<p class="muted">No clues yet.</p>';
    html += '<h3>Curios</h3><div class="grid">';
    Object.keys(ITEMS).filter(k => ITEMS[k].kind === 'curio').forEach(k => {
      html += S.curios[k] ? `<div class="item"><span class="ic">${ITEMS[k].icon}</span><span class="nm">${ITEMS[k].name}</span><span class="ds">${ITEMS[k].desc}</span></div>`
        : '<div class="item unknown"><span class="ic">❔</span><span class="nm">???</span></div>';
    });
    html += '</div>';
    const freed = Object.keys(S.freed).length;
    html += `<h3>Creatures freed</h3><p>${freed} of ${CREATURES.length}</p>`;
    if (S.log && S.log.length) html += '<h3>Recent happenings</h3>' + S.log.slice(0, 15).map(l => `<div class="logline">${esc(l)}</div>`).join('');
    S.clues.forEach(c => delete c.isNew); S.newJournal = false;
  }
  $('ptitle').textContent = title;
  body.innerHTML = html;
  body.scrollTop = 0;
  body.querySelectorAll('[data-use]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); useSpell(+b.dataset.use); }));
  $('panel').classList.add('show');
  hudCache = ''; save();
}

function openStation(st, backTo) {
  const list = RECIPES.filter(r => r.station === st && (r.page ? S.pages[r.page] : (!r.req || r.req())));
  let html = '';
  if ((st === 'bakery' || st === 'smithy') && !list.length) html += '<p class="muted">Nothing to trade right now.</p>';
  if (!list.length) html += '<p class="muted">Nothing you know how to make here yet.</p>';
  list.forEach(r => {
    const ok = Object.keys(r.needs).every(k => G.has(k, r.needs[k]));
    const out = r.special ? { icon: r.icon, name: r.label } : r.makes ? ITEMS[r.makes] : SPELL_ITEMS[r.spell];
    const known = r.spell ? (S.pages[r.page].cast ? out.name : ({ orb: 'an unknown orb', powder: 'an unknown powder', cube: 'an unknown cube' }[out.shape])) : out.name;
    html += `<div class="recipe"><div class="out">${out.icon} ${r.verb} → ${known}</div><div class="needs">` +
      Object.keys(r.needs).map(k => `<span class="${G.has(k, r.needs[k]) ? 'have' : 'miss'}">${ITEMS[k].icon} ${ITEMS[k].name} ${G.count(k)}/${r.needs[k]}</span>`).join('') + '</div>';
    // shortcut: missing a ground ingredient that you can grind right next door
    if (st === 'bench' && S.map === 'hut') Object.keys(r.needs).forEach(k => {
      if (G.has(k, r.needs[k])) return;
      const g = RECIPES.find(x => x.station === 'mortar' && x.makes === k && S.pages[x.page]);
      if (g && Object.keys(g.needs).every(n => G.has(n, g.needs[n]))) html += `<button class="side" data-grind="1">🥣 Grind ${ITEMS[Object.keys(g.needs)[0]].name} at the mortar</button> `;
    });
    html += `<button data-make="${r.id}" ${ok ? '' : 'disabled'}>${r.verb}</button></div>`;
  });
  // the formulas from the book, right where you work
  const pages = [...new Set(list.map(r => r.page).filter(Boolean))];
  if (pages.length) html += '<h3>📖 From your Spellbook</h3>' + pages.map(p => pageHtml(p, PAGE_ORDER.indexOf(p), true)).join('');
  if (backTo) html = `<button class="side back" data-back="1">← Back to the ${STATION_NAMES[backTo]}</button>` + html;
  $('ptitle').textContent = ({ fairy: '🧚 ', mortar: '🥣 ', bench: '🔨 ', bakery: '🍞 ', smithy: '⚒️ ' }[st]) + STATION_NAMES[st];
  $('pbody').innerHTML = html;
  $('pbody').scrollTop = 0;
  $('pbody').querySelectorAll('[data-make]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); make(b.dataset.make, backTo); }));
  $('pbody').querySelectorAll('[data-grind]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); openStation('mortar', 'bench'); }));
  $('pbody').querySelectorAll('[data-back]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); openStation(backTo); }));
  $('panel').classList.add('show');
}
function make(id, backTo) {
  const r = RECIPES.find(r => r.id === id);
  if (!Object.keys(r.needs).every(k => G.has(k, r.needs[k]))) return;
  if (r.station === 'fairy' && (S.favor || 0) < 1) { closePanel(); say(fennelTired()); return; }
  if (r.spell && S.pouch.length >= 6) { closePanel(); say(['Your pouch is full.']); return; }
  if (r.special === 'band') {
    const orbs = G.unbandedOrbs();
    closePanel();
    choice('BRUNO: Which orb shall I band?', orbs.map(o => SPELL_ITEMS[o.type].name).concat(['Never mind']), i => {
      if (i >= orbs.length) return;
      Object.keys(r.needs).forEach(k => G.take(k, r.needs[k]));
      const o = orbs[i]; o.band = true; o.max = 6; o.charges = 6; chime(3); save();
      say([`Bruno heats a thin silver wire until it glows, then wraps it twice around your ${SPELL_ITEMS[o.type].name}, like a pendant.`, `BRUNO: There. It'll hold six charges now. Don't drop it.`]);
    });
    return;
  }
  Object.keys(r.needs).forEach(k => G.take(k, r.needs[k]));
  if (r.station === 'fairy') S.favor--;
  if (S.map === 'hut') burst(S.px, S.py - 0.5, '#fff3b0', 12);
  if (r.makes === 'machete') { G.give('machete'); S.flags.macheteGot = true; save(); closePanel(); chime(3); say(['Bruno hammers, quenches, and polishes. He hands you a fine machete with a bark-wrapped grip.', 'BRUNO: For vines and brambles. Not fingers.', '(You can cut thickets, vines and weeds now.)']); return; }
  if (r.station === 'bakery') { G.give(r.makes); closePanel(); chime(2); say([`Rosie bustles about, and soon hands you a warm ${ITEMS[r.makes].name}.`, 'ROSIE: Fresh from the oven! It never goes cold now, you know.']); return; }
  if (r.makes) {
    G.give(r.makes); blip(800);
    // stay at the station (or hop back) so the next step is one tap away
    if (backTo) { toast(`🥣 You grind it into ${ITEMS[r.makes].name}.`); openStation(backTo); }
    else { toast(r.station === 'mortar' ? `🥣 Grind, grind... ${ITEMS[r.makes].name}!` : `🔨 You join them into a ${ITEMS[r.makes].name}.`); openStation(r.station); }
    return;
  }
  closePanel();
  const d = SPELL_ITEMS[r.spell];
  S.pouch.push({ type: r.spell, charges: d.charges || 1 });
  chime(2); save();
  const nm = S.pages[r.page].cast ? d.name : ({ orb: 'an unknown orb', powder: 'an unknown powder', cube: 'an unknown cube' }[d.shape]);
  say(r.station === 'fairy'
    ? ['Fennel circles it three times, trailing fairy dust. It begins to glow from the inside.', `${d.icon} You put ${nm} in your Spell Pouch.`]
    : [`You work everything together on the bench into ${nm}.`, `${d.icon} It goes into your Spell Pouch. Open the Pouch to cast it.`]);
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
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => { });
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
      const sp = (G.has('boots') ? 4.3 : 3.6) * dt, r = 0.3;
      const nx = S.px + mx * sp, ny = S.py + my * sp;
      if (boxFree(S.map, nx, S.py, r)) S.px = nx;
      if (boxFree(S.map, S.px, ny, r)) S.py = ny;
      if (Math.abs(mx) > 0.2) S.dir = mx < 0 ? -1 : 1;
      S.walk = (S.walk || 0) + dt * 9;
    }
  }
  updateCreatures(dt);
  updateChain(dt);
  edgeExits();
  particles.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.94; p.vy *= 0.94; p.life -= dt; });
  particles = particles.filter(p => p.life > 0);
  // zone entry
  const z = zoneAt(S.map, Math.floor(S.px), Math.floor(S.py));
  if (z !== curZone) { curZone = z; showZoneName(z.name); }
  updateFairy(dt);
  acts = paused ? [] : findActs();
  refreshHud();
  saveT += dt; if (saveT > 5) { saveT = 0; save(); }
}
function edgeExits() {
  if (fadeDir || paused) return;
  const m = MAPS[S.map];
  if (S.map === 'out' && S.px < 0.45) G.goMap('road', MAPS.road.w - 0.9, 8.5);
  else if (S.map === 'road' && S.px > m.w - 0.45) G.goMap('out', 0.9, 17.5);
  else if (S.map === 'road' && S.px < 0.45) G.goMap('village', MAPS.village.w - 0.9, 25.5);
  else if (S.map === 'village' && S.px > m.w - 0.45) G.goMap('road', 0.9, 8.5);
}
function updateFairy(dt) {
  if (!OUTDOOR.includes(S.map) || !G.flag('fairyFree')) return;
  if (!S.fairyOut) {
    if (S.map !== 'out') return;
    const r = OBJECTS.find(o => o.id === 'rune');
    if (S.px > r.tx && S.px < r.tx + r.tw && S.py > r.ty && S.py < r.ty + r.th) {
      S.fairyOut = true; fairyRT = { x: 7.8, y: 15.4 }; chime(2);
      notice('✨ Fennel zips out of the hut to join you! Tap her anytime to talk. She goes home when you go inside.');
    }
    return;
  }
  if (!fairyRT) fairyRT = { x: S.px, y: S.py - 1 };
  const tx = S.px - 0.8 * S.dir, ty = S.py - 0.75;
  const d = Math.hypot(tx - fairyRT.x, ty - fairyRT.y);
  const k = Math.min(1, dt * (d > 4 ? 4 : 2));
  fairyRT.x += (tx - fairyRT.x) * k; fairyRT.y += (ty - fairyRT.y) * k;
}
function showZoneName(n) {
  const el = $('zonename'); el.textContent = n; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
}
function startFade(cb) { fadeDir = 1; fadeCb = cb; }

let hudCache = '';
function refreshHud() {
  const st = `${G.flag('bookFound')}|${Math.ceil(lightT)}|${seeker ? 1 : 0}|${S.newBook}|${S.newJournal}`;
  if (st === hudCache) return;
  hudCache = st;
  document.querySelectorAll('#topbar [data-p]').forEach(b => {
    b.style.display = (b.dataset.p === 'satchel' || G.flag('bookFound')) ? '' : 'none';
    b.classList.toggle('badge', (b.dataset.p === 'book' && !!S.newBook) || (b.dataset.p === 'journal' && !!S.newJournal));
  });
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
  // trees, bushes and hedges as painted sprites so the hero can walk "behind" them
  const isHedge = (x, y) => { const c = m.rows[y] && m.rows[y][x]; return c === 'h' || (c === 'x' && !hollowOpen()); };
  for (let y = y0; y <= y1 + 3 && y < m.h; y++) for (let x = Math.max(0, x0 - 1); x <= Math.min(m.w - 1, x1 + 1); x++) {
    const c = m.rows[y][x];
    if (c === 'K') {
      list.push({ y: y + 0.95, f: () => drawSprite('dead', (hash(x, y) * 3) | 0, tileGray(S.map, x, y), sx(x) + TS / 2, sy(y) + TS * 0.95, Math.sin(t * 0.6 + x) * 0.01) });
    } else if (c === 't' && !S.cut[S.map + ':' + x + ',' + y]) {
      list.push({ y: y + 0.9, f: () => drawSprite('bramble', (hash(x, y) * 3) | 0, tileGray(S.map, x, y), sx(x) + TS / 2, sy(y) + TS * 0.98) });
    } else if (c === 'T' || c === 'B') {
      const sway = Math.sin(t * 0.8 + x * 0.7 + y) * 0.025;
      list.push({ y: y + 0.95, f: () => drawSprite(treeKind(c, x, y, m), (hash(x, y + 5) * 3) | 0, tileGray(S.map, x, y), sx(x) + TS / 2, sy(y) + TS * 0.95, sway) });
    } else if (c === 'b') {
      list.push({ y: y + 0.9, f: () => drawSprite(bushKind(x, y), (hash(x + 3, y) * 3) | 0, tileGray(S.map, x, y), sx(x) + TS / 2, sy(y) + TS * 0.95) });
    } else if (isHedge(x, y)) {
      const v = (isHedge(x - 1, y) ? 1 : 0) | (isHedge(x + 1, y) ? 2 : 0);
      list.push({ y: y + 0.9, f: () => drawSprite('hedge', v, tileGray(S.map, x, y), sx(x), sy(y) + TS * 0.98) });
    }
  }
  creatures.forEach(c => { if (!c.gone) list.push({ y: c.y + 0.2, f: () => drawCreature(c, t) }); });
  list.push({ y: S.py + 0.3, f: () => drawHero(t) });
  if (OUTDOOR.includes(S.map) && S.fairyOut && fairyRT) list.push({ y: fairyRT.y + 1, f: () => DRAW.fairy(null, fairyRT.x * TS - camX - TS / 2, fairyRT.y * TS - camY - TS * 0.4, TS, TS, 0, t) });
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

  drawActs(t);

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
function hollowOpen() { return !!(S.revealed.hollowgate && G.flag('chainChip')); }
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
    case ',': case 'T': case 'B': case 'H': case 'K': case 't': drawGrass(x, y, g, tx, ty); break;
    case 'n': {
      ctx.fillStyle = C('#86c8ea', g); ctx.fillRect(x, y, TS + 1, TS + 1);
      const vert = (m.rows[ty - 1] && 'n='.includes(m.rows[ty - 1][tx])) || (m.rows[ty + 1] && 'n='.includes(m.rows[ty + 1][tx]));
      ctx.fillStyle = C('#a7794f', g); ctx.fillRect(x, y, TS + 1, TS + 1);
      ctx.strokeStyle = C('#7a5432', g); ctx.lineWidth = 2;
      for (let i = 1; i < 5; i++) { ctx.beginPath(); if (vert) { ctx.moveTo(x, y + i * TS / 5); ctx.lineTo(x + TS, y + i * TS / 5); } else { ctx.moveTo(x + i * TS / 5, y); ctx.lineTo(x + i * TS / 5, y + TS); } ctx.stroke(); }
      ctx.fillStyle = C('#5f412d', g);
      if (vert) { ctx.fillRect(x, y, 3, TS + 1); ctx.fillRect(x + TS - 3, y, 3, TS + 1); } else { ctx.fillRect(x, y, TS + 1, 3); ctx.fillRect(x, y + TS - 3, TS + 1, 3); }
      break;
    }
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
    case 'b': drawGrass(x, y, g, tx, ty); break;
    case 'R': {
      drawGrass(x, y, g, tx, ty);
      const rg = ctx.createRadialGradient(x + TS * 0.38, y + TS * 0.38, TS * 0.05, x + TS * 0.5, y + TS * 0.6, TS * 0.5);
      rg.addColorStop(0, C('#d6d1c8', g)); rg.addColorStop(0.6, C('#a9a39b', g)); rg.addColorStop(1, C('#77716a', g));
      ctx.fillStyle = 'rgba(30,40,20,0.25)'; ctx.beginPath(); ctx.ellipse(x + TS * 0.52, y + TS * 0.86, TS * 0.42, TS * 0.1, 0, 0, 7); ctx.fill();
      ctx.fillStyle = rg; rr(x + TS * 0.1, y + TS * 0.22, TS * 0.8, TS * 0.66, TS * 0.28); ctx.fill();
      ctx.strokeStyle = C('#8a847b', g, 0.6); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + TS * 0.3, y + TS * 0.5); ctx.lineTo(x + TS * 0.45, y + TS * 0.62); ctx.lineTo(x + TS * 0.6, y + TS * 0.55); ctx.stroke();
      ctx.fillStyle = C('#7fae5a', g, 0.8); ctx.beginPath(); ctx.ellipse(x + TS * 0.7, y + TS * 0.32, TS * 0.1, TS * 0.05, 0.4, 0, 7); ctx.fill();
      break;
    }
    case 'h': case 'x': {
      drawGrass(x, y, g, tx, ty);
      if (c === 'x' && hollowOpen()) { ctx.fillStyle = C('#e8d3a6', g, 0.6); ctx.fillRect(x + TS * 0.2, y, TS * 0.6, TS); }
      break;
    }
    case 'O': {
      drawGrass(x, y, g, tx, ty);
      ctx.fillStyle = 'rgba(30,40,20,0.3)'; ctx.beginPath(); ctx.ellipse(x + TS * 0.5, y + TS * 0.9, TS * 0.36, TS * 0.1, 0, 0, 7); ctx.fill();
      const sg = ctx.createLinearGradient(x + TS * 0.22, 0, x + TS * 0.78, 0);
      sg.addColorStop(0, C('#c4c1cc', g)); sg.addColorStop(0.45, C('#a29fae', g)); sg.addColorStop(1, C('#6f6c7a', g));
      ctx.fillStyle = sg; rr(x + TS * 0.22, y - TS * 0.4, TS * 0.56, TS * 1.25, TS * 0.18); ctx.fill();
      ctx.fillStyle = C('#7fae5a', g, 0.7); ctx.beginPath(); ctx.ellipse(x + TS * 0.35, y + TS * 0.75, TS * 0.12, TS * 0.06, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = G.flag('groveLit') || S.zones.stones === 0 ? 'rgba(126,200,230,0.9)' : C('#7ec8e6', g, 0.5); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x + TS * 0.5, y + TS * 0.12, TS * 0.1, 0, 7); ctx.moveTo(x + TS * 0.5, y + TS * 0.22); ctx.lineTo(x + TS * 0.5, y + TS * 0.4); ctx.stroke();
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
    ctx.fillStyle = 'rgba(30,40,30,0.25)'; ctx.beginPath(); ctx.ellipse(x + w / 2, y + h - 4, w * 0.56, h * 0.14, 0, 0, 7); ctx.fill();
    // walls: plaster with timber frame
    const wg = ctx.createLinearGradient(x, 0, x + w, 0); wg.addColorStop(0, C('#e9dcc2', g)); wg.addColorStop(1, C('#c7b190', g));
    ctx.fillStyle = wg; rr(x + w * 0.08, y + h * 0.32, w * 0.84, h * 0.68, 4); ctx.fill();
    ctx.fillStyle = C('#7a543b', g);
    ctx.fillRect(x + w * 0.08, y + h * 0.32, w * 0.84, h * 0.04); ctx.fillRect(x + w * 0.08, y + h * 0.32, w * 0.04, h * 0.68); ctx.fillRect(x + w * 0.88, y + h * 0.32, w * 0.04, h * 0.68);
    ctx.fillRect(x + w * 0.08, y + h * 0.94, w * 0.84, h * 0.06);
    // stone footing
    ctx.fillStyle = C('#9d978e', g); for (let i = 0; i < 7; i++) { rr(x + w * (0.1 + i * 0.115), y + h * 0.9, w * 0.1, h * 0.09, 3); ctx.fill(); }
    // roof with shingle rows
    const rg = ctx.createLinearGradient(0, y - h * 0.3, 0, y + h * 0.45); rg.addColorStop(0, C('#c4718a', g)); rg.addColorStop(1, C('#8a4a5e', g));
    ctx.fillStyle = rg; ctx.beginPath(); ctx.moveTo(x - w * 0.05, y + h * 0.42); ctx.lineTo(x + w * 0.5, y - h * 0.3); ctx.lineTo(x + w * 1.05, y + h * 0.42); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.clip();
    ctx.strokeStyle = C('#7a3f52', g, 0.55); ctx.lineWidth = 1.5;
    for (let r = 0; r < 7; r++) { const yy = y - h * 0.2 + r * h * 0.09; ctx.beginPath(); ctx.moveTo(x - w * 0.05, yy); ctx.lineTo(x + w * 1.05, yy); ctx.stroke();
      for (let i = 0; i < 14; i++) { const xx = x + i * w * 0.08 + (r % 2) * w * 0.04; ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx, yy + h * 0.09); ctx.stroke(); } }
    ctx.restore();
    ctx.fillStyle = C('#e8a0b4', g, 0.5); ctx.beginPath(); ctx.moveTo(x + w * 0.5, y - h * 0.3); ctx.lineTo(x + w * 0.12, y + h * 0.36); ctx.lineTo(x + w * 0.2, y + h * 0.36); ctx.closePath(); ctx.fill();
    // chimney
    ctx.fillStyle = C('#9d978e', g); ctx.fillRect(x + w * 0.7, y - h * 0.12, w * 0.11, h * 0.3); ctx.fillStyle = C('#77716a', g); ctx.fillRect(x + w * 0.68, y - h * 0.15, w * 0.15, h * 0.05);
    // door
    const open = G.flag('doorOpen');
    ctx.fillStyle = C('#5f412d', g); rr(x + w * 0.34, y + h * 0.58, w * 0.24, h * 0.37, 10); ctx.fill();
    ctx.fillStyle = C(open ? '#2a201c' : '#8a5e3c', g); rr(x + w * 0.36, y + h * 0.61, w * 0.2, h * 0.34, 8); ctx.fill();
    if (!open) { ctx.fillStyle = C('#e7c36a', g); circ(x + w * 0.52, y + h * 0.8, w * 0.015); ctx.fill(); }
    // windows with flower boxes
    [[0.66, 0.5], [0.14, 0.5]].forEach(([a, b]) => {
      ctx.fillStyle = C('#5f412d', g); rr(x + w * a - 2, y + h * b - 2, w * 0.18 + 4, h * 0.22 + 4, 3); ctx.fill();
      ctx.fillStyle = C('#cfeaff', g); rr(x + w * a, y + h * b, w * 0.18, h * 0.22, 2); ctx.fill();
      ctx.fillStyle = C('#5f412d', g); ctx.fillRect(x + w * (a + 0.085), y + h * b, 2, h * 0.22); ctx.fillRect(x + w * a, y + h * (b + 0.1), w * 0.18, 2);
      ctx.fillStyle = C('#7a543b', g); ctx.fillRect(x + w * a - 3, y + h * (b + 0.22), w * 0.18 + 6, h * 0.06);
      ['#f7a8c8', '#fff3b0', '#e85a7a'].forEach((c, i) => { ctx.fillStyle = C(c, g); circ(x + w * (a + 0.03 + i * 0.06), y + h * (b + 0.21), w * 0.02); ctx.fill(); });
    });
  },
  lantern(o, x, y, w, h, g, t) {
    const lit = S.lanterns[o.id];
    ctx.fillStyle = C('#4a4a52', lit ? 0 : g); ctx.fillRect(x + w * 0.46, y - h * 0.3, w * 0.08, h * 1.15);
    ctx.fillStyle = C('#5c5c66', lit ? 0 : g); rr(x + w * 0.3, y - h * 0.55, w * 0.4, h * 0.38, 4); ctx.fill();
    if (lit) { const gl = ctx.createRadialGradient(x + w / 2, y - h * 0.36, 0, x + w / 2, y - h * 0.36, TS * 0.6); gl.addColorStop(0, 'rgba(255,215,120,0.9)'); gl.addColorStop(1, 'rgba(255,215,120,0)'); ctx.fillStyle = gl; circ(x + w / 2, y - h * 0.36, TS * 0.6); ctx.fill(); }
    ctx.fillStyle = lit ? '#ffe39a' : C('#8a8a96', g); rr(x + w * 0.36, y - h * 0.48, w * 0.28, h * 0.24, 3); ctx.fill();
  },
  berrybush(o, x, y, w, h, g) { drawSprite('berry', 0, g, x + w / 2, y + h * 0.95); },
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
  rune(o, x, y, w, h, g, t) {
    const cx = x + w / 2, cy = y + h / 2, r = Math.min(w, h) * 0.46;
    ctx.fillStyle = C('#b9b4a8', g); ctx.beginPath(); ctx.ellipse(cx, cy, r, r * 0.8, 0, 0, 7); ctx.fill();
    ctx.fillStyle = C('#cfcabd', g); ctx.beginPath(); ctx.ellipse(cx, cy, r * 0.86, r * 0.68, 0, 0, 7); ctx.fill();
    const glow = G.flag('fairyFree') && !S.fairyOut ? 0.5 + 0.5 * Math.sin(t * 2) : 0;
    ctx.strokeStyle = glow ? `rgba(150,120,230,${0.55 + 0.4 * glow})` : C('#7d776b', g); ctx.lineWidth = Math.max(2, TS * 0.06);
    for (let i = 0; i < 3; i++) { const a = i * 2.094 - 1.57; ctx.beginPath(); ctx.ellipse(cx + Math.cos(a) * r * 0.28, cy + Math.sin(a) * r * 0.22, r * 0.36, r * 0.29, 0, 0, 7); ctx.stroke(); }
    ctx.beginPath(); ctx.ellipse(cx, cy, r * 0.72, r * 0.57, 0, 0, 7); ctx.stroke();
  },
  strawpatch(o, x, y, w, h, g) {
    for (let i = 0; i < 4; i++) { const px = x + w * (0.2 + (i % 2) * 0.5) + (i > 1 ? w * 0.1 : 0), py = y + h * (0.35 + (i > 1 ? 0.35 : 0));
      ctx.fillStyle = C('#3f8a47', g); ctx.beginPath(); ctx.ellipse(px, py, w * 0.14, h * 0.08, i, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(px + w * 0.06, py + h * 0.05, w * 0.12, h * 0.07, -i, 0, 7); ctx.fill();
      ctx.fillStyle = C('#e8434f', g); ctx.beginPath(); ctx.moveTo(px - w * 0.05, py + h * 0.04); ctx.lineTo(px + w * 0.05, py + h * 0.04); ctx.lineTo(px, py + h * 0.15); ctx.closePath(); ctx.fill(); }
  },
  building(o, x, y, w, h, g, t) {
    const b = o.b, lit = o.kindle ? G.flag(o.kindle) : o.id === 'home1' ? G.flag('home1Open') : o.id === 'home2' ? G.flag('home2Open') : false;
    const gg = lit ? 0 : 1;
    ctx.fillStyle = 'rgba(30,40,30,0.25)'; ctx.beginPath(); ctx.ellipse(x + w / 2, y + h - 4, w * 0.55, h * 0.14, 0, 0, 7); ctx.fill();
    const wg = ctx.createLinearGradient(x, 0, x + w, 0); wg.addColorStop(0, C(b.wall, gg)); wg.addColorStop(1, C('#b8a688', gg));
    ctx.fillStyle = wg; rr(x + w * 0.06, y + h * 0.3, w * 0.88, h * 0.7, 4); ctx.fill();
    if (b.stone) { ctx.strokeStyle = C('#8a847b', gg, 0.6); ctx.lineWidth = 1.5; for (let r = 0; r < 5; r++) for (let i = 0; i < 6; i++) { rr(x + w * (0.08 + i * 0.145 + (r % 2) * 0.07), y + h * (0.34 + r * 0.12), w * 0.13, h * 0.1, 3); ctx.stroke(); } }
    else { ctx.fillStyle = C('#7a543b', gg); ctx.fillRect(x + w * 0.06, y + h * 0.3, w * 0.88, h * 0.035); ctx.fillRect(x + w * 0.06, y + h * 0.3, w * 0.03, h * 0.7); ctx.fillRect(x + w * 0.91, y + h * 0.3, w * 0.03, h * 0.7); }
    const rg = ctx.createLinearGradient(0, y - h * 0.3, 0, y + h * 0.42); rg.addColorStop(0, C(b.roof, gg)); rg.addColorStop(1, C('#3a3040', gg * 0.5 + 0.2));
    ctx.fillStyle = rg; ctx.beginPath(); ctx.moveTo(x - w * 0.04, y + h * 0.38); ctx.lineTo(x + w * 0.12, y - h * 0.22); ctx.lineTo(x + w * 0.88, y - h * 0.22); ctx.lineTo(x + w * 1.04, y + h * 0.38); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.clip(); ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1.5;
    for (let r = 0; r < 6; r++) { const yy = y - h * 0.15 + r * h * 0.1; ctx.beginPath(); ctx.moveTo(x - w * 0.05, yy); ctx.lineTo(x + w * 1.05, yy); ctx.stroke(); }
    ctx.restore();
    // chimney (+ smoke when lit)
    ctx.fillStyle = C('#9d978e', gg); ctx.fillRect(x + w * 0.74, y - h * 0.38, w * 0.09, h * 0.3);
    if (lit && (b.oven || b.forge || o.id.startsWith('home'))) for (let i = 0; i < 3; i++) { const k = ((t * 0.4 + i / 3) % 1); ctx.fillStyle = `rgba(235,235,240,${0.45 * (1 - k)})`; circ(x + w * 0.785 + Math.sin(t + i) * 4, y - h * 0.4 - k * h * 0.6, TS * (0.08 + k * 0.12)); ctx.fill(); }
    // windows
    const dark = b.dark && !lit;
    [[0.14, 0.48], [0.68, 0.48]].forEach(([a, c]) => {
      ctx.fillStyle = C('#5f412d', gg); rr(x + w * a - 2, y + h * c - 2, w * 0.18 + 4, h * 0.24 + 4, 3); ctx.fill();
      const glow = lit && (b.oven || b.forge) ? '#ffb05a' : lit ? '#ffe9a8' : '#cfeaff';
      ctx.fillStyle = dark ? '#120e18' : C(glow, gg); rr(x + w * a, y + h * c, w * 0.18, h * 0.24, 2); ctx.fill();
      if (dark) { ctx.fillStyle = 'rgba(160,110,220,0.5)'; circ(x + w * (a + 0.06), y + h * (c + 0.09), 2); ctx.fill(); circ(x + w * (a + 0.12), y + h * (c + 0.09), 2); ctx.fill(); }
      ctx.fillStyle = C('#5f412d', gg); ctx.fillRect(x + w * (a + 0.085), y + h * c, 2, h * 0.24);
    });
    // door
    ctx.fillStyle = C('#5f412d', gg); rr(x + w * 0.4, y + h * 0.6, w * 0.2, h * 0.4, 8); ctx.fill();
    ctx.fillStyle = C(lit ? '#a7794f' : '#8a6a4a', gg); rr(x + w * 0.42, y + h * 0.63, w * 0.16, h * 0.37, 6); ctx.fill();
    if (b.vines && !lit) { ctx.strokeStyle = '#4a6a42'; ctx.lineWidth = 3; for (let i = 0; i < 9; i++) { ctx.beginPath(); const sx0 = x + w * (0.3 + i * 0.05); ctx.moveTo(sx0, y + h); ctx.bezierCurveTo(sx0 + 10, y + h * 0.8, sx0 - 12, y + h * 0.6, sx0 + 4, y + h * 0.35); ctx.stroke(); }
      ctx.fillStyle = '#5c7f52'; for (let i = 0; i < 26; i++) { ctx.beginPath(); ctx.ellipse(x + w * (0.3 + hash(i, 1) * 0.45), y + h * (0.4 + hash(i, 2) * 0.6), 4, 2.5, hash(i, 3) * 3, 0, 7); ctx.fill(); } }
    // sign
    if (b.sign) { ctx.fillStyle = C('#e8d6a8', gg); rr(x + w * 0.62, y + h * 0.3, w * 0.16, h * 0.18, 4); ctx.fill(); ctx.strokeStyle = C('#7a543b', gg); ctx.lineWidth = 2; ctx.stroke();
      ctx.save(); if (!lit) ctx.filter = 'grayscale(1)'; ctx.font = `${Math.round(TS * 0.32)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(b.sign, x + w * 0.7, y + h * 0.4); ctx.restore(); }
    if (b.wheel) { ctx.strokeStyle = C('#6a4a32', gg); ctx.lineWidth = 4; circ(x + w * 0.02, y + h * 0.75, h * 0.3); ctx.stroke(); for (let i = 0; i < 6; i++) { const a = i * 1.047 + (lit ? t : 0); ctx.beginPath(); ctx.moveTo(x + w * 0.02, y + h * 0.75); ctx.lineTo(x + w * 0.02 + Math.cos(a) * h * 0.3, y + h * 0.75 + Math.sin(a) * h * 0.3); ctx.stroke(); } }
    // the hex: drifting purple wisps
    if (!lit) for (let i = 0; i < 4; i++) { const k = (t * 0.25 + i / 4) % 1; ctx.fillStyle = `rgba(150,110,210,${0.35 * Math.sin(k * Math.PI)})`; circ(x + w * (0.15 + i * 0.22) + Math.sin(t + i) * 6, y + h * (0.9 - k * 1.1), TS * 0.16); ctx.fill(); }
  },
  appletree(o, x, y, w, h, g, t) {
    drawSprite('oak', 1, g, x + w / 2, y + h * 0.95, Math.sin(t * 0.8) * 0.02);
    if (G.flag('weedsCut')) { const n = 3; for (let i = 0; i < 6; i++) { ctx.fillStyle = C('#e2403f', g); circ(x + w * (0.1 + hash(i, 7) * 0.8), y - h * (0.6 + hash(i, 8) * 1.1), TS * 0.07); ctx.fill(); } }
    else { ctx.strokeStyle = C('#6a7a42', g); ctx.lineWidth = 2.5; for (let i = 0; i < 10; i++) { const sx0 = x + w * (0.1 + hash(i, 4) * 0.8); ctx.beginPath(); ctx.moveTo(sx0, y + h); ctx.bezierCurveTo(sx0 + 8, y + h * 0.3, sx0 - 10, y - h * 0.4, sx0 + 4, y - h * (0.6 + hash(i, 5) * 0.8)); ctx.stroke(); }
      ctx.fillStyle = C('#7a8a4a', g); for (let i = 0; i < 18; i++) { ctx.beginPath(); ctx.ellipse(x + w * hash(i, 6), y + h * (0.9 - hash(i, 9) * 2), 4, 2.5, i, 0, 7); ctx.fill(); } }
  },
  ironrock(o, x, y, w, h, g) {
    const rg2 = ctx.createRadialGradient(x + w * 0.38, y + h * 0.38, 2, x + w * 0.5, y + h * 0.6, w * 0.5);
    rg2.addColorStop(0, C('#c98a6a', g)); rg2.addColorStop(0.6, C('#9a5a42', g)); rg2.addColorStop(1, C('#6a3a2a', g));
    ctx.fillStyle = 'rgba(30,40,20,0.25)'; ctx.beginPath(); ctx.ellipse(x + w / 2, y + h * 0.88, w * 0.42, h * 0.1, 0, 0, 7); ctx.fill();
    ctx.fillStyle = rg2; rr(x + w * 0.1, y + h * 0.2, w * 0.8, h * 0.7, w * 0.28); ctx.fill();
    ctx.strokeStyle = C('#d8a080', g, 0.8); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + w * 0.25, y + h * 0.45); ctx.lineTo(x + w * 0.5, y + h * 0.55); ctx.lineTo(x + w * 0.7, y + h * 0.4); ctx.stroke();
  },
  signpost(o, x, y, w, h, g) {
    ctx.fillStyle = C('#7a543b', g); ctx.fillRect(x + w * 0.46, y - h * 0.3, w * 0.08, h * 1.2);
    ctx.fillStyle = C('#b5835d', g); ctx.beginPath(); ctx.moveTo(x - w * 0.05, y - h * 0.15); ctx.lineTo(x + w * 0.8, y - h * 0.15); ctx.lineTo(x + w * 0.8, y + h * 0.15); ctx.lineTo(x - w * 0.05, y + h * 0.15); ctx.lineTo(x - w * 0.2, y); ctx.closePath(); ctx.fill();
  },
  fallen(o, x, y, w, h, g) {
    for (let i = 0; i < 3; i++) { const yy = y + h * (0.2 + i * 0.28), a = (i - 1) * 0.15;
      ctx.save(); ctx.translate(x + w / 2, yy); ctx.rotate(a);
      const lg = ctx.createLinearGradient(0, -h * 0.12, 0, h * 0.12); lg.addColorStop(0, C('#9a6c42', g)); lg.addColorStop(1, C('#4e3220', g));
      ctx.fillStyle = lg; rr(-w * 0.55, -h * 0.12, w * 1.1, h * 0.24, h * 0.1); ctx.fill();
      ctx.fillStyle = C('#d8b88a', g); ctx.beginPath(); ctx.ellipse(w * 0.55, 0, h * 0.06, h * 0.12, 0, 0, 7); ctx.fill(); ctx.restore(); }
  },
  brokenbridge(o, x, y, w, h, g) {
    ctx.fillStyle = C('#a7794f', g); ctx.fillRect(x, y + h * 0.15, w * 0.32, h * 0.7); ctx.fillRect(x + w * 0.7, y + h * 0.15, w * 0.3, h * 0.7);
    ctx.strokeStyle = C('#7a5432', g); ctx.lineWidth = 2;
    for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x + i * w * 0.08, y + h * 0.15); ctx.lineTo(x + i * w * 0.08, y + h * 0.85); ctx.stroke(); }
    ctx.save(); ctx.translate(x + w * 0.45, y + h * 0.6); ctx.rotate(0.5); ctx.fillStyle = C('#8a6a4a', g); ctx.fillRect(-w * 0.12, -4, w * 0.24, 8); ctx.restore();
  },
  chest(o, x, y, w, h, g) {
    const open = G.flag('chestOpen');
    ctx.fillStyle = C('#7a543b', g); rr(x + w * 0.12, y + h * 0.35, w * 0.76, h * 0.5, 4); ctx.fill();
    ctx.fillStyle = C('#9a6c42', g); rr(x + w * 0.12, open ? y + h * 0.05 : y + h * 0.22, w * 0.76, h * 0.22, 6); ctx.fill();
    ctx.fillStyle = C('#e7c36a', g); ctx.fillRect(x + w * 0.45, y + h * 0.4, w * 0.1, h * 0.14);
    if (!open && Math.sin(Date.now() / 300) > 0.5) star(x + w * 0.8, y + h * 0.25, TS * 0.08, 'rgba(255,255,230,0.9)');
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
  } else if (sp === 'bird') {
    const flap = Math.abs(Math.sin(c.t * 9 + c.x)), col = c.def.color || '#5b8fe0';
    ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(0, 0, s * 0.13, s * 0.1, 0, 0, 7); ctx.fill();
    circ(s * 0.11, -s * 0.06, s * 0.07); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.ellipse(-s * 0.02, -s * 0.03 - flap * s * 0.08, s * 0.1, s * 0.04 + flap * s * 0.03, -0.4, 0, 7); ctx.fill();
    ctx.fillStyle = '#f0b040'; ctx.beginPath(); ctx.moveTo(s * 0.17, -s * 0.07); ctx.lineTo(s * 0.24, -s * 0.05); ctx.lineTo(s * 0.17, -s * 0.03); ctx.fill();
    ctx.fillStyle = '#222'; circ(s * 0.13, -s * 0.08, s * 0.015); ctx.fill();
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-s * 0.12, 0); ctx.lineTo(-s * 0.22, -s * 0.04); ctx.lineTo(-s * 0.2, s * 0.04); ctx.fill();
  } else if (sp === 'mouse') {
    const hop = Math.abs(Math.sin(c.t * 8)) * s * 0.02;
    ctx.strokeStyle = '#c99a9a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-s * 0.1, s * 0.05); ctx.quadraticCurveTo(-s * 0.25, s * 0.0, -s * 0.22, -s * 0.12); ctx.stroke();
    ctx.fillStyle = '#b8b0a8'; ctx.beginPath(); ctx.ellipse(0, s * 0.05 - hop, s * 0.11, s * 0.08, 0, 0, 7); ctx.fill();
    circ(s * 0.09, 0 - hop, s * 0.06); ctx.fill();
    ctx.fillStyle = '#f0c8c8'; circ(s * 0.06, -s * 0.06 - hop, s * 0.04); ctx.fill(); circ(s * 0.12, -s * 0.07 - hop, s * 0.035); ctx.fill();
    ctx.fillStyle = '#222'; circ(s * 0.12, -s * 0.01 - hop, s * 0.012); ctx.fill();
  } else if (sp === 'squirrel') {
    const hop = Math.abs(Math.sin(c.t * 6)) * s * 0.04;
    ctx.fillStyle = '#b8653a'; ctx.beginPath(); ctx.ellipse(-s * 0.14, -s * 0.1 - hop, s * 0.1, s * 0.2, -0.3, 0, 7); ctx.fill();
    ctx.fillStyle = '#c9773f'; ctx.beginPath(); ctx.ellipse(0, s * 0.05 - hop, s * 0.13, s * 0.11, 0, 0, 7); ctx.fill();
    circ(s * 0.1, -s * 0.06 - hop, s * 0.08); ctx.fill();
    ctx.beginPath(); ctx.moveTo(s * 0.07, -s * 0.12 - hop); ctx.lineTo(s * 0.09, -s * 0.2 - hop); ctx.lineTo(s * 0.12, -s * 0.13 - hop); ctx.fill();
    ctx.fillStyle = '#f3e2c8'; ctx.beginPath(); ctx.ellipse(s * 0.04, s * 0.08 - hop, s * 0.06, s * 0.05, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#222'; circ(s * 0.13, -s * 0.07 - hop, s * 0.016); ctx.fill();
  } else if (sp === 'badger') {
    ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.beginPath(); ctx.ellipse(0, s * 0.22, s * 0.25, s * 0.06, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#7a7a80'; ctx.beginPath(); ctx.ellipse(0, s * 0.06, s * 0.24, s * 0.15, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#8a5a3a'; rr(-s * 0.12, -s * 0.02, s * 0.2, s * 0.2, 4); ctx.fill();
    ctx.fillStyle = '#f2f0ea'; ctx.beginPath(); ctx.ellipse(s * 0.2, -s * 0.04, s * 0.11, s * 0.09, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#2a2a2e'; ctx.beginPath(); ctx.ellipse(s * 0.2, -s * 0.07, s * 0.035, s * 0.08, 0.1, 0, 7); ctx.fill();
    ctx.fillStyle = '#222'; circ(s * 0.3, -s * 0.03, s * 0.02); ctx.fill();
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
  S.given = S.given || {};
  if (S.gifts) { if (S.gifts.r1) S.given.honeycake = true; if (S.gifts.r2) S.given.dew = true; if (S.gifts.r3) S.given.button = true; }
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

if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => { });
requestAnimationFrame(frame);
