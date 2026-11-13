// Hexwood - game data: items, spells, recipes, maps, objects, creatures.
// Object "act" functions run at play time and use the G helpers in game.js.
'use strict';

const VERSION = 'v2';

// ---------------------------------------------------------------- items
const ITEMS = {
  ash:        { name: 'Hearth Ash',    icon: '🌫️', kind: 'ingredient', desc: 'Soft gray ash from the hearth.' },
  inkberry:   { name: 'Inkberry',      icon: '🫐', kind: 'ingredient', desc: 'Dark berries that stain everything.' },
  quill:      { name: 'Goose Quill',   icon: '🪶', kind: 'ingredient', desc: 'A long white feather, good for writing.' },
  wisp:       { name: 'Wisp Feather',  icon: '💫', kind: 'ingredient', desc: 'Light as a breath and faintly glowing. Rare.' },
  candle:     { name: 'Candle Stub',   icon: '🕯️', kind: 'ingredient', desc: 'A short, well-used candle.' },
  sunstone:   { name: 'Sunstone',      icon: '🟡', kind: 'ingredient', desc: 'A stone that stays warm, as if it remembers summer.' },
  petal:      { name: 'Shimmer Petal', icon: '🌸', kind: 'ingredient', desc: 'A petal that shimmers when you look away from it.' },
  riverglass: { name: 'River Glass',   icon: '🔹', kind: 'ingredient', desc: 'Smooth, clear glass tumbled by the brook.' },
  berryink:   { name: 'Berry Ink',     icon: '🖋️', kind: 'worked',     desc: 'Ground inkberries. Deep purple.' },
  petaldust:  { name: 'Petal Dust',    icon: '💮', kind: 'worked',     desc: 'Ground shimmer petal. It twinkles.' },
  dimorb:     { name: 'Dim Orb',       icon: '🟠', kind: 'worked',     desc: 'Candle and sunstone, joined. Waiting to be enchanted.' },
  clearorb:   { name: 'Clear Orb',     icon: '⚪', kind: 'worked',     desc: 'River glass dusted with petal. Waiting to be enchanted.' },
  honeycake:  { name: 'Honeycake Crumb', icon: '🍰', kind: 'trinket',  desc: 'Sticky and sweet. Someone small might like it.' },
  dew:        { name: 'Thimble of Dew',  icon: '💧', kind: 'trinket',  desc: 'Morning dew caught in a thimble.' },
  button:     { name: 'Shiny Button',    icon: '🔘', kind: 'trinket',  desc: 'A bright brass button.' },
  honey:      { name: 'Wildflower Honey', icon: '🍯', kind: 'trinket',  desc: 'A little jar of Old Moss\'s honey.' },
  strawberry: { name: 'Wild Strawberry',  icon: '🍓', kind: 'trinket',  desc: 'Tiny, sweet, and very red.' },
  stool:      { name: 'Step Stool',    icon: '🪑', kind: 'tool',       desc: 'For reaching high places.' },
  key:        { name: 'Door Key',      icon: '🗝️', kind: 'tool',       desc: 'An old iron key.' },
  moonpebble: { name: 'Moon Pebble',   icon: '🌙', kind: 'curio',      desc: 'A pale pebble that glows at night.' },
  goldacorn:  { name: 'Golden Acorn',  icon: '🌰', kind: 'curio',      desc: 'An acorn of real gold. The chipmunks\' treasure.' },
  tinybell:   { name: 'Tiny Bell',     icon: '🔔', kind: 'curio',      desc: 'It rings without being shaken.' },
  marble:     { name: 'Glass Marble',  icon: '🔵', kind: 'curio',      desc: 'A swirl of blue caught in glass.' },
};

// Spell items that live in the pouch.
const SPELL_ITEMS = {
  writepowder: { name: 'Write Powder', icon: '✒️', shape: 'powder', page: 'write' },
  lightorb:    { name: 'Light Orb',    icon: '🌕', shape: 'orb', page: 'light',  charges: 3 },
  seekerorb:   { name: 'Seeker Orb',   icon: '🔮', shape: 'orb', page: 'seeker', charges: 3 },
};

const SHAPES = {
  powder: 'Powder: works once',
  orb:    'Orb: has charges, recharge at the hut hearth',
  cube:   'Cube: a permanent enchantment on an object',
};

// ---------------------------------------------------------------- spellbook pages
const PAGE_ORDER = ['write', 'light', 'seeker'];
const PAGES = {
  write: {
    unknown: 'A spell for writing magic',
    name: 'Write', shape: 'powder',
    formula: [
      '1 Hearth Ash',
      '1 Berry Ink (grind 2 Inkberries at the mortar)',
      '1 Goose Quill',
      'Assemble at the workbench.',
      'Casting costs 1 Wisp Feather.',
    ],
    effects: [
      'Writes the formula for a new spell onto a fresh page.',
      'Costs one Wisp Feather each time it is cast.',
      'The book holds no more than three formulas that have not yet been cast.',
    ],
  },
  light: {
    unknown: 'A pale, warm orb spell',
    name: 'Light', shape: 'orb',
    formula: [
      '1 Candle Stub',
      '1 Sunstone',
      'Join them at the workbench into a Dim Orb.',
      'Ask the fairy to enchant it.',
    ],
    effects: [
      'Glows around you for about a minute.',
      'Darkness pulls back from it.',
    ],
  },
  seeker: {
    unknown: 'A clear, watchful orb spell',
    name: 'Seeker', shape: 'orb',
    formula: [
      '1 Petal Dust (grind a Shimmer Petal at the mortar)',
      '1 River Glass',
      'Join them at the workbench into a Clear Orb.',
      'Ask the fairy to enchant it.',
    ],
    effects: [
      'While you hold it, you stand still and turn slowly, looking.',
      'Reveals hidden things within a few steps.',
      'Use it where something shimmers, glows, or a creature slips into a solid place.',
    ],
  },
};

// Effects discovered later, added to the book automatically.
const LATE_EFFECTS = {
  lantern: { page: 'light', text: 'Kindles old lanterns when you stand close while it glows.' },
};

// ---------------------------------------------------------------- recipes
const RECIPES = [
  { id: 'ink',    station: 'mortar', page: 'write',  needs: { inkberry: 2 }, makes: 'berryink',
    verb: 'Grind' },
  { id: 'write',  station: 'bench',  page: 'write',  needs: { ash: 1, berryink: 1, quill: 1 }, spell: 'writepowder',
    verb: 'Assemble' },
  { id: 'dim',    station: 'bench',  page: 'light',  needs: { candle: 1, sunstone: 1 }, makes: 'dimorb',
    verb: 'Join' },
  { id: 'light',  station: 'fairy',  page: 'light',  needs: { dimorb: 1 }, spell: 'lightorb',
    verb: 'Enchant' },
  { id: 'dust',   station: 'mortar', page: 'seeker', needs: { petal: 1 }, makes: 'petaldust',
    verb: 'Grind' },
  { id: 'clear',  station: 'bench',  page: 'seeker', needs: { riverglass: 1, petaldust: 1 }, makes: 'clearorb',
    verb: 'Join' },
  { id: 'seeker', station: 'fairy',  page: 'seeker', needs: { clearorb: 1 }, spell: 'seekerorb',
    verb: 'Enchant' },
];

const STATION_NAMES = { mortar: 'Mortar & Pestle', bench: 'Workbench', fairy: 'Fennel the Fairy' };

// ---------------------------------------------------------------- maps
// Tile legend:
//  # wall   w window   . floor
//  , grass  : flowers  = path   ~ water  o stepping stone
//  T tree   B birch    b bush   R rock   h hedge  O standing stone  H hut (solid, drawn by object)
//  x secret hedge (opens when revealed)
const HUT_MAP = [
  '#####w###w###',
  '#...........#',
  '#...........#',
  '#...........#',
  '#...........#',
  '#...........#',
  '#...........#',
  '#...........#',
  '#...........#',
  '######D######',
];

const CELLAR_MAP = [
  '#########',
  '#.......#',
  '#.......#',
  '#.......#',
  '#.......#',
  '#.......#',
  '#########',
];

function rng(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// The outdoors is "painted" by hand with coordinates, plus seeded scatter for trees and flowers.
function buildOutdoor() {
  const W = 40, H = 32;
  const g = [];
  for (let y = 0; y < H; y++) g.push(new Array(W).fill(','));
  const set = (x, y, c) => { if (x >= 0 && y >= 0 && x < W && y < H) g[y][x] = c; };
  const rect = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, c); };
  const R = rng(7);
  const reserved = new Set();
  const keep = (x, y, r = 1) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) reserved.add((x + dx) + ',' + (y + dy)); };

  // brook
  rect(1, 25, 38, 26, '~');
  set(7, 25, 'o'); set(7, 26, 'o');
  set(30, 25, 'o'); set(30, 26, 'o');

  // paths
  rect(7, 16, 7, 24, '=');
  rect(7, 27, 7, 28, '=');
  rect(7, 17, 34, 17, '=');
  rect(12, 6, 12, 17, '=');
  rect(12, 6, 34, 6, '=');
  rect(30, 17, 30, 24, '=');
  rect(30, 27, 30, 28, '=');

  // the hut
  rect(6, 13, 9, 15, 'H');

  // soft borders between areas (with gaps)
  for (let x = 1; x <= 38; x++) if (x !== 12 && x !== 13 && x !== 4 && x !== 24 && x !== 25 && R() < 0.75) set(x, 10, x < 18 ? 'T' : 'R');
  for (let y = 11; y <= 21; y++) if (y !== 17 && y !== 13 && R() < 0.7) set(15, y, 'b');
  for (let y = 1; y <= 9; y++) if (y !== 6 && y !== 7 && R() < 0.8) set(18, y, 'T');
  for (let x = 1; x <= 38; x++) if (x !== 7 && x !== 30 && x !== 18 && x !== 19 && R() < 0.35) set(x, 23, 'b');

  // the hidden hollow: a hedge ring in the grove's corner
  rect(1, 1, 7, 1, 'h'); rect(1, 6, 7, 6, 'h'); rect(7, 1, 7, 6, 'h'); rect(1, 1, 1, 6, 'h');
  set(7, 4, 'x');
  // three birches leaning together beside it
  set(8, 3, 'B'); set(8, 5, 'B'); set(9, 3, 'B');
  keep(8, 4, 0); keep(9, 4, 0); keep(10, 4, 0);

  // standing stones circle
  [[25, 3], [31, 3], [24, 5], [32, 5], [26, 8], [30, 8], [28, 2]].forEach(([x, y]) => set(x, y, 'O'));
  keep(28, 5, 2);

  // reserved spots (objects, creatures, routes) so scatter never covers them
  [[3, 8], [14, 2], [15, 8], [9, 8], [21, 4], [35, 3], [22, 13], [33, 19], [20, 15], [26, 13], [34, 14],
   [29, 19], [37, 12], [24, 20], [4, 18], [11, 12], [16, 24], [31, 28], [12, 28], [22, 23], [3, 12], [10, 19]]
    .forEach(([x, y]) => keep(x, y, 1));
  for (let x = 4; x <= 11; x++) keep(x, 16, 1); // hut front

  // scatter: grove (dense trees + birches), stones (rocks), meadow (flowers), yard (flowers, bushes), south bank
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    if (g[y][x] !== ',' || reserved.has(x + ',' + y)) continue;
    const r = R();
    if (y <= 9 && x <= 17) { if (r < 0.3) set(x, y, R() < 0.5 ? 'B' : 'T'); else if (r < 0.26) set(x, y, ':'); }
    else if (y <= 9) { if (r < 0.07) set(x, y, 'R'); else if (r < 0.12) set(x, y, 'b'); else if (r < 0.2) set(x, y, ':'); }
    else if (y <= 21 && x >= 16) { if (r < 0.28) set(x, y, ':'); else if (r < 0.31) set(x, y, 'b'); }
    else if (y <= 21) { if (r < 0.1) set(x, y, ':'); else if (r < 0.13) set(x, y, 'b'); }
    else if (y >= 27) { if (r < 0.12) set(x, y, 'T'); else if (r < 0.2) set(x, y, ':'); }
    else if (y >= 22 && y <= 24) { if (r < 0.1) set(x, y, ':'); }
  }

  // keep the hollow open and pretty inside
  rect(2, 2, 6, 5, ',');
  [[2, 2], [6, 2], [2, 5], [6, 5], [4, 2]].forEach(([x, y]) => set(x, y, ':'));

  // world border
  rect(0, 0, W - 1, 0, 'T'); rect(0, H - 1, W - 1, H - 1, 'T');
  rect(0, 0, 0, H - 1, 'T'); rect(W - 1, 0, W - 1, H - 1, 'T');
  return g.map(r => r.join(''));
}

// Zones: first match wins. g = 1 gray, 0 full color.
const ZONES = {
  hut:    [{ id: 'hut',    name: 'The Hut',        rect: [0, 0, 12, 9] }],
  cellar: [{ id: 'cellar', name: 'The Cellar',     rect: [0, 0, 8, 6], dark: true }],
  out: [
    { id: 'hollow', name: 'Chipmunk Hollow',   rect: [1, 1, 7, 6] },
    { id: 'grove',  name: 'Birch Grove',       rect: [0, 0, 17, 10], dark: true },
    { id: 'stones', name: 'The Old Stones',    rect: [18, 0, 39, 10] },
    { id: 'yard',   name: 'Hut Yard',          rect: [0, 11, 15, 22] },
    { id: 'meadow', name: 'Sunny Meadow',      rect: [16, 11, 39, 22] },
    { id: 'brook',  name: 'Willow Brook',      rect: [0, 23, 39, 31] },
  ],
};

// ---------------------------------------------------------------- objects
// tx,ty = top-left tile, tw,th = size in tiles. layer: floor | normal | wall.
// act() returns { label, fn } or null. vis() hides an object when false.
const F = (k) => G.flag(k);
const OBJECTS = [
  // ---------- hut interior
  { id: 'bed', map: 'hut', tx: 1, ty: 1, tw: 2, th: 2, draw: 'bed',
    act: () => !G.has('stool') && !F('stoolTaken')
      ? { label: 'Look under the bed', fn: () => { G.give('stool'); G.setFlag('stoolTaken'); G.say(['A little step stool was tucked under the bed.']); } }
      : { label: 'Look at the bed', fn: () => G.say(['Your bed. The quilt has gone gray like everything else.']) } },
  { id: 'nightstand', map: 'hut', tx: 3, ty: 1, draw: 'nightstand',
    act: () => !F('candleTaken')
      ? { label: 'Open the drawer', fn: () => { G.give('candle'); G.setFlag('candleTaken'); G.say(['A candle stub rolls around in the drawer.']); } }
      : { label: 'Look', fn: () => G.say(['An empty drawer.']) } },
  { id: 'shelf', map: 'hut', tx: 4, ty: 1, tw: 2, draw: 'shelf',
    act: () => {
      if (!F('fairyFree')) {
        if (G.has('stool')) return { label: 'Climb up to the jar', fn: () => G.freeFairy() };
        return { label: 'Look at the high shelf', fn: () => G.say(['A glass jar sits on the high shelf, far out of reach. Something inside it glows, very faintly.',
          'Carved into the shelf\'s edge is a tiny crescent moon.']) };
      }
      return { label: 'Look at the shelf', fn: () => G.say(['A tiny crescent moon is carved into the shelf\'s edge.']) };
    } },
  { id: 'painting', map: 'hut', tx: 7, ty: 0, layer: 'wall', draw: 'painting',
    act: () => ({ label: 'Look at the painting', fn: () => G.say(['A painting of the meadow, faded to gray.', 'Down in one corner, a single leaf is painted in gold.']) }) },
  { id: 'sill', map: 'hut', tx: 9, ty: 1, draw: 'sill',
    act: () => !F('dewTaken')
      ? { label: 'Look at the windowsill', fn: () => { G.give('dew'); G.setFlag('dewTaken'); G.say(['A thimble sits on the sill, full of morning dew.']); } }
      : { label: 'Look out the window', fn: () => G.say(['Outside, the whole forest is gray.']) } },
  { id: 'clock', map: 'hut', tx: 11, ty: 1, draw: 'clock',
    act: () => !F('sunTaken')
      ? { label: 'Look at the clock', fn: () => { G.give('sunstone'); G.setFlag('sunTaken'); G.say(['The clock stopped long ago. Its pendulum weight is a warm yellow stone.', 'You take the Sunstone.']); } }
      : { label: 'Look at the clock', fn: () => G.say(['Stopped at a quarter past something.']) } },
  { id: 'hearth', map: 'hut', tx: 11, ty: 4, th: 2, draw: 'hearth',
    act: () => {
      const low = G.orbsNeedingCharge(), needAsh = G.count('ash') < 1;
      const ash = () => { G.give('ash'); G.say(['You scoop up a handful of soft ash.']); };
      if (low && needAsh) return { label: 'Use the hearth', fn: () => G.choice('The embers glow warmly.', ['Recharge orbs', 'Scoop some ash'], i => i === 0 ? G.recharge() : ash()) };
      if (low) return { label: 'Recharge orbs', fn: () => G.recharge() };
      if (needAsh) return { label: 'Scoop some ash', fn: ash };
      return { label: 'Warm your hands', fn: () => G.say(['The embers glow. Orbs can be recharged here when they run low.']) };
    } },
  { id: 'table', map: 'hut', tx: 5, ty: 4, tw: 2, draw: 'table', act: () => null },
  { id: 'bowl', map: 'hut', tx: 7, ty: 4, draw: 'bowl',
    act: () => !F('berriesTaken')
      ? { label: 'Take the berries', fn: () => { G.give('inkberry', 4); G.setFlag('berriesTaken'); G.say(['A bowl of inkberries. You take all four.']); } }
      : { label: 'Look', fn: () => G.say(['An empty bowl, stained purple.']) } },
  { id: 'fairy', map: 'hut', tx: 6, ty: 3, solid: false, draw: 'fairy', vis: () => F('fairyFree'),
    act: () => ({ label: 'Talk to Fennel', fn: () => G.talkFairy() }) },
  { id: 'mortar', map: 'hut', tx: 1, ty: 5, draw: 'mortar',
    act: () => G.flag('bookFound') ? { label: 'Use the mortar', fn: () => G.openStation('mortar') }
      : { label: 'Look', fn: () => G.say(['A stone mortar and pestle, for grinding.']) } },
  { id: 'bench', map: 'hut', tx: 1, ty: 6, tw: 2, draw: 'bench',
    act: () => G.flag('bookFound') ? { label: 'Use the workbench', fn: () => G.openStation('bench') }
      : { label: 'Look', fn: () => G.say(['A sturdy workbench, scarred by years of making things.']) } },
  { id: 'rug', map: 'hut', tx: 5, ty: 6, tw: 3, th: 2, solid: false, layer: 'floor', draw: 'rug', vis: () => !F('rugRolled'),
    act: () => ({ label: 'Look at the rug', fn: () => G.say(['A round woven rug. Woven into its border is a little acorn.', 'Hmm. The rug lies a bit lumpy in the middle.'],
      () => G.choice('Roll back the rug?', ['Roll it back', 'Leave it'], i => { if (i === 0) { G.setFlag('rugRolled'); G.chime(1); G.say(['Under the rug: a trapdoor!']); } })) }) },
  { id: 'rugrolled', map: 'hut', tx: 5, ty: 6, tw: 1, th: 2, solid: false, layer: 'floor', draw: 'rugrolled', vis: () => F('rugRolled'),
    act: () => null },
  { id: 'trapdoor', map: 'hut', tx: 6, ty: 6, tw: 1, th: 1, solid: false, layer: 'floor', draw: 'trapdoor', vis: () => F('rugRolled'),
    act: () => ({ label: 'Climb down', fn: () => G.goMap('cellar', 1.5, 2.6) }) },
  { id: 'bureau', map: 'hut', tx: 10, ty: 7, tw: 2, draw: 'bureau',
    act: () => !F('bookFound')
      ? { label: 'Look at the bureau', fn: () => G.openBureau() }
      : { label: 'Look', fn: () => G.say(['The bureau\'s drawer stands open and empty.']) } },
  { id: 'cupboard', map: 'hut', tx: 1, ty: 8, draw: 'cupboard',
    act: () => !F('cakeTaken')
      ? { label: 'Open the cupboard', fn: () => { G.give('honeycake'); G.setFlag('cakeTaken'); G.say(['Not much here. A crumb of honeycake on a plate.']); } }
      : { label: 'Look', fn: () => G.say(['An empty cupboard.']) } },
  { id: 'vase', map: 'hut', tx: 4, ty: 8, draw: 'vase',
    act: () => F('quillsTaken') ? { label: 'Look', fn: () => G.say(['An empty vase.']) }
      : { label: 'Look at the vase', fn: () => { G.give('quill', 2); G.setFlag('quillsTaken'); G.say(['Two goose quills stand in the vase. You take them.']); } } },
  { id: 'basket', map: 'hut', tx: 8, ty: 8, draw: 'basket',
    act: () => !F('buttonTaken')
      ? { label: 'Look in the sewing basket', fn: () => { G.give('button'); G.setFlag('buttonTaken'); G.say(['Thread, needles... and a shiny brass button.']); } }
      : { label: 'Look', fn: () => G.say(['Thread and needles.']) } },
  { id: 'door', map: 'hut', tx: 6, ty: 9, layer: 'wall', draw: 'door',
    act: () => {
      if (F('doorOpen')) return { label: 'Go outside', fn: () => G.goMap('out', 7.5, 16.6) };
      if (G.has('key')) return { label: 'Unlock the door', fn: () => { G.take('key'); G.setFlag('doorOpen'); G.chime(2); G.say(['The key turns with a heavy clunk. The door swings open.']); } };
      return { label: 'Try the door', fn: () => G.say(['Locked. The keyhole is old and iron.']) };
    } },

  // ---------- cellar
  { id: 'stairs', map: 'cellar', tx: 1, ty: 1, solid: false, layer: 'floor', draw: 'stairs',
    act: () => ({ label: 'Climb up', fn: () => G.goMap('hut', 6.5, 5.6) }) },
  { id: 'jars', map: 'cellar', tx: 3, ty: 0, tw: 2, layer: 'wall', draw: 'jars',
    act: () => {
      if (!G.lightActive()) return { label: 'Feel along the shelf', fn: () => G.say(['Jars, by the feel of it. Too dark to see what\'s in them.']) };
      if (!F('honeyTaken')) return { label: 'Look at the jars', fn: () => { G.give('honey'); G.setFlag('honeyTaken'); G.say(['Old jars of pickled... something. Better not.', 'But one little jar glows gold: wildflower honey! You take it.']); } };
      return { label: 'Look at the jars', fn: () => G.say(['Old jars of pickled... something. Better not.']) };
    } },
  { id: 'keyhook', map: 'cellar', tx: 7, ty: 0, layer: 'wall', draw: 'keyhook', vis: () => !F('keyTaken'),
    act: () => G.lightActive()
      ? { label: 'Take the key', fn: () => { G.give('key'); G.setFlag('keyTaken'); G.setZone('cellar', 0); G.chime(1); G.say(['An old iron key hangs on a hook. It must be the hut door key!']); } }
      : { label: 'Feel along the wall', fn: () => G.say(['It\'s far too dark. You can\'t find anything.']) } },
  { id: 'crate', map: 'cellar', tx: 6, ty: 4, draw: 'crate',
    act: () => F('crateWisp') ? { label: 'Look', fn: () => G.say(['An empty crate.']) }
      : G.lightActive() ? { label: 'Look in the crate', fn: () => { G.give('wisp'); G.setFlag('crateWisp'); G.chime(1); G.say(['Tucked in the straw, a Wisp Feather glows softly.']); } }
      : { label: 'Feel around', fn: () => G.say(['A crate full of straw. Too dark to see inside.']) } },

  // ---------- outdoors
  { id: 'hutx', map: 'out', tx: 6, ty: 13, tw: 4, th: 3, draw: 'hutx',
    act: () => ({ label: 'Go inside', fn: () => G.goMap('hut', 6.5, 8.4) }) },
  { id: 'lantern1', map: 'out', tx: 3, ty: 8, draw: 'lantern', act: () => G.lanternAct('lantern1') },
  { id: 'lantern2', map: 'out', tx: 14, ty: 2, draw: 'lantern', act: () => G.lanternAct('lantern2') },
  { id: 'lantern3', map: 'out', tx: 15, ty: 8, draw: 'lantern', act: () => G.lanternAct('lantern3') },
  { id: 'berrybush', map: 'out', tx: 22, ty: 13, draw: 'berrybush',
    act: () => ({ label: 'Pick inkberries', fn: () => { G.give('inkberry', 2); G.say(['You pick two inkberries. More will grow.']); } }) },
  { id: 'shimmerflower', map: 'out', tx: 33, ty: 19, solid: false, draw: 'shimmerflower', vis: () => !F('flowerTaken'),
    act: () => ({ label: 'Pick the shimmering flower', fn: () => { G.give('petal'); G.setFlag('flowerTaken'); G.say(['You pick a Shimmer Petal.']); } }) },
  { id: 'riverglass', map: 'out', tx: 16, ty: 24, solid: false, draw: 'pickup', icon: '🔹', vis: () => !F('glassTaken'),
    act: () => ({ label: 'Pick up the glass', fn: () => { G.give('riverglass'); G.setFlag('glassTaken'); G.say(['A smooth piece of River Glass, tumbled by the brook.']); } }) },
  { id: 'goosequill', map: 'out', tx: 31, ty: 28, solid: false, draw: 'pickup', icon: '🪶', vis: () => !F('outQuill'),
    act: () => ({ label: 'Pick up the feather', fn: () => { G.give('quill'); G.setFlag('outQuill'); G.say(['A goose quill, dropped by the brook.']); } }) },
  { id: 'rune', map: 'out', tx: 10, ty: 15, tw: 2, th: 2, solid: false, layer: 'floor', draw: 'rune',
    act: () => G.flag('fairyOutNow') ? null : ({ label: 'Look at the rune', fn: () => G.say(['An old rune circle set into the ground, carved with knots that loop forever.', F('fairyFree') ? 'When you stand on it, Fennel can find you.' : 'It hums very faintly.']) }) },
  { id: 'strawpatch', map: 'out', tx: 24, ty: 20, solid: false, draw: 'strawpatch',
    act: () => G.count('strawberry') < 3 ? { label: 'Pick a strawberry', fn: () => { G.give('strawberry'); } } : { label: 'Look', fn: () => G.say(['Wild strawberries. You have plenty for now.']) } },
  { id: 'well', map: 'out', tx: 3, ty: 12, draw: 'well',
    act: () => ({ label: 'Look in the well', fn: () => G.say(['A deep, cool well. Your reflection looks back, the only color around.']) }) },
  { id: 'bell', map: 'out', tx: 37, ty: 12, solid: false, draw: 'pickup', icon: '🔔', vis: () => F('bunnyLed') && !F('bellTaken'),
    act: () => ({ label: 'Pick up the bell', fn: () => { G.give('tinybell'); G.setFlag('bellTaken'); G.curio('tinybell'); } }) },
  // secrets (need the Seeker Orb)
  { id: 'moonpebble', map: 'out', tx: 28, ty: 5, solid: false, draw: 'pickup', icon: '🌙', secret: true, vis: () => !F('pebbleTaken'),
    act: () => ({ label: 'Pick up the pebble', fn: () => { G.give('moonpebble'); G.setFlag('pebbleTaken'); G.curio('moonpebble'); G.setZone('stones', 0); } }) },
  { id: 'marble', map: 'out', tx: 10, ty: 19, solid: false, draw: 'pickup', icon: '🔵', secret: true, vis: () => !F('marbleTaken'),
    act: () => ({ label: 'Pick up the marble', fn: () => { G.give('marble'); G.setFlag('marbleTaken'); G.curio('marble'); } }) },
  { id: 'hollowgate', map: 'out', tx: 7, ty: 4, solid: false, draw: 'none', secret: true, tile: true, vis: () => F('chainChip'),
    act: () => null },
  { id: 'goldacorn', map: 'out', tx: 3, ty: 3, solid: false, draw: 'pickup', icon: '🌰', vis: () => F('chipsInHollow') && !F('acornTaken'),
    act: () => ({ label: 'Pick up the acorn', fn: () => { G.give('goldacorn'); G.setFlag('acornTaken'); G.curio('goldacorn'); G.hollowCheck(); } }) },
  { id: 'hollowwisp', map: 'out', tx: 5, ty: 4, solid: false, draw: 'pickup', icon: '💫', vis: () => F('chipsInHollow') && !F('hollowWisp'),
    act: () => ({ label: 'Take the feather', fn: () => { G.give('wisp'); G.setFlag('hollowWisp'); G.say(['A Wisp Feather! The chipmunks were keeping it safe.']); G.hollowCheck(); } }) },
];

// ---------------------------------------------------------------- creatures
// All start hexed. reward: given when freed. lead: freed critter leads you somewhere, then sets a flag.
const CREATURES = [
  { id: 'y_chip',  map: 'out', x: 4.5,  y: 18.5, species: 'chipmunk', zone: 'yard' },
  { id: 'y_fly',   map: 'out', x: 11.5, y: 12.5, species: 'butterfly', zone: 'yard' },
  { id: 'm_fly',   map: 'out', x: 20.5, y: 15.5, species: 'butterfly', zone: 'meadow', reward: { item: 'petal', n: 1, text: 'It leaves a Shimmer Petal behind.' } },
  { id: 'm_chip1', map: 'out', x: 26.5, y: 13.5, species: 'chipmunk', zone: 'meadow' },
  { id: 'm_chip2', map: 'out', x: 34.5, y: 14.5, species: 'chipmunk', zone: 'meadow' },
  { id: 'm_bun',   map: 'out', x: 29.5, y: 19.5, species: 'bunny', zone: 'meadow', lead: { x: 37.5, y: 12.5, flag: 'bunnyLed' } },
  { id: 'b_chip',  map: 'out', x: 12.5, y: 28.5, species: 'chipmunk', zone: 'brook' },
  { id: 'b_frog',  map: 'out', x: 22.5, y: 23.5, species: 'frog', zone: 'brook', reward: { item: 'inkberry', n: 2, text: 'It hops off and leaves two inkberries.' } },
  { id: 'g_chip',  map: 'out', x: 9.5,  y: 8.5, species: 'chipmunk', zone: 'grove' },
  { id: 's_chip',  map: 'out', x: 35.5, y: 3.5, species: 'chipmunk', zone: 'stones' },
  { id: 's_fire',  map: 'out', x: 21.5, y: 4.5, species: 'firefly', zone: 'stones' },
];

// Zone challenges for zones that clear by freeing every hexed creature in them.
const FREE_ALL_ZONES = ['yard', 'meadow', 'brook'];

const CLUES = {
  chipmunks: 'Six small friends remember the way. Where three birches lean together in the dark grove, the hedge is only pretending. Look with a seeing eye.',
};
