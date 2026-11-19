// Server-authoritative combat: movement, attacks, specials, projectiles and
// guard posts. Runs identically in the Colyseus room and the solo worker.
import { otherAlliance } from '../characters';
import type { FxKind } from '../protocol';
import { lineClear } from './nav';
import {
  type Damageable,
  type SimGuard,
  type SimPlayer,
  type SimWorld,
  blocked,
  dist,
  dist2,
  inCircle,
  moveWithCollision,
  norm,
} from './state';

export const RESPAWN_SECONDS = 5;
export const KILL_VOTES = 3;
export const HQ_HEAL_PER_SEC = 14;
/** Grand Strategy: extra damage while buffed */
export const BUFF_DAMAGE = 0.18;
/** melee hits slow the target so a ranged character can't simply run away from the chase */
export const MELEE_HIT_SLOW = 0.35;
export const MELEE_HIT_SLOW_SECONDS = 1.0;
/** firing a projectile slows the shooter to this fraction of speed for a moment */
export const RECOIL_SPEED = 0.6;
export const RECOIL_SECONDS = 0.3;
const BOOTH_CRPF = { range: 175, cooldown: 1.0, homeDamage: 5, capturedDamage: 2 };

export function fx(world: SimWorld, kind: FxKind, x: number, y: number, r: number, alliance: SimPlayer['alliance'], tx?: number, ty?: number) {
  world.fx.push({ id: world.nextId++, kind, x, y, r, alliance, tx, ty });
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
    fx(world, 'ko', target.x, target.y, target.def.radius, target.alliance);
    if (source) {
      source.stats.kills++;
      source.roundKills++;
      world.votes[source.alliance] += KILL_VOTES;
    }
  }
}

export function damageGuard(world: SimWorld, g: SimGuard, amount: number, source: SimPlayer | null) {
  if (!g.alive) return;
  const dmg = source && source.buffTtl > 0 ? amount * (1 + BUFF_DAMAGE) : amount;
  g.hp -= dmg;
  if (source) source.stats.damage += dmg;
  if (g.hp <= 0) {
    g.hp = 0;
    g.alive = false;
    fx(world, 'ko', g.x, g.y, g.radius, g.alliance);
  }
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

function special(world: SimWorld, p: SimPlayer) {
  const s = p.def.special;
  p.specialCd = s.cooldown;
  switch (s.kind) {
    case 'dash': {
      const [dx, dy] = aimFor(world, p, s.radius);
      p.fx = dx;
      p.fy = dy;
      p.dashTtl = s.duration;
      p.dashVx = (dx * s.radius) / s.duration;
      p.dashVy = (dy * s.radius) / s.duration;
      p.dashHit = new Set();
      fx(world, 'dash', p.x, p.y, p.def.radius, p.alliance, dx, dy);
      break;
    }
    case 'buff_aura':
      for (const a of alliesOf(world, p)) if (inCircle(a.x, a.y, { x: p.x, y: p.y, r: s.radius })) a.buffTtl = s.duration;
      fx(world, 'buff', p.x, p.y, s.radius, p.alliance);
      break;
    case 'shield_aura':
      for (const a of alliesOf(world, p))
        if (inCircle(a.x, a.y, { x: p.x, y: p.y, r: s.radius })) {
          a.shield = s.power;
          a.shieldTtl = s.duration;
        }
      fx(world, 'shield', p.x, p.y, s.radius, p.alliance);
      break;
    case 'heal_aura':
      for (const a of alliesOf(world, p))
        if (inCircle(a.x, a.y, { x: p.x, y: p.y, r: s.radius })) a.hp = Math.min(a.def.hp, a.hp + s.power);
      fx(world, 'heal', p.x, p.y, s.radius, p.alliance);
      break;
    case 'slow_zone': {
      const [dx, dy] = aimFor(world, p, 260);
      const zx = p.x + dx * 120;
      const zy = p.y + dy * 120;
      world.slowZones.push({ id: world.nextId++, x: zx, y: zy, r: s.radius, alliance: p.alliance, ttl: s.duration, factor: 1 - s.power });
      fx(world, 'slow', zx, zy, s.radius, p.alliance);
      break;
    }
    case 'whirlwind':
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
      fx(world, 'whirlwind', p.x, p.y, s.radius, p.alliance);
      break;
    case 'stun_aura':
      for (const e of enemiesOf(world, p))
        if (dist(p.x, p.y, e.x, e.y) - e.def.radius <= s.radius && e.dharnaTtl <= 0) {
          e.stunTtl = s.duration;
          e.dashTtl = 0;
        }
      fx(world, 'stun', p.x, p.y, s.radius, p.alliance);
      break;
    case 'dharna':
      p.dharnaTtl = s.duration;
      fx(world, 'dharna', p.x, p.y, p.def.radius + 20, p.alliance);
      break;
  }
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
        fx(world, 'hit', e.x, e.y, e.def.radius, p.alliance);
      }
    }
    const g = world.guards[otherAlliance(p.alliance)];
    if (g.alive && !p.dashHit.has('guard') && dist(p.x, p.y, g.x, g.y) <= p.def.radius + g.radius + 12) {
      p.dashHit.add('guard');
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
      if (dist2(pr.x, pr.y, e.x, e.y) <= (e.def.radius + 6) ** 2) {
        damagePlayer(world, e, pr.damage, owner);
        fx(world, 'hit', e.x, e.y, e.def.radius, pr.alliance);
        hit = true;
        break;
      }
    }
    if (!hit) {
      const g = world.guards[otherAlliance(pr.alliance)];
      if (g.alive && dist2(pr.x, pr.y, g.x, g.y) <= (g.radius + 6) ** 2) {
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
