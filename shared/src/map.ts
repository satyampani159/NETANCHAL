import type { AllianceId } from './characters';

export interface Rect { x: number; y: number; w: number; h: number }
export interface Circle { x: number; y: number; r: number }

export type ObstacleKind = 'gate' | 'auto' | 'barricade' | 'stall' | 'wall';
export interface Obstacle extends Rect {
  kind: ObstacleKind;
  label?: string;
  /** drawn orientation for autos: true = facing right */
  flip?: boolean;
}

export interface MapDef {
  width: number;
  height: number;
  /** each party's Political Tower: capturing the enemy's tower wins the round */
  hq: Record<AllianceId, Circle>;
  /** the CRPF gate in front of each tower; it has to fall before the tower can be taken */
  guardPosts: Record<AllianceId, { x: number; y: number }>;
  /** three home vote booths per party, captured by the other side */
  booths: Record<AllianceId, Circle[]>;
  spawns: Record<AllianceId, { x: number; y: number }[]>;
  /** forward respawn point for the opposition from round 2 onwards */
  mediaVan: Record<AllianceId, { x: number; y: number }>;
  obstacles: Obstacle[];
}

const W = 2000;
const H = 1200;
/** the map is point-symmetric (rotated 180 degrees), so neither side has a better half */
const rot = (o: Obstacle): Obstacle => ({ ...o, x: W - o.x - o.w, y: H - o.y - o.h, flip: o.flip === undefined ? undefined : !o.flip });

// "Kartavya Path": India Gate in the middle, two party towers at the ends, and
// three vote booths per party scattered through the lanes so no one camps the centre.
const HALF: Obstacle[] = [
  // tower-side market, clear of the tower circle and booths
  { x: 140, y: 150, w: 140, h: 90, kind: 'stall', label: 'KIRANA' },
  { x: 140, y: 960, w: 140, h: 90, kind: 'stall', label: 'CHAI' },
  // walls flanking the office
  { x: 300, y: 300, w: 40, h: 160, kind: 'wall' },
  { x: 300, y: 740, w: 40, h: 160, kind: 'wall' },
  // auto-rickshaw ranks
  { x: 330, y: 860, w: 84, h: 46, kind: 'auto' },
  { x: 330, y: 920, w: 84, h: 46, kind: 'auto' },
  { x: 600, y: 560, w: 84, h: 46, kind: 'auto', flip: true },
  { x: 880, y: 260, w: 84, h: 46, kind: 'auto' },
  { x: 1100, y: 380, w: 84, h: 46, kind: 'auto', flip: true },
  // Delhi Police barricades pinching the road and the northern lane
  { x: 760, y: 540, w: 24, h: 120, kind: 'barricade' },
  { x: 1000, y: 180, w: 110, h: 24, kind: 'barricade' },
];

export const MAP: MapDef = {
  width: W,
  height: H,
  hq: {
    rashtra_morcha: { x: 170, y: 600, r: 130 },
    jan_ekta: { x: 1830, y: 600, r: 130 },
  },
  guardPosts: {
    rashtra_morcha: { x: 380, y: 600 },
    jan_ekta: { x: 1620, y: 600 },
  },
  booths: {
    rashtra_morcha: [
      { x: 520, y: 200, r: 80 },
      { x: 700, y: 960, r: 80 },
      { x: 760, y: 420, r: 80 },
    ],
    jan_ekta: [
      { x: 1480, y: 1000, r: 80 },
      { x: 1300, y: 240, r: 80 },
      { x: 1240, y: 780, r: 80 },
    ],
  },
  spawns: {
    rashtra_morcha: [
      { x: 110, y: 520 },
      { x: 110, y: 680 },
      { x: 200, y: 460 },
      { x: 200, y: 740 },
    ],
    jan_ekta: [
      { x: 1890, y: 520 },
      { x: 1890, y: 680 },
      { x: 1800, y: 460 },
      { x: 1800, y: 740 },
    ],
  },
  mediaVan: {
    rashtra_morcha: { x: 700, y: 600 },
    jan_ekta: { x: 1300, y: 600 },
  },
  obstacles: [
    // India Gate: a landmark you walk around, not a capture point
    { x: 910, y: 500, w: 180, h: 200, kind: 'gate', label: 'INDIA GATE' },
    ...HALF,
    ...HALF.map(rot),
  ],
};
