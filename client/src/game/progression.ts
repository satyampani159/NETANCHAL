// Everything about progress that is pure logic: XP and levels, the daily streak, the daily challenge
// and the cosmetic unlock table. No cosmetic touches gameplay numbers. The profile store just saves this.
import { CHARACTERS, type CharacterId, type PlayerStats, styleOf } from '@netanchal/shared';

// ---------------- the profile ----------------

export interface Profile {
  name: string;
  xp: number;
  matches: number;
  wins: number;
  roundsWon: number;
  kills: number;
  assists: number;
  damage: number;
  mvps: number;
  winStreak: number;
  bestWinStreak: number;
  plays: Partial<Record<CharacterId, number>>;
  /** days in a row with a finished match */
  dayStreak: number;
  bestDayStreak: number;
  lastDay: string | null;
  freezes: number;
  challengesDone: number;
  /** the challenge for `challengeDay`: how far along and whether the reward was paid */
  challengeDay: string | null;
  challengeProgress: number;
  challengeComplete: boolean;
  tutorialDone: boolean;
  shares: number;
  firstDay: string | null;
  equipped: Partial<Record<CosmeticKind, string>>;
}

export const newProfile = (name: string): Profile => ({
  name,
  xp: 0,
  matches: 0,
  wins: 0,
  roundsWon: 0,
  kills: 0,
  assists: 0,
  damage: 0,
  mvps: 0,
  winStreak: 0,
  bestWinStreak: 0,
  plays: {},
  dayStreak: 0,
  bestDayStreak: 0,
  lastDay: null,
  freezes: 0,
  challengesDone: 0,
  challengeDay: null,
  challengeProgress: 0,
  challengeComplete: false,
  tutorialDone: false,
  shares: 0,
  firstDay: null,
  equipped: {},
});

/** what one finished match tells us about the player */
export interface MatchSummary {
  won: boolean;
  roundsWon: number;
  mvp: boolean;
  character: CharacterId;
  stats: PlayerStats;
  privateRoom: boolean;
}

// ---------------- XP and levels ----------------

export const XP = { match: 30, win: 40, round: 10, mvp: 25, kill: 2, challenge: 60 } as const;

/** XP needed to get from level n to n + 1: 100 early, rising 25 a level */
export const xpToNext = (level: number) => 100 + 25 * (level - 1);

export function levelInfo(xp: number) {
  let level = 1;
  let left = xp;
  while (left >= xpToNext(level)) {
    left -= xpToNext(level);
    level++;
  }
  return { level, into: left, need: xpToNext(level) };
}

export function xpForMatch(m: MatchSummary): number {
  return XP.match + (m.won ? XP.win : 0) + m.roundsWon * XP.round + (m.mvp ? XP.mvp : 0) + m.stats.kills * XP.kill;
}

// ---------------- days and streaks ----------------

/** a calendar day in the player's own time zone */
export function dayKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

/** A finished match today: same day keeps the streak, the next day extends it, a gap resets it (a freeze covers one missed day). */
export function bumpDayStreak(p: Pick<Profile, 'dayStreak' | 'bestDayStreak' | 'lastDay' | 'freezes'>, today: string) {
  let { dayStreak, freezes } = p;
  if (p.lastDay === null) dayStreak = 1;
  else {
    const gap = daysBetween(p.lastDay, today);
    if (gap <= 0) {
      /* same day (or a clock set back): nothing changes */
    } else if (gap === 1) dayStreak += 1;
    else if (gap === 2 && freezes > 0) {
      freezes -= 1;
      dayStreak += 1;
    } else dayStreak = 1;
  }
  return { dayStreak, bestDayStreak: Math.max(p.bestDayStreak, dayStreak), lastDay: today, freezes };
}

// ---------------- the daily challenge ----------------

export interface Challenge {
  id: string;
  title: string;
  target: number;
  /** how far this match took it (added to today's progress) */
  progress: (m: MatchSummary) => number;
}

const isRanged = (c: CharacterId) => styleOf(CHARACTERS[c]) === 'ranged';

export const CHALLENGES: Challenge[] = [
  { id: 'win-round', title: 'Win a round', target: 1, progress: (m) => m.roundsWon },
  { id: 'kos-3', title: 'Get 3 KOs', target: 3, progress: (m) => m.stats.kills },
  { id: 'flip-2', title: 'Flip 2 booths', target: 2, progress: (m) => m.stats.boothFlips },
  { id: 'gate-break', title: 'Break a CRPF gate', target: 1, progress: (m) => m.stats.gateBreaks },
  { id: 'win-ranged', title: 'Win a match as a ranged neta', target: 1, progress: (m) => (m.won && isRanged(m.character) ? 1 : 0) },
  { id: 'win-melee', title: 'Win a match as a melee neta', target: 1, progress: (m) => (m.won && !isRanged(m.character) ? 1 : 0) },
  { id: 'mvp', title: 'Be the match MVP', target: 1, progress: (m) => (m.mvp ? 1 : 0) },
  { id: 'tower', title: 'Take an enemy tower', target: 1, progress: (m) => m.stats.towerCaptures },
  { id: 'hold-60', title: 'Hold booths and towers for 60 seconds', target: 60, progress: (m) => m.stats.captureSeconds },
  { id: 'assists-5', title: 'Get 5 assists', target: 5, progress: (m) => m.stats.assists },
  { id: 'damage-1500', title: 'Deal 1500 damage', target: 1500, progress: (m) => m.stats.damage },
  { id: 'win-match', title: 'Win a match', target: 1, progress: (m) => (m.won ? 1 : 0) },
  { id: 'private-room', title: 'Finish a match in a private room', target: 1, progress: (m) => (m.privateRoom ? 1 : 0) },
  { id: 'kos-6', title: 'Get 6 KOs', target: 6, progress: (m) => m.stats.kills },
];

/** the same challenge for everyone on a given day, with no server */
export function challengeFor(day: string): Challenge {
  let h = 2166136261;
  for (let i = 0; i < day.length; i++) h = Math.imul(h ^ day.charCodeAt(i), 16777619);
  return CHALLENGES[(h >>> 0) % CHALLENGES.length];
}

// ---------------- cosmetics (looks only) ----------------

export type CosmeticKind = 'hat' | 'plate' | 'banner' | 'frame';
export type Unlock = { type: 'level'; n: number } | { type: 'streak'; n: number } | { type: 'challenges'; n: number } | { type: 'free' };

export interface Cosmetic {
  id: string;
  kind: CosmeticKind;
  name: string;
  /** a colour or emoji used to draw it */
  color: string;
  unlock: Unlock;
}

export const COSMETICS: Cosmetic[] = [
  { id: 'hat-none', kind: 'hat', name: 'No hat', color: '', unlock: { type: 'free' } },
  { id: 'hat-topi', kind: 'hat', name: 'Gandhi topi', color: '#F7F5F0', unlock: { type: 'level', n: 2 } },
  { id: 'hat-pagdi', kind: 'hat', name: 'Saffron pagdi', color: '#FF8A1A', unlock: { type: 'level', n: 4 } },
  { id: 'hat-crown', kind: 'hat', name: 'Winner crown', color: '#FFD23F', unlock: { type: 'level', n: 8 } },
  { id: 'hat-helmet', kind: 'hat', name: 'Campaign helmet', color: '#E5484D', unlock: { type: 'streak', n: 3 } },
  { id: 'hat-garland', kind: 'hat', name: 'Marigold garland', color: '#FFB703', unlock: { type: 'challenges', n: 3 } },
  { id: 'plate-plain', kind: 'plate', name: 'Plain', color: '#F7F5F0', unlock: { type: 'free' } },
  { id: 'plate-yellow', kind: 'plate', name: 'Poll yellow', color: '#FFD23F', unlock: { type: 'level', n: 3 } },
  { id: 'plate-pink', kind: 'plate', name: 'Rally pink', color: '#FF4D8D', unlock: { type: 'level', n: 5 } },
  { id: 'plate-sky', kind: 'plate', name: 'Sky blue', color: '#4CC9F0', unlock: { type: 'streak', n: 7 } },
  { id: 'banner-none', kind: 'banner', name: 'No banner', color: '', unlock: { type: 'free' } },
  { id: 'banner-vote', kind: 'banner', name: 'VOTE FOR ME', color: '#FF8A1A', unlock: { type: 'level', n: 2 } },
  { id: 'banner-landslide', kind: 'banner', name: 'LANDSLIDE', color: '#1FA463', unlock: { type: 'level', n: 6 } },
  { id: 'banner-streak', kind: 'banner', name: 'ON A ROLL', color: '#E5484D', unlock: { type: 'streak', n: 14 } },
  { id: 'banner-sweep', kind: 'banner', name: 'CLEAN SWEEP', color: '#7C4DFF', unlock: { type: 'challenges', n: 5 } },
  { id: 'frame-plain', kind: 'frame', name: 'Plain', color: '#111111', unlock: { type: 'free' } },
  { id: 'frame-gold', kind: 'frame', name: 'Gold frame', color: '#FFB703', unlock: { type: 'level', n: 10 } },
  { id: 'frame-ink', kind: 'frame', name: 'Pop pink', color: '#FF4D8D', unlock: { type: 'streak', n: 30 } },
];

export function isUnlocked(c: Cosmetic, p: Pick<Profile, 'xp' | 'bestDayStreak' | 'challengesDone'>): boolean {
  const u = c.unlock;
  if (u.type === 'free') return true;
  if (u.type === 'level') return levelInfo(p.xp).level >= u.n;
  if (u.type === 'streak') return p.bestDayStreak >= u.n;
  return p.challengesDone >= u.n;
}

export function unlockText(c: Cosmetic): string {
  const u = c.unlock;
  if (u.type === 'free') return 'Included';
  if (u.type === 'level') return `Reach level ${u.n}`;
  if (u.type === 'streak') return `${u.n}-day streak`;
  return `Complete ${u.n} daily challenges`;
}

export const unlockedIds = (p: Pick<Profile, 'xp' | 'bestDayStreak' | 'challengesDone'>) => new Set(COSMETICS.filter((c) => isUnlocked(c, p)).map((c) => c.id));

// ---------------- applying a finished match ----------------

export interface Gains {
  xp: number;
  levelBefore: number;
  levelAfter: number;
  challenge: Challenge;
  challengeProgress: number;
  challengeJustCompleted: boolean;
  dayStreak: number;
  streakExtended: boolean;
  unlocked: Cosmetic[];
}

export function applyMatch(prev: Profile, m: MatchSummary, today: string): { profile: Profile; gains: Gains } {
  const challenge = challengeFor(today);
  const sameDay = prev.challengeDay === today;
  const alreadyDone = sameDay && prev.challengeComplete;
  const progress = Math.min(challenge.target, (sameDay ? prev.challengeProgress : 0) + challenge.progress(m));
  const justCompleted = !alreadyDone && progress >= challenge.target;

  let xp = xpForMatch(m) + (justCompleted ? XP.challenge : 0);
  const streak = bumpDayStreak(prev, today);
  const before = unlockedIds(prev);
  const levelBefore = levelInfo(prev.xp).level;

  const winStreak = m.won ? prev.winStreak + 1 : 0;
  const profile: Profile = {
    ...prev,
    ...streak,
    xp: prev.xp + xp,
    matches: prev.matches + 1,
    wins: prev.wins + (m.won ? 1 : 0),
    roundsWon: prev.roundsWon + m.roundsWon,
    kills: prev.kills + m.stats.kills,
    assists: prev.assists + m.stats.assists,
    damage: prev.damage + m.stats.damage,
    mvps: prev.mvps + (m.mvp ? 1 : 0),
    winStreak,
    bestWinStreak: Math.max(prev.bestWinStreak, winStreak),
    plays: { ...prev.plays, [m.character]: (prev.plays[m.character] ?? 0) + 1 },
    challengesDone: prev.challengesDone + (justCompleted ? 1 : 0),
    challengeDay: today,
    challengeProgress: progress,
    challengeComplete: alreadyDone || justCompleted,
    firstDay: prev.firstDay ?? today,
  };
  // a freeze is earned once, when level 5 is reached
  if (levelInfo(prev.xp).level < 5 && levelInfo(profile.xp).level >= 5) profile.freezes += 1;
  const after = unlockedIds(profile);
  return {
    profile,
    gains: {
      xp,
      levelBefore,
      levelAfter: levelInfo(profile.xp).level,
      challenge,
      challengeProgress: progress,
      challengeJustCompleted: justCompleted,
      dayStreak: profile.dayStreak,
      streakExtended: profile.dayStreak > prev.dayStreak,
      unlocked: COSMETICS.filter((c) => after.has(c.id) && !before.has(c.id)),
    },
  };
}
