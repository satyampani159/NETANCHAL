// Direct checks of the new rules in the shared sim. Usage: npm run rules
import { flipValue } from '../shared/src/sim/capture';
import { CHARACTERS, CHARACTER_IDS, INTERMISSION_SECONDS, MAP, MatchSim, charactersOf, mvpScore, newTally, styleOf, themeFor } from '../shared/src/index';
import { damagePlayer } from '../shared/src/sim/combat';

let failed = 0;
const check = (name: string, ok: boolean, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failed++;
};

function fresh() {
  const sim = new MatchSim(() => {}, { solo: true, seed: 5 });
  sim.startBotOnly();
  const w = (sim as unknown as { world: any }).world;
  for (const p of w.players) {
    p.botControlled = false; // nobody moves unless the test says so
    p.input = { mx: 0, my: 0, attack: false, special: false };
    p.x = 1000; p.y = 40; // park everyone far from every objective
  }
  return { sim, w };
}
const run = (sim: MatchSim, seconds: number) => { for (let i = 0; i < seconds * 30; i++) sim.update(1 / 30); };
const by = (w: any, id: string) => w.players.find((p: any) => p.def.id === id);

// 1. a booth flips after a few seconds with one capturer, and pays the bonus
{
  const { sim, w } = fresh();
  const booth = w.booths.find((b: any) => b.home === 'jan_ekta');
  const v = by(w, 'vikas_veer'); // rashtra_morcha
  v.x = booth.x; v.y = booth.y; v.hp = 9999; v.def = { ...v.def, hp: 9999 };
  const before = w.votes.rashtra_morcha;
  run(sim, 2);
  check('booth does not flip after 2s', booth.owner === 'jan_ekta', `progress ${booth.progress.toFixed(2)}`);
  run(sim, 3);
  check('booth flips after ~5s with one capturer', booth.owner === 'rashtra_morcha');
  check('flip pays the +20 bonus', w.votes.rashtra_morcha - before >= 20, `+${(w.votes.rashtra_morcha - before).toFixed(1)}`);

  // 2. the flipped booth's CRPF now shoots the other side only, and only lightly
  const jan = by(w, 'toofan_rani');
  jan.x = booth.x + 60; jan.y = booth.y; jan.hp = 140;
  v.hp = 9999;
  const vhp = v.hp;
  run(sim, 4);
  check('captured booth CRPF hits the old owner', jan.hp < 140, `hp ${jan.hp}`);
  check('captured booth CRPF leaves the new owner alone', v.hp >= vhp);
  check('captured CRPF damage is light (<= 2 per shot)', 140 - jan.hp <= 2 * 5, `${(140 - jan.hp).toFixed(1)} over 4s`);
}

// 3. the tower can only be captured once its CRPF gate is down
{
  const { sim, w } = fresh();
  const hq = MAP.hq.jan_ekta;
  const v = by(w, 'vikas_veer');
  v.x = hq.x; v.y = hq.y; v.def = { ...v.def, hp: 9999 }; v.hp = 9999;
  run(sim, 15);
  check('tower cannot be captured while the CRPF gate stands', w.hqCapture.jan_ekta === 0);
  w.guards.jan_ekta.alive = false;
  run(sim, 5);
  check('tower starts filling once the gate is down', w.hqCapture.jan_ekta > 0.2 && w.hqCapture.jan_ekta < 1, `progress ${w.hqCapture.jan_ekta.toFixed(2)}`);
  run(sim, 15);
  check('a full tower ends the round for the capturer', sim.score.rashtra_morcha === 1, `score ${sim.score.rashtra_morcha}-${sim.score.jan_ekta}`);
}

// 4. respawn starts with the special ready, not the old life's cooldown
{
  const { sim, w } = fresh();
  const p = by(w, 'toofan_rani');
  p.specialCd = 8.5;
  p.attackCd = 0.4;
  damagePlayer(w, p, 99999, null);
  check('player is dead', !p.alive);
  run(sim, 6);
  check('player respawned', p.alive);
  check('special is ready right after respawn', p.specialCd === 0, `specialCd ${p.specialCd}`);
}

// 5. names are character names
{
  const { w } = fresh();
  check('players are named after their characters', w.players.every((p: any) => p.name === p.def.name), w.players.map((p: any) => p.name).slice(0, 3).join(', '));
}

// 6. online lobbies give a late joiner the full countdown; solo lobbies do not
{
  const online = new MatchSim(() => {}, { solo: false, seed: 9 });
  online.addPlayer('a', 'A');
  for (let i = 0; i < 7 * 30; i++) online.update(1 / 30);
  const before = online.lobbyView().secondsLeft;
  online.addPlayer('b', 'B');
  const after = online.lobbyView().secondsLeft;
  check('late joiner restarts the online countdown', before < 1.5 && after >= 7.9, `${before.toFixed(1)}s -> ${after.toFixed(1)}s`);
  const solo = new MatchSim(() => {}, { solo: true, seed: 9 });
  solo.addPlayer('a', 'A');
  for (let i = 0; i < 3 * 30; i++) solo.update(1 / 30);
  check('solo countdown keeps running', solo.lobbyView().secondsLeft < 5.5, `${solo.lobbyView().secondsLeft.toFixed(1)}s`);
  // each join up to 30s keeps the countdown alive; after that it can no longer be extended
  const stale = new MatchSim(() => {}, { solo: false, seed: 9 });
  stale.addPlayer('h0', 'H0');
  let t = 0;
  let n = 1;
  const advance = (to: number) => { while (t < to) { stale.update(1 / 30); t += 1 / 30; } };
  for (const at of [5, 10, 15, 20, 25]) { advance(at); stale.addPlayer(`h${n++}`, 'x'); }
  advance(30.5);
  const stillLobby = stale.phase === 'lobby';
  stale.addPlayer(`h${n++}`, 'late');
  const left = stale.lobbyView().secondsLeft;
  check('after 30s a join no longer extends the countdown', stillLobby && left < 6, `${left.toFixed(1)}s left`);
}

// 7. joining a running match: take over a bot, never a human-held character
{
  const log: Array<{ to: string; type: string; msg: any }> = [];
  const sim = new MatchSim((to, type, msg) => log.push({ to, type, msg }), { solo: false, seed: 21 });
  const w = () => (sim as unknown as { world: any }).world;
  const lastTo = (to: string, type: string) => [...log].reverse().find((m) => m.to === to && m.type === type);
  sim.addPlayer('a', 'Alice');
  sim.handle('a', 'pick', { characterId: 'vikas_veer' });
  for (let i = 0; i < 10 * 30; i++) sim.update(1 / 30);
  check('match is running', sim.phase === 'playing');

  const res = sim.addPlayer('b', 'Bala');
  check('a newcomer joins a running match as a viewer', res === 'viewer');
  const lobby = sim.lobbyView();
  check('lobby is marked in progress with round and score', lobby.inProgress && lobby.round === 1 && lobby.secondsLeft === 0);
  check('viewer was sent the lobby and a null-alliance welcome', lastTo('b', 'lobby') !== undefined && lastTo('b', 'welcome')?.msg.alliance === null);

  sim.handle('b', 'pick', { characterId: 'vikas_veer' });
  check('cannot take a character another human is playing', lastTo('b', 'error')?.msg.message.includes('someone else') === true);
  check('and the human keeps their seat', w().players.find((p: any) => p.def.id === 'vikas_veer').humanId === 'a');

  // pick a bot character from the OTHER party too, to prove both parties are open
  const target = lobby.slots.find((sl) => sl.isBot && sl.alliance === 'jan_ekta' && sl.characterId)!;
  const bot = w().players.find((p: any) => p.slotId === target.slotId);
  bot.hp = 41;
  const x = bot.x;
  sim.handle('b', 'pick', { characterId: target.characterId });
  check('takes over a bot from either party', bot.humanId === 'b' && !bot.botControlled);
  check('the takeover keeps the character\'s state', bot.hp === 41 && bot.x === x, `hp ${bot.hp}`);
  check('newcomer gets welcome with the right alliance and a live snapshot', lastTo('b', 'welcome')?.msg.alliance === 'jan_ekta' && lastTo('b', 'match_start')?.msg.players.length === 8);
  sim.handle('b', 'input', { mx: 1, my: 0, attack: false, special: false });
  check('their input drives the character', bot.input.mx === 1);

  // a third person, then the first leaves for good: the seat opens
  sim.addPlayer('c', 'Chitra');
  sim.removePlayer('b');
  check('leaving hands the character back to a bot', bot.botControlled && bot.humanId === null);
  sim.handle('c', 'pick', { characterId: target.characterId });
  check('another player can now take that seat', bot.humanId === 'c');

  // a dropped connection: seat is held, then released
  sim.removePlayer('c', 30);
  check('a dropped player\'s seat is reserved and bot-driven', bot.botControlled && sim.lobbyView().slots.find((sl) => sl.slotId === target.slotId)!.reserved);
  sim.addPlayer('d', 'Dev');
  sim.handle('d', 'pick', { characterId: target.characterId });
  check('a reserved seat cannot be taken', bot.humanId === 'c');
  check('the dropped player can reclaim it', sim.rejoin('c') === 'jan_ekta' && !bot.botControlled);
  sim.removePlayer('c', 5);
  for (let i = 0; i < 6 * 30; i++) sim.update(1 / 30);
  check('an unclaimed reservation expires', bot.humanId === null && !sim.lobbyView().slots.find((sl) => sl.slotId === target.slotId)!.reserved);
  sim.handle('d', 'pick', { characterId: target.characterId });
  check('then someone else can have it', bot.humanId === 'd');

  // pings use the server's position, not the client's
  log.length = 0;
  sim.handle('a', 'ping', { type: 'attack', x: 99999, y: -5 } as any);
  const ping = log.find((m) => m.type === 'ping');
  const alice = w().players.find((p: any) => p.humanId === 'a');
  check('pings carry the server-side position', !!ping && ping.msg.x === alice.x && ping.msg.y === alice.y);
}

// 8. the roster rules from the design: no roles, one shooter per party, the requested numbers
{
  check('no character has a role any more', CHARACTER_IDS.every((id) => !('role' in CHARACTERS[id])));
  for (const alliance of ['rashtra_morcha', 'jan_ekta'] as const)
    check(`${alliance} has exactly one ranged character`, charactersOf(alliance).filter((c) => styleOf(c) === 'ranged').length === 1, charactersOf(alliance).filter((c) => styleOf(c) === 'ranged').map((c) => c.name).join());
  check('Toofan Rani, Sadak Kumar and Pandit Shabdkosh are melee', ['toofan_rani', 'sadak_kumar', 'pandit_shabdkosh'].every((id) => styleOf(CHARACTERS[id as keyof typeof CHARACTERS]) === 'melee'));
  check('Dharna Dada: HP 195 and special damage 32', CHARACTERS.dharna_dada.hp === 195 && CHARACTERS.dharna_dada.special.damage === 32);
  check('Vikas Veer: range 70 and HP 143', CHARACTERS.vikas_veer.basic.range === 70 && CHARACTERS.vikas_veer.hp === 143);
  check('every special deals damage', CHARACTER_IDS.every((id) => CHARACTERS[id].special.damage > 0));
}

// 9. each special really hurts an enemy standing where it is meant to reach
{
  // [attacker, where the victim stands relative to the attacker, in pixels along the aim direction]
  const cases: Array<[keyof typeof CHARACTERS, number]> = [
    ['vikas_veer', 300],
    ['kila_singh', 170],
    ['toofan_rani', 90],
    ['bijli_babu', 220],
    ['sadak_kumar', 170],
    ['chanakya_rao', 110],
    ['pandit_shabdkosh', 130],
    ['dharna_dada', 100],
  ];
  for (const [id, offset] of cases) {
    const { sim, w } = fresh();
    w.map = { ...w.map, obstacles: [] };
    w.booths = [];
    for (const g of Object.values(w.guards) as any[]) g.alive = false;
    const caster = by(w, id);
    const victim = w.players.find((p: any) => p.alliance !== caster.alliance && p !== caster)!;
    caster.x = 1000; caster.y = 1000; caster.specialCd = 0;
    victim.x = 1000 + offset; victim.y = 1000; victim.def = { ...victim.def, hp: 9999 }; victim.hp = 9999;
    caster.input = { mx: 0, my: 0, ax: 1, ay: 0, attack: false, special: true };
    const start = victim.hp;
    sim.update(1 / 30);
    caster.input = { mx: 0, my: 0, attack: false, special: false };
    run(sim, 1.5);
    const dealt = start - victim.hp;
    const sp = CHARACTERS[id].special;
    // the scroll fan needs to land more than one scroll up close, or it is not a real damage move
    const enough = sp.kind === 'volley' ? dealt >= sp.damage * 2 : dealt >= sp.damage * 0.9;
    check(`${CHARACTERS[id].name}'s ${sp.name} damages an enemy ${offset}px away`, enough && dealt <= sp.damage * (sp.count ?? 1) * 1.01, `${dealt.toFixed(0)} damage, special is ${sp.damage}${sp.count ? ` x${sp.count}` : ''}`);
  }
}

// 10. healing at your own tower beats dying and waiting for the respawn
{
  const { sim, w } = fresh();
  const p = by(w, 'dharna_dada'); // the biggest health bar
  const hq = MAP.hq[p.alliance as 'rashtra_morcha' | 'jan_ekta'];
  p.x = hq.x; p.y = hq.y; p.hp = 1;
  run(sim, 3);
  check('a full health bar refills inside the tower in under 3 seconds', p.hp >= p.def.hp - 0.01, `${p.hp.toFixed(0)}/${p.def.hp} after 3s`);
}

// 11. round endings: a political headline, an MVP and an 8 second break
{
  const events: any[] = [];
  const sim = new MatchSim((_to: any, type: string, msg: any) => { if (type === 'round_ended') events.push(msg); }, { solo: true, seed: 5 });
  sim.startBotOnly();
  const w = (sim as unknown as { world: any }).world;
  for (const p of w.players) { p.botControlled = false; p.input = { mx: 0, my: 0, attack: false, special: false }; p.x = 1000; p.y = 40; }
  const a = by(w, 'vikas_veer'), b = by(w, 'toofan_rani'), c = by(w, 'kila_singh');
  // c (same side as a) damages b then a lands the KO: c should earn an assist
  damagePlayer(w, b, 20, c);
  damagePlayer(w, b, 999, a);
  check('a hit shortly before a KO counts as an assist', c.round.assists === 1 && a.round.kills === 1, `assists ${c.round.assists}`);
  a.round.kills = 0; a.round.damage = 0; a.stats.kills = 0;
  // a pure damage dealer vs a player who held ground and broke the gate
  const brawler = { ...newTally(), damage: 300, kills: 1 };
  const holder = { ...newTally(), damage: 120, captureSeconds: 14, boothFlips: 2, gateDamage: 200, gateBreaks: 1, assists: 1 };
  check('holding booths and breaking the gate can out-score a lone brawler', mvpScore(holder) > mvpScore(brawler), `${mvpScore(holder)} vs ${mvpScore(brawler)}`);
  check('dying costs MVP points', mvpScore({ ...brawler, deaths: 3 }) < mvpScore(brawler));
  w.votes.rashtra_morcha = 80; w.votes.jan_ekta = 40;
  (sim as any).timeLeft = 0;
  sim.update(1 / 30);
  const e = events[0];
  check('round_ended carries the MVP, votes and a break length', !!e && !!e.mvp && e.votes.rashtra_morcha === 80 && e.intermission === INTERMISSION_SECONDS && INTERMISSION_SECONDS === 8);
  check('the round MVP is from the winning side unless the losers are 10% ahead', !!e && (e.mvp.alliance === e.winner || e.mvp.losingSide));
  check('every round has a political event name', [1, 2, 3].every((r) => themeFor(r).title.length > 3) && themeFor(1).title !== themeFor(2).title);
}

// 12. votes follow play: faster flips, bigger rewards, sweep, double votes at the end, contested capture
{
  const { sim, w } = fresh();
  const booth = w.booths.find((b: any) => b.home === 'jan_ekta');
  const v = by(w, 'vikas_veer');
  v.x = booth.x; v.y = booth.y; v.def = { ...v.def, hp: 9999 }; v.hp = 9999;
  run(sim, 3.2);
  check('one capturer flips a booth in about 3 seconds', booth.owner === 'rashtra_morcha', `progress ${booth.progress.toFixed(2)}`);
  const expected = flipValue(w, { ...booth, flips: 0 }, 'rashtra_morcha');
  check('a flip pays its depth-based value', w.votes.rashtra_morcha >= Math.round(expected) - 0.5 && expected >= 15, `${expected.toFixed(0)} votes`);
}
{
  const { sim, w } = fresh();
  const booth = w.booths.find((b: any) => b.home === 'jan_ekta');
  const att = by(w, 'vikas_veer'), att2 = by(w, 'kila_singh'), def = by(w, 'toofan_rani');
  for (const p of [att, att2, def]) { p.def = { ...p.def, hp: 9999 }; p.hp = 9999; }
  att.x = booth.x; att.y = booth.y; def.x = booth.x; def.y = booth.y; def.alliance = 'jan_ekta';
  run(sim, 4);
  check('one attacker against one defender cannot flip a booth', booth.owner === 'jan_ekta');
  att2.x = booth.x; att2.y = booth.y;
  run(sim, 4);
  check('two attackers against one defender push through slowly', booth.progress > 0.2 || booth.owner === 'rashtra_morcha', `progress ${booth.progress.toFixed(2)}`);
}
{
  const { sim, w } = fresh();
  const target = by(w, 'toofan_rani'), killer = by(w, 'vikas_veer');
  const before = w.votes.rashtra_morcha;
  damagePlayer(w, target, 9999, killer);
  const normal = w.votes.rashtra_morcha - before;
  w.counting = true;
  const t2 = by(w, 'dharna_dada'); const b2 = w.votes.rashtra_morcha;
  damagePlayer(w, t2, 9999, killer);
  check('a KO is worth votes, and double in the last 30 seconds', normal >= 8 && w.votes.rashtra_morcha - b2 >= normal * 2 - 0.01, `${normal} then ${(w.votes.rashtra_morcha - b2).toFixed(0)}`);
  void sim;
}
{
  const { sim, w } = fresh();
  const jan = w.booths.filter((b: any) => b.home === 'jan_ekta');
  jan[0].owner = 'rashtra_morcha'; jan[1].owner = 'rashtra_morcha';
  const v = by(w, 'vikas_veer');
  v.x = jan[2].x; v.y = jan[2].y; v.def = { ...v.def, hp: 9999 }; v.hp = 9999;
  const before = w.votes.rashtra_morcha;
  run(sim, 3.5);
  check('taking all three enemy booths pays the sweep bonus once', jan[2].owner === 'rashtra_morcha' && w.votes.rashtra_morcha - before >= 15 + 80 && w.sweepPaid.rashtra_morcha === true, `+${(w.votes.rashtra_morcha - before).toFixed(0)}`);
}

// 13. booth value follows territory; repeat flips and quick retakes pay less
{
  const { w } = fresh();
  const rm = w.booths.filter((b: any) => b.home === 'rashtra_morcha');
  const je = w.booths.filter((b: any) => b.home === 'jan_ekta');
  const own = Math.max(...rm.map((b: any) => flipValue(w, { ...b, flips: 0 }, 'rashtra_morcha')));
  const deep = Math.max(...je.map((b: any) => flipValue(w, { ...b, flips: 0 }, 'rashtra_morcha')));
  check('retaking your own booth pays much less than invading', own <= 35 && deep >= 55 && deep > own * 1.8, `own up to ${own.toFixed(0)}, deepest ${deep.toFixed(0)}`);
  const b0 = { ...je[0], flips: 0 };
  const seq = [0, 1, 2, 3].map((n) => flipValue(w, { ...b0, flips: n }, 'rashtra_morcha'));
  check('repeat flips of one booth pay x1, x0.6, x0.35, x0.2', Math.abs(seq[1] / seq[0] - 0.6) < 0.01 && Math.abs(seq[2] / seq[0] - 0.35) < 0.01 && Math.abs(seq[3] / seq[0] - 0.2) < 0.01, seq.map((x) => x.toFixed(0)).join(', '));
  w.counting = true;
  check('the last 30 seconds double a flip', Math.abs(flipValue(w, b0, 'rashtra_morcha') / seq[0] - 2) < 0.01);
}
{
  // scripted ping-pong on one booth: each side camps in turn
  const { sim, w } = fresh();
  const booth = w.booths.find((b: any) => b.home === 'jan_ekta');
  const a = by(w, 'vikas_veer'), d = by(w, 'toofan_rani');
  for (const p of [a, d]) { p.def = { ...p.def, hp: 99999 }; p.hp = 99999; }
  let paid = 0;
  let t = 0;
  while (t < 60) {
    const owner = booth.owner;
    const mover = owner === 'jan_ekta' ? a : d;
    const other = owner === 'jan_ekta' ? d : a;
    mover.x = booth.x; mover.y = booth.y; other.x = 1000; other.y = 40;
    for (let i = 0; i < 30; i++) { sim.update(1 / 30); for (const f of w.fx) if (f.kind === 'booth_flip') paid += f.value ?? 0; w.fx = []; }
    t += 1;
  }
  check('trading one booth back and forth for a minute pays little in flip bonuses', paid < 150, `${paid.toFixed(0)} votes of flip bonus (both sides), ${booth.flips} flips`);
}

console.log(failed ? `\n${failed} check(s) FAILED` : '\nall checks passed');
process.exit(failed ? 1 : 0);
