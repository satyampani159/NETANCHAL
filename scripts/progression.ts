// Checks of the pure progression logic. Usage: npm run progression
import { COSMETICS, CHALLENGES, XP, applyMatch, bumpDayStreak, challengeFor, dayKey, daysBetween, levelInfo, newProfile, type MatchSummary, unlockedIds, xpToNext } from '../client/src/game/progression';
import type { PlayerStats } from '../shared/src/index';

let failed = 0;
const check = (name: string, ok: boolean, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failed++;
};
const stats = (o: Partial<PlayerStats> = {}): PlayerStats => ({ id: 'x', name: 'x', characterId: 'vikas_veer', alliance: 'rashtra_morcha', isBot: false, kills: 0, deaths: 0, damage: 0, captureSeconds: 0, assists: 0, boothFlips: 0, gateDamage: 0, gateBreaks: 0, towerCaptures: 0, score: 0, ...o });
const match = (o: Partial<MatchSummary> = {}, s: Partial<PlayerStats> = {}): MatchSummary => ({ won: false, roundsWon: 0, mvp: false, character: 'vikas_veer', stats: stats(s), privateRoom: false, ...o });

// levels
check('level 1 starts at 0 xp', levelInfo(0).level === 1);
check('level 2 at 100 xp, level 3 at 225', levelInfo(100).level === 2 && levelInfo(224).level === 2 && levelInfo(225).level === 3, `${xpToNext(1)}, ${xpToNext(2)}`);

// streak
const base = { dayStreak: 0, bestDayStreak: 0, lastDay: null as string | null, freezes: 0 };
let s = bumpDayStreak(base, '2026-11-10');
check('the first day starts a streak of 1', s.dayStreak === 1);
s = bumpDayStreak(s, '2026-11-10');
check('a second match the same day keeps it at 1', s.dayStreak === 1);
s = bumpDayStreak(s, '2026-11-11');
check('the next day extends it', s.dayStreak === 2 && s.bestDayStreak === 2);
const gap = bumpDayStreak(s, '2026-11-14');
check('a gap of days resets to 1 and keeps the best', gap.dayStreak === 1 && gap.bestDayStreak === 2);
const frozen = bumpDayStreak({ ...s, freezes: 1 }, '2026-11-13');
check('a freeze covers exactly one missed day', frozen.dayStreak === 3 && frozen.freezes === 0);
check('day maths handles month ends', daysBetween('2026-11-30', '2026-12-01') === 1 && daysBetween('2026-02-28', '2026-03-01') === 1);
check('dayKey is YYYY-MM-DD', /^\d{4}-\d{2}-\d{2}$/.test(dayKey(new Date(2026, 10, 5))) && dayKey(new Date(2026, 10, 5)) === '2026-11-05');

// daily challenge
check('the same day always gives the same challenge', challengeFor('2026-11-15').id === challengeFor('2026-11-15').id);
const seen = new Set(Array.from({ length: 60 }, (_, i) => challengeFor(dayKey(new Date(2026, 10, 1 + i))).id));
check('over two months most challenges come up', seen.size >= Math.floor(CHALLENGES.length * 0.7), `${seen.size} of ${CHALLENGES.length}`);
check('challenge ids are unique', new Set(CHALLENGES.map((c) => c.id)).size === CHALLENGES.length);

// applying a match
let p = newProfile('Test');
const day = '2026-11-15';
const ch = challengeFor(day);
const winMatch = match({ won: true, roundsWon: 2, mvp: true }, { kills: 4, assists: 6, boothFlips: 3, gateBreaks: 1, towerCaptures: 1, captureSeconds: 80, damage: 2000 });
const r1 = applyMatch(p, winMatch, day);
const expectXp = XP.match + XP.win + 2 * XP.round + XP.mvp + 4 * XP.kill + (r1.gains.challengeJustCompleted ? XP.challenge : 0);
check('a strong match completes any daily challenge and pays the right XP', r1.gains.challengeJustCompleted && r1.gains.xp === expectXp, `${ch.id}: +${r1.gains.xp} xp`);
check('stats and streaks update', r1.profile.matches === 1 && r1.profile.wins === 1 && r1.profile.winStreak === 1 && r1.profile.dayStreak === 1 && r1.profile.mvps === 1 && r1.profile.kills === 4);
const r2 = applyMatch(r1.profile, winMatch, day);
check('the challenge reward is paid once a day', !r2.gains.challengeJustCompleted && r2.profile.challengesDone === 1);
const r3 = applyMatch(r2.profile, match(), '2026-11-16');
check('a loss resets the win streak but extends the day streak', r3.profile.winStreak === 0 && r3.profile.bestWinStreak === 2 && r3.profile.dayStreak === 2 && r3.profile.challengeDay === '2026-11-16');
check('a new day starts the challenge from zero', r3.profile.challengeProgress === Math.min(challengeFor('2026-11-16').target, challengeFor('2026-11-16').progress(match())));

// unlocks
check('only free items are unlocked at the start', COSMETICS.filter((c) => unlockedIds(newProfile('x')).has(c.id)).every((c) => c.unlock.type === 'free'));
const rich = { ...newProfile('x'), xp: 5000, bestDayStreak: 30, challengesDone: 10 };
check('everything unlocks eventually', unlockedIds(rich).size === COSMETICS.length);
check('cosmetic ids are unique', new Set(COSMETICS.map((c) => c.id)).size === COSMETICS.length);
check('cosmetics carry only looks: no stat fields', COSMETICS.every((c) => Object.keys(c).sort().join() === 'color,id,kind,name,unlock'));
check('reaching level 5 earns exactly one freeze', applyMatch({ ...newProfile('x'), xp: 500 }, match({ won: true }), day).profile.freezes === 1 && applyMatch({ ...newProfile('x'), xp: 600 }, match(), day).profile.freezes === 0);

console.log(failed ? `\n${failed} check(s) FAILED` : '\nall checks passed');
process.exit(failed ? 1 : 0);
