"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// ../shared/src/index.ts
var index_exports = {};
__export(index_exports, {
  ALLIANCES: () => ALLIANCES,
  ALLIANCE_IDS: () => ALLIANCE_IDS,
  CHARACTERS: () => CHARACTERS,
  CHARACTER_IDS: () => CHARACTER_IDS,
  DIFFICULTY: () => DIFFICULTY,
  LEADS: () => LEADS,
  LOBBY_SECONDS: () => LOBBY_SECONDS,
  MAP: () => MAP,
  MatchSim: () => MatchSim,
  ROUNDS_TO_WIN: () => ROUNDS_TO_WIN,
  ROUND_SECONDS: () => ROUND_SECONDS,
  SNAPSHOT_HZ: () => SNAPSHOT_HZ,
  TEAM_SIZE: () => TEAM_SIZE,
  TICK_HZ: () => TICK_HZ,
  charactersOf: () => charactersOf,
  otherAlliance: () => otherAlliance
});
module.exports = __toCommonJS(index_exports);

// ../shared/src/characters.ts
var ALLIANCES = {
  rashtra_morcha: { name: "Rashtra Morcha", short: "RM", color: 15895592, css: "#F28C28", accent: "#B85A0B" },
  jan_ekta: { name: "Jan Ekta Gathbandhan", short: "JEG", color: 2006634, css: "#1E9E6A", accent: "#0F6B46" }
};
var ALLIANCE_IDS = ["rashtra_morcha", "jan_ekta"];
var otherAlliance = (a) => a === "rashtra_morcha" ? "jan_ekta" : "rashtra_morcha";
var CHARACTERS = {
  vikas_veer: {
    id: "vikas_veer",
    name: "Vikas Veer",
    alliance: "rashtra_morcha",
    role: "attacker",
    hp: 128,
    speed: 164,
    radius: 22,
    basic: { name: "Rally Punch", kind: "melee", damage: 20, range: 64, cooldown: 0.55 },
    special: {
      name: "Inauguration Dash",
      kind: "dash",
      cooldown: 8,
      radius: 240,
      power: 44,
      duration: 0.25,
      description: "Charges forward, ribbon-cutting through everyone in the way for heavy damage."
    },
    strongAgainst: ["pandit_shabdkosh", "bijli_babu"],
    weakAgainst: ["dharna_dada", "toofan_rani"],
    counterNote: "Dives the back line fast, but bounces off anyone who simply refuses to move."
  },
  chanakya_rao: {
    id: "chanakya_rao",
    name: "Chanakya Rao",
    alliance: "rashtra_morcha",
    role: "helper",
    hp: 100,
    speed: 150,
    radius: 20,
    basic: { name: "Strategy Scroll", kind: "projectile", damage: 11, range: 340, cooldown: 0.7, projectileSpeed: 500 },
    special: {
      name: "Grand Strategy",
      kind: "buff_aura",
      cooldown: 12,
      radius: 200,
      power: 0.18,
      duration: 5,
      description: "Allies nearby deal 18% more damage for 5 seconds."
    },
    strongAgainst: ["dharna_dada", "pandit_shabdkosh"],
    weakAgainst: ["toofan_rani", "bijli_babu"],
    counterNote: "Wins long fights by out-planning tanks; folds when rushed before the plan lands."
  },
  sadak_kumar: {
    id: "sadak_kumar",
    name: "Sadak Kumar",
    alliance: "rashtra_morcha",
    role: "helper",
    hp: 106,
    speed: 146,
    radius: 21,
    basic: { name: "Gravel Toss", kind: "projectile", damage: 13, range: 290, cooldown: 0.75, projectileSpeed: 450 },
    special: {
      name: "Speed Breaker",
      kind: "slow_zone",
      cooldown: 12,
      radius: 130,
      power: 0.4,
      duration: 5,
      description: "Lays a speed breaker zone that slows enemies inside by 40% for 5 seconds."
    },
    strongAgainst: ["toofan_rani", "vikas_veer"],
    weakAgainst: ["pandit_shabdkosh", "chanakya_rao"],
    counterNote: "Shuts down fast divers; long-range talkers just stand outside the roadworks."
  },
  kila_singh: {
    id: "kila_singh",
    name: "Kila Singh",
    alliance: "rashtra_morcha",
    role: "defender",
    hp: 195,
    speed: 152,
    radius: 25,
    basic: { name: "Lathi Swing", kind: "melee", damage: 22, range: 76, cooldown: 0.7 },
    special: {
      name: "Fortify",
      kind: "shield_aura",
      cooldown: 11,
      radius: 180,
      power: 55,
      duration: 5,
      description: "Shields himself and nearby allies, absorbing 55 damage each for 5 seconds."
    },
    strongAgainst: ["toofan_rani", "vikas_veer"],
    weakAgainst: ["bijli_babu", "chanakya_rao"],
    counterNote: "A wall against melee pushes, but stuns and ranged poke chip him down."
  },
  toofan_rani: {
    id: "toofan_rani",
    name: "Toofan Rani",
    alliance: "jan_ekta",
    role: "attacker",
    hp: 122,
    speed: 170,
    radius: 21,
    basic: { name: "Slogan Blast", kind: "projectile", damage: 14, range: 230, cooldown: 0.5, projectileSpeed: 540 },
    special: {
      name: "Toofan",
      kind: "whirlwind",
      cooldown: 9,
      radius: 120,
      power: 28,
      duration: 0,
      description: "A whirlwind of slogans that damages and knocks back every enemy around her."
    },
    strongAgainst: ["chanakya_rao", "vikas_veer"],
    weakAgainst: ["kila_singh", "sadak_kumar"],
    counterNote: "Shreds squishy helpers in a crowd; slowed down or walled off, she runs out of wind."
  },
  bijli_babu: {
    id: "bijli_babu",
    name: "Bijli Babu",
    alliance: "jan_ekta",
    role: "helper",
    hp: 105,
    speed: 152,
    radius: 20,
    basic: { name: "Spark", kind: "projectile", damage: 12, range: 310, cooldown: 0.65, projectileSpeed: 600 },
    special: {
      name: "Power Cut",
      kind: "stun_aura",
      cooldown: 14,
      radius: 140,
      power: 0,
      duration: 1.1,
      description: "Cuts the power: enemies nearby are stunned for 1.1 seconds."
    },
    strongAgainst: ["kila_singh", "chanakya_rao"],
    weakAgainst: ["vikas_veer", "sadak_kumar"],
    counterNote: "Stuns lock down slow defenders; a fast dash reaches him before the lights go out."
  },
  pandit_shabdkosh: {
    id: "pandit_shabdkosh",
    name: "Pandit Shabdkosh",
    alliance: "jan_ekta",
    role: "helper",
    hp: 100,
    speed: 144,
    radius: 20,
    basic: { name: "Big Words", kind: "projectile", damage: 10, range: 380, cooldown: 0.75, projectileSpeed: 460 },
    special: {
      name: "Sermon",
      kind: "heal_aura",
      cooldown: 14,
      radius: 160,
      power: 38,
      duration: 0,
      description: "Heals himself and nearby allies for 38 HP."
    },
    strongAgainst: ["sadak_kumar", "kila_singh"],
    weakAgainst: ["vikas_veer", "chanakya_rao"],
    counterNote: "Out-talks anyone from range and keeps the team topped up; hates being caught up close."
  },
  dharna_dada: {
    id: "dharna_dada",
    name: "Dharna Dada",
    alliance: "jan_ekta",
    role: "defender",
    hp: 240,
    speed: 154,
    radius: 25,
    basic: { name: "Dhakka", kind: "melee", damage: 26, range: 74, cooldown: 0.7 },
    special: {
      name: "Dharna",
      kind: "dharna",
      cooldown: 12,
      radius: 0,
      power: 0.6,
      duration: 5,
      description: "Sits in protest: cannot move, takes 60% less damage and counts double on capture zones."
    },
    strongAgainst: ["vikas_veer", "sadak_kumar"],
    weakAgainst: ["chanakya_rao", "bijli_babu"],
    counterNote: "Immovable against brawlers; a patient strategist simply waits the protest out."
  }
};
var CHARACTER_IDS = Object.keys(CHARACTERS);
var charactersOf = (alliance) => CHARACTER_IDS.map((id) => CHARACTERS[id]).filter((c) => c.alliance === alliance);
var LEADS = { rashtra_morcha: "vikas_veer", jan_ekta: "toofan_rani" };

// ../shared/src/map.ts
var W = 2e3;
var H = 1200;
var rot = (o) => ({ ...o, x: W - o.x - o.w, y: H - o.y - o.h, flip: o.flip === void 0 ? void 0 : !o.flip });
var HALF = [
  // tower-side market, clear of the tower circle and booths
  { x: 140, y: 150, w: 140, h: 90, kind: "stall", label: "KIRANA" },
  { x: 140, y: 960, w: 140, h: 90, kind: "stall", label: "CHAI" },
  // walls flanking the office
  { x: 300, y: 300, w: 40, h: 160, kind: "wall" },
  { x: 300, y: 740, w: 40, h: 160, kind: "wall" },
  // auto-rickshaw ranks
  { x: 330, y: 860, w: 84, h: 46, kind: "auto" },
  { x: 330, y: 920, w: 84, h: 46, kind: "auto" },
  { x: 600, y: 560, w: 84, h: 46, kind: "auto", flip: true },
  { x: 880, y: 260, w: 84, h: 46, kind: "auto" },
  { x: 1100, y: 380, w: 84, h: 46, kind: "auto", flip: true },
  // Delhi Police barricades pinching the road and the northern lane
  { x: 760, y: 540, w: 24, h: 120, kind: "barricade" },
  { x: 1e3, y: 180, w: 110, h: 24, kind: "barricade" }
];
var MAP = {
  width: W,
  height: H,
  hq: {
    rashtra_morcha: { x: 170, y: 600, r: 130 },
    jan_ekta: { x: 1830, y: 600, r: 130 }
  },
  guardPosts: {
    rashtra_morcha: { x: 380, y: 600 },
    jan_ekta: { x: 1620, y: 600 }
  },
  booths: {
    rashtra_morcha: [
      { x: 520, y: 200, r: 80 },
      { x: 700, y: 960, r: 80 },
      { x: 760, y: 420, r: 80 }
    ],
    jan_ekta: [
      { x: 1480, y: 1e3, r: 80 },
      { x: 1300, y: 240, r: 80 },
      { x: 1240, y: 780, r: 80 }
    ]
  },
  spawns: {
    rashtra_morcha: [
      { x: 110, y: 520 },
      { x: 110, y: 680 },
      { x: 200, y: 460 },
      { x: 200, y: 740 }
    ],
    jan_ekta: [
      { x: 1890, y: 520 },
      { x: 1890, y: 680 },
      { x: 1800, y: 460 },
      { x: 1800, y: 740 }
    ]
  },
  mediaVan: {
    rashtra_morcha: { x: 700, y: 600 },
    jan_ekta: { x: 1300, y: 600 }
  },
  obstacles: [
    // India Gate: a landmark you walk around, not a capture point
    { x: 910, y: 500, w: 180, h: 200, kind: "gate", label: "INDIA GATE" },
    ...HALF,
    ...HALF.map(rot)
  ]
};

// ../shared/src/protocol.ts
var LOBBY_SECONDS = 8;
var ROUND_SECONDS = 150;
var ROUNDS_TO_WIN = 2;
var TEAM_SIZE = 4;
var TICK_HZ = 30;
var SNAPSHOT_HZ = 20;

// ../shared/src/sim/state.ts
var NO_INPUT = { mx: 0, my: 0, attack: false, special: false };
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = a + 1831565813 >>> 0;
    let t = a;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
var dist2 = (ax, ay, bx, by) => (ax - bx) ** 2 + (ay - by) ** 2;
var dist = (ax, ay, bx, by) => Math.sqrt(dist2(ax, ay, bx, by));
function norm(x, y) {
  const l = Math.hypot(x, y);
  return l > 1e-6 ? [x / l, y / l] : [0, 0];
}
function circleHitsRect(x, y, r, o) {
  const cx = Math.max(o.x, Math.min(x, o.x + o.w));
  const cy = Math.max(o.y, Math.min(y, o.y + o.h));
  return dist2(x, y, cx, cy) < r * r;
}
function blocked(world, x, y, r) {
  const m = world.map;
  if (x < r || y < r || x > m.width - r || y > m.height - r) return true;
  for (const o of m.obstacles) if (circleHitsRect(x, y, r, o)) return true;
  return false;
}
function moveWithCollision(world, p, r, dx, dy) {
  if (!blocked(world, p.x + dx, p.y + dy, r)) {
    p.x += dx;
    p.y += dy;
    return;
  }
  if (!blocked(world, p.x + dx, p.y, r)) p.x += dx;
  else if (!blocked(world, p.x, p.y + dy, r)) p.y += dy;
}
function inCircle(x, y, c) {
  return dist2(x, y, c.x, c.y) <= c.r * c.r;
}

// ../shared/src/sim/nav.ts
var CELL = 40;
var CLEARANCE = 30;
var cache = /* @__PURE__ */ new WeakMap();
function gridFor(world) {
  let g = cache.get(world.map);
  if (g) return g;
  const cols = Math.ceil(world.map.width / CELL);
  const rows = Math.ceil(world.map.height / CELL);
  const walls = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) walls[r * cols + c] = blocked(world, c * CELL + CELL / 2, r * CELL + CELL / 2, CLEARANCE) ? 1 : 0;
  g = { cols, rows, walls };
  cache.set(world.map, g);
  return g;
}
function lineClear(world, x0, y0, x1, y1, r) {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.max(1, Math.ceil(len / 16));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    if (blocked(world, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r)) return false;
  }
  return true;
}
var NEIGH = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, 1.414],
  [1, -1, 1.414],
  [-1, 1, 1.414],
  [-1, -1, 1.414]
];
function snap(grid, x, y) {
  const c0 = Math.min(grid.cols - 1, Math.max(0, Math.floor(x / CELL)));
  const r0 = Math.min(grid.rows - 1, Math.max(0, Math.floor(y / CELL)));
  if (!grid.walls[r0 * grid.cols + c0]) return r0 * grid.cols + c0;
  for (let d = 1; d < 8; d++)
    for (let dr = -d; dr <= d; dr++)
      for (let dc = -d; dc <= d; dc++) {
        if (Math.max(Math.abs(dr), Math.abs(dc)) !== d) continue;
        const r = r0 + dr;
        const c = c0 + dc;
        if (r < 0 || c < 0 || r >= grid.rows || c >= grid.cols) continue;
        if (!grid.walls[r * grid.cols + c]) return r * grid.cols + c;
      }
  return r0 * grid.cols + c0;
}
function findPath(world, sx, sy, tx, ty) {
  const grid = gridFor(world);
  const start = snap(grid, sx, sy);
  const goal = snap(grid, tx, ty);
  const n = grid.cols * grid.rows;
  const gCost = new Float32Array(n).fill(Infinity);
  const from = new Int32Array(n).fill(-1);
  const closed = new Uint8Array(n);
  const gx = goal % grid.cols;
  const gy = Math.floor(goal / grid.cols);
  const h = (i) => {
    const dx = Math.abs(i % grid.cols - gx);
    const dy = Math.abs(Math.floor(i / grid.cols) - gy);
    return Math.max(dx, dy) + 0.414 * Math.min(dx, dy);
  };
  const heap = [];
  const push = (f, i) => {
    heap.push([f, i]);
    let k = heap.length - 1;
    while (k > 0) {
      const p = k - 1 >> 1;
      if (heap[p][0] <= heap[k][0]) break;
      [heap[p], heap[k]] = [heap[k], heap[p]];
      k = p;
    }
  };
  const pop = () => {
    const top = heap[0];
    const last = heap.pop();
    if (heap.length) {
      heap[0] = last;
      let k = 0;
      for (; ; ) {
        const l = 2 * k + 1;
        const r = l + 1;
        let m = k;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === k) break;
        [heap[m], heap[k]] = [heap[k], heap[m]];
        k = m;
      }
    }
    return top;
  };
  gCost[start] = 0;
  push(h(start), start);
  while (heap.length) {
    const [, cur] = pop();
    if (closed[cur]) continue;
    closed[cur] = 1;
    if (cur === goal) {
      const out = [];
      for (let i = goal; i !== -1; i = from[i]) out.push({ x: i % grid.cols * CELL + CELL / 2, y: Math.floor(i / grid.cols) * CELL + CELL / 2 });
      return out.reverse();
    }
    const cx = cur % grid.cols;
    const cy = Math.floor(cur / grid.cols);
    for (const [dx, dy, cost] of NEIGH) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= grid.cols || ny >= grid.rows) continue;
      const ni = ny * grid.cols + nx;
      if (grid.walls[ni] || closed[ni]) continue;
      if (dx && dy && (grid.walls[cy * grid.cols + nx] || grid.walls[ny * grid.cols + cx])) continue;
      const g = gCost[cur] + cost;
      if (g < gCost[ni]) {
        gCost[ni] = g;
        from[ni] = cur;
        push(g + h(ni), ni);
      }
    }
  }
  return null;
}
function nextWaypoint(world, x, y, tx, ty, radius) {
  if (lineClear(world, x, y, tx, ty, radius)) return null;
  const path = findPath(world, x, y, tx, ty);
  if (!path || path.length < 2) return null;
  for (let i = path.length - 1; i >= 1; i--) if (lineClear(world, x, y, path[i].x, path[i].y, radius)) return path[i];
  return path[1];
}

// ../shared/src/sim/combat.ts
var RESPAWN_SECONDS = 5;
var KILL_VOTES = 3;
var HQ_HEAL_PER_SEC = 14;
var BUFF_DAMAGE = 0.18;
var MELEE_HIT_SLOW = 0.35;
var MELEE_HIT_SLOW_SECONDS = 1;
var RECOIL_SPEED = 0.6;
var RECOIL_SECONDS = 0.3;
var BOOTH_CRPF = { range: 175, cooldown: 1, homeDamage: 5, capturedDamage: 2 };
function fx(world, kind, x, y, r, alliance, tx, ty) {
  world.fx.push({ id: world.nextId++, kind, x, y, r, alliance, tx, ty });
}
function enemiesOf(world, p) {
  return world.players.filter((o) => o.alive && o.alliance !== p.alliance);
}
function alliesOf(world, p, includeSelf = true) {
  return world.players.filter((o) => o.alive && o.alliance === p.alliance && (includeSelf || o !== p));
}
function nearestTarget(world, p, range, needLos = false) {
  let best = null;
  let bestD = Infinity;
  for (const e of enemiesOf(world, p)) {
    const d = dist(p.x, p.y, e.x, e.y) - e.def.radius;
    if (d <= range && d < bestD && (!needLos || lineClear(world, p.x, p.y, e.x, e.y, 3))) {
      best = { kind: "player", p: e };
      bestD = d;
    }
  }
  const g = world.guards[otherAlliance(p.alliance)];
  if (g.alive) {
    const d = dist(p.x, p.y, g.x, g.y) - g.radius;
    if (d <= range && d + 40 < bestD && (!needLos || lineClear(world, p.x, p.y, g.x, g.y, 3))) best = { kind: "guard", g };
  }
  return best;
}
function targetPos(t) {
  return t.kind === "player" ? { x: t.p.x, y: t.p.y, r: t.p.def.radius } : { x: t.g.x, y: t.g.y, r: t.g.radius };
}
function damagePlayer(world, target, amount, source) {
  if (!target.alive) return;
  let dmg = amount;
  if (source && source.buffTtl > 0) dmg *= 1 + BUFF_DAMAGE;
  if (target.dharnaTtl > 0) dmg *= 1 - target.def.special.power;
  if (target.shield > 0) {
    const absorbed = Math.min(target.shield, dmg);
    target.shield -= absorbed;
    dmg -= absorbed;
  }
  target.hp -= dmg;
  if (source) source.stats.damage += dmg;
  if (target.hp <= 0) {
    target.hp = 0;
    target.alive = false;
    target.respawnIn = RESPAWN_SECONDS;
    target.stats.deaths++;
    target.roundDeaths++;
    target.dashTtl = 0;
    target.dharnaTtl = 0;
    target.shield = 0;
    fx(world, "ko", target.x, target.y, target.def.radius, target.alliance);
    if (source) {
      source.stats.kills++;
      source.roundKills++;
      world.votes[source.alliance] += KILL_VOTES;
    }
  }
}
function damageGuard(world, g, amount, source) {
  if (!g.alive) return;
  const dmg = source && source.buffTtl > 0 ? amount * (1 + BUFF_DAMAGE) : amount;
  g.hp -= dmg;
  if (source) source.stats.damage += dmg;
  if (g.hp <= 0) {
    g.hp = 0;
    g.alive = false;
    fx(world, "ko", g.x, g.y, g.radius, g.alliance);
  }
}
function damage(world, t, amount, source) {
  if (t.kind === "player") damagePlayer(world, t.p, amount, source);
  else damageGuard(world, t.g, amount, source);
}
function aimFor(world, p, range) {
  const { ax, ay } = p.input;
  if (ax !== void 0 && ay !== void 0 && (ax !== 0 || ay !== 0)) return norm(ax, ay);
  const t = nearestTarget(world, p, range * 1.2);
  if (t) {
    const tp = targetPos(t);
    const v = norm(tp.x - p.x, tp.y - p.y);
    if (v[0] || v[1]) return v;
  }
  return [p.fx, p.fy];
}
function basicAttack(world, p) {
  const b = p.def.basic;
  const [dx, dy] = aimFor(world, p, b.range);
  p.fx = dx;
  p.fy = dy;
  p.attackCd = b.cooldown;
  if (b.kind === "melee") {
    fx(world, "melee", p.x + dx * b.range * 0.5, p.y + dy * b.range * 0.5, b.range * 0.6, p.alliance, dx, dy);
    const cosArc = Math.cos(75 * Math.PI / 180);
    const hits = enemiesOf(world, p).map((e) => ({ kind: "player", p: e }));
    const g = world.guards[otherAlliance(p.alliance)];
    if (g.alive) hits.push({ kind: "guard", g });
    for (const t of hits) {
      const tp = targetPos(t);
      const d = dist(p.x, p.y, tp.x, tp.y);
      if (d - tp.r > b.range) continue;
      const [ux, uy] = norm(tp.x - p.x, tp.y - p.y);
      if (d > tp.r && ux * dx + uy * dy < cosArc) continue;
      damage(world, t, b.damage, p);
      if (t.kind === "player") t.p.hitSlowTtl = MELEE_HIT_SLOW_SECONDS;
      fx(world, "hit", tp.x, tp.y, tp.r, p.alliance);
    }
  } else {
    p.recoilTtl = RECOIL_SECONDS;
    const speed = b.projectileSpeed ?? 500;
    world.projectiles.push({
      id: world.nextId++,
      ownerId: p.id,
      owner: p.def.id,
      alliance: p.alliance,
      x: p.x + dx * p.def.radius,
      y: p.y + dy * p.def.radius,
      vx: dx * speed,
      vy: dy * speed,
      travelled: 0,
      range: b.range,
      damage: b.damage
    });
  }
}
function special(world, p) {
  const s = p.def.special;
  p.specialCd = s.cooldown;
  switch (s.kind) {
    case "dash": {
      const [dx, dy] = aimFor(world, p, s.radius);
      p.fx = dx;
      p.fy = dy;
      p.dashTtl = s.duration;
      p.dashVx = dx * s.radius / s.duration;
      p.dashVy = dy * s.radius / s.duration;
      p.dashHit = /* @__PURE__ */ new Set();
      fx(world, "dash", p.x, p.y, p.def.radius, p.alliance, dx, dy);
      break;
    }
    case "buff_aura":
      for (const a of alliesOf(world, p)) if (inCircle(a.x, a.y, { x: p.x, y: p.y, r: s.radius })) a.buffTtl = s.duration;
      fx(world, "buff", p.x, p.y, s.radius, p.alliance);
      break;
    case "shield_aura":
      for (const a of alliesOf(world, p))
        if (inCircle(a.x, a.y, { x: p.x, y: p.y, r: s.radius })) {
          a.shield = s.power;
          a.shieldTtl = s.duration;
        }
      fx(world, "shield", p.x, p.y, s.radius, p.alliance);
      break;
    case "heal_aura":
      for (const a of alliesOf(world, p))
        if (inCircle(a.x, a.y, { x: p.x, y: p.y, r: s.radius })) a.hp = Math.min(a.def.hp, a.hp + s.power);
      fx(world, "heal", p.x, p.y, s.radius, p.alliance);
      break;
    case "slow_zone": {
      const [dx, dy] = aimFor(world, p, 260);
      const zx = p.x + dx * 120;
      const zy = p.y + dy * 120;
      world.slowZones.push({ id: world.nextId++, x: zx, y: zy, r: s.radius, alliance: p.alliance, ttl: s.duration, factor: 1 - s.power });
      fx(world, "slow", zx, zy, s.radius, p.alliance);
      break;
    }
    case "whirlwind":
      for (const e of enemiesOf(world, p)) {
        const d = dist(p.x, p.y, e.x, e.y);
        if (d - e.def.radius > s.radius) continue;
        damagePlayer(world, e, s.power, p);
        if (e.alive && e.dharnaTtl <= 0) {
          const [ux, uy] = norm(e.x - p.x, e.y - p.y);
          moveWithCollision(world, e, e.def.radius, ux * 90, uy * 90);
        }
      }
      {
        const g = world.guards[otherAlliance(p.alliance)];
        if (g.alive && dist(p.x, p.y, g.x, g.y) - g.radius <= s.radius) damageGuard(world, g, s.power, p);
      }
      fx(world, "whirlwind", p.x, p.y, s.radius, p.alliance);
      break;
    case "stun_aura":
      for (const e of enemiesOf(world, p))
        if (dist(p.x, p.y, e.x, e.y) - e.def.radius <= s.radius && e.dharnaTtl <= 0) {
          e.stunTtl = s.duration;
          e.dashTtl = 0;
        }
      fx(world, "stun", p.x, p.y, s.radius, p.alliance);
      break;
    case "dharna":
      p.dharnaTtl = s.duration;
      fx(world, "dharna", p.x, p.y, p.def.radius + 20, p.alliance);
      break;
  }
}
function respawnPoint(world, p) {
  if (world.ruling && world.ruling !== p.alliance) {
    const v = world.map.mediaVan[p.alliance];
    return { x: v.x + (p.spawnIndex % 2 * 2 - 1) * 30, y: v.y + (p.spawnIndex - 1.5) * 40 };
  }
  return world.map.spawns[p.alliance][p.spawnIndex % 4];
}
function stepPlayer(world, p, dt) {
  if (!p.alive) {
    p.respawnIn -= dt;
    if (p.respawnIn <= 0) {
      const sp = respawnPoint(world, p);
      p.x = sp.x;
      p.y = sp.y;
      p.hp = p.def.hp;
      p.alive = true;
      p.attackCd = 0;
      p.specialCd = 0;
      p.stunTtl = 0;
      p.buffTtl = 0;
      p.shield = 0;
      p.shieldTtl = 0;
      p.dharnaTtl = 0;
      p.hitSlowTtl = 0;
      p.recoilTtl = 0;
      p.slowFactor = 1;
      p.dashTtl = 0;
      p.input = { mx: 0, my: 0, attack: false, special: false };
    }
    return;
  }
  p.attackCd = Math.max(0, p.attackCd - dt);
  p.specialCd = Math.max(0, p.specialCd - dt);
  p.buffTtl = Math.max(0, p.buffTtl - dt);
  p.hitSlowTtl = Math.max(0, p.hitSlowTtl - dt);
  p.recoilTtl = Math.max(0, p.recoilTtl - dt);
  p.dharnaTtl = Math.max(0, p.dharnaTtl - dt);
  p.shieldTtl = Math.max(0, p.shieldTtl - dt);
  if (p.shieldTtl <= 0) p.shield = 0;
  if (inCircle(p.x, p.y, world.map.hq[p.alliance])) p.hp = Math.min(p.def.hp, p.hp + HQ_HEAL_PER_SEC * dt);
  if (p.stunTtl > 0) {
    p.stunTtl -= dt;
    return;
  }
  p.slowFactor = Math.min(p.hitSlowTtl > 0 ? 1 - MELEE_HIT_SLOW : 1, p.recoilTtl > 0 ? RECOIL_SPEED : 1);
  for (const z of world.slowZones) if (z.alliance !== p.alliance && inCircle(p.x, p.y, z)) p.slowFactor = Math.min(p.slowFactor, z.factor);
  if (p.dashTtl > 0) {
    const step = Math.min(dt, p.dashTtl);
    p.dashTtl -= step;
    const before = { x: p.x, y: p.y };
    moveWithCollision(world, p, p.def.radius, p.dashVx * step, p.dashVy * step);
    if (before.x === p.x && before.y === p.y) p.dashTtl = 0;
    for (const e of enemiesOf(world, p)) {
      if (p.dashHit.has(e.id)) continue;
      if (dist2(p.x, p.y, e.x, e.y) <= (p.def.radius + e.def.radius + 12) ** 2) {
        p.dashHit.add(e.id);
        damagePlayer(world, e, p.def.special.power, p);
        fx(world, "hit", e.x, e.y, e.def.radius, p.alliance);
      }
    }
    const g = world.guards[otherAlliance(p.alliance)];
    if (g.alive && !p.dashHit.has("guard") && dist(p.x, p.y, g.x, g.y) <= p.def.radius + g.radius + 12) {
      p.dashHit.add("guard");
      damageGuard(world, g, p.def.special.power, p);
    }
    return;
  }
  const { mx, my } = p.input;
  const len = Math.hypot(mx, my);
  if (len > 0.05 && p.dharnaTtl <= 0) {
    const k = Math.min(1, len) / len;
    const speed = p.def.speed * p.slowFactor;
    moveWithCollision(world, p, p.def.radius, mx * k * speed * dt, my * k * speed * dt);
    p.fx = mx / len;
    p.fy = my / len;
  }
  if (p.input.special && p.specialCd <= 0) special(world, p);
  if (p.input.attack && p.attackCd <= 0) basicAttack(world, p);
}
function stepProjectiles(world, dt) {
  const keep = [];
  for (const pr of world.projectiles) {
    const sx = pr.vx * dt;
    const sy = pr.vy * dt;
    pr.x += sx;
    pr.y += sy;
    pr.travelled += Math.hypot(sx, sy);
    if (pr.travelled > pr.range || blocked(world, pr.x, pr.y, 2)) continue;
    const owner = world.players.find((p) => p.id === pr.ownerId) ?? null;
    let hit = false;
    for (const e of world.players) {
      if (!e.alive || e.alliance === pr.alliance) continue;
      if (dist2(pr.x, pr.y, e.x, e.y) <= (e.def.radius + 6) ** 2) {
        damagePlayer(world, e, pr.damage, owner);
        fx(world, "hit", e.x, e.y, e.def.radius, pr.alliance);
        hit = true;
        break;
      }
    }
    if (!hit) {
      const g = world.guards[otherAlliance(pr.alliance)];
      if (g.alive && dist2(pr.x, pr.y, g.x, g.y) <= (g.radius + 6) ** 2) {
        damageGuard(world, g, pr.damage, owner);
        fx(world, "hit", g.x, g.y, g.radius, pr.alliance);
        hit = true;
      }
    }
    if (!hit) keep.push(pr);
  }
  world.projectiles = keep;
}
function stepGuards(world, dt) {
  for (const g of Object.values(world.guards)) {
    if (!g.alive) continue;
    g.cd -= dt;
    if (g.cd > 0) continue;
    let target = null;
    let best = g.range * g.range;
    for (const e of world.players) {
      if (!e.alive || e.alliance === g.alliance) continue;
      const d = dist2(g.x, g.y, e.x, e.y);
      if (d < best) {
        best = d;
        target = e;
      }
    }
    if (target) {
      g.cd = 0.8;
      fx(world, "guard_shot", g.x, g.y, 0, g.alliance, target.x, target.y);
      damagePlayer(world, target, g.damage, null);
    }
  }
}
function stepBooths(world, dt) {
  for (const b of world.booths) {
    b.cd -= dt;
    if (b.cd > 0) continue;
    let target = null;
    let best = BOOTH_CRPF.range ** 2;
    for (const e of world.players) {
      if (!e.alive || e.alliance === b.owner) continue;
      const d = dist2(b.x, b.y, e.x, e.y);
      if (d < best) {
        best = d;
        target = e;
      }
    }
    if (!target) continue;
    b.cd = BOOTH_CRPF.cooldown;
    fx(world, "guard_shot", b.x, b.y - 24, 0, b.owner, target.x, target.y);
    damagePlayer(world, target, b.owner === b.home ? BOOTH_CRPF.homeDamage : BOOTH_CRPF.capturedDamage, null);
  }
}
function stepSlowZones(world, dt) {
  for (const z of world.slowZones) z.ttl -= dt;
  world.slowZones = world.slowZones.filter((z) => z.ttl > 0);
}

// ../shared/src/sim/bots/behaviourTree.ts
var DIFFICULTY = {
  easy: { thinkEvery: 0.45, aimJitter: 0.45, specialChance: 0.35, retreatAt: 0.15 },
  normal: { thinkEvery: 0.25, aimJitter: 0.18, specialChance: 0.7, retreatAt: 0.3 },
  hard: { thinkEvery: 0.12, aimJitter: 0.05, specialChance: 1, retreatAt: 0.35 }
};
var DEFENDER_LEASH = 700;
var selector = (...children) => (ctx) => {
  for (const c of children) if (c(ctx) === "success") return "success";
  return "failure";
};
var sequence = (...children) => (ctx) => {
  for (const c of children) if (c(ctx) === "failure") return "failure";
  return "success";
};
var condition = (fn) => (ctx) => fn(ctx) ? "success" : "failure";
var action = (fn) => (ctx) => {
  fn(ctx);
  return "success";
};
function steerTo(ctx, tx, ty, stopAt = 8) {
  const { me, world } = ctx;
  const d = dist(me.x, me.y, tx, ty);
  if (d <= stopAt) {
    ctx.out.mx = 0;
    ctx.out.my = 0;
    return;
  }
  let gx = tx;
  let gy = ty;
  if (d > 60) {
    const wp = nextWaypoint(world, me.x, me.y, tx, ty, me.def.radius + 2);
    if (wp) {
      gx = wp.x;
      gy = wp.y;
    }
  }
  let [dx, dy] = norm(gx - me.x, gy - me.y);
  const probe = me.def.radius + 34;
  if (blocked(world, me.x + dx * probe, me.y + dy * probe, me.def.radius)) {
    const s = me.bot.detourSign;
    for (const deg of [35, 60, 90, 120, -35, -60, -90]) {
      const a = deg * s * Math.PI / 180;
      const rx = dx * Math.cos(a) - dy * Math.sin(a);
      const ry = dx * Math.sin(a) + dy * Math.cos(a);
      if (!blocked(world, me.x + rx * probe, me.y + ry * probe, me.def.radius)) {
        dx = rx;
        dy = ry;
        break;
      }
    }
  }
  ctx.out.mx = dx;
  ctx.out.my = dy;
}
function aimAt(ctx, tx, ty) {
  const j = ctx.diff.aimJitter;
  const [dx, dy] = norm(tx - ctx.me.x, ty - ctx.me.y);
  const a = (ctx.world.rng() - 0.5) * 2 * j;
  ctx.out.ax = dx * Math.cos(a) - dy * Math.sin(a);
  ctx.out.ay = dx * Math.sin(a) + dy * Math.cos(a);
}
var hpRatio = (p) => p.hp / p.def.hp;
function enemiesWithin(ctx, r) {
  return enemiesOf(ctx.world, ctx.me).filter((e) => dist(ctx.me.x, ctx.me.y, e.x, e.y) - e.def.radius <= r);
}
function alliesWithin(ctx, r) {
  return alliesOf(ctx.world, ctx.me).filter((a) => dist(ctx.me.x, ctx.me.y, a.x, a.y) <= r);
}
function specialUseful(ctx) {
  const s = ctx.me.def.special;
  switch (s.kind) {
    case "dash": {
      const t = nearestTarget(ctx.world, ctx.me, s.radius * 0.9);
      if (!t) return false;
      const tp = targetPos(t);
      return dist(ctx.me.x, ctx.me.y, tp.x, tp.y) > 70;
    }
    case "buff_aura":
      return alliesWithin(ctx, s.radius).length >= 2 && enemiesWithin(ctx, 360).length > 0;
    case "shield_aura":
      return enemiesWithin(ctx, 300).length > 0 && (alliesWithin(ctx, s.radius).length >= 2 || hpRatio(ctx.me) < 0.6);
    case "heal_aura":
      return alliesWithin(ctx, s.radius).some((a) => a.def.hp - a.hp >= s.power * 0.8);
    case "slow_zone":
      return enemiesWithin(ctx, 240).length > 0;
    case "whirlwind":
      return enemiesWithin(ctx, s.radius).length > 0;
    case "stun_aura":
      return enemiesWithin(ctx, s.radius).length >= (ctx.diff.specialChance >= 1 ? 1 : 2) || enemiesWithin(ctx, s.radius).length > 0 && hpRatio(ctx.me) < 0.5;
    case "dharna": {
      const inZone = inCircle(ctx.me.x, ctx.me.y, ctx.world.map.hq[ctx.me.alliance]) || ctx.world.booths.some((b) => inCircle(ctx.me.x, ctx.me.y, b)) || inCircle(ctx.me.x, ctx.me.y, ctx.world.map.hq[otherAlliance(ctx.me.alliance)]);
      return inZone && enemiesWithin(ctx, 220).length > 0;
    }
  }
}
var engageNearest = (aggro) => sequence(
  condition((ctx) => nearestTarget(ctx.world, ctx.me, ctx.me.def.basic.range + aggro, true) !== null),
  action((ctx) => {
    const t = nearestTarget(ctx.world, ctx.me, ctx.me.def.basic.range + aggro, true);
    const tp = targetPos(t);
    const range = ctx.me.def.basic.range;
    const d = dist(ctx.me.x, ctx.me.y, tp.x, tp.y) - tp.r;
    aimAt(ctx, tp.x, tp.y);
    const want = ctx.me.def.basic.kind === "projectile" ? range * 0.75 : range * 0.6;
    if (d > want) steerTo(ctx, tp.x + ctx.me.bot.jx * 0.3, tp.y + ctx.me.bot.jy * 0.3);
    else if (ctx.me.def.basic.kind === "projectile" && d < range * 0.4) {
      const [ax, ay] = norm(ctx.me.x - tp.x, ctx.me.y - tp.y);
      steerTo(ctx, ctx.me.x + ax * 80, ctx.me.y + ay * 80);
    } else {
      ctx.out.mx = 0;
      ctx.out.my = 0;
    }
    ctx.out.attack = d <= range;
  })
);
var retreat = sequence(
  condition((ctx) => {
    const me = ctx.me;
    if (me.def.role === "defender") return false;
    if (hpRatio(me) < ctx.diff.retreatAt) me.bot.retreating = true;
    else if (hpRatio(me) >= 0.85) me.bot.retreating = false;
    return me.bot.retreating;
  }),
  action((ctx) => {
    const hq = ctx.world.map.hq[ctx.me.alliance];
    steerTo(ctx, hq.x + ctx.me.bot.jx * 0.4, hq.y + ctx.me.bot.jy * 0.4, 30);
    const t = nearestTarget(ctx.world, ctx.me, ctx.me.def.basic.range, true);
    if (t) {
      const tp = targetPos(t);
      aimAt(ctx, tp.x, tp.y);
      ctx.out.attack = true;
    }
  })
);
var useSpecial = sequence(
  condition((ctx) => ctx.me.specialCd <= 0 && ctx.world.rng() < ctx.diff.specialChance && specialUseful(ctx)),
  action((ctx) => {
    ctx.out.special = true;
    const t = nearestTarget(ctx.world, ctx.me, 400);
    if (t) {
      const tp = targetPos(t);
      aimAt(ctx, tp.x, tp.y);
    }
  })
);
function pushEnemyHq(ctx) {
  const enemy = otherAlliance(ctx.me.alliance);
  const g = ctx.world.guards[enemy];
  if (g.alive) {
    aimAt(ctx, g.x, g.y);
    const d = dist(ctx.me.x, ctx.me.y, g.x, g.y) - g.radius;
    if (d > ctx.me.def.basic.range * 0.8) steerTo(ctx, g.x + ctx.me.bot.jx, g.y + ctx.me.bot.jy);
    ctx.out.attack = d <= ctx.me.def.basic.range;
    return;
  }
  const hq = ctx.world.map.hq[enemy];
  steerTo(ctx, hq.x + ctx.me.bot.jx * 0.6, hq.y + ctx.me.bot.jy * 0.6, 20);
}
var nearestBooth = (ctx, list) => list.reduce((best, b) => !best || dist(ctx.me.x, ctx.me.y, b.x, b.y) < dist(ctx.me.x, ctx.me.y, best.x, best.y) ? b : best, null);
function goToBooth(ctx, b) {
  steerTo(ctx, b.x + ctx.me.bot.jx * 0.25, b.y + ctx.me.bot.jy * 0.25, 18);
}
function boothsToDefend(ctx) {
  const { world, me } = ctx;
  return world.booths.filter((b) => b.home === me.alliance && b.owner !== me.alliance || b.owner === me.alliance && b.progress > 0.12);
}
var objective = action((ctx) => {
  const { world, me } = ctx;
  const enemy = otherAlliance(me.alliance);
  const myHq = world.map.hq[me.alliance];
  const behind = world.votes[me.alliance] < world.votes[enemy];
  const lateGame = ctx.roundTimeLeft < 45;
  if (world.hqCapture[me.alliance] > 0.15 && dist(me.x, me.y, myHq.x, myHq.y) < 900) {
    steerTo(ctx, myHq.x + me.bot.jx * 0.5, myHq.y + me.bot.jy * 0.5, 20);
    return;
  }
  const enemyHeld = world.booths.filter((b) => b.owner !== me.alliance);
  const capturedByUs = world.booths.filter((b) => b.home !== me.alliance && b.owner === me.alliance).length;
  switch (me.def.role) {
    case "attacker": {
      const wantTower = capturedByUs >= 1 || ctx.roundTimeLeft < 100 || enemyHeld.length === 0;
      if (wantTower) return pushEnemyHq(ctx);
      const b = nearestBooth(ctx, enemyHeld);
      return b ? goToBooth(ctx, b) : pushEnemyHq(ctx);
    }
    case "helper": {
      const defend = nearestBooth(ctx, boothsToDefend(ctx));
      if (defend && dist(me.x, me.y, defend.x, defend.y) < 900) return goToBooth(ctx, defend);
      if (ctx.roundTimeLeft < 70 && !defend) return pushEnemyHq(ctx);
      const byDistance = [...enemyHeld].sort((a, c) => dist(me.x, me.y, a.x, a.y) - dist(me.x, me.y, c.x, c.y));
      if (byDistance.length) return goToBooth(ctx, byDistance[Math.min(me.spawnIndex % 2, byDistance.length - 1)]);
      if (ctx.roundTimeLeft < 70 || lateGame && behind) return pushEnemyHq(ctx);
      const home = nearestBooth(ctx, world.booths.filter((b) => b.owner === me.alliance));
      return home ? goToBooth(ctx, home) : pushEnemyHq(ctx);
    }
    case "defender": {
      const lost = nearestBooth(ctx, boothsToDefend(ctx));
      if (lost && dist(lost.x, lost.y, myHq.x, myHq.y) < 650) return goToBooth(ctx, lost);
      const post = world.map.guardPosts[me.alliance];
      const dir = me.alliance === "rashtra_morcha" ? 1 : -1;
      steerTo(ctx, post.x + dir * 60 + me.bot.jx * 0.4, post.y + me.bot.jy * 0.6, 30);
      return;
    }
  }
});
var siege = sequence(
  condition((ctx) => ctx.me.def.role !== "defender" && ctx.roundTimeLeft < 75 && world_hasTowerChance(ctx)),
  action((ctx) => {
    pushEnemyHq(ctx);
    if (!ctx.out.attack) {
      const t = nearestTarget(ctx.world, ctx.me, ctx.me.def.basic.range, true);
      if (t) {
        const tp = targetPos(t);
        aimAt(ctx, tp.x, tp.y);
        ctx.out.attack = true;
      }
    }
  })
);
function world_hasTowerChance(ctx) {
  return ctx.world.hqCapture[ctx.me.alliance] < 0.15;
}
var holdBooth = sequence(
  condition((ctx) => ctx.me.def.role !== "defender" && ctx.world.booths.some((b) => b.owner !== ctx.me.alliance && inCircle(ctx.me.x, ctx.me.y, b))),
  action((ctx) => {
    const b = ctx.world.booths.find((x) => x.owner !== ctx.me.alliance && inCircle(ctx.me.x, ctx.me.y, x));
    const t = nearestTarget(ctx.world, ctx.me, ctx.me.def.basic.range, true);
    if (t) {
      const tp = targetPos(t);
      aimAt(ctx, tp.x, tp.y);
      ctx.out.attack = true;
    }
    steerTo(ctx, b.x, b.y, 30);
  })
);
var root = selector(
  retreat,
  sequence(useSpecial, selector(engageNearest(220), action(() => {
  }))),
  siege,
  holdBooth,
  sequence(
    condition((ctx) => ctx.me.def.role === "defender"),
    // defenders are leashed to their gate: they never get kited into the chowk
    condition((ctx) => {
      const t = nearestTarget(ctx.world, ctx.me, ctx.me.def.basic.range + 260, true);
      if (!t) return false;
      const tp = targetPos(t);
      const post = ctx.world.map.guardPosts[ctx.me.alliance];
      return dist(tp.x, tp.y, post.x, post.y) < DEFENDER_LEASH;
    }),
    engageNearest(260)
  ),
  sequence(condition((ctx) => ctx.me.def.role !== "defender"), engageNearest(170)),
  objective
);
function thinkBot(world, me, difficulty, dt, roundTimeLeft) {
  if (!me.alive) {
    me.input = { mx: 0, my: 0, attack: false, special: false };
    return;
  }
  me.bot.thinkIn -= dt;
  if (me.bot.thinkIn > 0) {
    me.input = { ...me.bot.input, special: false };
    return;
  }
  const diff = DIFFICULTY[difficulty];
  me.bot.thinkIn = diff.thinkEvery * (0.75 + world.rng() * 0.5);
  const ctx = { world, me, diff, roundTimeLeft, out: { mx: 0, my: 0, attack: false, special: false } };
  root(ctx);
  me.bot.input = ctx.out;
  me.input = ctx.out;
}

// ../shared/src/sim/capture.ts
var HQ_BASE_RATE = 0.09;
var HQ_EXTRA_RATE = 0.04;
var HQ_DEFEND_DRAIN = 0.12;
var HQ_IDLE_DRAIN = 0.025;
var BOOTH_RATE = 0.28;
var BOOTH_EXTRA = 0.4;
var BOOTH_DEFEND_DRAIN = 0.3;
var BOOTH_IDLE_DRAIN = 0.05;
var BOOTH_CAPTURE_BONUS = 20;
var BOOTH_VOTES_PER_SEC = 0.6;
function presence(world, zone, alliance) {
  let n = 0;
  for (const p of world.players) {
    if (!p.alive || p.alliance !== alliance || !inCircle(p.x, p.y, zone)) continue;
    n += p.dharnaTtl > 0 ? 2 : 1;
  }
  return n;
}
var boothsHeld = (world, alliance) => world.booths.filter((b) => b.owner === alliance).length;
function resolveCaptures(world, dt) {
  for (const owner of ALLIANCE_IDS) {
    const zone = world.map.hq[owner];
    const attackers = presence(world, zone, otherAlliance(owner));
    const defenders = presence(world, zone, owner);
    const gated = world.guards[owner].alive;
    let progress = world.hqCapture[owner];
    if (attackers > 0 && defenders === 0 && !gated) {
      progress += dt * (HQ_BASE_RATE + HQ_EXTRA_RATE * (Math.min(attackers, 3) - 1));
      for (const p of world.players)
        if (p.alive && p.alliance !== owner && inCircle(p.x, p.y, zone)) p.stats.captureSeconds += dt;
    } else if (defenders > 0 && attackers === 0) progress -= dt * HQ_DEFEND_DRAIN;
    else if (attackers === 0) progress -= dt * HQ_IDLE_DRAIN;
    world.hqCapture[owner] = Math.max(0, Math.min(1, progress));
  }
  for (const b of world.booths) {
    const taker = otherAlliance(b.owner);
    const attackers = presence(world, b, taker);
    const defenders = presence(world, b, b.owner);
    if (attackers > 0 && defenders === 0) {
      b.progress += dt * BOOTH_RATE * (1 + BOOTH_EXTRA * (Math.min(attackers, 3) - 1));
      for (const p of world.players) if (p.alive && p.alliance === taker && inCircle(p.x, p.y, b)) p.stats.captureSeconds += dt;
    } else if (defenders > 0 && attackers === 0) b.progress -= dt * BOOTH_DEFEND_DRAIN;
    else if (attackers === 0) b.progress -= dt * BOOTH_IDLE_DRAIN;
    b.progress = Math.max(0, Math.min(1, b.progress));
    if (b.progress >= 1) {
      b.owner = taker;
      b.progress = 0;
      b.cd = 1;
      world.votes[taker] += BOOTH_CAPTURE_BONUS;
      world.fx.push({ id: world.nextId++, kind: "booth_flip", x: b.x, y: b.y, r: b.r, alliance: taker });
    }
    world.votes[b.owner] += dt * BOOTH_VOTES_PER_SEC;
  }
}

// ../shared/src/sim/MatchSim.ts
var LOBBY_EXTEND_WINDOW = 30;
var MAX_VIEWERS = 8;
var GUARD_BASE = { hp: 320, damage: 11, range: 230, radius: 26 };
var GUARD_RULING = { hp: 480, damage: 14, range: 250, radius: 28 };
var MatchSim = class {
  constructor(out, opts) {
    this.out = out;
    this.phase = "lobby";
    this.round = 0;
    this.timeLeft = 0;
    this.score = { rashtra_morcha: 0, jan_ekta: 0 };
    this.slots = [];
    /** seconds the lobby has been open; late joiners only extend the countdown within this window */
    this.lobbyAge = 0;
    /** people who joined a running match and have not picked a character yet */
    this.viewers = /* @__PURE__ */ new Map();
    this.intermissionLeft = 0;
    this.t = 0;
    this.botCount = 0;
    this.lastLobbySecond = -1;
    this.solo = opts.solo;
    this.difficulty = opts.difficulty ?? "normal";
    this.rng = mulberry32(opts.seed ?? Math.floor(Math.random() * 2 ** 31));
    this.lobbyTotal = this.lobbyLeft = opts.lobbySeconds ?? LOBBY_SECONDS;
    this.roundSeconds = opts.roundSeconds ?? ROUND_SECONDS;
    this.intermission = opts.intermissionSeconds ?? 4;
    for (const alliance of ALLIANCE_IDS)
      for (let i = 0; i < TEAM_SIZE; i++)
        this.slots.push({ slotId: `${alliance}-${i}`, alliance, index: i, characterId: null, playerId: null, name: "", ready: false, connected: false, reservedUntil: null });
  }
  // ---------------- lobby ----------------
  /** humans who are connected and seated */
  get humanCount() {
    return this.slots.filter((s) => s.playerId && s.connected).length;
  }
  /** everyone currently in the room: seated humans plus people watching a running match */
  get peopleCount() {
    return this.humanCount + this.viewers.size;
  }
  get isFull() {
    return this.humanCount >= TEAM_SIZE * 2 || this.phase !== "lobby";
  }
  /** seats a new arrival could take right now (lobby: free seats; running match: characters no human holds) */
  openSeats() {
    return this.slots.filter((s) => !s.playerId).length;
  }
  /** false once the match is over, or when too many people are already waiting */
  joinable() {
    if (this.phase === "match_over") return false;
    if (this.phase === "lobby") return this.openSeats() > 0;
    return this.viewers.size < MAX_VIEWERS;
  }
  hasPlayer(playerId) {
    return this.viewers.has(playerId) || this.slots.some((s) => s.playerId === playerId);
  }
  /**
   * Lobby: takes a seat (provisional alliance until the player picks).
   * Running match: the player becomes a viewer who sees the lobby and may pick any
   * character no other human holds. Returns the alliance, 'viewer', or null if they cannot join.
   */
  addPlayer(playerId, name, preferred) {
    if (this.phase === "match_over") return null;
    if (this.hasPlayer(playerId)) return this.rejoin(playerId);
    if (this.phase !== "lobby") {
      if (this.viewers.size >= MAX_VIEWERS) return null;
      this.viewers.set(playerId, name);
      this.out(playerId, "welcome", { playerId, alliance: null, solo: this.solo });
      this.out(playerId, "lobby", this.lobbyView());
      return "viewer";
    }
    const humans = (a) => this.slots.filter((s) => s.alliance === a && s.playerId).length;
    let alliance = preferred ?? (humans("rashtra_morcha") === humans("jan_ekta") ? this.rng() < 0.5 ? "rashtra_morcha" : "jan_ekta" : humans("rashtra_morcha") < humans("jan_ekta") ? "rashtra_morcha" : "jan_ekta");
    let slot = this.slots.find((s) => s.alliance === alliance && !s.playerId);
    if (!slot) {
      alliance = otherAlliance(alliance);
      slot = this.slots.find((s) => s.alliance === alliance && !s.playerId);
    }
    if (!slot) return null;
    slot.playerId = playerId;
    slot.name = name;
    slot.connected = true;
    if (!this.solo && this.lobbyAge < LOBBY_EXTEND_WINDOW) this.lobbyLeft = Math.max(this.lobbyLeft, this.lobbyTotal);
    this.out(playerId, "welcome", { playerId, alliance, solo: this.solo });
    this.broadcastLobby();
    return alliance;
  }
  /**
   * A player leaves or loses their connection.
   * Lobby: the seat is freed. Running match: a bot takes over the character at once.
   * With `graceSeconds` the seat stays reserved so the same player can reclaim it
   * (dropped connection); without it the seat is freed straight away (deliberate Leave).
   */
  removePlayer(playerId, graceSeconds = 0) {
    if (this.viewers.delete(playerId)) return;
    const slot = this.slots.find((s) => s.playerId === playerId);
    if (!slot) return;
    if (this.phase === "lobby") {
      Object.assign(slot, { playerId: null, characterId: null, name: "", ready: false, connected: false, reservedUntil: null });
      this.broadcastLobby();
      return;
    }
    const p = this.world?.players.find((pl) => pl.slotId === slot.slotId);
    if (p) {
      p.botControlled = true;
      p.input = { ...NO_INPUT };
    }
    if (graceSeconds > 0) {
      slot.connected = false;
      slot.reservedUntil = this.t + graceSeconds;
    } else this.releaseSeat(slot);
    this.broadcastLobby();
  }
  /** A player who dropped (or reloaded) reclaims their seat; returns their alliance, or null if it is gone. */
  rejoin(playerId) {
    if (this.viewers.has(playerId)) {
      this.out(playerId, "welcome", { playerId, alliance: null, solo: this.solo });
      this.out(playerId, "lobby", this.lobbyView());
      return "viewer";
    }
    const slot = this.slots.find((s) => s.playerId === playerId);
    if (!slot) return null;
    slot.connected = true;
    slot.reservedUntil = null;
    const p = this.world?.players.find((pl) => pl.slotId === slot.slotId);
    if (p) {
      p.botControlled = false;
      p.input = { ...NO_INPUT };
    }
    this.out(playerId, "welcome", { playerId, alliance: slot.alliance, solo: this.solo });
    this.broadcastLobby();
    if (this.world) this.out(playerId, "match_start", this.snapshot(false));
    return slot.alliance;
  }
  /** the seat goes back to the bot that was already playing it, and others may take it over */
  releaseSeat(slot) {
    const p = this.world?.players.find((pl) => pl.slotId === slot.slotId);
    if (p) p.humanId = null;
    Object.assign(slot, {
      playerId: null,
      connected: false,
      ready: false,
      reservedUntil: null,
      name: slot.characterId ? CHARACTERS[slot.characterId].name : ""
    });
  }
  expireReservations() {
    let changed = false;
    for (const s of this.slots)
      if (s.reservedUntil !== null && this.t >= s.reservedUntil) {
        this.releaseSeat(s);
        changed = true;
      }
    if (changed) this.broadcastLobby();
  }
  handle(playerId, type, msg) {
    switch (type) {
      case "pick":
        return this.pick(playerId, msg.characterId);
      case "ready":
        return this.ready(playerId);
      case "input": {
        const p = this.world?.players.find((pl) => pl.humanId === playerId && !pl.botControlled);
        if (!p) return;
        const m = msg;
        const len = Math.hypot(m.mx, m.my);
        p.input = {
          mx: len > 1 ? m.mx / len : m.mx || 0,
          my: len > 1 ? m.my / len : m.my || 0,
          ax: Number.isFinite(m.ax) ? m.ax : void 0,
          ay: Number.isFinite(m.ay) ? m.ay : void 0,
          attack: !!m.attack,
          special: !!m.special
        };
        return;
      }
      case "ping": {
        const slot = this.slots.find((s) => s.playerId === playerId && s.connected);
        const me = slot && this.world?.players.find((pl) => pl.slotId === slot.slotId);
        if (!slot || !me) return;
        const m = msg;
        const from = CHARACTERS[me.def.id].name;
        for (const s of this.slots)
          if (s.playerId && s.connected && s.alliance === slot.alliance) this.out(s.playerId, "ping", { type: m.type, x: me.x, y: me.y, from, alliance: slot.alliance });
        return;
      }
    }
  }
  /** Any of the 8 netas can be picked; the pick decides which alliance the player plays for. */
  pick(playerId, characterId) {
    if (this.phase === "playing" || this.phase === "round_over") return this.takeOver(playerId, characterId);
    if (this.phase !== "lobby") return;
    let slot = this.slots.find((s) => s.playerId === playerId);
    const def = CHARACTERS[characterId];
    if (!slot || !def) return;
    if (this.slots.some((s) => s !== slot && s.characterId === characterId)) {
      this.out(playerId, "error", { message: `${def.name} is already taken.` });
      return;
    }
    if (def.alliance !== slot.alliance) {
      const seat = this.slots.find((s) => s.alliance === def.alliance && !s.playerId);
      if (!seat) {
        this.out(playerId, "error", { message: `${ALLIANCES[def.alliance].name} is full. Pick from your side.` });
        return;
      }
      Object.assign(seat, { playerId, name: slot.name, connected: true, ready: false });
      Object.assign(slot, { playerId: null, characterId: null, name: "", ready: false, connected: false });
      slot = seat;
      this.out(playerId, "welcome", { playerId, alliance: def.alliance, solo: this.solo });
    }
    slot.characterId = characterId;
    this.broadcastLobby();
  }
  /** A viewer of a running match takes over the bot playing the chosen character, in place. */
  takeOver(playerId, characterId) {
    const name = this.viewers.get(playerId);
    if (name === void 0) {
      this.out(playerId, "error", { message: "You are already playing. Leave the match to pick someone else." });
      return;
    }
    const slot = this.slots.find((s) => s.characterId === characterId);
    const def = CHARACTERS[characterId];
    if (!slot || !def) {
      this.out(playerId, "error", { message: "Unknown character." });
      return;
    }
    if (slot.playerId) {
      this.out(playerId, "error", { message: `${def.name} is being played by someone else.` });
      return;
    }
    const p = this.world.players.find((pl) => pl.slotId === slot.slotId);
    if (!p) return;
    this.viewers.delete(playerId);
    Object.assign(slot, { playerId, name, connected: true, ready: true, reservedUntil: null });
    p.humanId = playerId;
    p.botControlled = false;
    p.input = { ...NO_INPUT };
    p.bot.retreating = false;
    this.out(playerId, "welcome", { playerId, alliance: slot.alliance, solo: this.solo });
    this.broadcastLobby();
    this.out(playerId, "match_start", this.snapshot(false));
  }
  ready(playerId) {
    const slot = this.slots.find((s) => s.playerId === playerId);
    if (!slot || this.phase !== "lobby") return;
    slot.ready = true;
    const humans = this.slots.filter((s) => s.playerId && s.connected);
    if (humans.length > 0 && humans.every((s) => s.ready && s.characterId)) this.lobbyLeft = Math.min(this.lobbyLeft, 0.6);
    this.broadcastLobby();
  }
  lobbyView() {
    const slots = this.slots.map((s) => ({
      slotId: s.slotId,
      alliance: s.alliance,
      characterId: s.characterId,
      playerId: s.playerId,
      name: s.name,
      isBot: !s.playerId,
      ready: s.ready,
      reserved: s.reservedUntil !== null
    }));
    const inProgress = this.phase !== "lobby";
    return {
      secondsLeft: inProgress ? 0 : Math.max(0, this.lobbyLeft),
      total: this.lobbyTotal,
      slots,
      inProgress,
      round: this.round,
      score: { ...this.score }
    };
  }
  broadcastLobby() {
    this.out("*", "lobby", this.lobbyView());
  }
  /** Any seat still unpicked when the ring hits zero is filled by a bot. */
  fillWithBots() {
    for (const alliance of ALLIANCE_IDS) {
      const seats = this.slots.filter((s) => s.alliance === alliance);
      const free = () => charactersOf(alliance).filter((c) => !seats.some((s) => s.characterId === c.id));
      for (const s of seats.filter((x) => x.playerId && !x.characterId)) {
        const options = free();
        s.characterId = options[Math.floor(this.rng() * options.length)].id;
      }
      for (const s of seats.filter((x) => !x.characterId)) {
        const options = free();
        s.characterId = options[Math.floor(this.rng() * options.length)].id;
        s.name = CHARACTERS[s.characterId].name;
      }
    }
  }
  // ---------------- match ----------------
  startMatch() {
    this.fillWithBots();
    this.broadcastLobby();
    const players = this.slots.map((s) => {
      const def = CHARACTERS[s.characterId];
      return {
        id: s.slotId,
        slotId: s.slotId,
        // everyone is shown by their character's name, human or bot
        name: def.name,
        humanId: s.playerId,
        botControlled: !s.playerId || !s.connected,
        def,
        alliance: s.alliance,
        spawnIndex: s.index,
        x: 0,
        y: 0,
        fx: s.alliance === "rashtra_morcha" ? 1 : -1,
        fy: 0,
        hp: def.hp,
        alive: true,
        respawnIn: 0,
        attackCd: 0,
        specialCd: 0,
        shield: 0,
        shieldTtl: 0,
        stunTtl: 0,
        buffTtl: 0,
        dharnaTtl: 0,
        slowFactor: 1,
        hitSlowTtl: 0,
        recoilTtl: 0,
        dashTtl: 0,
        dashVx: 0,
        dashVy: 0,
        dashHit: /* @__PURE__ */ new Set(),
        input: { ...NO_INPUT },
        bot: { thinkIn: 0, input: { ...NO_INPUT }, jx: (this.rng() - 0.5) * 120, jy: (this.rng() - 0.5) * 160, detourSign: this.rng() < 0.5 ? 1 : -1, retreating: false },
        stats: { kills: 0, deaths: 0, damage: 0, captureSeconds: 0 },
        roundKills: 0,
        roundDeaths: 0
      };
    });
    this.world = {
      map: MAP,
      players,
      projectiles: [],
      guards: { rashtra_morcha: this.makeGuard("rashtra_morcha", null), jan_ekta: this.makeGuard("jan_ekta", null) },
      slowZones: [],
      hqCapture: { rashtra_morcha: 0, jan_ekta: 0 },
      booths: this.makeBooths(),
      votes: { rashtra_morcha: 0, jan_ekta: 0 },
      ruling: null,
      fx: [],
      nextId: 1,
      rng: this.rng
    };
    this.startRound();
    this.out("*", "match_start", this.snapshot());
  }
  makeBooths() {
    return ALLIANCE_IDS.flatMap(
      (home) => MAP.booths[home].map((b, i) => ({ id: `${home}-b${i + 1}`, home, x: b.x, y: b.y, r: b.r, owner: home, progress: 0, cd: 0 }))
    );
  }
  makeGuard(alliance, ruling) {
    const g = ruling === alliance ? GUARD_RULING : GUARD_BASE;
    const pos = MAP.guardPosts[alliance];
    return { alliance, x: pos.x, y: pos.y, hp: g.hp, maxHp: g.hp, alive: true, cd: 0, radius: g.radius, range: g.range, damage: g.damage };
  }
  startRound() {
    const w = this.world;
    this.round++;
    this.phase = "playing";
    this.timeLeft = this.roundSeconds;
    w.guards = { rashtra_morcha: this.makeGuard("rashtra_morcha", w.ruling), jan_ekta: this.makeGuard("jan_ekta", w.ruling) };
    w.projectiles = [];
    w.slowZones = [];
    w.hqCapture = { rashtra_morcha: 0, jan_ekta: 0 };
    w.booths = this.makeBooths();
    w.votes = { rashtra_morcha: 0, jan_ekta: 0 };
    for (const p of w.players) {
      const sp = MAP.spawns[p.alliance][p.spawnIndex];
      Object.assign(p, {
        x: sp.x,
        y: sp.y,
        hp: p.def.hp,
        alive: true,
        respawnIn: 0,
        attackCd: 0,
        specialCd: p.def.special.cooldown * 0.4,
        hitSlowTtl: 0,
        recoilTtl: 0,
        shield: 0,
        shieldTtl: 0,
        stunTtl: 0,
        buffTtl: 0,
        dharnaTtl: 0,
        dashTtl: 0,
        roundKills: 0,
        roundDeaths: 0,
        input: { ...NO_INPUT },
        fx: p.alliance === "rashtra_morcha" ? 1 : -1,
        fy: 0
      });
    }
  }
  endRound(winner, reason) {
    this.score[winner]++;
    this.world.ruling = winner;
    const msg = { round: this.round, winner, reason, score: { ...this.score } };
    this.out("*", "round_ended", msg);
    if (this.score[winner] >= ROUNDS_TO_WIN) {
      this.phase = "match_over";
      this.out("*", "snapshot", this.snapshot());
      this.out("*", "match_ended", this.results(winner));
    } else {
      this.phase = "round_over";
      this.intermissionLeft = this.intermission;
    }
  }
  results(winner) {
    const stats = this.world.players.map((p) => ({
      id: p.id,
      name: p.name,
      characterId: p.def.id,
      alliance: p.alliance,
      isBot: !p.humanId,
      kills: p.stats.kills,
      deaths: p.stats.deaths,
      damage: Math.round(p.stats.damage),
      captureSeconds: Math.round(p.stats.captureSeconds)
    }));
    const rate = (s) => s.kills * 120 + s.damage + s.captureSeconds * 15 - s.deaths * 40;
    const mvp = [...stats].sort((a, b) => rate(b) - rate(a))[0];
    return { winner, mvp: mvp.id, score: { ...this.score }, stats };
  }
  checkRoundEnd() {
    const w = this.world;
    for (const a of ALLIANCE_IDS) if (w.hqCapture[a] >= 1) return this.endRound(otherAlliance(a), "hq_captured");
    if (this.timeLeft > 0) return;
    const rm = Math.floor(w.votes.rashtra_morcha);
    const je = Math.floor(w.votes.jan_ekta);
    if (rm !== je) return this.endRound(rm > je ? "rashtra_morcha" : "jan_ekta", "votes");
    const bm = boothsHeld(w, "rashtra_morcha");
    const bj = boothsHeld(w, "jan_ekta");
    if (bm !== bj) return this.endRound(bm > bj ? "rashtra_morcha" : "jan_ekta", "votes");
    const tie = w.ruling ?? (w.hqCapture.jan_ekta >= w.hqCapture.rashtra_morcha ? "rashtra_morcha" : "jan_ekta");
    this.endRound(tie, "tiebreak");
  }
  update(dt) {
    this.t += dt;
    if (this.world) this.expireReservations();
    if (this.phase === "lobby") {
      this.lobbyLeft -= dt;
      this.lobbyAge += dt;
      const sec = Math.ceil(this.lobbyLeft);
      if (sec !== this.lastLobbySecond) {
        this.lastLobbySecond = sec;
        this.broadcastLobby();
      }
      if (this.lobbyLeft <= 0 && this.humanCount > 0) this.startMatch();
      return;
    }
    if (this.phase === "match_over") return;
    if (this.phase === "round_over") {
      this.intermissionLeft -= dt;
      if (this.intermissionLeft <= 0) this.startRound();
      return;
    }
    const w = this.world;
    this.timeLeft = Math.max(0, this.timeLeft - dt);
    for (const p of w.players) if (p.botControlled) thinkBot(w, p, this.difficulty, dt, this.timeLeft);
    for (const p of w.players) stepPlayer(w, p, dt);
    stepProjectiles(w, dt);
    stepGuards(w, dt);
    stepBooths(w, dt);
    stepSlowZones(w, dt);
    resolveCaptures(w, dt);
    this.checkRoundEnd();
  }
  /** `drainFx` false is for a one-off copy sent to a single player, so it does not swallow effects the others still need */
  snapshot(drainFx = true) {
    const w = this.world;
    const fxOut = drainFx ? w.fx : [];
    if (drainFx) w.fx = [];
    const ruling = w.ruling;
    return {
      t: this.t,
      phase: this.phase,
      round: this.round,
      timeLeft: this.timeLeft,
      score: { ...this.score },
      votes: { rashtra_morcha: Math.floor(w.votes.rashtra_morcha), jan_ekta: Math.floor(w.votes.jan_ekta) },
      ruling,
      players: w.players.map((p) => ({
        id: p.id,
        name: p.name,
        characterId: p.def.id,
        alliance: p.alliance,
        role: p.def.role,
        isBot: p.botControlled,
        x: Math.round(p.x * 10) / 10,
        y: Math.round(p.y * 10) / 10,
        fx: p.fx,
        fy: p.fy,
        hp: Math.ceil(p.hp),
        maxHp: p.def.hp,
        alive: p.alive,
        respawnIn: Math.max(0, p.respawnIn),
        attackCd: p.attackCd,
        specialCd: p.specialCd,
        shield: Math.ceil(p.shield),
        stunned: p.stunTtl > 0,
        slowed: p.slowFactor < 1,
        buffed: p.buffTtl > 0,
        dharna: p.dharnaTtl > 0,
        kills: p.stats.kills,
        deaths: p.stats.deaths
      })),
      projectiles: w.projectiles.map((pr) => ({ id: pr.id, x: Math.round(pr.x), y: Math.round(pr.y), alliance: pr.alliance, owner: pr.owner })),
      guards: ALLIANCE_IDS.map((a) => {
        const g = w.guards[a];
        return { alliance: a, x: g.x, y: g.y, hp: Math.ceil(g.hp), maxHp: g.maxHp, alive: g.alive };
      }),
      zones: {
        hqCapture: { ...w.hqCapture },
        booths: w.booths.map((b) => ({ id: b.id, x: b.x, y: b.y, r: b.r, home: b.home, owner: b.owner, progress: b.progress }))
      },
      slowZones: w.slowZones.map((z) => ({ id: z.id, x: z.x, y: z.y, r: z.r, alliance: z.alliance, ttl: z.ttl })),
      mediaVan: ruling ? { alliance: otherAlliance(ruling), ...MAP.mediaVan[otherAlliance(ruling)] } : null,
      fx: fxOut
    };
  }
  /** Slot id a human controls in the match (same as their PlayerView id). */
  characterOf(playerId) {
    return this.slots.find((s) => s.playerId === playerId)?.slotId ?? null;
  }
  /** test/balance hook: start an all-bot match immediately */
  startBotOnly() {
    this.startMatch();
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ALLIANCES,
  ALLIANCE_IDS,
  CHARACTERS,
  CHARACTER_IDS,
  DIFFICULTY,
  LEADS,
  LOBBY_SECONDS,
  MAP,
  MatchSim,
  ROUNDS_TO_WIN,
  ROUND_SECONDS,
  SNAPSHOT_HZ,
  TEAM_SIZE,
  TICK_HZ,
  charactersOf,
  otherAlliance
});
