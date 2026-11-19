import type { AllianceId, CharacterDef, CharacterId } from '../characters';
import type { FxEvent, InputMsg, PlayerTally } from '../protocol';
import type { MapDef, Rect } from '../map';

export interface BotMemory {
  thinkIn: number;
  input: InputMsg;
  /** small per-bot offset so bots don't stack on the exact same point */
  jx: number;
  jy: number;
  detourSign: 1 | -1;
  retreating: boolean;
}

export interface SimPlayer {
  id: string;
  slotId: string;
  name: string;
  /** the human who owns this slot; null for a pure bot */
  humanId: string | null;
  /** true while a bot drives this character (pure bot, or a human who dropped) */
  botControlled: boolean;
  def: CharacterDef;
  alliance: AllianceId;
  spawnIndex: number;
  x: number;
  y: number;
  fx: number;
  fy: number;
  hp: number;
  alive: boolean;
  respawnIn: number;
  attackCd: number;
  specialCd: number;
  stunTtl: number;
  /** damage reduction while a special's defence is active (Kila's bulldozer, Dharna's quake) */
  braceTtl: number;
  braceFrac: number;
  slowFactor: number;
  /** seconds left of a melee-hit slow (stacks with slow zones by taking the stronger) */
  hitSlowTtl: number;
  /** brief slowdown after firing a projectile, so kiting costs distance */
  recoilTtl: number;
  dashTtl: number;
  dashVx: number;
  dashVy: number;
  dashHit: Set<string>;
  /** what a dash does to people it touches (0 damage = nothing; Vikas's scissors snap at the end instead) */
  dashDamage: number;
  dashRadius: number;
  dashKnock: number;
  /** something to trigger when the dash ends */
  dashThen: 'snip' | null;
  /** throttles the green effect while healing at the tower */
  healFxCd: number;
  input: InputMsg;
  bot: BotMemory;
  stats: PlayerTally;
  /** the same numbers for the current round only (for the round MVP) */
  round: PlayerTally;
  /** who damaged this player lately (id -> seconds left of assist credit) */
  hitBy: Record<string, number>;
  /** per-round kills/deaths for the HUD */
  roundKills: number;
  roundDeaths: number;
}

export interface SimProjectile {
  id: number;
  ownerId: string;
  owner: CharacterId;
  alliance: AllianceId;
  x: number;
  y: number;
  vx: number;
  vy: number;
  travelled: number;
  range: number;
  damage: number;
  /** fired by a special: drawn bigger */
  big?: boolean;
}

export interface SimGuard {
  alliance: AllianceId;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  alive: boolean;
  cd: number;
  radius: number;
  range: number;
  damage: number;
}

export interface SimBooth {
  id: string;
  home: AllianceId;
  x: number;
  y: number;
  r: number;
  owner: AllianceId;
  /** 0..1 toward the party that does not own it */
  progress: number;
  cd: number;
  /** seconds the current owner has held it: income grows the longer you keep a booth */
  heldFor: number;
  /** how many times it has changed hands this round: repeat flips pay less */
  flips: number;
  /** seconds of "just captured" protection left: capturing it is slower */
  shield: number;
}

/** a strike that lands after a short warning: lightning bolts and the dictionary slam */
export interface SimPending {
  id: number;
  kind: 'lightning' | 'book';
  ttl: number;
  x: number;
  y: number;
  r: number;
  damage: number;
  stun: number;
  ownerId: string;
  alliance: AllianceId;
}

export interface SimSlowZone { id: number; x: number; y: number; r: number; alliance: AllianceId; ttl: number; factor: number }

export interface SimWorld {
  map: MapDef;
  players: SimPlayer[];
  projectiles: SimProjectile[];
  guards: Record<AllianceId, SimGuard>;
  slowZones: SimSlowZone[];
  pending: SimPending[];
  hqCapture: Record<AllianceId, number>;
  booths: SimBooth[];
  votes: Record<AllianceId, number>;
  ruling: AllianceId | null;
  /** the last 30 seconds: flips and KOs pay double */
  counting: boolean;
  /** the one-off sweep bonus has been paid this round */
  sweepPaid: Record<AllianceId, boolean>;
  fx: FxEvent[];
  nextId: number;
  rng: () => number;
}

export type Damageable = { kind: 'player'; p: SimPlayer } | { kind: 'guard'; g: SimGuard };

export const NO_INPUT: InputMsg = { mx: 0, my: 0, attack: false, special: false };

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const dist2 = (ax: number, ay: number, bx: number, by: number) => (ax - bx) ** 2 + (ay - by) ** 2;
export const dist = (ax: number, ay: number, bx: number, by: number) => Math.sqrt(dist2(ax, ay, bx, by));

export function norm(x: number, y: number): [number, number] {
  const l = Math.hypot(x, y);
  return l > 1e-6 ? [x / l, y / l] : [0, 0];
}

export function circleHitsRect(x: number, y: number, r: number, o: Rect): boolean {
  const cx = Math.max(o.x, Math.min(x, o.x + o.w));
  const cy = Math.max(o.y, Math.min(y, o.y + o.h));
  return dist2(x, y, cx, cy) < r * r;
}

export function blocked(world: SimWorld, x: number, y: number, r: number): boolean {
  const m = world.map;
  if (x < r || y < r || x > m.width - r || y > m.height - r) return true;
  for (const o of m.obstacles) if (circleHitsRect(x, y, r, o)) return true;
  return false;
}

/** Moves a circle, sliding along walls one axis at a time. */
export function moveWithCollision(world: SimWorld, p: { x: number; y: number }, r: number, dx: number, dy: number) {
  if (!blocked(world, p.x + dx, p.y + dy, r)) {
    p.x += dx;
    p.y += dy;
    return;
  }
  if (!blocked(world, p.x + dx, p.y, r)) p.x += dx;
  else if (!blocked(world, p.x, p.y + dy, r)) p.y += dy;
}

export function pointInRects(world: SimWorld, x: number, y: number): boolean {
  for (const o of world.map.obstacles) if (x >= o.x && x <= o.x + o.w && y >= o.y && y <= o.y + o.h) return true;
  return false;
}

export function inCircle(x: number, y: number, c: { x: number; y: number; r: number }) {
  return dist2(x, y, c.x, c.y) <= c.r * c.r;
}

/** Adds to a stat for the match and for the current round. */
export function bump(p: SimPlayer, key: keyof PlayerTally, amount = 1) {
  p.stats[key] += amount;
  p.round[key] += amount;
}
