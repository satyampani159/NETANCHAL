// How much does play decide the result? Runs bot rounds and reports vote margins and skill sensitivity.
// Usage: npm run margin -- [rounds=120]
import { type AllianceId, type Difficulty, MatchSim, type RoundEnded } from '../shared/src/index';

const N = Number(process.argv[2] ?? 120);
const DT = 1 / 30;
type Level = Difficulty | 'passive';

function playRound(seed: number, teams: Partial<Record<AllianceId, Level>>): RoundEnded {
  let out: RoundEnded | null = null;
  const sim = new MatchSim((_to, type, msg) => { if (type === 'round_ended' && !out) out = msg as RoundEnded; }, { solo: true, seed, difficulty: 'normal', teamDifficulty: teams, intermissionSeconds: 0.1 });
  sim.startBotOnly();
  for (let i = 0; i < 30 * 200 && !out; i++) sim.update(DT);
  return out as unknown as RoundEnded;
}

const median = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)] ?? 0;
function scenario(name: string, strong: Level, weak: Level) {
  let strongWins = 0, tie = 0, hq = 0;
  const margins: number[] = [];
  for (let i = 0; i < N; i++) {
    // alternate sides so the map cannot favour the stronger team
    const strongSide: AllianceId = i % 2 ? 'jan_ekta' : 'rashtra_morcha';
    const weakSide: AllianceId = strongSide === 'jan_ekta' ? 'rashtra_morcha' : 'jan_ekta';
    const r = playRound(7000 + i, { [strongSide]: strong, [weakSide]: weak });
    if (r.winner === strongSide) strongWins++;
    if (r.reason === 'tiebreak') tie++;
    if (r.reason === 'hq_captured') hq++;
    const total = r.votes.rashtra_morcha + r.votes.jan_ekta;
    margins.push(Math.abs(r.votes.rashtra_morcha - r.votes.jan_ekta) / Math.max(1, total));
  }
  const pct = (x: number) => `${((100 * x) / N).toFixed(0)}%`;
  console.log(`${name.padEnd(24)} stronger side wins ${pct(strongWins)} | median vote margin ${(100 * median(margins)).toFixed(0)}% of votes | tower falls ${pct(hq)} | tiebreaks ${pct(tie)}`);
  return { winRate: strongWins / N, margin: median(margins), tie: tie / N };
}

const equal = scenario('equal bots (normal)', 'normal', 'normal');
const skill = scenario('hard vs easy', 'hard', 'easy');
const passive = scenario('normal vs passive', 'normal', 'passive');
console.log(`targets: equal 45-55% | hard vs easy >= 85% | passive loses >= 95% | median margin 15-30% | tiebreaks < 3%`);
void equal; void skill; void passive;
