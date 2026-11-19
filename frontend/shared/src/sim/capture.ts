// Tower capture (the round-winning objective) and vote-booth capture.
import { ALLIANCE_IDS, type AllianceId, otherAlliance } from '../characters';
import { type SimWorld, inCircle } from './state';

const HQ_BASE_RATE = 0.09; // progress / second with one attacker
const HQ_EXTRA_RATE = 0.04; // per extra attacker, capped at 3
const HQ_DEFEND_DRAIN = 0.12;
const HQ_IDLE_DRAIN = 0.025;

const BOOTH_RATE = 0.28; // ~3.5s for one capturer, faster with more
const BOOTH_EXTRA = 0.4; // +40% per extra capturer, capped at 3
const BOOTH_DEFEND_DRAIN = 0.3;
const BOOTH_IDLE_DRAIN = 0.05;
/** one-off votes when a booth flips, on top of the trickle */
export const BOOTH_CAPTURE_BONUS = 20;
/** votes per second for every booth a party holds, home or captured */
export const BOOTH_VOTES_PER_SEC = 0.6;

function presence(world: SimWorld, zone: { x: number; y: number; r: number }, alliance: AllianceId) {
  let n = 0;
  for (const p of world.players) {
    if (!p.alive || p.alliance !== alliance || !inCircle(p.x, p.y, zone)) continue;
    n += p.dharnaTtl > 0 ? 2 : 1;
  }
  return n;
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
      world.fx.push({ id: world.nextId++, kind: 'booth_flip', x: b.x, y: b.y, r: b.r, alliance: taker });
    }
    world.votes[b.owner] += dt * BOOTH_VOTES_PER_SEC;
  }
}
