// Stage-2 exit check from the plan: run bot-only matches and report win rates.
// "No character's team wins over 55% in bot-only tests."
// Usage: npm run balance -- [matches=200] [difficulty=normal]
import { ALLIANCES, CHARACTERS, type CharacterId, type MatchEnded, MatchSim, type Difficulty } from '../shared/src/index';

const N = Number(process.argv[2] ?? 200);
const difficulty = (process.argv[3] ?? 'normal') as Difficulty;
const DT = 1 / 30;

const allianceWins = { rashtra_morcha: 0, jan_ekta: 0 };
const charWins: Record<string, { played: number; won: number }> = {};
const reasons: Record<string, number> = {};
let rounds = 0;
let secs = 0;
let flips = 0;
let towerFalls = 0;

for (let i = 0; i < N; i++) {
  let result: MatchEnded | null = null;
  const sim = new MatchSim(
    (_to, type, msg) => {
      if (type === 'match_ended') result = msg as MatchEnded;
      if (type === 'round_ended') {
        rounds++;
        const r = (msg as { reason: string }).reason;
        reasons[r] = (reasons[r] ?? 0) + 1;
      }
    },
    { solo: true, seed: 1000 + i, difficulty, intermissionSeconds: 0.1 },
  );
  sim.startBotOnly();
  let guard = 0;
  const owners = new Map<string, string>();
  while (!result && guard++ < 30 * 60 * 15) {
    sim.update(DT);
    secs += DT;
    // booth flips, counted straight from the sim's world
    for (const b of (sim as unknown as { world: { booths: { id: string; owner: string }[] } }).world.booths) {
      if (owners.has(b.id) && owners.get(b.id) !== b.owner) flips++;
      owners.set(b.id, b.owner);
    }
  }
  if (!result) continue;
  const res = result as MatchEnded;
  allianceWins[res.winner]++;
  for (const s of res.stats) {
    const c = (charWins[s.characterId] ??= { played: 0, won: 0 });
    c.played++;
    if (s.alliance === res.winner) c.won++;
  }
}

const pct = (a: number, b: number) => `${((100 * a) / Math.max(1, b)).toFixed(1)}%`;
console.log(`${N} bot-only matches at ${difficulty}, avg ${(rounds / N).toFixed(2)} rounds, avg round ${(secs / rounds).toFixed(0)}s`);
console.log('round end reasons:', reasons, `| booth flips per round: ${(flips / rounds).toFixed(2)}`);
for (const [a, w] of Object.entries(allianceWins)) console.log(`${ALLIANCES[a as keyof typeof ALLIANCES].name.padEnd(22)} ${pct(w, N)}`);
let ok = true;
for (const [id, c] of Object.entries(charWins)) {
  const rate = c.won / c.played;
  if (rate > 0.55) ok = false;
  console.log(`  ${CHARACTERS[id as CharacterId].name.padEnd(18)} ${pct(c.won, c.played)}`);
}
console.log(ok ? 'PASS: no team above 55%' : 'FAIL: a team is above 55%');
