// Hexwood - game data: items, spells, recipes, maps, objects, creatures.
// Object "act" functions run at play time and use the G helpers in game.js.
'use strict';

const VERSION = 'v9';
const VILLAGE_NAME = 'Thistledown';

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
  bark:       { name: 'Dry Bark',      icon: '🪵', kind: 'ingredient', desc: 'Papery bark peeled from a dead tree.' },
  ironstone:  { name: 'Iron-stone',    icon: '🪨', kind: 'ingredient', desc: 'A heavy, rust-streaked stone. The smith can use it.' },
  apple:      { name: 'Apple',         icon: '🍎', kind: 'trinket',    desc: 'Crisp and sweet.' },
  tinder:     { name: 'Bark Tinder',   icon: '🟫', kind: 'worked',     desc: 'Dry bark ground fine. It catches at the smallest spark.' },
  embercube:  { name: 'Ember Cube',    icon: '🟧', kind: 'worked',     desc: 'Ash and tinder pressed into a warm little cube. Waiting to be enchanted.' },
  berrytart:  { name: 'Berry Tart',    icon: '🥧', kind: 'trinket',    desc: 'Rosie\'s berry tart. Everyone loves these.' },
  turnover:   { name: 'Apple Turnover', icon: '🥐', kind: 'trinket',   desc: 'Flaky, warm, and full of apple.' },
  machete:    { name: 'Machete',       icon: '🔪', kind: 'tool',       desc: 'Bruno\'s blade for vines, weeds and thickets.' },
  boots:      { name: 'Sturdy Boots',  icon: '🥾', kind: 'gear',       desc: 'Old walking boots. You move a little faster in them.' },
  resin:      { name: 'Pine Resin',    icon: '🍯', kind: 'ingredient', desc: 'Sticky golden resin from a pine tree.' },
  silk:       { name: 'Spider Silk',   icon: '🕸️', kind: 'ingredient', desc: 'A wisp of strong, fine silk from an old web.' },
  fungus:     { name: 'Tinder Fungus', icon: '🍄', kind: 'ingredient', desc: 'A shelf mushroom from a dead tree. Pounded and cured, it becomes soft "mushroom leather".' },
  paste:      { name: 'Mending Paste', icon: '🫙', kind: 'worked',     desc: 'Resin and silk worked together. Waiting to be enchanted.' },
  flour:      { name: 'Flour',         icon: '🌾', kind: 'ingredient', desc: 'Fine flour from Barnaby\'s mill.' },
  planks:     { name: 'Planks',        icon: '🪵', kind: 'ingredient', desc: 'Smooth planks, cut by Barnaby.' },
  nails:      { name: 'Nails',         icon: '📌', kind: 'ingredient', desc: 'A handful of Bruno\'s iron nails.' },
  copper:     { name: 'Copper',        icon: '🟤', kind: 'ingredient', desc: 'Reddish metal from a far-off quarry.' },
  shortcake:  { name: 'Strawberry Shortcake', icon: '🍰', kind: 'trinket', desc: 'Rosie\'s best. Light, sweet and piled with berries.' },
  jar:        { name: 'Glass Jar',     icon: '🫙', kind: 'tool',       desc: 'An empty jar with a cork. Good for collecting honey.' },
  paper:      { name: 'Paper',         icon: '📄', kind: 'ingredient', desc: 'Fresh sheets from Marigold\'s workshop.' },
  blankbook:  { name: 'Blank Book',    icon: '📓', kind: 'tool',       desc: 'A bound book of empty pages. Someday a spell will fill it.' },
  compass:    { name: 'Brass Compass', icon: '🧭', kind: 'curio',      desc: 'Hidden in the old signpost. It always points toward the Keep.' },
  silvercoin: { name: 'Silver Coin',   icon: '🪙', kind: 'curio',      desc: 'An old coin from the Sunny Lane fountain, stamped with a tower.' },
  locket:     { name: 'Faded Locket',  icon: '📿', kind: 'curio',      desc: 'Inside: a tiny painted portrait, and one word, "Tig".' },
  goblet:     { name: 'Silver Goblet', icon: '🏆', kind: 'curio',      desc: 'From the Keep\'s long dining table. Engraved with the looping knot.' },
  mossnote:   { name: 'Old Moss\'s Note', icon: '📝', kind: 'tool',    desc: '"If you are reading this, the hex has held. I have gone up, toward the roof, to see where it came from. The stairs will not let just anyone pass. Light, warmth and music woke the hall for me... I hope they do for you. - M."' },
  pearl:      { name: 'River Pearl',   icon: '🫧', kind: 'curio',      desc: 'A pearl with a faint rainbow inside, from the frogs\' island.' },
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
  kindlecube:  { name: 'Kindle Cube',  icon: '🔥', shape: 'cube', page: 'kindle' },
  mendpowder:  { name: 'Mend Powder',  icon: '✨', shape: 'powder', page: 'mend' },
};

const SHAPES = {
  powder: 'Powder: works once',
  orb:    'Orb: has charges, recharge at the hut hearth',
  cube:   'Cube: a permanent enchantment on an object',
};

// ---------------------------------------------------------------- spellbook pages
const PAGE_ORDER = ['write', 'light', 'seeker', 'kindle', 'mend'];
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

PAGES.kindle = {
  unknown: 'A warm, square spell that never cools',
  name: 'Kindle', shape: 'cube',
  formula: [
    '1 Hearth Ash',
    '1 Bark Tinder (grind Dry Bark at the mortar; dead trees have bark)',
    'Join them at the workbench into an Ember Cube.',
    'Ask the fairy to enchant it.',
    'Cast it standing beside something that should always burn.',
  ],
  effects: [
    'Lights a fire that never goes out, for good.',
    'Each cube is used up when cast. Make one for every fire you want.',
  ],
};
PAGES.mend = {
  unknown: 'A soft, sticky powder that wants to fix things',
  name: 'Mend', shape: 'powder',
  formula: [
    '1 Pine Resin (pine trees, the tall pointed ones)',
    '1 Spider Silk (old webs on dead branches)',
    'Work them together at the workbench into Mending Paste.',
    'Ask the fairy to enchant it.',
    'Cast it standing beside something broken.',
  ],
  effects: [
    'Mends one broken thing, as good as new.',
    'Each pinch is used up. Make one for every repair.',
  ],
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
  { id: 'tinder', station: 'mortar', page: 'kindle', needs: { bark: 1 }, makes: 'tinder', verb: 'Grind' },
  { id: 'ember',  station: 'bench',  page: 'kindle', needs: { ash: 1, tinder: 1 }, makes: 'embercube', verb: 'Join' },
  { id: 'kindle', station: 'fairy',  page: 'kindle', needs: { embercube: 1 }, spell: 'kindlecube', verb: 'Enchant' },
  // village barter
  { id: 'tart',     station: 'bakery', req: () => G.flag('bakeryLit'), needs: { inkberry: 2, strawberry: 2 }, makes: 'berrytart', verb: 'Trade' },
  { id: 'turnover', station: 'bakery', req: () => G.flag('bakeryLit'), needs: { apple: 2 }, makes: 'turnover', verb: 'Trade' },
  { id: 'machete',  station: 'smithy', req: () => G.flag('smithyLit') && !G.flag('macheteGot'), needs: { ironstone: 2, bark: 1, berrytart: 1 }, makes: 'machete', verb: 'Trade' },
  { id: 'nails',    station: 'smithy', req: () => G.flag('macheteGot'), needs: { ironstone: 1 }, makes: 'nails', n: 4, verb: 'Trade' },
  { id: 'band',     station: 'smithy', req: () => G.flag('macheteGot'), needs: { ironstone: 2, copper: 1 }, special: 'band', verb: 'Trade',
    label: 'Orb rings (an orb holds 6 charges)', icon: '💍', note: 'Needs copper. Copper comes from a quarry out past the old keep. You can\'t get there yet.' },
  { id: 'paper',     station: 'paper', req: () => G.flag('paperLit'), needs: { bark: 2 }, makes: 'paper', n: 3, verb: 'Trade' },
  { id: 'ink',       station: 'paper', req: () => G.flag('paperLit'), needs: { inkberry: 3 }, makes: 'berryink', n: 2, verb: 'Trade' },
  { id: 'bind',      station: 'paper', req: () => G.flag('paperLit'), needs: { paper: 6, honey: 1, silk: 2 }, makes: 'blankbook', verb: 'Trade' },
  { id: 'jar',       station: 'crafts', req: () => G.flag('craftsOpen') && !G.has('jar'), needs: { apple: 2 }, makes: 'jar', verb: 'Trade' },
  { id: 'mendpaste', station: 'bench', page: 'mend', needs: { resin: 1, silk: 1 }, makes: 'paste', verb: 'Join' },
  { id: 'mend',      station: 'fairy', page: 'mend', needs: { paste: 1 }, spell: 'mendpowder', verb: 'Enchant' },
  { id: 'shortcake', station: 'bakery', req: () => G.flag('bakeryLit') && G.flag('millMended'), needs: { flour: 1, strawberry: 2 }, makes: 'shortcake', verb: 'Trade' },
  { id: 'planks',    station: 'mill', req: () => G.flag('millMended'), needs: { turnover: 1 }, makes: 'planks', n: 4, verb: 'Trade' },
  { id: 'flour',     station: 'mill', req: () => G.flag('millMended'), needs: { shortcake: 1 }, makes: 'flour', n: 3, verb: 'Trade' },
  { id: 'bigpouch',  station: 'leather', req: () => G.flag('leatherMended') && !G.flag('bigPouch'), needs: { fungus: 3, berrytart: 1 }, special: 'bigpouch', verb: 'Trade',
    label: 'Leather spell pouch (holds 9 spells)', icon: '👝' },
  { id: 'satchel',   station: 'leather', req: () => G.flag('leatherMended') && G.flag('bigPouch') && !G.flag('bigSatchel'), needs: { fungus: 4, berrytart: 1 }, special: 'satchel', verb: 'Trade',
    label: 'Leather satchel (carry twice as much)', icon: '🎒' },
];

const STATION_NAMES = { mortar: 'Mortar & Pestle', bench: 'Workbench', fairy: 'Fennel the Fairy', bakery: 'Rosie\'s Bakery', smithy: 'Bruno\'s Smithy', mill: 'Barnaby\'s Mill', leather: 'Rufus\'s Leather Goods', paper: 'Marigold\'s Paper Workshop', crafts: 'Tilly\'s Crafting Supplies' };

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

const LIB_MAP = [
  '##w###w###w',
  '#.........#',
  '#.........#',
  '#.........#',
  '#.........#',
  '#.........#',
  '#.........#',
  '#.........#',
  '#####D#####',
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
  // the path west toward town
  rect(0, 17, 7, 17, '='); set(0, 16, 'T'); set(0, 18, 'T');
  return g.map(r => r.join(''));
}

// The Old Road: a grassy stretch with a few trees between the hut and town.
function buildRoad() {
  const W = 30, H = 20, g = [];
  for (let y = 0; y < H; y++) g.push(new Array(W).fill(','));
  const set = (x, y, c) => { if (x >= 0 && y >= 0 && x < W && y < H) g[y][x] = c; };
  const rect = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, c); };
  const R = rng(21);
  rect(0, 0, W - 1, 0, 'T'); rect(0, 0, 0, H - 1, 'T'); rect(W - 1, 0, W - 1, H - 1, 'T');
  rect(0, 15, W - 1, 16, '~'); rect(0, H - 1, W - 1, H - 1, 'T');
  for (let x = 1; x < W - 1; x++) { if (R() < 0.18) set(x, 18, 'T'); else if (R() < 0.3) set(x, 17, ':'); }
  rect(0, 8, W - 1, 8, '='); rect(13, 7, 17, 7, '='); rect(13, 8, 17, 8, ',');
  set(12, 8, '='); set(18, 8, '=');
  const keep = new Set();
  const k = (x, y, r = 1) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) keep.add((x + dx) + ',' + (y + dy)); };
  [[11, 3], [16, 11], [17, 11], [8, 10], [20, 5], [13, 14], [5, 4], [9, 11], [14, 3], [22, 12], [25, 4], [24, 10]].forEach(([x, y]) => k(x, y));
  for (let x = 0; x < W; x++) { keep.add(x + ',8'); keep.add(x + ',7'); keep.add(x + ',9'); }
  for (let y = 1; y < 15; y++) for (let x = 1; x < W - 1; x++) {
    if (g[y][x] !== ',' || keep.has(x + ',' + y)) continue;
    const r = R();
    if (r < 0.07) set(x, y, 'T'); else if (r < 0.1) set(x, y, 'b'); else if (r < 0.2) set(x, y, ':');
  }
  [[5, 4], [9, 11], [14, 3], [22, 12], [25, 4]].forEach(([x, y]) => set(x, y, 'K'));   // dead trees: dry bark
  [[8, 5], [21, 10], [2, 11]].forEach(([x, y]) => set(x, y, 'P'));                    // pines: resin
  [[15, 11], [18, 11], [16, 12], [17, 12]].forEach(([x, y]) => set(x, y, 'R'));        // rocky outcrop
  [[6, 13], [7, 13], [23, 10], [24, 11]].forEach(([x, y]) => set(x, y, 't'));            // thickets
  set(0, 8, '='); set(W - 1, 8, '=');
  return g.map(r => r.join(''));
}

// Thistledown, following Todd's sketch: river down the west side bending east below town,
// one main street, two cross streets, three rows of four buildings.
function buildVillage() {
  const W = 34, H = 28, g = [];
  for (let y = 0; y < H; y++) g.push(new Array(W).fill(','));
  const set = (x, y, c) => { if (x >= 0 && y >= 0 && x < W && y < H) g[y][x] = c; };
  const rect = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, c); };
  const R = rng(33);
  rect(0, 0, W - 1, 0, 'T'); rect(0, H - 1, W - 1, H - 1, 'T'); rect(0, 0, 0, H - 1, 'T'); rect(W - 1, 0, W - 1, H - 1, 'T');
  rect(5, 1, 6, 21, '~'); rect(5, 22, W - 1, 23, '~');
  rect(19, 1, 20, 21, '=');                 // main street
  rect(19, 22, 20, 23, 'n');                // south bridge into town
  rect(19, 24, 20, 25, '='); rect(19, 25, W - 1, 25, '=');   // road toward the hut
  rect(1, 6, W - 2, 6, '='); rect(5, 6, 6, 6, 'n');          // north cross street, bridge west
  rect(1, 13, W - 2, 13, '=');                                // middle cross street
  rect(5, 13, 6, 13, '~');                                    // its bridge is broken
  // little paths to each door
  [9, 14, 23, 28].forEach(x => { rect(x + 1, 5, x + 2, 5, '='); rect(x + 1, 12, x + 2, 12, '='); });
  // brambles around the old chest beside the library
  [[7, 1], [8, 1], [8, 2], [7, 3], [8, 3]].forEach(([x, y]) => set(x, y, 't'));
  // greenery
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    if (g[y][x] !== ',') continue;
    if (y >= 24 && y <= 26 && x >= 17) continue;
    const inBuilding = [2, 9, 16].some(by => y >= by - 1 && y <= by + 3) && [9, 14, 23, 28].some(bx => x >= bx - 1 && x <= bx + 4);
    const r = R();
    if (inBuilding) { if (r < 0.1 && (y === 5 || y === 12 || y === 19)) set(x, y, ':'); continue; }
    if (y >= 24) { if (r < 0.35) set(x, y, 'T'); else if (r < 0.45) set(x, y, ':'); continue; }
    if (x <= 4) { if (r < 0.25) set(x, y, 'T'); else if (r < 0.32) set(x, y, ':'); continue; }
    if (r < 0.12) set(x, y, ':');
  }
  rect(1, 6, 4, 6, '='); rect(1, 13, 4, 13, '=');
  [[7, 9], [8, 16], [32, 3], [32, 10], [32, 18], [21, 20], [13, 20]].forEach(([x, y]) => set(x, y, 'T'));
  set(W - 1, 25, '=');
  set(0, 13, '=');   // the road west, once the bridge is mended
  rect(0, 2, 4, 3, '~');                    // the river arrives from Willow Bend
  rect(19, 26, 20, H - 1, '=');             // past the bridge, south to the Crossroads
  rect(19, 24, 20, 25, '=');
  return g.map(r => r.join(''));
}

// helpers shared by the new outdoor maps
function blankMap(W, H, seed) {
  const g = [];
  for (let y = 0; y < H; y++) g.push(new Array(W).fill(','));
  const set = (x, y, c) => { if (x >= 0 && y >= 0 && x < W && y < H) g[y][x] = c; };
  const rect = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, c); };
  const R = rng(seed);
  rect(0, 0, W - 1, 0, 'T'); rect(0, H - 1, W - 1, H - 1, 'T'); rect(0, 0, 0, H - 1, 'T'); rect(W - 1, 0, W - 1, H - 1, 'T');
  const keep = new Set();
  const k = (x, y, r = 1) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) keep.add((x + dx) + ',' + (y + dy)); };
  const scatter = (dens, x0 = 1, y0 = 1, x1 = W - 2, y1 = H - 2) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (g[y][x] !== ',' || keep.has(x + ',' + y)) continue;
      const r = R();
      if (r < dens) set(x, y, R() < 0.3 ? 'P' : 'T'); else if (r < dens + 0.04) set(x, y, 'b'); else if (r < dens + 0.16) set(x, y, ':');
    }
  };
  return { g, set, rect, R, k, keep, scatter, done: () => g.map(r => r.join('')) };
}

// C4 The Crossroads: two roads cross. North: Thistledown. West: Sunny Lane and the Keep.
// East: the Fairy Woods (veiled). South: the quarry road (rockslide).
function buildCrossroads() {
  const W = 32, H = 22, M = blankMap(W, H, 71);
  M.rect(15, 0, 16, H - 1, '='); M.rect(0, 10, W - 1, 11, '=');
  for (let y = 0; y < H; y++) { M.keep.add('14,' + y); M.keep.add('17,' + y); }
  for (let x = 0; x < W; x++) { M.keep.add(x + ',9'); M.keep.add(x + ',12'); }
  [[17, 8], [8, 6], [22, 5], [24, 15], [6, 15], [26, 9]].forEach(([x, y]) => M.k(x, y));
  M.scatter(0.14);
  M.rect(26, 7, 30, 14, ','); M.k(28, 10, 3);
  [[27, 7], [29, 8], [27, 13], [30, 12]].forEach(([x, y]) => M.set(x, y, ':'));
  return M.done();
}

// C3 Sunny Lane: the once-lovely approach to the Keep. A path comes down from Willow Bend;
// the main road rises from the Keep in the south and bends east to the Crossroads.
function buildSunnyLane() {
  const W = 32, H = 22, M = blankMap(W, H, 83);
  M.rect(8, 0, 8, 11, '='); M.rect(8, 11, W - 1, 11, '='); M.rect(16, 11, 16, H - 1, '='); M.rect(15, 12, 15, H - 1, '=');
  for (let x = 7; x < W; x++) { M.keep.add(x + ',10'); M.keep.add(x + ',12'); }
  for (let y = 0; y < H; y++) { M.keep.add('7,' + y); M.keep.add('9,' + y); M.keep.add('14,' + y); M.keep.add('17,' + y); }
  [[20, 14], [21, 14], [20, 15], [21, 15], [5, 15], [26, 6], [12, 17], [24, 17], [11, 5]].forEach(([x, y]) => M.k(x, y));
  M.scatter(0.1);
  // overgrown flower beds and hedges along the lane
  for (let x = 18; x < W - 1; x += 2) { M.set(x, 9, ':'); M.set(x, 13, ':'); }
  [[19, 8], [23, 8], [27, 8]].forEach(([x, y]) => M.set(x, y, 'b'));
  return M.done();
}

// B3 The Keep grounds: the Keep faces south. You arrive from the north and must go round its
// east side, where brambles block the way, to reach the front courtyard.
function buildKeepYard() {
  const W = 30, H = 24, M = blankMap(W, H, 97);
  M.rect(15, 0, 15, 2, '='); M.rect(15, 2, 25, 2, '='); M.rect(25, 2, 25, 16, '='); M.rect(10, 16, 25, 16, '=');
  M.rect(8, 13, 21, 19, ','); M.rect(14, 12, 15, 19, '=');      // front courtyard and the walk to the door
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const nearPath = (Math.abs(x - 25) <= 1 && y >= 1 && y <= 17) || (y >= 1 && y <= 3 && x >= 14 && x <= 26) || (x >= 7 && x <= 22 && y >= 12 && y <= 20);
    if (nearPath || (x >= 7 && x <= 22 && y >= 2 && y <= 12)) continue;
    if (M.g[y][x] === ',' && M.R() < 0.55) M.set(x, y, M.R() < 0.4 ? 'P' : 'T');
  }
  // bramble wall across the east path
  [[24, 7], [25, 7], [26, 7], [24, 8], [25, 8], [26, 8]].forEach(([x, y]) => M.set(x, y, 't'));
  // the Keep's walls keep you from slipping past on the west
  M.rect(1, 12, 6, 20, 'T'); M.rect(7, 20, 22, 21, 'h'); M.rect(23, 17, 28, 21, 'T');
  M.rect(6, 3, 7, 12, 'T'); M.rect(22, 3, 23, 12, 'T'); M.rect(27, 3, 28, 12, 'T');   // no slipping round the sides
  return M.done();
}

// B3 inside: the Keep's ground floor.
const KEEP_MAP = [
  'SSSSSSSSSSSSSSSSSSSSSSSSSSSSSS',
  'S_________S_rrrrrr_S_________S',
  'S_________S_rrrrrr_S_________S',
  'S_________S_rrrrrr_S_________S',
  'S_________S_rrrrrr_S_________S',
  'S_________S__rrrr__S_________S',
  'S_________S__rrrr__S_________S',
  'S_________S__rrrr__S_________S',
  'SSSSS_SSSSS__rrrr__S_________S',
  'S_________S__rrrr__S_________S',
  'S_________S__rrrr__S_________S',
  'S_________S__rrrr__S_________S',
  'S__________rrrrrrrr__________S',
  'S__________rrrrrrrr__________S',
  'S_________S__rrrr__S_________S',
  'S_________S__rrrr__S_________S',
  'S_________S__rrrr__S_________S',
  'SSSSSSSSSSSSSSDDSSSSSSSSSSSSSS',
];

// Willow Bend: the west bank, across the mended bridge. A pond with an island.
function buildWestbank() {
  const W = 30, H = 22, g = [];
  for (let y = 0; y < H; y++) g.push(new Array(W).fill(','));
  const set = (x, y, c) => { if (x >= 0 && y >= 0 && x < W && y < H) g[y][x] = c; };
  const rect = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, c); };
  const R = rng(57);
  rect(0, 0, W - 1, 0, 'T'); rect(0, H - 1, W - 1, H - 1, 'T'); rect(0, 0, 0, H - 1, 'T'); rect(W - 1, 0, W - 1, H - 1, 'T');
  rect(10, 7, 19, 14, '~'); rect(14, 10, 15, 11, ',');                 // pond and its island
  [[10, 10], [11, 10], [12, 10], [13, 10]].forEach(([x, y]) => set(x, y, 'L'));   // sunken lily pads
  rect(20, 13, W - 1, 13, '='); rect(20, 13, 20, 16, '='); rect(4, 16, 20, 16, '='); rect(4, 4, 4, 16, '=');
  const keep = new Set();
  const k = (x, y, r = 1) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) keep.add((x + dx) + ',' + (y + dy)); };
  [[9, 8], [20, 9], [12, 15], [18, 6], [5, 10], [24, 8], [24, 4], [25, 4], [7, 4], [26, 18], [3, 12], [8, 18], [6, 5], [25, 17], [9, 10], [22, 5]].forEach(([x, y]) => k(x, y));
  for (let y = 6; y <= 15; y++) for (let x = 9; x <= 20; x++) keep.add(x + ',' + y);
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    if (g[y][x] !== ',' || keep.has(x + ',' + y)) continue;
    const r = R();
    if (r < 0.1) set(x, y, R() < 0.5 ? 'P' : 'T'); else if (r < 0.13) set(x, y, 'b'); else if (r < 0.25) set(x, y, ':');
  }
  [[7, 4], [26, 18], [3, 12]].forEach(([x, y]) => set(x, y, 'K'));
  [[22, 5], [8, 18], [25, 17]].forEach(([x, y]) => set(x, y, 'P'));
  [[23, 3], [26, 3]].forEach(([x, y]) => set(x, y, 'R'));
  set(W - 1, 13, '=');
  // the river from the waterfall (west) flows east toward town; a little stream feeds the pond
  rect(0, 2, W - 1, 3, '~'); rect(15, 4, 15, 6, '~');
  // a break in the trees to the south, flanked by shrubs, toward Sunny Lane
  rect(12, 17, 12, H - 1, '='); [17, 18, 19, 20].forEach(y => { set(11, y, 'b'); set(13, y, 'b'); });
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
  road: [{ id: 'road', name: 'The Old Road', rect: [0, 0, 29, 19] }],
  library: [{ id: 'library', name: 'Inside the Library', rect: [0, 0, 10, 8] }],
  westbank: [{ id: 'westbank', name: 'Willow Bend', rect: [0, 0, 29, 21] }],
  crossroads: [{ id: 'crossroads', name: 'The Crossroads', rect: [0, 0, 31, 21] }],
  sunnylane: [{ id: 'sunnylane', name: 'Sunny Lane', rect: [0, 0, 31, 21] }],
  keepyard: [{ id: 'keepyard', name: 'The Keep', rect: [0, 0, 29, 23] }],
  keep: [
    { id: 'k_kitchen',  name: 'The Kitchen',  rect: [0, 0, 10, 8] },
    { id: 'k_dining',   name: 'The Dining Room', rect: [0, 9, 10, 17] },
    { id: 'k_ballroom', name: 'The Ballroom', rect: [19, 0, 29, 17] },
    { id: 'k_lobby',    name: 'The Great Hall', rect: [11, 0, 18, 17] },
  ],
  village: [
    { id: 'v_bakery', name: 'The Bakery',      rect: [8, 8, 13, 12] },
    { id: 'v_home1',  name: 'Bramble Cottage', rect: [14, 8, 18, 12] },
    { id: 'v_smithy', name: 'The Smithy',      rect: [8, 15, 13, 21] },
    { id: 'v_home2',  name: 'Lantern Cottage', rect: [14, 15, 18, 21] },
    { id: 'v_mill',   name: 'The Mill',        rect: [22, 15, 27, 21] },
    { id: 'v_library', name: 'The Owl\'s Library', rect: [8, 1, 13, 5] },
    { id: 'v_paper',  name: 'The Paper Workshop', rect: [14, 1, 18, 5] },
    { id: 'v_crafts', name: 'Crafting Supplies', rect: [27, 8, 32, 12] },
    { id: 'v_leather', name: 'Leather Goods',  rect: [22, 8, 27, 12] },
    { id: 'village',  name: VILLAGE_NAME,      rect: [0, 0, 33, 27] },
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
      : { label: 'Look at the bed', fn: () => G.say([G.zoneGray('hut') > 0 ? 'Your bed. The quilt has gone gray like everything else.' : 'Your bed. The patchwork quilt is bright again: rose, cream and a little gold. It looks very inviting.']) } },
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
    act: () => ({ label: 'Look at the painting', fn: () => G.say([G.zoneGray('hut') > 0 ? 'A painting of the meadow, faded to gray.' : 'A painting of the meadow in summer, blue sky and golden sun.', 'Down in one corner, a single leaf is painted in gold.']) }) },
  { id: 'sill', map: 'hut', tx: 9, ty: 1, draw: 'sill',
    act: () => !F('dewTaken')
      ? { label: 'Look at the windowsill', fn: () => { G.give('dew'); G.setFlag('dewTaken'); G.say(['A thimble sits on the sill, full of morning dew.']); } }
      : { label: 'Look out the window', fn: () => G.say([G.outsideView()]) } },
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
  { id: 'goosequill', map: 'out', tx: 31, ty: 28, solid: false, draw: 'pickup', icon: '🪶', vis: () => G.count('quill') < 2,
    act: () => ({ label: 'Pick up the feather', fn: () => { G.give('quill'); G.setFlag('outQuill'); G.say(['A goose quill. The geese along the brook drop them all the time.']); } }) },
  { id: 'goosequill2', map: 'westbank', tx: 21, ty: 11, solid: false, draw: 'pickup', icon: '🪶', vis: () => G.count('quill') < 2,
    act: () => ({ label: 'Pick up the feather', fn: () => { G.give('quill'); G.say(['A goose quill, left by the pond.']); } }) },
  { id: 'rune', map: 'out', tx: 10, ty: 15, tw: 2, th: 2, solid: false, layer: 'floor', draw: 'rune',
    act: () => G.flag('fairyOutNow') ? null : ({ label: 'Look at the rune', fn: () => G.say(['An old rune circle set into the ground, carved with knots that loop forever.', F('fairyFree') ? 'When you stand on it, Fennel can find you.' : 'It hums very faintly.']) }) },
  { id: 'strawpatch', map: 'out', tx: 24, ty: 20, solid: false, draw: 'strawpatch',
    act: () => G.count('strawberry') < G.cap('strawberry') ? { label: 'Pick a strawberry', fn: () => { G.give('strawberry'); } } : { label: 'Look', fn: () => G.say(['Wild strawberries. You have plenty for now.']) } },
  { id: 'well', map: 'out', tx: 3, ty: 12, draw: 'well',
    act: () => ({ label: 'Look in the well', fn: () => G.say([G.zoneGray('yard') > 0 ? 'A deep, cool well. Your reflection looks back, the only color around.' : 'A deep, cool well. Your reflection looks back, with blue sky and green leaves all around it.']) }) },
  { id: 'bell', map: 'out', tx: 37, ty: 12, solid: false, draw: 'pickup', icon: '🔔', vis: () => F('bunnyLed') && !F('bellTaken'),
    act: () => ({ label: 'Pick up the bell', fn: () => { G.give('tinybell'); G.setFlag('bellTaken'); G.curio('tinybell'); } }) },
  // ---------- the Old Road
  { id: 'appletree', map: 'road', tx: 11, ty: 3, draw: 'appletree',
    act: () => {
      if (!F('weedsCut')) return G.has('machete') ? { label: 'Cut away the weeds', fn: () => { G.setFlag('weedsCut'); G.chime(2); G.burstAt(11.5, 3.5, '#c8f0a0'); G.say(['You hack away the choking bindweed. The old apple tree seems to stand up straighter.', 'Apples are already ripening on its branches.']); } }
        : { label: 'Look at the apple tree', fn: () => G.say(['An old apple tree, choked with tangled bindweed. Not a single apple.', 'If only you had a blade to cut it free.']) };
      return G.count('apple') < G.cap('apple') ? { label: 'Pick an apple', fn: () => G.give('apple') } : { label: 'Look', fn: () => G.say(['There are always a few apples ripening here.']) };
    } },
  { id: 'iron1', map: 'road', tx: 16, ty: 11, draw: 'ironrock',
    act: () => G.count('ironstone') < G.cap('ironstone') ? { label: 'Chip off iron-stone', fn: () => G.give('ironstone') } : { label: 'Look', fn: () => G.say(['A rusty-red rock. You have all the iron-stone you can carry.']) } },
  { id: 'iron2', map: 'road', tx: 17, ty: 11, draw: 'ironrock',
    act: () => G.count('ironstone') < G.cap('ironstone') ? { label: 'Chip off iron-stone', fn: () => G.give('ironstone') } : { label: 'Look', fn: () => G.say(['A rusty-red rock. You have all the iron-stone you can carry.']) } },
  { id: 'roadsign', map: 'road', tx: 3, ty: 7, draw: 'signpost',
    act: () => ({ label: 'Read the signpost', fn: () => G.say([`The old signpost points west: "${VILLAGE_NAME}". The other arm, pointing back east, just says "Moss".`]) }) },

  // ---------- Thistledown
  { id: 'library',  map: 'village', tx: 9,  ty: 2,  tw: 4, th: 3, draw: 'building', b: { name: 'The Owl\'s Library', wall: '#d9cbb0', roof: '#5b6aa8', sign: '📚' },
    lit: 'libOpen',
    act: () => F('libOpen') ? { label: 'Enter the library', fn: () => G.goMap('library', 5.5, 7.4) }
      : { label: 'Look at the library door', fn: () => G.say(['The Owl\'s Library. Set into the door is a square panel of little tiles, all jumbled up, like a picture that\'s been shuffled.'], () => G.openPuzzle('swap')) } },
  { id: 'paper',    map: 'village', tx: 14, ty: 2,  tw: 4, th: 3, draw: 'building', b: { name: 'The Paper Mill', wall: '#e3d6bd', roof: '#7a8a5a', sign: '📜' },
    kindle: 'paperLit',
    act: () => F('paperLit') ? { label: 'Visit the paper workshop', fn: () => G.visitShop('paper') }
      : { label: 'Look at the workshop', fn: () => G.say(['A little workshop full of drying racks, the kind used for making paper. Its drying stove is cold, and everything inside is limp and damp.', 'Paper needs warm, dry air to cure.']) } },
  { id: 'clothier', map: 'village', tx: 23, ty: 2,  tw: 4, th: 3, draw: 'building', b: { name: 'The Clothier', wall: '#ecd9d9', roof: '#a85b7a', sign: '🧵' },
    act: () => ({ label: 'Look at the clothier', fn: () => G.say(['The Clothier. Bolts of fabric sit gray behind the window. A heavy hex holds the door.']) }) },
  { id: 'home3',    map: 'village', tx: 28, ty: 2,  tw: 4, th: 3, draw: 'building', b: { name: 'A cottage', wall: '#e2d4b6', roof: '#8a6a4a' },
    act: () => ({ label: 'Look at the cottage', fn: () => G.say(['A small cottage, wrapped in a heavy gray hex.']) }) },
  { id: 'bakery',   map: 'village', tx: 9,  ty: 9,  tw: 4, th: 3, draw: 'building', kindle: 'bakeryLit', b: { name: 'The Bakery', wall: '#f1dfc0', roof: '#c4704a', sign: '🍞', oven: true },
    act: () => G.flag('bakeryLit') ? { label: 'Visit the bakery', fn: () => G.visitShop('bakery') }
      : { label: 'Look at the bakery', fn: () => G.say(['The Bakery. Through the window you can see a big brick oven, stone cold.', 'A bakery with no fire... if only something could make that oven burn again, for good.']) } },
  { id: 'home1',    map: 'village', tx: 14, ty: 9,  tw: 4, th: 3, draw: 'building', b: { name: 'Bramble Cottage', wall: '#e8dcc0', roof: '#6a8a5a', vines: true },
    act: () => F('home1Open') ? { label: 'Look at Bramble Cottage', fn: () => G.say(['Bramble Cottage. The squirrel family has made it cozy already. Little faces keep popping up at the windows.']) }
      : G.has('machete') ? { label: 'Cut away the vines', fn: () => G.openHome1() }
      : { label: 'Look at the cottage', fn: () => G.say(['A pretty cottage, its door completely buried in thick, hexed vines.', 'You\'d need a sharp blade to cut through.']) } },
  { id: 'leather',  map: 'village', tx: 23, ty: 9,  tw: 4, th: 3, draw: 'building', b: { name: 'Leather Goods', wall: '#dccab0', roof: '#7a5a3a', sign: '👜' },
    mend: 'leatherMended',
    act: () => F('leatherMended') ? { label: 'Visit Leather Goods', fn: () => G.visitShop('leather') }
      : { label: 'Look at the shop', fn: () => G.say(['Leather Goods. The door hangs off one hinge and the window is cracked right across. Pouches and belts hang gray inside.', 'Something would need to mend it before anyone could work here.']) } },
  { id: 'crafts',   map: 'village', tx: 28, ty: 9,  tw: 4, th: 3, draw: 'building', b: { name: 'Crafting Supplies', wall: '#e6dcc8', roof: '#4a7a8a', sign: '✂️' },
    lit: 'craftsOpen',
    act: () => F('craftsOpen') ? { label: 'Visit Crafting Supplies', fn: () => G.visitShop('crafts') }
      : F('craftsDoor') ? { label: 'Look inside', fn: () => G.say(['The door stands open, but the shop seems empty. Jars of buttons, spools and beads, all gray.', 'And yet... you hear tiny, worried squeaks. Something is in here that you can\'t see.']) }
      : { label: 'Look at the shop door', fn: () => G.say(['Crafting Supplies. The door is locked by a panel of little brass tiles with rings and rods, all turned the wrong way.'], () => G.openPuzzle('pipes')) } },
  { id: 'smithy',   map: 'village', tx: 9,  ty: 16, tw: 4, th: 3, draw: 'building', kindle: 'smithyLit', b: { name: 'The Smithy', wall: '#b8b2a8', roof: '#5a5a66', sign: '⚒️', forge: true, stone: true },
    act: () => G.flag('smithyLit') ? { label: 'Visit the smithy', fn: () => G.visitShop('smithy') }
      : { label: 'Look at the smithy', fn: () => G.say(['The Smithy. The forge inside is cold and dark, and the anvil is thick with dust.', 'No smith would come to a forge without fire.']) } },
  { id: 'home2',    map: 'village', tx: 14, ty: 16, tw: 4, th: 3, draw: 'building', b: { name: 'Lantern Cottage', wall: '#ece0c4', roof: '#9a6a8a', dark: true },
    act: () => F('home2Open') ? { label: 'Look at Lantern Cottage', fn: () => G.say(['Lantern Cottage. Six chipmunks peek out of every window.']) }
      : G.lightActive() ? { label: 'Shine your light in the window', fn: () => G.openHome2() }
      : { label: 'Look at the cottage', fn: () => G.say(['A cottage whose windows are so dark they seem to swallow light. Something hexed is sitting inside them.', 'Maybe some light would chase it out.']) } },
  { id: 'mill',     map: 'village', tx: 23, ty: 16, tw: 4, th: 3, draw: 'building', b: { name: 'The Mill', wall: '#e0d0b0', roof: '#8a5a3a', sign: '🌾', wheel: true },
    mend: 'millMended',
    act: () => F('millMended') ? { label: 'Visit the mill', fn: () => G.visitShop('mill') }
      : { label: 'Look at the mill', fn: () => G.say(['The Mill. Its big water wheel is cracked clean through one side, stuck fast in the hex.', 'If only it could be mended.']) } },
  { id: 'home4',    map: 'village', tx: 28, ty: 16, tw: 4, th: 3, draw: 'building', b: { name: 'A cottage', wall: '#e4d8c0', roof: '#6a7a9a' },
    act: () => ({ label: 'Look at the cottage', fn: () => G.say(['A small cottage, wrapped in a heavy gray hex.']) }) },
  { id: 'fallen',   map: 'village', tx: 1, ty: 5, tw: 4, th: 3, draw: 'fallen',
    act: () => ({ label: 'Look at the fallen trees', fn: () => G.say(['Great old trees have fallen across the road west. Far too big to move.', '(The road beyond will open in a later version.)']) }) },
  { id: 'brokenbridge', map: 'village', tx: 5, ty: 13, tw: 2, solid: false, layer: 'floor', draw: 'brokenbridge', vis: () => !F('bridgeMended'),
    mend: 'bridgeMended', mendReady: () => F('bridgeBuilt'),
    act: () => {
      if (F('bridgeMended')) return null;
      if (F('bridgeBuilt')) return { label: 'Look at the bridge', fn: () => G.say(['New planks, nailed down tight... but the whole thing still wobbles and creaks.', 'It needs a little magic to hold it together.']) };
      if (G.count('planks') >= 4 && G.count('nails') >= 4) return { label: 'Lay the planks', fn: () => G.buildBridge() };
      return { label: 'Look at the bridge', fn: () => G.say(['A wooden bridge, broken clean through the middle. The river rushes past below.', 'You\'d need 4 planks and 4 nails to patch it, and then something to hold it all together.']) };
    } },
  { id: 'chest', map: 'village', tx: 7, ty: 2, draw: 'chest', vis: () => F('chainBird'),
    act: () => F('chestOpen') ? { label: 'Look', fn: () => G.say(['An empty old chest.']) }
      : { label: 'Open the old chest', fn: () => G.openChest() } },

  { id: 'web1', map: 'road', tx: 6, ty: 4, solid: false, draw: 'web', act: () => G.webAct() },
  { id: 'web2', map: 'road', tx: 23, ty: 12, solid: false, draw: 'web', act: () => G.webAct() },
  // ---------- Willow Bend
  { id: 'web3', map: 'westbank', tx: 6, ty: 5, solid: false, draw: 'web', act: () => G.webAct() },
  { id: 'iron3', map: 'westbank', tx: 24, ty: 4, draw: 'ironrock',
    act: () => G.count('ironstone') < G.cap('ironstone') ? { label: 'Chip off iron-stone', fn: () => G.give('ironstone') } : { label: 'Look', fn: () => G.say(['A rusty-red rock. You have all the iron-stone you can carry.']) } },
  { id: 'iron4', map: 'westbank', tx: 25, ty: 4, draw: 'ironrock',
    act: () => G.count('ironstone') < G.cap('ironstone') ? { label: 'Chip off iron-stone', fn: () => G.give('ironstone') } : { label: 'Look', fn: () => G.say(['A rusty-red rock. You have all the iron-stone you can carry.']) } },
  { id: 'strawpatch2', map: 'westbank', tx: 5, ty: 18, solid: false, draw: 'strawpatch',
    act: () => G.count('strawberry') < G.cap('strawberry') ? { label: 'Pick a strawberry', fn: () => G.give('strawberry') } : { label: 'Look', fn: () => G.say(['Wild strawberries. You have plenty for now.']) } },
  { id: 'islandwisp', map: 'westbank', tx: 14, ty: 10, solid: false, draw: 'pickup', icon: '💫', vis: () => F('frogsSang') && !F('islandWisp'),
    act: () => ({ label: 'Take the feather', fn: () => { G.give('wisp'); G.setFlag('islandWisp'); G.islandCheck(); } }) },
  { id: 'islandpearl', map: 'westbank', tx: 15, ty: 11, solid: false, draw: 'pickup', icon: '🫧', vis: () => F('frogsSang') && !F('pearlTaken'),
    act: () => ({ label: 'Pick up the pearl', fn: () => { G.give('pearl'); G.setFlag('pearlTaken'); G.curio('pearl'); G.islandCheck(); } }) },

  // ---------- inside the Owl's Library
  { id: 'shelf1', map: 'library', tx: 1, ty: 1, tw: 2, draw: 'bookshelf', book: 'symbols',    act: () => G.shelfAct('symbols') },
  { id: 'shelf2', map: 'library', tx: 8, ty: 1, tw: 2, draw: 'bookshelf', book: 'vegetation', act: () => G.shelfAct('vegetation') },
  { id: 'shelf3', map: 'library', tx: 1, ty: 5, tw: 2, draw: 'bookshelf', book: 'creatures',  act: () => G.shelfAct('creatures') },
  { id: 'shelf4', map: 'library', tx: 8, ty: 5, tw: 2, draw: 'bookshelf', book: 'moss',       act: () => G.shelfAct('moss') },
  { id: 'owldesk', map: 'library', tx: 4, ty: 2, tw: 3, draw: 'owldesk',
    act: () => ({ label: 'Talk to Ambrose', fn: () => G.say(['AMBROSE: Hoo! Welcome, welcome. You opened my door, and the hex simply... let go. I am in your debt.',
      'AMBROSE: These four shelves are all that\'s left of a fine collection. Read whatever you like. Just put the books back.',
      'AMBROSE: And if you ever find something strange out there, bring it to me. I can\'t tell you if it\'s magical. That\'s Fennel\'s gift. But I can usually tell you what it was for.']) }) },
  { id: 'lrug', map: 'library', tx: 3, ty: 4, tw: 5, th: 2, solid: false, layer: 'floor', draw: 'rug', act: () => null },
  { id: 'ldoor', map: 'library', tx: 5, ty: 8, layer: 'wall', draw: 'ldoor',
    act: () => ({ label: 'Go outside', fn: () => G.goMap('village', 11, 5.6) }) },
  // ---------- Willow Bend bee tree
  { id: 'beetree', map: 'westbank', tx: 23, ty: 14, draw: 'beetree',
    act: () => G.has('jar') ? (G.count('honey') < G.cap('honey') ? { label: 'Collect honey', fn: () => { G.give('honey'); G.say(['You hold the jar under the hollow. The bees grumble but let you have some. Wildflower honey!']); } } : { label: 'Look at the bee tree', fn: () => G.say(['The bees are busy. You have all the honey you can carry for now.']) })
      : { label: 'Look at the bee tree', fn: () => G.say(['Bees hum in and out of a hollow in the trunk. Golden honey glistens inside.', 'You\'d need a jar to collect any.']) } },

  // ---------- the Crossroads
  { id: 'signpost4', map: 'crossroads', tx: 17, ty: 8, draw: 'signpost4',
    act: () => F('signpostSolved') ? { label: 'Read the signpost', fn: () => G.say(['North: Thistledown. West: The Keep. East: Fairy Woods. South: The Quarry. All pointing true again.']) }
      : { label: 'Look at the signpost', fn: () => G.say(['A tall, old signpost with four arms. They\'ve all spun loose in the wind and point every which way.', 'Something rattles inside the post when you touch it.'], () => G.openSignpost()) } },
  { id: 'fairyveil', map: 'crossroads', tx: 30, ty: 9, th: 4, draw: 'veil', layer: 'normal',
    act: () => ({ label: 'Look at the shimmer', fn: () => G.say(['The road east vanishes into a shimmering veil, like heat over a summer road. Behind it, trees glitter.', 'It gently pushes you back. The Fairy Woods aren\'t ready for visitors yet.', '(A later version.)']) }) },
  { id: 'rockslide', map: 'crossroads', tx: 14, ty: 18, tw: 4, th: 3, draw: 'rockslide',
    act: () => ({ label: 'Look at the rockslide', fn: () => G.say(['Boulders have tumbled across the south road toward the quarries. Far too heavy to move by hand.', 'If only there were a way to make heavy things light...']) }) },
  { id: 'xwell', map: 'crossroads', tx: 22, ty: 5, draw: 'well',
    act: () => ({ label: 'Look in the well', fn: () => G.say(['An old travellers\' well. Someone has scratched four arrows into the stone rim: north, east, south and west.']) }) },
  // ---------- Sunny Lane
  { id: 'fountain', map: 'sunnylane', tx: 20, ty: 14, tw: 2, th: 2, draw: 'fountain', mend: 'fountainMended',
    act: () => F('fountainMended') ? (F('coinTaken') ? { label: 'Look at the fountain', fn: () => G.say(['The fountain splashes happily. Sunny Lane feels sunny again.']) } : { label: 'Look in the basin', fn: () => { G.give('silvercoin'); G.setFlag('coinTaken'); G.curio('silvercoin'); } })
      : { label: 'Look at the fountain', fn: () => G.say(['A stone fountain, cracked right down the middle. Its basin is dry and full of gray leaves.', 'Something glints at the bottom, under the leaves, but the crack is too sharp to reach past.']) } },
  { id: 'lamp1', map: 'sunnylane', tx: 18, ty: 12, draw: 'lamppost', act: () => null },
  { id: 'lamp2', map: 'sunnylane', tx: 24, ty: 12, draw: 'lamppost', act: () => null },
  { id: 'lamp3', map: 'sunnylane', tx: 28, ty: 12, draw: 'lamppost', act: () => null },
  { id: 'lamp4', map: 'sunnylane', tx: 17, ty: 17, draw: 'lamppost', act: () => null },
  { id: 'locket', map: 'sunnylane', tx: 11, ty: 5, solid: false, draw: 'pickup', icon: '📿', secret: true, vis: () => !F('locketTaken'),
    act: () => ({ label: 'Pick up the locket', fn: () => { G.give('locket'); G.setFlag('locketTaken'); G.curio('locket'); } }) },
  // ---------- the Keep grounds
  { id: 'keepx', map: 'keepyard', tx: 8, ty: 3, tw: 14, th: 9, draw: 'keepx',
    act: () => F('keepOpen') ? { label: 'Enter the Keep', fn: () => G.goMap('keep', 15, 16.3) }
      : { label: 'Look at the great door', fn: () => G.say(['The Keep\'s great door is sealed by a ring of gray light. Set into it are four empty slots, numbered I, II, III and IV.', 'Each slot can turn to show a symbol.'], () => G.openSeal()) } },
  { id: 'statue1', map: 'keepyard', tx: 9, ty: 14, draw: 'statue', sym: 'knot', num: 'II', act: () => G.statueAct('statue1') },
  { id: 'statue2', map: 'keepyard', tx: 20, ty: 14, draw: 'statue', sym: 'branch', num: 'IV', act: () => G.statueAct('statue2') },
  { id: 'statue3', map: 'keepyard', tx: 9, ty: 18, draw: 'statue', sym: 'wave', num: 'I', act: () => G.statueAct('statue3') },
  { id: 'statue4', map: 'keepyard', tx: 20, ty: 18, draw: 'statue', sym: 'moon', num: 'III', act: () => G.statueAct('statue4') },
  // ---------- inside the Keep
  { id: 'kdoor', map: 'keep', tx: 14, ty: 17, tw: 2, layer: 'wall', draw: 'ldoor', act: () => ({ label: 'Go outside', fn: () => G.goMap('keepyard', 15, 13.4) }) },
  { id: 'kstairsup', map: 'keep', tx: 15, ty: 1, tw: 3, th: 4, solid: false, layer: 'floor', draw: 'kstairs', up: true,
    act: () => ({ label: '⬆ Stairs up', fn: () => G.say(F('keepAwake') ? ['The gray light on the stairs has thinned to a faint shimmer... but it still won\'t let you pass.', '(The upper floors come in a later version.)'] : ['A curtain of gray light hangs across the stairs going up. It hums, and won\'t let you pass.']) }) },
  { id: 'kstairsdown', map: 'keep', tx: 12, ty: 1, tw: 3, th: 4, solid: false, layer: 'floor', draw: 'kstairs', up: false,
    act: () => ({ label: '⬇ Stairs down', fn: () => G.say(['The stairs down disappear into deep darkness. A cold draft rises from below, and an iron grate is locked across the steps.', '(The lower floors come in a later version.)']) }) },
  { id: 'khearth', map: 'keep', tx: 3, ty: 1, tw: 3, draw: 'khearth', kindle: 'keepHearth',
    act: () => F('keepHearth') ? (G.has('mossnote') ? { label: 'Warm your hands', fn: () => G.say(['The great kitchen hearth burns steady and warm.']) } : { label: 'Look at the mantel', fn: () => { G.give('mossnote'); G.say(['In the warm light, you notice a folded note tucked behind a jar on the mantel. It\'s written in a spidery, careful hand.', '"If you are reading this, the hex has held. I have gone up, toward the roof, to see where it came from. The stairs will not let just anyone pass. Light, warmth and music woke the hall for me... I hope they do for you. - M."', 'Old Moss!']); G.keepCheck(); } })
      : { label: 'Look at the hearth', fn: () => G.say(['A huge kitchen hearth, cold for years. Pots hang over gray ashes.', 'It would take a fire that never goes out to warm this room again.']) } },
  { id: 'ktable', map: 'keep', tx: 2, ty: 11, tw: 7, th: 2, draw: 'ktable', act: () => F('chandLit') && !F('gobletTaken') ? { label: 'Pick up the goblet', fn: () => { G.give('goblet'); G.setFlag('gobletTaken'); G.curio('goblet'); } } : null },
  { id: 'chandelier', map: 'keep', tx: 5, ty: 14, solid: false, layer: 'normal', draw: 'chandelier',
    act: () => F('chandLit') ? null : G.lightActive() ? { label: 'Hold your light up', fn: () => G.lightChandelier() }
      : { label: 'Look up', fn: () => G.say(['A great iron chandelier hangs over the dining table, its candles gray and cold.', 'The room is too dim to see much. Some light might help.']) } },
  { id: 'musicbox', map: 'keep', tx: 24, ty: 7, draw: 'musicbox', mend: 'musicMended',
    act: () => F('musicMended') ? (F('ballWisp') ? { label: 'Listen', fn: () => G.say(['The little music box tinkles its waltz, over and over.']) } : null)
      : { label: 'Look at the music box', fn: () => G.say(['On a pedestal in the middle of the ballroom sits a silver music box. Its lid is cracked and its key is bent.', 'The whole ballroom seems to be holding its breath, waiting for a song.']) } },
  { id: 'ballwisp', map: 'keep', tx: 24, ty: 10, solid: false, draw: 'pickup', icon: '💫', vis: () => F('musicMended') && !F('ballWisp'),
    act: () => ({ label: 'Take the feather', fn: () => { G.give('wisp'); G.setFlag('ballWisp'); G.say(['A Wisp Feather, left drifting in the middle of the dance floor.']); } }) },

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
  { id: 'r_fly1',  map: 'road', x: 8.5,  y: 10.5, species: 'butterfly', zone: 'road' },
  { id: 'r_fly2',  map: 'road', x: 20.5, y: 5.5,  species: 'butterfly', zone: 'road' },
  { id: 'r_frog',  map: 'road', x: 13.5, y: 14.3, species: 'frog', zone: 'road', reward: { item: 'strawberry', n: 1, text: 'It hops off and leaves you a wild strawberry.' } },
  { id: 'v_blue',  map: 'village', x: 25.5, y: 7.6,  species: 'bird', color: '#5b8fe0', zone: 'village' },
  { id: 'v_red',   map: 'village', x: 13.5, y: 14.6, species: 'bird', color: '#e0574f', zone: 'village' },
  { id: 'v_yellow',map: 'village', x: 30.5, y: 20.3, species: 'bird', color: '#f0c43a', zone: 'village' },
  { id: 'v_mouse1',map: 'village', x: 22.3, y: 12.4, species: 'mouse', zone: 'village' },
  { id: 'v_mouse2',map: 'village', x: 16.5, y: 20.2, species: 'mouse', zone: 'village' },
  { id: 'x_hedge', map: 'crossroads', x: 8.5, y: 6.5, species: 'hedgehog', zone: 'crossroads', reward: { item: 'button', n: 1, text: 'It snuffles, and leaves you a shiny button it was carrying.' } },
  { id: 'x_bun',   map: 'crossroads', x: 24.5, y: 15.5, species: 'bunny', zone: 'crossroads' },
  { id: 'x_fly',   map: 'crossroads', x: 6.5, y: 15.5, species: 'butterfly', zone: 'crossroads' },
  { id: 's_sq',    map: 'sunnylane', x: 5.5, y: 15.5, species: 'squirrel', zone: 'sunnylane' },
  { id: 's_bird',  map: 'sunnylane', x: 26.5, y: 6.5, species: 'bird', color: '#9a6ad8', zone: 'sunnylane' },
  { id: 's_hedge', map: 'sunnylane', x: 12.5, y: 17.5, species: 'hedgehog', zone: 'sunnylane' },
  { id: 'w_frog1', map: 'westbank', x: 9.5,  y: 8.5,  species: 'frog', zone: 'westbank' },
  { id: 'w_frog2', map: 'westbank', x: 20.5, y: 9.5,  species: 'frog', zone: 'westbank' },
  { id: 'w_frog3', map: 'westbank', x: 12.5, y: 15.3, species: 'frog', zone: 'westbank' },
  { id: 'w_frog4', map: 'westbank', x: 18.5, y: 6.3,  species: 'frog', zone: 'westbank' },
  { id: 'w_fly1',  map: 'westbank', x: 5.5,  y: 10.5, species: 'butterfly', zone: 'westbank' },
  { id: 'w_fly2',  map: 'westbank', x: 24.5, y: 8.5,  species: 'butterfly', zone: 'westbank', reward: { item: 'strawberry', n: 2, text: 'It leaves two wild strawberries behind.' } },
];
// Residents who move into restored buildings (never hexed).
const RESIDENTS = [
  { id: 'rosie',  map: 'village', x: 11, y: 12.6, species: 'bunny', when: () => G.flag('bakeryLit') },
  { id: 'rosie2', map: 'village', x: 12.4, y: 12.9, species: 'bunny', when: () => G.flag('bakeryLit') },
  { id: 'bruno',  map: 'village', x: 11, y: 19.8, species: 'badger', when: () => G.flag('smithyLit') },
  { id: 'barnaby', map: 'village', x: 26.6, y: 19.7, species: 'beaver', when: () => G.flag('millMended') },
  { id: 'marigold', map: 'village', x: 16.6, y: 5.7, species: 'goose', when: () => G.flag('paperLit') },
  { id: 'tilly',  map: 'village', x: 30.4, y: 12.7, species: 'mouse', when: () => G.flag('craftsOpen') },
  { id: 'rufus',  map: 'village', x: 26.4, y: 12.6, species: 'raccoon', when: () => G.flag('leatherMended') },
  // squirrels and chipmunks live INSIDE their cottages now (they peek out of the windows)
  ...[['#5b8fe0', 7.8], ['#e0574f', 8.6], ['#f0c43a', 7.2]].map(([c, x], i) => ({ id: 'bird' + i, map: 'village', x, y: 5.3 + i * 0.15, species: 'bird', color: c, when: () => G.flag('chainBird') })),
];

// Zone challenges for zones that clear by freeing every hexed creature in them.
const FREE_ALL_ZONES = ['yard', 'meadow', 'brook', 'road', 'village', 'westbank', 'crossroads'];

const CLUES = {
  frogs: 'Four voices in the reeds. When the frogs sing together, the pond remembers its old stepping stones.',
  birds: 'Three voices, one song. Beside the owl\'s silent door, the brambles hide what an old friend left behind. A sharp blade and a gentle hand.',
  chipmunks: 'Six small friends remember the way. Where three birches lean together in the dark grove, the hedge is only pretending. Look with a seeing eye.',
};


// ---------------------------------------------------------------- library books
// Symbols are small SVG drawings (meanings to be discovered later).
const SYM = {
  knot:   '<path d="M50 18c18 0 22 26 4 34s-34-6-26-22 34-6 34 14-26 28-36 12 4-38 24-38z" fill="none" stroke="#5b4fb6" stroke-width="5"/><circle cx="50" cy="50" r="38" fill="none" stroke="#5b4fb6" stroke-width="4"/>',
  eye:    '<circle cx="50" cy="40" r="16" fill="none" stroke="#2d7aa0" stroke-width="5"/><line x1="50" y1="56" x2="50" y2="86" stroke="#2d7aa0" stroke-width="5"/><line x1="38" y1="74" x2="62" y2="74" stroke="#2d7aa0" stroke-width="4"/>',
  wave:   '<path d="M14 40q12-14 24 0t24 0t24 0M14 58q12-14 24 0t24 0t24 0M14 76q12-14 24 0t24 0t24 0" fill="none" stroke="#3a8a8a" stroke-width="5"/>',
  spiral: '<path d="M50 50m0-4a4 4 0 1 1-4 4a10 10 0 1 1 10 10a18 18 0 1 1-18-18a26 26 0 1 1 26 26" fill="none" stroke="#a0566b" stroke-width="5"/>',
  branch: '<line x1="50" y1="14" x2="50" y2="88" stroke="#4f7a3a" stroke-width="5"/><path d="M50 30l-16-12M50 30l16-12M50 50l-20-14M50 50l20-14M50 70l-16-12M50 70l16-12" stroke="#4f7a3a" stroke-width="4" fill="none"/>',
  moon:   '<path d="M62 18a34 34 0 1 0 0 64a26 26 0 1 1 0-64z" fill="none" stroke="#b08a2a" stroke-width="5"/><circle cx="66" cy="50" r="5" fill="#b08a2a"/>',
};
const svg = (inner, w = 120) => `<svg viewBox="0 0 100 100" width="${w}" height="${w}" style="display:block;margin:6px auto">${inner}</svg>`;
const PLANT = {
  inkberry: '<ellipse cx="50" cy="80" rx="34" ry="10" fill="#3a3a2a" opacity=".25"/><path d="M50 82V40" stroke="#4a3a2a" stroke-width="4"/>' + [0, 60, 120, 180, 240, 300].map(a => `<ellipse cx="50" cy="38" rx="7" ry="20" fill="#1f3a2a" transform="rotate(${a} 50 50) translate(0 -8)"/>`).join('') + '<circle cx="44" cy="52" r="6" fill="#3e2f7a"/><circle cx="56" cy="54" r="6" fill="#4b3a8c"/><circle cx="50" cy="60" r="6" fill="#3e2f7a"/>',
  strawberry: '<path d="M50 30c22 0 26 18 14 36-6 10-10 18-14 18s-8-8-14-18c-12-18-8-36 14-36z" fill="#e8434f"/><path d="M36 30l14-10 14 10-14 4z" fill="#3f8a47"/>' + [[42, 44], [56, 46], [48, 58], [58, 62], [42, 64]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2" fill="#ffe9a0"/>`).join(''),
  apple: '<circle cx="50" cy="56" r="28" fill="#e2403f"/><path d="M50 30q2-12 10-14" stroke="#6a4a2a" stroke-width="4" fill="none"/><ellipse cx="62" cy="22" rx="10" ry="5" fill="#5aa65a" transform="rotate(-20 62 22)"/><ellipse cx="40" cy="46" rx="7" ry="4" fill="#fff" opacity=".4"/>',
  shimmer: '<path d="M50 90V54" stroke="#4f9a57" stroke-width="4"/>' + [0, 72, 144, 216, 288].map((a, i) => `<ellipse cx="50" cy="34" rx="9" ry="16" fill="hsl(${a + 200},80%,78%)" transform="rotate(${a} 50 48)"/>`).join('') + '<circle cx="50" cy="48" r="7" fill="#fff6c8"/>',
  pine: '<path d="M50 10L74 46H60L80 76H20L40 46H26z" fill="#2b6343"/><rect x="46" y="76" width="8" height="14" fill="#6a4a2a"/><circle cx="58" cy="62" r="4" fill="#e8b84a"/>',
  fungus: '<rect x="20" y="10" width="14" height="84" fill="#7a6a5a"/><path d="M34 34q34-4 42 8q-20 6-42 2z" fill="#c9a06a"/><path d="M34 58q28-4 36 8q-18 5-36 2z" fill="#b8905a"/><path d="M34 34q34-4 42 8" stroke="#8a6a3a" stroke-width="2" fill="none"/>',
  star: '<path d="M50 90V56" stroke="#5a8a4a" stroke-width="4"/>' + [45, 135, 225, 315].map(a => `<ellipse cx="50" cy="30" rx="12" ry="20" fill="#f6f0c8" stroke="#d8c88a" stroke-width="1.5" transform="rotate(${a} 50 50)"/>`).join('') + '<circle cx="50" cy="50" r="7" fill="#c8b860"/>',
};
const page = (title, art, text) => `<h3 style="text-align:center">${title}</h3>${art}<p>${text}</p>`;
const BOOKS = {
  symbols: { title: 'Symbols', pages: () => [
    page('Symbols of the Land', '', 'Marks carved and painted all over this land, long before the hex. Some of them we have seen. What they mean is still a mystery. This book will fill in as more is learned.'),
    page('The Looping Knot', svg(SYM.knot), 'Three loops that never end, inside a circle. Carved into the rune stone outside Old Moss\'s hut. <i>Meaning: unknown. Fennel seems to like it.</i>'),
    page('The Watching Stone', svg(SYM.eye), 'A ring above a standing line. Found on the Old Stones in the forest. <i>Meaning: unknown.</i>'),
    page('Three Waves', svg(SYM.wave), 'Three rippling lines. <i>Where it is found: not yet seen. Meaning: unknown.</i>'),
    page('The Unwinding', svg(SYM.spiral), 'A spiral opening outward. <i>Where it is found: not yet seen. Meaning: unknown.</i>'),
    page('The Branch', svg(SYM.branch), 'A line with three pairs of arms, like a sapling. <i>Where it is found: not yet seen. Meaning: unknown.</i>'),
    page('Moon and Seed', svg(SYM.moon), 'A crescent cradling a single dot. <i>Where it is found: not yet seen. Meaning: unknown.</i>'),
  ] },
  vegetation: { title: 'Vegetation', pages: () => [
    page('What Grows Here', '', 'A gardener\'s notes on the plants of this land: how to know them, and what they are good for. Magic is part of the world, and so it is part of these notes.'),
    page('Inkberry', svg(PLANT.inkberry), 'A low bush with very dark leaves, serrated at the edges, growing in groups of six. The berries are deep purple and terribly tart, with no nourishment at all. <b>Use:</b> ground into ink, they help magic take hold on the page. Writing spells will not work without them.'),
    page('Wild Strawberry', svg(PLANT.strawberry), 'A creeping plant with three-part leaves and small white flowers that become sweet red berries. <b>Use:</b> good to eat, and loved by bakers and fairies alike.'),
    page('Apple', svg(PLANT.apple), 'An orchard tree. A healthy tree keeps a few apples ripening at all times. Choked by weeds, it bears nothing. <b>Use:</b> food, baking, and a fine treat.'),
    page('Shimmer Flower', svg(PLANT.shimmer), 'Five petals that seem to change color when you look away. Rare. <b>Use:</b> ground into dust, it helps magic see what is hidden.'),
    page('Pine', svg(PLANT.pine), 'Tall and pointed, with needles instead of leaves. Its bark weeps golden resin. <b>Use:</b> the resin is a natural glue, and a key part of mending.'),
    page('Tinder Fungus', svg(PLANT.fungus), 'A shelf mushroom that grows on dead trees. Dry, it catches a spark easily. Pounded and cured, it becomes soft "mushroom leather." <b>Use:</b> leatherwork.'),
    page('Pale Star-Flower', svg(PLANT.star), 'A pale white-yellow flower with four broad petals. <i>Little is known about this one. Where it grows, no one living seems to remember.</i>'),
  ] },
  creatures: { title: 'Creatures of Hexwood', pages: () => {
    const all = [['hedgehog', 'Hedgehog', 'Prickly outside, soft inside. Always carrying something small and shiny.'], ['chipmunk', 'Chipmunk', 'Quick, striped and endlessly curious. They keep treasures and remember the way.'], ['butterfly', 'Butterfly', 'Light as a petal. Sometimes leaves a shimmer petal behind.'],
      ['bunny', 'Rabbit', 'Gentle and good with their noses. Excellent bakers.'], ['frog', 'Frog', 'Sing in chorus by the water. Sometimes leave a treat.'], ['firefly', 'Firefly', 'A tiny lantern with wings.'],
      ['bird', 'Songbird', 'Blue, red and yellow. They sing best together.'], ['mouse', 'Mouse', 'Small, tidy, a little nervous. Very good with buttons and string.'], ['squirrel', 'Squirrel', 'Busy, bouncy, and fond of cozy cottages.'],
      ['badger', 'Badger', 'Gruff, strong, and a fine smith.'], ['beaver', 'Beaver', 'Very good with wood. Runs the mill.'], ['raccoon', 'Raccoon', 'Clever paws. Works mushroom leather.'], ['goose', 'Goose', 'Loud, proud, and the source of every quill in the land.'], ['owl', 'Owl', 'Wise, and fond of books.']];
    const met = new Set(Object.keys(S.freed).map(id => (CREATURES.find(c => c.id === id) || {}).species));
    RESIDENTS.forEach(r => { if (r.when()) met.add(r.species); });
    if (G.flag('libOpen')) met.add('owl');
    return [page('Creatures of Hexwood', '', 'Every creature you help is written down here. Pages fill in as you meet them.')].concat(all.map(([sp, n, d]) => met.has(sp) ? page(n, '', d) : page('???', '', '<i>Not yet met.</i>')));
  } },
  moss: { title: 'Old Moss', pages: () => [
    page('Old Moss', '', 'Old Moss was the hedge-wizard of this forest, as long as anyone can remember. He lived in the little hut east of town, kept a spellbook and a very tidy garden, and was kind to everything that crawled, hopped or flew.'),
    page('The Keep', '', 'Moss often walked south, past the willows, to the old Keep. He said the Keep had the finest view in the land, if you climbed all the way to the roof. What he did there, he never said.'),
    page('The Night of the Hex', '', 'One winter night, the color drained out of everything. Gardens went gray. Doors stuck shut. Creatures curled up under a gray spell and would not wake.'),
    page('Where Moss Went', '', 'The last anyone saw of Old Moss, he was heading south toward the Keep with his satchel over his shoulder. He locked his spellbook in the bureau first, and left the fairy to watch the hut. He has not been seen since.'),
    page('', '', '<i>The rest of the pages are blank... for now.</i>'),
  ] },
};
