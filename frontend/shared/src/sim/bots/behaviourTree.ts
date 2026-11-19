// One behaviour-tree module, two hosts: the solo Web Worker and the Colyseus
// room both call `thinkBot` for every bot-controlled character.
import { otherAlliance } from '../../characters';
import type { InputMsg } from '../../protocol';
import { alliesOf, enemiesOf, nearestTarget, targetPos } from '../combat';
import { nextWaypoint } from '../nav';
import { type SimBooth, type SimPlayer, type SimWorld, blocked, dist, inCircle, norm } from '../state';

export type Difficulty = 'easy' | 'normal' | 'hard';

export const DIFFICULTY: Record<Difficulty, { thinkEvery: number; aimJitter: number; specialChance: number; retreatAt: number }> = {
  easy: { thinkEvery: 0.45, aimJitter: 0.45, specialChance: 0.35, retreatAt: 0.15 },
  normal: { thinkEvery: 0.25, aimJitter: 0.18, specialChance: 0.7, retreatAt: 0.3 },
  hard: { thinkEvery: 0.12, aimJitter: 0.05, specialChance: 1, retreatAt: 0.35 },
};

type Status = 'success' | 'failure';

const DEFENDER_LEASH = 700;

interface Ctx {
  world: SimWorld;
  me: SimPlayer;
  out: InputMsg;
  diff: (typeof DIFFICULTY)[Difficulty];
  roundTimeLeft: number;
}

type Node = (ctx: Ctx) => Status;

const selector =
  (...children: Node[]): Node =>
  (ctx) => {
    for (const c of children) if (c(ctx) === 'success') return 'success';
    return 'failure';
  };

const sequence =
  (...children: Node[]): Node =>
  (ctx) => {
    for (const c of children) if (c(ctx) === 'failure') return 'failure';
    return 'success';
  };

const condition =
  (fn: (ctx: Ctx) => boolean): Node =>
  (ctx) =>
    fn(ctx) ? 'success' : 'failure';

const action =
  (fn: (ctx: Ctx) => void): Node =>
  (ctx) => {
    fn(ctx);
    return 'success';
  };

// ---------- steering ----------

function steerTo(ctx: Ctx, tx: number, ty: number, stopAt = 8) {
  const { me, world } = ctx;
  const d = dist(me.x, me.y, tx, ty);
  if (d <= stopAt) {
    ctx.out.mx = 0;
    ctx.out.my = 0;
    return;
  }
  // big obstacles (India Gate, autos, barricades): follow an A* path around them
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
  // small clutter: probe ahead and slide around it
  const probe = me.def.radius + 34;
  if (blocked(world, me.x + dx * probe, me.y + dy * probe, me.def.radius)) {
    const s = me.bot.detourSign;
    for (const deg of [35, 60, 90, 120, -35, -60, -90]) {
      const a = (deg * s * Math.PI) / 180;
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

function aimAt(ctx: Ctx, tx: number, ty: number) {
  const j = ctx.diff.aimJitter;
  const [dx, dy] = norm(tx - ctx.me.x, ty - ctx.me.y);
  const a = (ctx.world.rng() - 0.5) * 2 * j;
  ctx.out.ax = dx * Math.cos(a) - dy * Math.sin(a);
  ctx.out.ay = dx * Math.sin(a) + dy * Math.cos(a);
}

// ---------- queries ----------

const hpRatio = (p: SimPlayer) => p.hp / p.def.hp;

function enemiesWithin(ctx: Ctx, r: number) {
  return enemiesOf(ctx.world, ctx.me).filter((e) => dist(ctx.me.x, ctx.me.y, e.x, e.y) - e.def.radius <= r);
}

function alliesWithin(ctx: Ctx, r: number) {
  return alliesOf(ctx.world, ctx.me).filter((a) => dist(ctx.me.x, ctx.me.y, a.x, a.y) <= r);
}

function specialUseful(ctx: Ctx): boolean {
  const s = ctx.me.def.special;
  switch (s.kind) {
    case 'dash': {
      const t = nearestTarget(ctx.world, ctx.me, s.radius * 0.9);
      if (!t) return false;
      const tp = targetPos(t);
      return dist(ctx.me.x, ctx.me.y, tp.x, tp.y) > 70;
    }
    case 'buff_aura':
      return alliesWithin(ctx, s.radius).length >= 2 && enemiesWithin(ctx, 360).length > 0;
    case 'shield_aura':
      return enemiesWithin(ctx, 300).length > 0 && (alliesWithin(ctx, s.radius).length >= 2 || hpRatio(ctx.me) < 0.6);
    case 'heal_aura':
      return alliesWithin(ctx, s.radius).some((a) => a.def.hp - a.hp >= s.power * 0.8);
    case 'slow_zone':
      return enemiesWithin(ctx, 240).length > 0;
    case 'whirlwind':
      return enemiesWithin(ctx, s.radius).length > 0;
    case 'stun_aura':
      return enemiesWithin(ctx, s.radius).length >= (ctx.diff.specialChance >= 1 ? 1 : 2) || (enemiesWithin(ctx, s.radius).length > 0 && hpRatio(ctx.me) < 0.5);
    case 'dharna': {
      const inZone =
        inCircle(ctx.me.x, ctx.me.y, ctx.world.map.hq[ctx.me.alliance]) ||
        ctx.world.booths.some((b) => inCircle(ctx.me.x, ctx.me.y, b)) ||
        inCircle(ctx.me.x, ctx.me.y, ctx.world.map.hq[otherAlliance(ctx.me.alliance)]);
      return inZone && enemiesWithin(ctx, 220).length > 0;
    }
  }
}

// ---------- behaviours ----------

const engageNearest = (aggro: number): Node =>
  sequence(
    condition((ctx) => nearestTarget(ctx.world, ctx.me, ctx.me.def.basic.range + aggro, true) !== null),
    action((ctx) => {
      const t = nearestTarget(ctx.world, ctx.me, ctx.me.def.basic.range + aggro, true)!;
      const tp = targetPos(t);
      const range = ctx.me.def.basic.range;
      const d = dist(ctx.me.x, ctx.me.y, tp.x, tp.y) - tp.r;
      aimAt(ctx, tp.x, tp.y);
      // ranged characters kite at ~80% range; melee walks in
      const want = ctx.me.def.basic.kind === 'projectile' ? range * 0.75 : range * 0.6;
      if (d > want) steerTo(ctx, tp.x + ctx.me.bot.jx * 0.3, tp.y + ctx.me.bot.jy * 0.3);
      else if (ctx.me.def.basic.kind === 'projectile' && d < range * 0.4) {
        const [ax, ay] = norm(ctx.me.x - tp.x, ctx.me.y - tp.y);
        steerTo(ctx, ctx.me.x + ax * 80, ctx.me.y + ay * 80);
      } else {
        ctx.out.mx = 0;
        ctx.out.my = 0;
      }
      ctx.out.attack = d <= range;
    }),
  );

const retreat: Node = sequence(
  condition((ctx) => {
    // hysteresis: once a bot heads home it stays until mostly healed
    const me = ctx.me;
    if (me.def.role === 'defender') return false;
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
  }),
);

const useSpecial: Node = sequence(
  condition((ctx) => ctx.me.specialCd <= 0 && ctx.world.rng() < ctx.diff.specialChance && specialUseful(ctx)),
  action((ctx) => {
    ctx.out.special = true;
    const t = nearestTarget(ctx.world, ctx.me, 400);
    if (t) {
      const tp = targetPos(t);
      aimAt(ctx, tp.x, tp.y);
    }
  }),
);

function pushEnemyHq(ctx: Ctx) {
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

const nearestBooth = (ctx: Ctx, list: SimBooth[]) =>
  list.reduce<SimBooth | null>((best, b) => (!best || dist(ctx.me.x, ctx.me.y, b.x, b.y) < dist(ctx.me.x, ctx.me.y, best.x, best.y) ? b : best), null);

function goToBooth(ctx: Ctx, b: SimBooth) {
  steerTo(ctx, b.x + ctx.me.bot.jx * 0.25, b.y + ctx.me.bot.jy * 0.25, 18);
}

/** booths of mine that are being taken or already lost, closest to this bot first */
function boothsToDefend(ctx: Ctx) {
  const { world, me } = ctx;
  return world.booths.filter((b) => (b.home === me.alliance && b.owner !== me.alliance) || (b.owner === me.alliance && b.progress > 0.12));
}

const objective: Node = action((ctx) => {
  const { world, me } = ctx;
  const enemy = otherAlliance(me.alliance);
  const myHq = world.map.hq[me.alliance];
  const behind = world.votes[me.alliance] < world.votes[enemy];
  const lateGame = ctx.roundTimeLeft < 45;

  // the home tower is being taken: everyone nearby goes back
  if (world.hqCapture[me.alliance] > 0.15 && dist(me.x, me.y, myHq.x, myHq.y) < 900) {
    steerTo(ctx, myHq.x + me.bot.jx * 0.5, myHq.y + me.bot.jy * 0.5, 20);
    return;
  }

  const enemyHeld = world.booths.filter((b) => b.owner !== me.alliance);
  const capturedByUs = world.booths.filter((b) => b.home !== me.alliance && b.owner === me.alliance).length;

  switch (me.def.role) {
    case 'attacker': {
      // take a booth first, then go for the tower once one is ours or a third of the round has gone
      const wantTower = capturedByUs >= 1 || ctx.roundTimeLeft < 100 || enemyHeld.length === 0;
      if (wantTower) return pushEnemyHq(ctx);
      const b = nearestBooth(ctx, enemyHeld);
      return b ? goToBooth(ctx, b) : pushEnemyHq(ctx);
    }
    case 'helper': {
      const defend = nearestBooth(ctx, boothsToDefend(ctx));
      if (defend && dist(me.x, me.y, defend.x, defend.y) < 900) return goToBooth(ctx, defend);
      // the two helpers split the enemy booths between them instead of piling onto one
      // second half of the round: with nothing of ours under threat, help break their gate
      if (ctx.roundTimeLeft < 70 && !defend) return pushEnemyHq(ctx);
      const byDistance = [...enemyHeld].sort((a, c) => dist(me.x, me.y, a.x, a.y) - dist(me.x, me.y, c.x, c.y));
      if (byDistance.length) return goToBooth(ctx, byDistance[Math.min(me.spawnIndex % 2, byDistance.length - 1)]);
      if (ctx.roundTimeLeft < 70 || (lateGame && behind)) return pushEnemyHq(ctx);
      const home = nearestBooth(ctx, world.booths.filter((b) => b.owner === me.alliance));
      return home ? goToBooth(ctx, home) : pushEnemyHq(ctx);
    }
    case 'defender': {
      // sit on the CRPF gate; step out to retake a booth only when it is close to the tower
      const lost = nearestBooth(ctx, boothsToDefend(ctx));
      if (lost && dist(lost.x, lost.y, myHq.x, myHq.y) < 650) return goToBooth(ctx, lost);
      const post = world.map.guardPosts[me.alliance];
      const dir = me.alliance === 'rashtra_morcha' ? 1 : -1;
      steerTo(ctx, post.x + dir * 60 + me.bot.jx * 0.4, post.y + me.bot.jy * 0.6, 30);
      return;
    }
  }
});

/** Last minute: stop trading blows in the middle and march on the enemy tower, shooting only what is in reach. */
const siege: Node = sequence(
  condition((ctx) => ctx.me.def.role !== 'defender' && ctx.roundTimeLeft < 75 && world_hasTowerChance(ctx)),
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
  }),
);

/** a siege only makes sense while our own tower is not the one in trouble */
function world_hasTowerChance(ctx: Ctx) {
  return ctx.world.hqCapture[ctx.me.alliance] < 0.15;
}

/**
 * Once inside an enemy booth, stay and capture it. Fight back only against
 * enemies that are actually in reach; do not chase anyone out of the circle.
 */
const holdBooth: Node = sequence(
  condition((ctx) => ctx.me.def.role !== 'defender' && ctx.world.booths.some((b) => b.owner !== ctx.me.alliance && inCircle(ctx.me.x, ctx.me.y, b))),
  action((ctx) => {
    const b = ctx.world.booths.find((x) => x.owner !== ctx.me.alliance && inCircle(ctx.me.x, ctx.me.y, x))!;
    const t = nearestTarget(ctx.world, ctx.me, ctx.me.def.basic.range, true);
    if (t) {
      const tp = targetPos(t);
      aimAt(ctx, tp.x, tp.y);
      ctx.out.attack = true;
    }
    // drift to the middle of the booth so the capture keeps ticking
    steerTo(ctx, b.x, b.y, 30);
  }),
);

const root: Node = selector(
  retreat,
  sequence(useSpecial, selector(engageNearest(220), action(() => {}))),
  siege,
  holdBooth,
  sequence(
    condition((ctx) => ctx.me.def.role === 'defender'),
    // defenders are leashed to their gate: they never get kited into the chowk
    condition((ctx) => {
      const t = nearestTarget(ctx.world, ctx.me, ctx.me.def.basic.range + 260, true);
      if (!t) return false;
      const tp = targetPos(t);
      const post = ctx.world.map.guardPosts[ctx.me.alliance];
      return dist(tp.x, tp.y, post.x, post.y) < DEFENDER_LEASH;
    }),
    engageNearest(260),
  ),
  sequence(condition((ctx) => ctx.me.def.role !== 'defender'), engageNearest(170)),
  objective,
);

export function thinkBot(world: SimWorld, me: SimPlayer, difficulty: Difficulty, dt: number, roundTimeLeft: number): void {
  if (!me.alive) {
    me.input = { mx: 0, my: 0, attack: false, special: false };
    return;
  }
  me.bot.thinkIn -= dt;
  if (me.bot.thinkIn > 0) {
    // keep moving between decisions, but specials fire once
    me.input = { ...me.bot.input, special: false };
    return;
  }
  const diff = DIFFICULTY[difficulty];
  me.bot.thinkIn = diff.thinkEvery * (0.75 + world.rng() * 0.5);
  const ctx: Ctx = { world, me, diff, roundTimeLeft, out: { mx: 0, my: 0, attack: false, special: false } };
  root(ctx);
  me.bot.input = ctx.out;
  me.input = ctx.out;
}
