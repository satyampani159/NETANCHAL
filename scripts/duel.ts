// 1v1 duels between two bots in open ground, for every pairing across the two parties.
// Usage: npm run duel -- [duelsPerPair=40]
// Checks that nobody is hopeless or unbeatable, and that melee fighters can catch the two shooters.
import { newTally } from '../shared/src/rounds';
import { CHARACTERS, CHARACTER_IDS, type CharacterDef, type CharacterId, MAP, styleOf } from '../shared/src/index';
import { thinkBot } from '../shared/src/sim/bots/behaviourTree';
import { stepPending, stepPlayer, stepProjectiles } from '../shared/src/sim/combat';
import { NO_INPUT, type SimPlayer, type SimWorld, mulberry32 } from '../shared/src/sim/state';

const N = Number(process.argv[2] ?? 40);
const DT = 1 / 30;

function mk(def: CharacterDef, x: number, y: number, idx: number, rng: () => number): SimPlayer {
  return {
    id: def.id, slotId: def.id, name: def.name, humanId: null, botControlled: true, def, alliance: def.alliance, spawnIndex: idx,
    x, y, fx: 1, fy: 0, hp: def.hp, alive: true, respawnIn: 0, attackCd: 0, specialCd: def.special.cooldown * 0.4,
    stunTtl: 0, braceTtl: 0, braceFrac: 0, slowFactor: 1, hitSlowTtl: 0, recoilTtl: 0,
    dashTtl: 0, dashVx: 0, dashVy: 0, dashHit: new Set(), dashDamage: 0, dashRadius: 0, dashKnock: 0, dashThen: null, healFxCd: 0,
    input: { ...NO_INPUT },
    bot: { thinkIn: 0, input: { ...NO_INPUT }, jx: 0, jy: 0, detourSign: rng() < 0.5 ? 1 : -1, retreating: false },
    stats: newTally(), round: newTally(), hitBy: {}, roundKills: 0, roundDeaths: 0,
  };
}

function duel(a: CharacterDef, b: CharacterDef, seed: number): 'a' | 'b' | 'draw' {
  const rng = mulberry32(seed);
  // random gap, sideways offset, facing and special timing, so a result is a trend and not a coin that
  // one tiny number flips for every seed
  const flip = rng() < 0.5;
  const gap = 220 + rng() * 140;
  const off = (rng() - 0.5) * 160;
  const pa = mk(a, 1000 + (flip ? gap / 2 : -gap / 2), 600 + off / 2, 1, rng);
  const pb = mk(b, 1000 + (flip ? -gap / 2 : gap / 2), 600 - off / 2, 1, rng);
  pa.specialCd = rng() * a.special.cooldown;
  pb.specialCd = rng() * b.special.cooldown;
  const dead = (alliance: 'rashtra_morcha' | 'jan_ekta') => ({ alliance, x: -999, y: -999, hp: 0, maxHp: 1, alive: false, cd: 99, radius: 1, range: 0, damage: 0 });
  const world: SimWorld = {
    map: { ...MAP, obstacles: [], booths: { rashtra_morcha: [], jan_ekta: [] }, hq: { rashtra_morcha: { x: -5000, y: -5000, r: 1 }, jan_ekta: { x: -5000, y: -5000, r: 1 } } },
    players: [pa, pb], projectiles: [], guards: { rashtra_morcha: dead('rashtra_morcha'), jan_ekta: dead('jan_ekta') },
    slowZones: [], pending: [], hqCapture: { rashtra_morcha: 0, jan_ekta: 0 }, booths: [], votes: { rashtra_morcha: 0, jan_ekta: 0 },
    ruling: null, counting: false, sweepPaid: { rashtra_morcha: false, jan_ekta: false }, fx: [], nextId: 1, rng,
  };
  for (let i = 0; i < 60 * 30 && pa.alive && pb.alive; i++) {
    for (const p of world.players) thinkBot(world, p, 'normal', DT, 120);
    for (const p of world.players) stepPlayer(world, p, DT);
    stepProjectiles(world, DT);
    stepPending(world, DT);
    world.fx = [];
  }
  if (!pa.alive && !pb.alive) return 'draw';
  if (!pa.alive) return 'b';
  if (!pb.alive) return 'a';
  const fa = pa.hp / pa.def.hp, fb = pb.hp / pb.def.hp;
  return fa === fb ? 'draw' : fa > fb ? 'a' : 'b';
}

const defs = CHARACTER_IDS.map((id) => CHARACTERS[id]);
const wins: Record<string, { w: number; n: number }> = {};
const matrix: Record<string, Record<string, number>> = {};
let meleeVsRanged = { w: 0, n: 0 };
for (const a of defs) {
  matrix[a.id] = {};
  for (const b of defs) {
    if (a.alliance === b.alliance) continue;
    let w = 0;
    for (let i = 0; i < N; i++) if (duel(a, b, 7000 + i) === 'a') w++;
    matrix[a.id][b.id] = Math.round((100 * w) / N);
    const t = (wins[a.id] ??= { w: 0, n: 0 });
    t.w += w;
    t.n += N;
    if (styleOf(a) === 'melee' && styleOf(b) === 'ranged') {
      meleeVsRanged.w += w;
      meleeVsRanged.n += N;
    }
  }
}

console.log('win % in 1v1 duels (row beats column):');
console.log(' '.repeat(18) + defs.map((d) => d.name.split(' ')[0].slice(0, 7).padEnd(8)).join(''));
for (const a of defs) console.log(a.name.padEnd(18) + defs.map((b) => (matrix[a.id][b.id] === undefined ? '   -    ' : `${matrix[a.id][b.id]}`.padEnd(8))).join(''));
console.log();
let ok = true;
for (const a of defs) {
  const r = (100 * wins[a.id].w) / wins[a.id].n;
  const flag = r < 35 || r > 65 ? '  <-- out of 35-65' : '';
  if (flag) ok = false;
  console.log(`${a.name.padEnd(18)} ${styleOf(a).padEnd(7)} ${r.toFixed(0)}%${flag}`);
}
const mr = (100 * meleeVsRanged.w) / meleeVsRanged.n;
if (mr < 40 || mr > 60) ok = false;
console.log(`\nmelee vs the two shooters: ${mr.toFixed(1)}%  (target 40-60)`);
console.log(ok ? 'PASS' : 'OUT OF BAND');
