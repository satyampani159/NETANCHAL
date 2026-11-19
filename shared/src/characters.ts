// Typed roster + ability constants. Imported by the client (UI, HUD) and the
// simulation (solo worker + Socket.io server) so numbers can never drift.

export type AllianceId = 'rashtra_morcha' | 'jan_ekta';
export type CharacterId =
  | 'vikas_veer'
  | 'chanakya_rao'
  | 'sadak_kumar'
  | 'kila_singh'
  | 'toofan_rani'
  | 'bijli_babu'
  | 'pandit_shabdkosh'
  | 'dharna_dada';

/**
 * Every special deals damage and every character can win a fight alone.
 *  cut_dash   dash forward, then a giant pair of scissors snaps shut in a cone
 *  volley     a fan of big scrolls
 *  speed_wave a row of speed-breaker humps erupts forward: damage and slow
 *  bulldozer  drive a bulldozer along a lane, shoving everyone aside
 *  fish_swing swing a giant fish all the way round
 *  lightning  marks nearby enemies, then lightning crashes down on them
 *  book_slam  a giant dictionary slams down in front
 *  quake      slam the ground: shockwave all round, and take less damage for a moment
 */
export type SpecialKind = 'cut_dash' | 'volley' | 'speed_wave' | 'bulldozer' | 'fish_swing' | 'lightning' | 'book_slam' | 'quake';

export type FightStyle = 'melee' | 'ranged';

export interface BasicAttack {
  name: string;
  /** melee hits everything in a short arc, projectile fires one bolt */
  kind: 'melee' | 'projectile';
  damage: number;
  range: number;
  cooldown: number; // seconds
  projectileSpeed?: number;
}

export interface SpecialAbility {
  name: string;
  kind: SpecialKind;
  cooldown: number; // seconds
  /** damage per hit (per scroll for the volley, per bolt for lightning) */
  damage: number;
  /** how far it reaches: dash distance, lane length, targeting range or distance to the slam point */
  range: number;
  /** size of the area it hits */
  radius: number;
  /** the timed part: dash time, telegraph before a strike, or how long a defence lasts */
  duration: number;
  /** how many targets or projectiles */
  count?: number;
  /** seconds the target is stunned */
  stun?: number;
  /** fraction of speed removed (0.5 = half speed) for 3 seconds */
  slow?: number;
  /** pixels enemies are shoved */
  knock?: number;
  /** fraction of incoming damage ignored for `duration` seconds */
  brace?: number;
  description: string;
}

export interface CharacterDef {
  id: CharacterId;
  name: string;
  alliance: AllianceId;
  hp: number;
  speed: number; // px / second
  radius: number;
  basic: BasicAttack;
  special: SpecialAbility;
  strongAgainst: CharacterId[];
  weakAgainst: CharacterId[];
  counterNote: string;
}

/** Only two kinds of fighter: those who hit up close and those who shoot. Each party has exactly one shooter. */
export const styleOf = (c: Pick<CharacterDef, 'basic'>): FightStyle => (c.basic.kind === 'melee' ? 'melee' : 'ranged');

export const ALLIANCES: Record<AllianceId, { name: string; short: string; color: number; css: string; accent: string }> = {
  rashtra_morcha: { name: 'Rashtra Morcha', short: 'RM', color: 0xf28c28, css: '#F28C28', accent: '#B85A0B' },
  jan_ekta: { name: 'Jan Ekta Gathbandhan', short: 'JEG', color: 0x1e9e6a, css: '#1E9E6A', accent: '#0F6B46' },
};

export const ALLIANCE_IDS: AllianceId[] = ['rashtra_morcha', 'jan_ekta'];
export const otherAlliance = (a: AllianceId): AllianceId => (a === 'rashtra_morcha' ? 'jan_ekta' : 'rashtra_morcha');

export const CHARACTERS: Record<CharacterId, CharacterDef> = {
  vikas_veer: {
    id: 'vikas_veer',
    name: 'Vikas Veer',
    alliance: 'rashtra_morcha',
    hp: 143,
    speed: 164,
    radius: 22,
    basic: { name: 'Rally Punch', kind: 'melee', damage: 23.8, range: 70, cooldown: 0.55 },
    special: {
      name: 'Ribbon Cutter',
      kind: 'cut_dash',
      cooldown: 8,
      damage: 46,
      range: 220,
      radius: 150,
      duration: 0.22,
      description: 'Dashes forward, then a giant pair of scissors snaps shut and cuts everyone in front of him.',
    },
    strongAgainst: ['pandit_shabdkosh', 'bijli_babu'],
    weakAgainst: ['dharna_dada', 'toofan_rani'],
    counterNote: 'Dives in fast and snips whoever he lands next to, but a heavy hitter can trade with him.',
  },
  chanakya_rao: {
    id: 'chanakya_rao',
    name: 'Chanakya Rao',
    alliance: 'rashtra_morcha',
    hp: 120,
    speed: 150,
    radius: 20,
    basic: { name: 'Strategy Scroll', kind: 'projectile', damage: 16.5, range: 340, cooldown: 0.7, projectileSpeed: 500 },
    special: {
      name: 'Arthashastra Barrage',
      kind: 'volley',
      cooldown: 8,
      damage: 10,
      range: 380,
      radius: 0,
      duration: 0,
      count: 5,
      description: 'Fires a fan of five giant scrolls. Up close, most of them hit.',
    },
    strongAgainst: ['dharna_dada', 'pandit_shabdkosh'],
    weakAgainst: ['toofan_rani', 'bijli_babu'],
    counterNote: 'Wins from range and kites slow fighters; anyone who gets in his face wins.',
  },
  sadak_kumar: {
    id: 'sadak_kumar',
    name: 'Sadak Kumar',
    alliance: 'rashtra_morcha',
    hp: 147,
    speed: 156,
    radius: 21,
    basic: { name: 'Gravel Whack', kind: 'melee', damage: 22, range: 72, cooldown: 0.62 },
    special: {
      name: 'Speed Breaker',
      kind: 'speed_wave',
      cooldown: 8,
      damage: 42,
      range: 300,
      radius: 58,
      duration: 3,
      slow: 0.5,
      description: 'A row of huge speed breakers erupts down the road: damage, and everything it catches is slowed.',
    },
    strongAgainst: ['toofan_rani', 'vikas_veer'],
    weakAgainst: ['pandit_shabdkosh', 'chanakya_rao'],
    counterNote: 'Hits and slows whoever is chasing him, then finishes them while they crawl.',
  },
  kila_singh: {
    id: 'kila_singh',
    name: 'Kila Singh',
    alliance: 'rashtra_morcha',
    hp: 174,
    speed: 160,
    radius: 25,
    basic: { name: 'Lathi Swing', kind: 'melee', damage: 22, range: 76, cooldown: 0.7 },
    special: {
      name: 'Bulldozer',
      kind: 'bulldozer',
      cooldown: 9,
      damage: 46,
      range: 320,
      radius: 62,
      duration: 0.6,
      knock: 90,
      brace: 0.3,
      description: 'Drives a bulldozer straight down a wide lane, shoving everyone aside, and takes less damage while driving.',
    },
    strongAgainst: ['toofan_rani', 'vikas_veer'],
    weakAgainst: ['bijli_babu', 'chanakya_rao'],
    counterNote: 'A tough bruiser that bulldozes through a crowd; shooters keep their distance and chip him down.',
  },
  toofan_rani: {
    id: 'toofan_rani',
    name: 'Toofan Rani',
    alliance: 'jan_ekta',
    hp: 151,
    speed: 170,
    radius: 21,
    basic: { name: 'Slogan Slap', kind: 'melee', damage: 17, range: 66, cooldown: 0.45 },
    special: {
      name: 'Maach Maar',
      kind: 'fish_swing',
      cooldown: 8,
      damage: 44,
      range: 0,
      radius: 150,
      duration: 0,
      knock: 120,
      description: 'Swings a giant hilsa fish all the way round: damage to everyone close, and a big shove.',
    },
    strongAgainst: ['chanakya_rao', 'vikas_veer'],
    weakAgainst: ['kila_singh', 'sadak_kumar'],
    counterNote: 'The fastest brawler; she lives in the middle of a crowd and clears it with the fish.',
  },
  bijli_babu: {
    id: 'bijli_babu',
    name: 'Bijli Babu',
    alliance: 'jan_ekta',
    hp: 114,
    speed: 152,
    radius: 20,
    basic: { name: 'Spark', kind: 'projectile', damage: 20.6, range: 310, cooldown: 0.65, projectileSpeed: 600 },
    special: {
      name: 'Bijli Giri',
      kind: 'lightning',
      cooldown: 10,
      damage: 34,
      range: 430,
      radius: 70,
      duration: 0.6,
      count: 3,
      stun: 0.4,
      description: 'Marks up to three enemies with red circles. Half a second later, lightning crashes down on each one.',
    },
    strongAgainst: ['kila_singh', 'chanakya_rao'],
    weakAgainst: ['vikas_veer', 'sadak_kumar'],
    counterNote: 'Dangerous from a distance; the red circles are easy to step out of, and a dash reaches him.',
  },
  pandit_shabdkosh: {
    id: 'pandit_shabdkosh',
    name: 'Pandit Shabdkosh',
    alliance: 'jan_ekta',
    hp: 135,
    speed: 150,
    radius: 20,
    basic: { name: 'Book Bonk', kind: 'melee', damage: 24, range: 70, cooldown: 0.62 },
    special: {
      name: 'Shabd Prahar',
      kind: 'book_slam',
      cooldown: 9,
      damage: 44,
      range: 130,
      radius: 110,
      duration: 0.4,
      stun: 0.5,
      description: 'A giant dictionary slams down in front of him, stunning everyone underneath.',
    },
    strongAgainst: ['sadak_kumar', 'kila_singh'],
    weakAgainst: ['vikas_veer', 'chanakya_rao'],
    counterNote: 'Slams the dictionary where you are about to be; keep moving and he runs out of words.',
  },
  dharna_dada: {
    id: 'dharna_dada',
    name: 'Dharna Dada',
    alliance: 'jan_ekta',
    hp: 195,
    speed: 145,
    radius: 25,
    basic: { name: 'Dhakka', kind: 'melee', damage: 24, range: 74, cooldown: 0.94 },
    special: {
      name: 'Dharna Quake',
      kind: 'quake',
      cooldown: 10,
      damage: 32,
      range: 0,
      radius: 170,
      duration: 3,
      knock: 40,
      brace: 0.4,
      description: 'Slams the ground: a shockwave hits everyone around him, and he takes 40% less damage for 3 seconds.',
    },
    strongAgainst: ['vikas_veer', 'sadak_kumar'],
    weakAgainst: ['chanakya_rao', 'bijli_babu'],
    counterNote: 'Hard to push over and hits hard; shooters wear him down from a distance.',
  },
};

export const CHARACTER_IDS = Object.keys(CHARACTERS) as CharacterId[];

export const charactersOf = (alliance: AllianceId): CharacterDef[] =>
  CHARACTER_IDS.map((id) => CHARACTERS[id]).filter((c) => c.alliance === alliance);

/** The lead faces on the landing hero. */
export const LEADS: Record<AllianceId, CharacterId> = { rashtra_morcha: 'vikas_veer', jan_ekta: 'toofan_rani' };
