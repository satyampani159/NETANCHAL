// Server-authoritative combat: movement, attacks, specials, projectiles and
// guard posts. Runs identically in the Socket.io server and the solo worker.
import { otherAlliance } from '../characters';
import type { FxKind } from '../protocol';
import { lineClear } from './nav';
import {
  type Damageable,
  type SimGuard,
  type SimPending,
  type SimPlayer,
  type SimWorld,
  blocked,
  bump,
  dist,
  dist2,
  inCircle,
  moveWithCollision,
  norm,
} from './state';

export const RESPAWN_SECONDS = 5;
export const KILL_VOTES = 8;
/** a KO of someone defending their own booth or tower */
export const OBJECTIVE_KILL_VOTES = 12;
/**
 * Healing inside your own tower, as a fraction of max HP per second. A full bar takes about
 * 2.5 s, which is faster than dying and waiting for the respawn, so retreating always pays.
 */
export const HQ_HEAL_FRACTION_PER_SEC = 0.4;
/** a special's slowdown lasts this long */
const SPECIAL_SLOW_SECONDS = 3;
const ASSIST_WINDOW = 4;
/** melee hits slow the target so a ranged character can't simply run away from the chase */
export const MELEE_HIT_SLOW = 0.35;
export const MELEE_HIT_SLOW_SECONDS = 1.0;
/** firing a projectile slows the shooter to this fraction of speed for a moment */
export const RECOIL_SPEED = 0.6;
export const RECOIL_SECONDS = 0.3;
const BOOTH_CRPF = { range: 175, cooldown: 1.0, homeDamage: 4, capturedDamage: 2 };

export function fx(world: SimWorld, kind: FxKind, x: number, y: number, r: number, alliance: SimPlayer['alliance'], tx?: number, ty?: number, dur?: number) {
  world.fx.push({ id: world.nextId++, kind, x, y, r, alliance, tx, ty, dur });
}

export function enemiesOf(world: SimWorld, p: SimPlayer) {
  return world.players.filter((o) => o.alive && o.alliance !== p.alliance);
}

export function alliesOf(world: SimWorld, p: SimPlayer, includeSelf = true) {
  return world.players.filter((o) => o.alive && o.alliance === p.alliance && (includeSelf || o !== p));
}

/** Nearest damageable enemy (player or guard) within range of p. */
export function nearestTarget(world: SimWorld, p: SimPlayer, range: number, needLos = false): Damageable | null {
  let best: Damageable | null = null;
  let bestD = Infinity;
  for (const e of enemiesOf(world, p)) {
    const d = dist(p.x, p.y, e.x, e.y) - e.def.radius;
    if (d <= range && d < bestD && (!needLos || lineClear(world, p.x, p.y, e.x, e.y, 3))) {
      best = { kind: 'player', p: e };
      bestD = d;
    }
  }
  const g = world.guards[otherAlliance(p.alliance)];
  if (g.alive) {
    const d = dist(p.x, p.y, g.x, g.y) - g.radius;
    // players are preferred over the guard unless the guard is clearly closer
    if (d <= range && d + 40 < bestD && (!needLos || lineClear(world, p.x, p.y, g.x, g.y, 3))) best = { kind: 'guard', g };
  }
  return best;
}

export function targetPos(t: Damageable) {
  return t.kind === 'player' ? { x: t.p.x, y: t.p.y, r: t.p.def.radius } : { x: t.g.x, y: t.g.y, r: t.g.radius };
}

export function damagePlayer(world: SimWorld, target: SimPlayer, amount: number, source: SimPlayer | null) {
  if (!target.alive) return;
  let dmg = amount;
  if (target.braceTtl > 0) dmg *= 1 - target.braceFrac;
  target.hp -= dmg;
  if (source) {
    bump(source, 'damage', dmg);
    if (source !== target) target.hitBy[source.id] = ASSIST_WINDOW;
  }
  if (target.hp <= 0) {
    target.hp = 0;
    target.alive = false;
    target.respawnIn = RESPAWN_SECONDS;
    bump(target, 'deaths');
    target.roundDeaths++;
    cancelDash(target);
    target.braceTtl = 0;
    fx(world, 'ko', target.x, target.y, target.def.radius, target.alliance);
    if (source) {
      bump(source, 'kills');
      source.roundKills++;
      const defending = world.booths.some((b) => b.owner === target.alliance && inCircle(target.x, target.y, b)) || inCircle(target.x, target.y, world.map.hq[target.alliance]);
      world.votes[source.alliance] += (defending ? OBJECTIVE_KILL_VOTES : KILL_VOTES) * (world.counting ? 2 : 1);
    }
    // everyone else on the killer's side who hurt this player in the last few seconds gets an assist
    for (const q of world.players) {
      if (q === source || q.alliance === target.alliance) continue;
      if ((target.hitBy[q.id] ?? 0) > 0) bump(q, 'assists');
    }
    target.hitBy = {};
  }
}

export function damageGuard(world: SimWorld, g: SimGuard, amount: number, source: SimPlayer | null) {
  if (!g.alive) return;
  const dealt = Math.min(amount, g.hp);
  g.hp -= amount;
  if (source) {
    bump(source, 'damage', amount);
    bump(source, 'gateDamage', dealt);
  }
  if (g.hp <= 0) {
    g.hp = 0;
    g.alive = false;
    if (source) bump(source, 'gateBreaks');
    fx(world, 'ko', g.x, g.y, g.radius, g.alliance);
  }
}

function cancelDash(p: SimPlayer) {
  p.dashTtl = 0;
  p.dashThen = null;
}

function damage(world: SimWorld, t: Damageable, amount: number, source: SimPlayer) {
  if (t.kind === 'player') damagePlayer(world, t.p, amount, source);
  else damageGuard(world, t.g, amount, source);
}

function aimFor(world: SimWorld, p: SimPlayer, range: number): [number, number] {
  const { ax, ay } = p.input;
  if (ax !== undefined && ay !== undefined && (ax !== 0 || ay !== 0)) return norm(ax, ay);
  const t = nearestTarget(world, p, range * 1.2);
  if (t) {
    const tp = targetPos(t);
    const v = norm(tp.x - p.x, tp.y - p.y);
    if (v[0] || v[1]) return v;
  }
  return [p.fx, p.fy];
}

function basicAttack(world: SimWorld, p: SimPlayer) {
  const b = p.def.basic;
  const [dx, dy] = aimFor(world, p, b.range);
  p.fx = dx;
  p.fy = dy;
  p.attackCd = b.cooldown;
  if (b.kind === 'melee') {
    fx(world, 'melee', p.x + dx * b.range * 0.5, p.y + dy * b.range * 0.5, b.range * 0.6, p.alliance, dx, dy);
    const cosArc = Math.cos((75 * Math.PI) / 180);
    const hits: Damageable[] = enemiesOf(world, p).map((e) => ({ kind: 'player' as const, p: e }));
    const g = world.guards[otherAlliance(p.alliance)];
    if (g.alive) hits.push({ kind: 'guard', g });
    for (const t of hits) {
      const tp = targetPos(t);
      const d = dist(p.x, p.y, tp.x, tp.y);
      if (d - tp.r > b.range) continue;
      const [ux, uy] = norm(tp.x - p.x, tp.y - p.y);
      if (d > tp.r && ux * dx + uy * dy < cosArc) continue;
      damage(world, t, b.damage, p);
      if (t.kind === 'player') t.p.hitSlowTtl = MELEE_HIT_SLOW_SECONDS;
      fx(world, 'hit', tp.x, tp.y, tp.r, p.alliance);
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
      damage: b.damage,
    });
  }
}

/** Shoves `e` away from a point, stopping at walls. */
function shove(world: SimWorld, e: SimPlayer, fromX: number, fromY: number, px: number) {
  if (!e.alive || px <= 0) return;
  const [ux, uy] = norm(e.x - fromX, e.y - fromY);
  moveWithCollision(world, e, e.def.radius, ux * px, uy * px);
}

interface HitOptions {
  stun?: number;
  knock?: number;
}

/** Damages everything of the other party inside a circle, including the CRPF gate. */
function hitCircle(world: SimWorld, alliance: SimPlayer['alliance'], source: SimPlayer | null, cx: number, cy: number, r: number, dmg: number, opts: HitOptions = {}) {
  for (const e of world.players) {
    if (!e.alive || e.alliance === alliance) continue;
    if (dist(cx, cy, e.x, e.y) - e.def.radius > r) continue;
    damagePlayer(world, e, dmg, source);
    if (!e.alive) continue;
    if (opts.stun) {
      e.stunTtl = Math.max(e.stunTtl, opts.stun);
      cancelDash(e);
    }
    if (opts.knock) shove(world, e, cx, cy, opts.knock);
  }
  const g = world.guards[otherAlliance(alliance)];
  if (g.alive && dist(cx, cy, g.x, g.y) - g.radius <= r) damageGuard(world, g, dmg, source);
}

/** Damages everything of the other party in a cone in front of `p`. */
function hitCone(world: SimWorld, p: SimPlayer, dx: number, dy: number, reach: number, halfDeg: number, dmg: number) {
  const cos = Math.cos((halfDeg * Math.PI) / 180);
  const inCone = (x: number, y: number, r: number) => {
    const d = dist(p.x, p.y, x, y);
    if (d - r > reach) return false;
    if (d <= r + p.def.radius) return true;
    const [ux, uy] = norm(x - p.x, y - p.y);
    return ux * dx + uy * dy >= cos;
  };
  for (const e of enemiesOf(world, p)) if (inCone(e.x, e.y, e.def.radius)) damagePlayer(world, e, dmg, p);
  const g = world.guards[otherAlliance(p.alliance)];
  if (g.alive && inCone(g.x, g.y, g.radius)) damageGuard(world, g, dmg, p);
}

function special(world: SimWorld, p: SimPlayer) {
  const s = p.def.special;
  p.specialCd = s.cooldown;
  const [dx, dy] = aimFor(world, p, Math.max(s.range, s.radius, 200));
  p.fx = dx;
  p.fy = dy;
  switch (s.kind) {
    case 'cut_dash':
    case 'bulldozer': {
      p.dashTtl = s.duration;
      p.dashVx = (dx * s.range) / s.duration;
      p.dashVy = (dy * s.range) / s.duration;
      p.dashHit = new Set();
      if (s.kind === 'cut_dash') {
        // Vikas: no damage on the way, the giant scissors snap shut where he lands
        p.dashDamage = 0;
        p.dashRadius = 0;
        p.dashKnock = 0;
        p.dashThen = 'snip';
        fx(world, 'dash', p.x, p.y, p.def.radius, p.alliance, dx, dy);
      } else {
        // Kila: the bulldozer hurts and shoves everyone along the whole lane, and he takes less damage
        p.dashDamage = s.damage;
        p.dashRadius = s.radius;
        p.dashKnock = s.knock ?? 0;
        p.dashThen = null;
        p.braceTtl = s.duration + 0.2;
        p.braceFrac = s.brace ?? 0;
        fx(world, 'bulldoze', p.x, p.y, s.radius, p.alliance, p.x + dx * s.range, p.y + dy * s.range, s.duration);
      }
      break;
    }
    case 'volley': {
      const n = s.count ?? 5;
      p.recoilTtl = RECOIL_SECONDS;
      for (let i = 0; i < n; i++) {
        const a = ((n === 1 ? 0 : i / (n - 1) - 0.5) * 40 * Math.PI) / 180;
        const vx = dx * Math.cos(a) - dy * Math.sin(a);
        const vy = dx * Math.sin(a) + dy * Math.cos(a);
        world.projectiles.push({
          id: world.nextId++,
          ownerId: p.id,
          owner: p.def.id,
          alliance: p.alliance,
          x: p.x + vx * p.def.radius,
          y: p.y + vy * p.def.radius,
          vx: vx * 560,
          vy: vy * 560,
          travelled: 0,
          range: s.range,
          damage: s.damage,
          big: true,
        });
      }
      fx(world, 'volley', p.x, p.y, 0, p.alliance, dx, dy, 0.3);
      break;
    }
    case 'speed_wave': {
      for (const e of enemiesOf(world, p)) {
        const rx = e.x - p.x;
        const ry = e.y - p.y;
        const along = rx * dx + ry * dy;
        const across = Math.abs(rx * dy - ry * dx);
        if (along < -e.def.radius || along > s.range + e.def.radius || across > s.radius + e.def.radius) continue;
        damagePlayer(world, e, s.damage, p);
      }
      const g = world.guards[otherAlliance(p.alliance)];
      if (g.alive) {
        const along = (g.x - p.x) * dx + (g.y - p.y) * dy;
        const across = Math.abs((g.x - p.x) * dy - (g.y - p.y) * dx);
        if (along > 0 && along < s.range + g.radius && across < s.radius + g.radius) damageGuard(world, g, s.damage, p);
      }
      // the humps stay behind as a slow strip
      for (const t of [100, 200, 300]) {
        world.slowZones.push({ id: world.nextId++, x: p.x + dx * t, y: p.y + dy * t, r: s.radius + 16, alliance: p.alliance, ttl: s.duration || SPECIAL_SLOW_SECONDS, factor: 1 - (s.slow ?? 0.5) });
      }
      fx(world, 'speed_wave', p.x, p.y, s.radius, p.alliance, p.x + dx * s.range, p.y + dy * s.range, 0.5);
      break;
    }
    case 'fish_swing':
      hitCircle(world, p.alliance, p, p.x, p.y, s.radius, s.damage, { knock: s.knock });
      fx(world, 'fish', p.x, p.y, s.radius, p.alliance, dx, dy, 0.45);
      break;
    case 'lightning': {
      const targets = enemiesOf(world, p)
        .map((e) => ({ e, d: dist(p.x, p.y, e.x, e.y) }))
        .filter((t) => t.d <= s.range)
        .sort((a, b) => a.d - b.d)
        .slice(0, s.count ?? 3)
        .map((t) => ({ x: t.e.x, y: t.e.y }));
      // nobody in range: the bolt still falls ahead of him, so the button never does nothing
      if (targets.length === 0) targets.push({ x: p.x + dx * 240, y: p.y + dy * 240 });
      for (const t of targets) {
        world.pending.push({ id: world.nextId++, kind: 'lightning', ttl: s.duration, x: t.x, y: t.y, r: s.radius, damage: s.damage, stun: s.stun ?? 0, ownerId: p.id, alliance: p.alliance });
        fx(world, 'lightning', t.x, t.y, s.radius, p.alliance, undefined, undefined, s.duration);
      }
      break;
    }
    case 'book_slam': {
      const x = p.x + dx * s.range;
      const y = p.y + dy * s.range;
      world.pending.push({ id: world.nextId++, kind: 'book', ttl: s.duration, x, y, r: s.radius, damage: s.damage, stun: s.stun ?? 0, ownerId: p.id, alliance: p.alliance });
      fx(world, 'book', x, y, s.radius, p.alliance, dx, dy, s.duration);
      break;
    }
    case 'quake':
      hitCircle(world, p.alliance, p, p.x, p.y, s.radius, s.damage, { knock: s.knock });
      p.braceTtl = s.duration;
      p.braceFrac = s.brace ?? 0;
      fx(world, 'quake', p.x, p.y, s.radius, p.alliance, undefined, undefined, 0.5);
      break;
  }
}

/** Strikes that were announced a moment ago land now. */
export function stepPending(world: SimWorld, dt: number) {
  if (world.pending.length === 0) return;
  const keep: SimPending[] = [];
  for (const st of world.pending) {
    st.ttl -= dt;
    if (st.ttl > 0) {
      keep.push(st);
      continue;
    }
    const owner = world.players.find((pl) => pl.id === st.ownerId) ?? null;
    hitCircle(world, st.alliance, owner, st.x, st.y, st.r, st.damage, { stun: st.stun });
  }
  world.pending = keep;
}

export function respawnPoint(world: SimWorld, p: SimPlayer) {
  // From round 2 the opposition (non-ruling side) respawns at its media van.
  if (world.ruling && world.ruling !== p.alliance) {
    const v = world.map.mediaVan[p.alliance];
    return { x: v.x + ((p.spawnIndex % 2) * 2 - 1) * 30, y: v.y + (p.spawnIndex - 1.5) * 40 };
  }
  return world.map.spawns[p.alliance][p.spawnIndex % 4];
}

export function stepPlayer(world: SimWorld, p: SimPlayer, dt: number) {
  if (!p.alive) {
    p.respawnIn -= dt;
    if (p.respawnIn <= 0) {
      const sp = respawnPoint(world, p);
      p.x = sp.x;
      p.y = sp.y;
      p.hp = p.def.hp;
      p.alive = true;
      // a new life starts clean: specials are ready straight away instead of
      // resuming the cooldown the last life died with
      p.attackCd = 0;
      p.specialCd = 0;
      p.stunTtl = 0;
      p.braceTtl = 0;
      p.hitSlowTtl = 0;
      p.recoilTtl = 0;
      p.slowFactor = 1;
      cancelDash(p);
      p.input = { mx: 0, my: 0, attack: false, special: false };
    }
    return;
  }

  p.attackCd = Math.max(0, p.attackCd - dt);
  p.specialCd = Math.max(0, p.specialCd - dt);
  p.braceTtl = Math.max(0, p.braceTtl - dt);
  p.hitSlowTtl = Math.max(0, p.hitSlowTtl - dt);
  p.recoilTtl = Math.max(0, p.recoilTtl - dt);
  p.healFxCd = Math.max(0, p.healFxCd - dt);
  for (const k in p.hitBy) {
    p.hitBy[k] -= dt;
    if (p.hitBy[k] <= 0) delete p.hitBy[k];
  }

  if (p.hp < p.def.hp && inCircle(p.x, p.y, world.map.hq[p.alliance])) {
    p.hp = Math.min(p.def.hp, p.hp + p.def.hp * HQ_HEAL_FRACTION_PER_SEC * dt);
    if (p.healFxCd <= 0) {
      p.healFxCd = 0.6;
      fx(world, 'heal', p.x, p.y, p.def.radius + 14, p.alliance);
    }
  }

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
    if (p.dashDamage > 0) {
      // the bulldozer: everything it touches along the lane is hurt once and shoved aside
      const reach = p.dashRadius || p.def.radius + 12;
      for (const e of enemiesOf(world, p)) {
        if (p.dashHit.has(e.id)) continue;
        if (dist2(p.x, p.y, e.x, e.y) <= (reach + e.def.radius) ** 2) {
          p.dashHit.add(e.id);
          damagePlayer(world, e, p.dashDamage, p);
          shove(world, e, p.x - p.fx * 20, p.y - p.fy * 20, p.dashKnock);
          fx(world, 'hit', e.x, e.y, e.def.radius, p.alliance);
        }
      }
      const g = world.guards[otherAlliance(p.alliance)];
      if (g.alive && !p.dashHit.has('guard') && dist(p.x, p.y, g.x, g.y) <= reach + g.radius) {
        p.dashHit.add('guard');
        damageGuard(world, g, p.dashDamage, p);
      }
    }
    // the scissors snap shut where the dash ends
    if (p.dashTtl <= 0 && p.dashThen === 'snip') {
      p.dashThen = null;
      const sp = p.def.special;
      hitCone(world, p, p.fx, p.fy, sp.radius, 70, sp.damage);
      fx(world, 'cut', p.x, p.y, sp.radius, p.alliance, p.fx, p.fy, 0.4);
    }
    return;
  }

  const { mx, my } = p.input;
  const len = Math.hypot(mx, my);
  if (len > 0.05) {
    const k = Math.min(1, len) / len;
    const speed = p.def.speed * p.slowFactor;
    moveWithCollision(world, p, p.def.radius, mx * k * speed * dt, my * k * speed * dt);
    p.fx = mx / len;
    p.fy = my / len;
  }

  if (p.input.special && p.specialCd <= 0) special(world, p);
  if (p.input.attack && p.attackCd <= 0) basicAttack(world, p);
}

export function stepProjectiles(world: SimWorld, dt: number) {
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
      if (dist2(pr.x, pr.y, e.x, e.y) <= (e.def.radius + (pr.big ? 14 : 6)) ** 2) {
        damagePlayer(world, e, pr.damage, owner);
        fx(world, 'hit', e.x, e.y, e.def.radius, pr.alliance);
        hit = true;
        break;
      }
    }
    if (!hit) {
      const g = world.guards[otherAlliance(pr.alliance)];
      if (g.alive && dist2(pr.x, pr.y, g.x, g.y) <= (g.radius + (pr.big ? 14 : 6)) ** 2) {
        damageGuard(world, g, pr.damage, owner);
        fx(world, 'hit', g.x, g.y, g.radius, pr.alliance);
        hit = true;
      }
    }
    if (!hit) keep.push(pr);
  }
  world.projectiles = keep;
}

export function stepGuards(world: SimWorld, dt: number) {
  for (const g of Object.values(world.guards)) {
    if (!g.alive) continue;
    g.cd -= dt;
    if (g.cd > 0) continue;
    let target: SimPlayer | null = null;
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
      fx(world, 'guard_shot', g.x, g.y, 0, g.alliance, target.x, target.y);
      damagePlayer(world, target, g.damage, null);
    }
  }
}

/**
 * CRPF posts at every vote booth. They shoot enemies of the booth's current
 * owner: hard while it is still in its home party's hands, only lightly once
 * it has been captured.
 */
export function stepBooths(world: SimWorld, dt: number) {
  for (const b of world.booths) {
    b.cd -= dt;
    if (b.cd > 0) continue;
    let target: SimPlayer | null = null;
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
    fx(world, 'guard_shot', b.x, b.y - 24, 0, b.owner, target.x, target.y);
    damagePlayer(world, target, b.owner === b.home ? BOOTH_CRPF.homeDamage : BOOTH_CRPF.capturedDamage, null);
  }
}

export function stepSlowZones(world: SimWorld, dt: number) {
  for (const z of world.slowZones) z.ttl -= dt;
  world.slowZones = world.slowZones.filter((z) => z.ttl > 0);
}
