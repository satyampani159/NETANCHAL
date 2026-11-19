// Tower capture (the round-winning objective) and vote-booth capture.
import { ALLIANCE_IDS, type AllianceId, otherAlliance } from '../characters';
import { type SimWorld, bump, inCircle } from './state';

const HQ_BASE_RATE = 0.09; // progress / second with one attacker
const HQ_EXTRA_RATE = 0.04; // per extra attacker, capped at 3
const HQ_DEFEND_DRAIN = 0.12;
const HQ_IDLE_DRAIN = 0.025;

const BOOTH_RATE = 0.42; // ~2.4s for one capturer, faster with more
const BOOTH_EXTRA = 0.4; // +40% per extra capturer, capped at 3
const BOOTH_DEFEND_DRAIN = 0.3;
const BOOTH_IDLE_DRAIN = 0.05;
/** one-off votes when a booth flips, on top of the trickle */
/** a flip pays BASE up to BASE + RANGE, depending on how deep into the other party's territory the booth is */
export const FLIP_BASE = 15;
export const FLIP_RANGE = 55;
/** later flips of the same booth in a round pay a shrinking share */
const REPEAT_FLIP_SHARE = [1, 0.6, 0.35, 0.2, 0.1];
/** seconds a freshly captured booth is harder to take back */
const SHIELD_SECONDS = 8;
const SHIELD_SPEED = 0.4;
/** holding all three of the other party's booths at once, paid once a round */
export const SWEEP_BONUS = 80;
/** how much of the normal speed a capture keeps while the other side has people in the circle but fewer */
const CONTESTED_SPEED = 0.25;
/** a party this many votes behind captures a little faster */
const HOLD_RAMP_SECONDS = 60;
const COMEBACK_GAP = 30;
const COMEBACK_SPEED = 1.5;
/** votes per second per unit of tower progress, paid to the side pushing the tower */
const TOWER_PRESSURE_VOTES = 3;
/** votes per second for every booth a party holds, home or captured */
export const BOOTH_VOTES_PER_SEC = 0.12;

function presence(world: SimWorld, zone: { x: number; y: number; r: number }, alliance: AllianceId) {
  let n = 0;
  for (const p of world.players) {
    if (!p.alive || p.alliance !== alliance || !inCircle(p.x, p.y, zone)) continue;
    n += 1;
  }
  return n;
}

/** has this party taken all three of the other party's booths? */
export const holdsSweep = (world: SimWorld, alliance: AllianceId) => world.booths.filter((b) => b.home !== alliance).every((b) => b.owner === alliance);

/** 0 at the capturer's own tower, 1 at the enemy tower (clamped), measured to the booth */
export function depthFor(world: SimWorld, b: { x: number; y: number }, taker: AllianceId) {
  const mine = world.map.hq[taker];
  const theirs = world.map.hq[otherAlliance(taker)];
  const gap = Math.hypot(theirs.x - mine.x, theirs.y - mine.y) || 1;
  const d = Math.hypot(b.x - mine.x, b.y - mine.y) / gap;
  return Math.min(1, Math.max(0, (d - 0.25) / 0.55));
}

/** votes for flipping this booth: more the deeper it is in enemy territory, less for repeat flips */
export function flipValue(world: SimWorld, b: { x: number; y: number; flips: number }, taker: AllianceId) {
  const base = FLIP_BASE + FLIP_RANGE * depthFor(world, b, taker);
  return base * REPEAT_FLIP_SHARE[Math.min(b.flips, REPEAT_FLIP_SHARE.length - 1)] * (world.counting ? 2 : 1);
}

export const boothsHeld = (world: SimWorld, alliance: AllianceId) => world.booths.filter((b) => b.owner === alliance).length;

export function resolveCaptures(world: SimWorld, dt: number) {
  for (const owner of ALLIANCE_IDS) {
    const zone = world.map.hq[owner];
    const attackers = presence(world, zone, otherAlliance(owner));
    const defenders = presence(world, zone, owner);
    // the CRPF gate has to fall before the tower can be taken
    const gated = world.guards[owner].alive;
    let progress = world.hqCapture[owner];
    if (attackers > 0 && defenders === 0 && !gated) {
      progress += dt * (HQ_BASE_RATE + HQ_EXTRA_RATE * (Math.min(attackers, 3) - 1)) * (holdsSweep(world, otherAlliance(owner)) ? 1.25 : 1);
      for (const p of world.players)
        if (p.alive && p.alliance !== owner && inCircle(p.x, p.y, zone)) bump(p, 'captureSeconds', dt);
    } else if (defenders > 0 && attackers === 0) progress -= dt * HQ_DEFEND_DRAIN;
    else if (attackers === 0) progress -= dt * HQ_IDLE_DRAIN;
    world.hqCapture[owner] = Math.max(0, Math.min(1, progress));
    // pushing the tower pays even before it falls
    if (world.hqCapture[owner] > 0.03) world.votes[otherAlliance(owner)] += dt * TOWER_PRESSURE_VOTES * world.hqCapture[owner];
  }

  for (const b of world.booths) {
    const taker = otherAlliance(b.owner);
    const attackers = presence(world, b, taker);
    const defenders = presence(world, b, b.owner);
    const behind = world.votes[otherAlliance(b.owner)] + COMEBACK_GAP < world.votes[b.owner];
    const speed = BOOTH_RATE * (1 + BOOTH_EXTRA * (Math.min(attackers, 3) - 1)) * (behind ? COMEBACK_SPEED : 1) * (b.shield > 0 ? SHIELD_SPEED : 1);
    b.shield = Math.max(0, b.shield - dt);
    if (attackers > 0 && (defenders === 0 || attackers > defenders)) {
      // a lone defender slows a bigger attacking group down rather than stopping it
      b.progress += dt * speed * (defenders === 0 ? 1 : CONTESTED_SPEED);
      for (const p of world.players) if (p.alive && p.alliance === taker && inCircle(p.x, p.y, b)) bump(p, 'captureSeconds', dt);
    } else if (defenders > 0 && attackers === 0) b.progress -= dt * BOOTH_DEFEND_DRAIN;
    else if (attackers === 0) b.progress -= dt * BOOTH_IDLE_DRAIN;
    b.progress = Math.max(0, Math.min(1, b.progress));
    if (b.progress >= 1) {
      for (const p of world.players) if (p.alive && p.alliance === taker && inCircle(p.x, p.y, b)) bump(p, 'boothFlips');
      b.owner = taker;
      b.heldFor = 0;
      b.progress = 0;
      b.cd = 1;
      const value = Math.round(flipValue(world, b, taker));
      world.votes[taker] += value;
      b.flips++;
      b.shield = SHIELD_SECONDS;
      world.fx.push({ id: world.nextId++, kind: 'booth_flip', x: b.x, y: b.y, r: b.r, alliance: taker, value, retake: taker === b.home });
      if (!world.sweepPaid[taker] && holdsSweep(world, taker)) {
        world.sweepPaid[taker] = true;
        world.votes[taker] += SWEEP_BONUS;
        world.fx.push({ id: world.nextId++, kind: 'sweep', x: b.x, y: b.y, r: 120, alliance: taker });
      }
    }
    // a booth you keep pays more and more, up to double after a minute
    b.heldFor += dt;
    world.votes[b.owner] += dt * BOOTH_VOTES_PER_SEC * (1 + Math.min(1, b.heldFor / HOLD_RAMP_SECONDS));
  }
}
