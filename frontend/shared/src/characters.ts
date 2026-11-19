// Typed roster + ability constants. Imported by the client (UI, HUD) and the
// simulation (solo worker + Colyseus server) so numbers can never drift.

export type AllianceId = 'rashtra_morcha' | 'jan_ekta';
export type Role = 'attacker' | 'helper' | 'defender';
export type CharacterId =
  | 'vikas_veer'
  | 'chanakya_rao'
  | 'sadak_kumar'
  | 'kila_singh'
  | 'toofan_rani'
  | 'bijli_babu'
  | 'pandit_shabdkosh'
  | 'dharna_dada';

export type SpecialKind = 'dash' | 'buff_aura' | 'slow_zone' | 'shield_aura' | 'whirlwind' | 'stun_aura' | 'heal_aura' | 'dharna';

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
  /** radius for auras/zones, distance for dashes */
  radius: number;
  /** damage, heal, shield amount or slow % depending on kind */
  power: number;
  duration: number; // seconds, 0 for instant
  description: string;
}

export interface CharacterDef {
  id: CharacterId;
  name: string;
  alliance: AllianceId;
  role: Role;
  hp: number;
  speed: number; // px / second
  radius: number;
  basic: BasicAttack;
  special: SpecialAbility;
  strongAgainst: CharacterId[];
  weakAgainst: CharacterId[];
  counterNote: string;
}

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
    role: 'attacker',
    hp: 128,
    speed: 164,
    radius: 22,
    basic: { name: 'Rally Punch', kind: 'melee', damage: 20, range: 64, cooldown: 0.55 },
    special: {
      name: 'Inauguration Dash',
      kind: 'dash',
      cooldown: 8,
      radius: 240,
      power: 44,
      duration: 0.25,
      description: 'Charges forward, ribbon-cutting through everyone in the way for heavy damage.',
    },
    strongAgainst: ['pandit_shabdkosh', 'bijli_babu'],
    weakAgainst: ['dharna_dada', 'toofan_rani'],
    counterNote: 'Dives the back line fast, but bounces off anyone who simply refuses to move.',
  },
  chanakya_rao: {
    id: 'chanakya_rao',
    name: 'Chanakya Rao',
    alliance: 'rashtra_morcha',
    role: 'helper',
    hp: 100,
    speed: 150,
    radius: 20,
    basic: { name: 'Strategy Scroll', kind: 'projectile', damage: 11, range: 340, cooldown: 0.7, projectileSpeed: 500 },
    special: {
      name: 'Grand Strategy',
      kind: 'buff_aura',
      cooldown: 12,
      radius: 200,
      power: 0.18,
      duration: 5,
      description: 'Allies nearby deal 18% more damage for 5 seconds.',
    },
    strongAgainst: ['dharna_dada', 'pandit_shabdkosh'],
    weakAgainst: ['toofan_rani', 'bijli_babu'],
    counterNote: 'Wins long fights by out-planning tanks; folds when rushed before the plan lands.',
  },
  sadak_kumar: {
    id: 'sadak_kumar',
    name: 'Sadak Kumar',
    alliance: 'rashtra_morcha',
    role: 'helper',
    hp: 106,
    speed: 146,
    radius: 21,
    basic: { name: 'Gravel Toss', kind: 'projectile', damage: 13, range: 290, cooldown: 0.75, projectileSpeed: 450 },
    special: {
      name: 'Speed Breaker',
      kind: 'slow_zone',
      cooldown: 12,
      radius: 130,
      power: 0.4,
      duration: 5,
      description: 'Lays a speed breaker zone that slows enemies inside by 40% for 5 seconds.',
    },
    strongAgainst: ['toofan_rani', 'vikas_veer'],
    weakAgainst: ['pandit_shabdkosh', 'chanakya_rao'],
    counterNote: 'Shuts down fast divers; long-range talkers just stand outside the roadworks.',
  },
  kila_singh: {
    id: 'kila_singh',
    name: 'Kila Singh',
    alliance: 'rashtra_morcha',
    role: 'defender',
    hp: 195,
    speed: 152,
    radius: 25,
    basic: { name: 'Lathi Swing', kind: 'melee', damage: 22, range: 76, cooldown: 0.7 },
    special: {
      name: 'Fortify',
      kind: 'shield_aura',
      cooldown: 11,
      radius: 180,
      power: 55,
      duration: 5,
      description: 'Shields himself and nearby allies, absorbing 55 damage each for 5 seconds.',
    },
    strongAgainst: ['toofan_rani', 'vikas_veer'],
    weakAgainst: ['bijli_babu', 'chanakya_rao'],
    counterNote: 'A wall against melee pushes, but stuns and ranged poke chip him down.',
  },
  toofan_rani: {
    id: 'toofan_rani',
    name: 'Toofan Rani',
    alliance: 'jan_ekta',
    role: 'attacker',
    hp: 122,
    speed: 170,
    radius: 21,
    basic: { name: 'Slogan Blast', kind: 'projectile', damage: 14, range: 230, cooldown: 0.5, projectileSpeed: 540 },
    special: {
      name: 'Toofan',
      kind: 'whirlwind',
      cooldown: 9,
      radius: 120,
      power: 28,
      duration: 0,
      description: 'A whirlwind of slogans that damages and knocks back every enemy around her.',
    },
    strongAgainst: ['chanakya_rao', 'vikas_veer'],
    weakAgainst: ['kila_singh', 'sadak_kumar'],
    counterNote: 'Shreds squishy helpers in a crowd; slowed down or walled off, she runs out of wind.',
  },
  bijli_babu: {
    id: 'bijli_babu',
    name: 'Bijli Babu',
    alliance: 'jan_ekta',
    role: 'helper',
    hp: 105,
    speed: 152,
    radius: 20,
    basic: { name: 'Spark', kind: 'projectile', damage: 12, range: 310, cooldown: 0.65, projectileSpeed: 600 },
    special: {
      name: 'Power Cut',
      kind: 'stun_aura',
      cooldown: 14,
      radius: 140,
      power: 0,
      duration: 1.1,
      description: 'Cuts the power: enemies nearby are stunned for 1.1 seconds.',
    },
    strongAgainst: ['kila_singh', 'chanakya_rao'],
    weakAgainst: ['vikas_veer', 'sadak_kumar'],
    counterNote: 'Stuns lock down slow defenders; a fast dash reaches him before the lights go out.',
  },
  pandit_shabdkosh: {
    id: 'pandit_shabdkosh',
    name: 'Pandit Shabdkosh',
    alliance: 'jan_ekta',
    role: 'helper',
    hp: 100,
    speed: 144,
    radius: 20,
    basic: { name: 'Big Words', kind: 'projectile', damage: 10, range: 380, cooldown: 0.75, projectileSpeed: 460 },
    special: {
      name: 'Sermon',
      kind: 'heal_aura',
      cooldown: 14,
      radius: 160,
      power: 38,
      duration: 0,
      description: 'Heals himself and nearby allies for 38 HP.',
    },
    strongAgainst: ['sadak_kumar', 'kila_singh'],
    weakAgainst: ['vikas_veer', 'chanakya_rao'],
    counterNote: 'Out-talks anyone from range and keeps the team topped up; hates being caught up close.',
  },
  dharna_dada: {
    id: 'dharna_dada',
    name: 'Dharna Dada',
    alliance: 'jan_ekta',
    role: 'defender',
    hp: 240,
    speed: 154,
    radius: 25,
    basic: { name: 'Dhakka', kind: 'melee', damage: 26, range: 74, cooldown: 0.7 },
    special: {
      name: 'Dharna',
      kind: 'dharna',
      cooldown: 12,
      radius: 0,
      power: 0.6,
      duration: 5,
      description: 'Sits in protest: cannot move, takes 60% less damage and counts double on capture zones.',
    },
    strongAgainst: ['vikas_veer', 'sadak_kumar'],
    weakAgainst: ['chanakya_rao', 'bijli_babu'],
    counterNote: 'Immovable against brawlers; a patient strategist simply waits the protest out.',
  },
};

export const CHARACTER_IDS = Object.keys(CHARACTERS) as CharacterId[];

export const charactersOf = (alliance: AllianceId): CharacterDef[] =>
  CHARACTER_IDS.map((id) => CHARACTERS[id]).filter((c) => c.alliance === alliance);

/** The lead faces on the landing hero. */
export const LEADS: Record<AllianceId, CharacterId> = { rashtra_morcha: 'vikas_veer', jan_ekta: 'toofan_rani' };
