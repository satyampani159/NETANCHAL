// The whole match lifecycle (lobby → 8s bot-fill → rounds → results) as a
// host-agnostic class. The Socket.io server and the solo Web Worker both wrap
// it and only provide transport.
import { ALLIANCES, ALLIANCE_IDS, type AllianceId, CHARACTERS, type CharacterId, charactersOf, otherAlliance } from '../characters';
import { MAP } from '../map';
import {
  type ClientMessages,
  type LobbyView,
  LOBBY_SECONDS,
  type MatchEnded,
  type Phase,
  type PlayerStats,
  type PlayerTally,
  type RoundMvp,
  ROUND_SECONDS,
  ROUNDS_TO_WIN,
  type RoundEnded,
  type ServerMessages,
  type SlotView,
  type Snapshot,
  TEAM_SIZE,
} from '../protocol';
import { type Difficulty, thinkBot } from './bots/behaviourTree';
import { boothsHeld, resolveCaptures } from './capture';
import { stepBooths, stepGuards, stepPending, stepPlayer, stepProjectiles, stepSlowZones } from './combat';
import { COUNTING_HOUR_SECONDS, INTERMISSION_SECONDS, mvpScore, newTally } from '../rounds';
import { NO_INPUT, bump, inCircle, type SimBooth, type SimGuard, type SimPlayer, type SimWorld, mulberry32 } from './state';

export type Outbound = <K extends keyof ServerMessages>(to: string | '*', type: K, msg: ServerMessages[K]) => void;

export interface MatchSimOptions {
  solo: boolean;
  difficulty?: Difficulty;
  /** test hook: a different bot level per party, or a party whose bots just stand still */
  teamDifficulty?: Partial<Record<AllianceId, Difficulty | 'passive'>>;
  seed?: number;
  lobbySeconds?: number;
  roundSeconds?: number;
  /** first-match coaching: bots stay at their spawn for this many seconds of round 1 */
  tutorialIdleSeconds?: number;
  /** pause between rounds */
  intermissionSeconds?: number;
}

interface Slot {
  slotId: string;
  alliance: AllianceId;
  index: number;
  characterId: CharacterId | null;
  playerId: string | null;
  name: string;
  ready: boolean;
  /** a human is present (false while their seat is only being held after a dropped connection) */
  connected: boolean;
  /** sim time until which a dropped player's seat is held for them; null when not reserved */
  reservedUntil: number | null;
}

/** a new human joining an online lobby restarts the countdown, until the lobby is this old (seconds) */
const LOBBY_EXTEND_WINDOW = 30;

/** how many people may wait on the lobby screen of a running match */
const MAX_VIEWERS = 8;

const GUARD_BASE = { hp: 320, damage: 11, range: 230, radius: 26 };
const GUARD_RULING = { hp: 480, damage: 14, range: 250, radius: 28 };

export class MatchSim {
  phase: Phase = 'lobby';
  round = 0;
  timeLeft = 0;
  score: Record<AllianceId, number> = { rashtra_morcha: 0, jan_ekta: 0 };
  readonly difficulty: Difficulty;
  private readonly teamDifficulty: NonNullable<MatchSimOptions['teamDifficulty']>;
  readonly solo: boolean;

  private slots: Slot[] = [];
  private lobbyLeft: number;
  private lobbyTotal: number;
  /** seconds the lobby has been open; late joiners only extend the countdown within this window */
  private lobbyAge = 0;
  /** people who joined a running match and have not picked a character yet */
  private viewers = new Map<string, string>();
  private intermissionLeft = 0;
  private world!: SimWorld;
  private t = 0;
  private rng: () => number;
  private botCount = 0;
  private lastLobbySecond = -1;
  private readonly roundSeconds: number;
  private readonly tutorialIdle: number;
  private readonly intermission: number;

  constructor(
    private out: Outbound,
    opts: MatchSimOptions,
  ) {
    this.solo = opts.solo;
    this.difficulty = opts.difficulty ?? 'normal';
    this.teamDifficulty = opts.teamDifficulty ?? {};
    this.rng = mulberry32(opts.seed ?? Math.floor(Math.random() * 2 ** 31));
    this.lobbyTotal = this.lobbyLeft = opts.lobbySeconds ?? LOBBY_SECONDS;
    this.roundSeconds = opts.roundSeconds ?? ROUND_SECONDS;
    this.tutorialIdle = opts.tutorialIdleSeconds ?? 0;
    this.intermission = opts.intermissionSeconds ?? INTERMISSION_SECONDS;
    for (const alliance of ALLIANCE_IDS)
      for (let i = 0; i < TEAM_SIZE; i++)
        this.slots.push({ slotId: `${alliance}-${i}`, alliance, index: i, characterId: null, playerId: null, name: '', ready: false, connected: false, reservedUntil: null });
  }

  // ---------------- lobby ----------------

  /** humans who are connected and seated */
  get humanCount() {
    return this.slots.filter((s) => s.playerId && s.connected).length;
  }

  /** everyone currently in the room: seated humans plus people watching a running match */
  get peopleCount() {
    return this.humanCount + this.viewers.size;
  }

  get isFull() {
    return this.humanCount >= TEAM_SIZE * 2 || this.phase !== 'lobby';
  }

  /** seats a new arrival could take right now (lobby: free seats; running match: characters no human holds) */
  openSeats(): number {
    return this.slots.filter((s) => !s.playerId).length;
  }

  /** false once the match is over, or when too many people are already waiting */
  joinable(): boolean {
    if (this.phase === 'match_over') return false;
    if (this.phase === 'lobby') return this.openSeats() > 0;
    return this.viewers.size < MAX_VIEWERS;
  }

  hasPlayer(playerId: string): boolean {
    return this.viewers.has(playerId) || this.slots.some((s) => s.playerId === playerId);
  }

  /**
   * Lobby: takes a seat (provisional alliance until the player picks).
   * Running match: the player becomes a viewer who sees the lobby and may pick any
   * character no other human holds. Returns the alliance, 'viewer', or null if they cannot join.
   */
  addPlayer(playerId: string, name: string, preferred?: AllianceId): AllianceId | 'viewer' | null {
    if (this.phase === 'match_over') return null;
    // the same player coming back (page reload, reconnect)
    if (this.hasPlayer(playerId)) return this.rejoin(playerId);

    if (this.phase !== 'lobby') {
      if (this.viewers.size >= MAX_VIEWERS) return null;
      this.viewers.set(playerId, name);
      this.out(playerId, 'welcome', { playerId, alliance: null, solo: this.solo });
      this.out(playerId, 'lobby', this.lobbyView());
      return 'viewer';
    }

    const humans = (a: AllianceId) => this.slots.filter((s) => s.alliance === a && s.playerId).length;
    let alliance: AllianceId =
      preferred ?? (humans('rashtra_morcha') === humans('jan_ekta') ? (this.rng() < 0.5 ? 'rashtra_morcha' : 'jan_ekta') : humans('rashtra_morcha') < humans('jan_ekta') ? 'rashtra_morcha' : 'jan_ekta');
    let slot = this.slots.find((s) => s.alliance === alliance && !s.playerId);
    if (!slot) {
      alliance = otherAlliance(alliance);
      slot = this.slots.find((s) => s.alliance === alliance && !s.playerId);
    }
    if (!slot) return null;
    slot.playerId = playerId;
    slot.name = name;
    slot.connected = true;
    // online, everyone who joins gets the full countdown to pick, but a match can't be stalled for ever
    if (!this.solo && this.lobbyAge < LOBBY_EXTEND_WINDOW) this.lobbyLeft = Math.max(this.lobbyLeft, this.lobbyTotal);
    this.out(playerId, 'welcome', { playerId, alliance, solo: this.solo });
    this.broadcastLobby();
    return alliance;
  }

  /**
   * A player leaves or loses their connection.
   * Lobby: the seat is freed. Running match: a bot takes over the character at once.
   * With `graceSeconds` the seat stays reserved so the same player can reclaim it
   * (dropped connection); without it the seat is freed straight away (deliberate Leave).
   */
  removePlayer(playerId: string, graceSeconds = 0) {
    if (this.viewers.delete(playerId)) return;
    const slot = this.slots.find((s) => s.playerId === playerId);
    if (!slot) return;
    if (this.phase === 'lobby') {
      Object.assign(slot, { playerId: null, characterId: null, name: '', ready: false, connected: false, reservedUntil: null });
      this.broadcastLobby();
      return;
    }
    const p = this.world?.players.find((pl) => pl.slotId === slot.slotId);
    if (p) {
      p.botControlled = true;
      p.input = { ...NO_INPUT };
    }
    if (graceSeconds > 0) {
      slot.connected = false;
      slot.reservedUntil = this.t + graceSeconds;
    } else this.releaseSeat(slot);
    this.broadcastLobby();
  }

  /** A player who dropped (or reloaded) reclaims their seat; returns their alliance, or null if it is gone. */
  rejoin(playerId: string): AllianceId | 'viewer' | null {
    if (this.viewers.has(playerId)) {
      this.out(playerId, 'welcome', { playerId, alliance: null, solo: this.solo });
      this.out(playerId, 'lobby', this.lobbyView());
      return 'viewer';
    }
    const slot = this.slots.find((s) => s.playerId === playerId);
    if (!slot) return null;
    slot.connected = true;
    slot.reservedUntil = null;
    const p = this.world?.players.find((pl) => pl.slotId === slot.slotId);
    if (p) {
      p.botControlled = false;
      p.input = { ...NO_INPUT };
    }
    this.out(playerId, 'welcome', { playerId, alliance: slot.alliance, solo: this.solo });
    this.broadcastLobby();
    if (this.world) this.out(playerId, 'match_start', this.snapshot(false));
    return slot.alliance;
  }

  /** the seat goes back to the bot that was already playing it, and others may take it over */
  private releaseSeat(slot: Slot) {
    const p = this.world?.players.find((pl) => pl.slotId === slot.slotId);
    if (p) p.humanId = null;
    Object.assign(slot, {
      playerId: null,
      connected: false,
      ready: false,
      reservedUntil: null,
      name: slot.characterId ? CHARACTERS[slot.characterId].name : '',
    });
  }

  private expireReservations() {
    let changed = false;
    for (const s of this.slots)
      if (s.reservedUntil !== null && this.t >= s.reservedUntil) {
        this.releaseSeat(s);
        changed = true;
      }
    if (changed) this.broadcastLobby();
  }

  handle<K extends keyof ClientMessages>(playerId: string, type: K, msg: ClientMessages[K]) {
    switch (type) {
      case 'pick':
        return this.pick(playerId, (msg as ClientMessages['pick']).characterId);
      case 'ready':
        return this.ready(playerId);
      case 'input': {
        const p = this.world?.players.find((pl) => pl.humanId === playerId && !pl.botControlled);
        if (!p) return;
        const m = msg as ClientMessages['input'];
        const len = Math.hypot(m.mx, m.my);
        p.input = {
          mx: len > 1 ? m.mx / len : m.mx || 0,
          my: len > 1 ? m.my / len : m.my || 0,
          ax: Number.isFinite(m.ax) ? m.ax : undefined,
          ay: Number.isFinite(m.ay) ? m.ay : undefined,
          attack: !!m.attack,
          special: !!m.special,
        };
        return;
      }
      case 'ping': {
        const slot = this.slots.find((s) => s.playerId === playerId && s.connected);
        const me = slot && this.world?.players.find((pl) => pl.slotId === slot.slotId);
        if (!slot || !me) return;
        const m = msg as ClientMessages['ping'];
        // the position comes from the server's own copy of the player, never from the client
        const from = CHARACTERS[me.def.id].name;
        // pings are team-only
        for (const s of this.slots)
          if (s.playerId && s.connected && s.alliance === slot.alliance) this.out(s.playerId, 'ping', { type: m.type, x: me.x, y: me.y, from, alliance: slot.alliance });
        return;
      }
    }
  }

  /** Any of the 8 netas can be picked; the pick decides which alliance the player plays for. */
  private pick(playerId: string, characterId: CharacterId) {
    if (this.phase === 'playing' || this.phase === 'round_over') return this.takeOver(playerId, characterId);
    if (this.phase !== 'lobby') return;
    let slot = this.slots.find((s) => s.playerId === playerId);
    const def = CHARACTERS[characterId];
    if (!slot || !def) return;
    if (this.slots.some((s) => s !== slot && s.characterId === characterId)) {
      this.out(playerId, 'error', { message: `${def.name} is already taken.` });
      return;
    }
    if (def.alliance !== slot.alliance) {
      // switch sides: move into a free seat of the other alliance
      const seat = this.slots.find((s) => s.alliance === def.alliance && !s.playerId);
      if (!seat) {
        this.out(playerId, 'error', { message: `${ALLIANCES[def.alliance].name} is full. Pick from your side.` });
        return;
      }
      Object.assign(seat, { playerId, name: slot.name, connected: true, ready: false });
      Object.assign(slot, { playerId: null, characterId: null, name: '', ready: false, connected: false });
      slot = seat;
      this.out(playerId, 'welcome', { playerId, alliance: def.alliance, solo: this.solo });
    }
    slot.characterId = characterId;
    this.broadcastLobby();
  }

  /** A viewer of a running match takes over the bot playing the chosen character, in place. */
  private takeOver(playerId: string, characterId: CharacterId) {
    const name = this.viewers.get(playerId);
    if (name === undefined) {
      this.out(playerId, 'error', { message: 'You are already playing. Leave the match to pick someone else.' });
      return;
    }
    const slot = this.slots.find((s) => s.characterId === characterId);
    const def = CHARACTERS[characterId];
    if (!slot || !def) {
      this.out(playerId, 'error', { message: 'Unknown character.' });
      return;
    }
    if (slot.playerId) {
      this.out(playerId, 'error', { message: `${def.name} is being played by someone else.` });
      return;
    }
    const p = this.world.players.find((pl) => pl.slotId === slot.slotId);
    if (!p) return;
    this.viewers.delete(playerId);
    Object.assign(slot, { playerId, name, connected: true, ready: true, reservedUntil: null });
    p.humanId = playerId;
    p.botControlled = false;
    p.input = { ...NO_INPUT };
    p.bot.retreating = false;
    this.out(playerId, 'welcome', { playerId, alliance: slot.alliance, solo: this.solo });
    // the lobby view first, so the client can find its seat, then the live state
    this.broadcastLobby();
    this.out(playerId, 'match_start', this.snapshot(false));
  }

  /** the host of a private room skips the rest of the countdown */
  startNow() {
    if (this.phase === 'lobby' && this.humanCount > 0) this.lobbyLeft = Math.min(this.lobbyLeft, 0.3);
  }

  private ready(playerId: string) {
    const slot = this.slots.find((s) => s.playerId === playerId);
    if (!slot || this.phase !== 'lobby') return;
    slot.ready = true;
    const humans = this.slots.filter((s) => s.playerId && s.connected);
    // in solo the human can skip the wait; online everyone has to be ready
    if (humans.length > 0 && humans.every((s) => s.ready && s.characterId)) this.lobbyLeft = Math.min(this.lobbyLeft, 0.6);
    this.broadcastLobby();
  }

  lobbyView(): LobbyView {
    const slots: SlotView[] = this.slots.map((s) => ({
      slotId: s.slotId,
      alliance: s.alliance,
      characterId: s.characterId,
      playerId: s.playerId,
      name: s.name,
      isBot: !s.playerId,
      ready: s.ready,
      reserved: s.reservedUntil !== null,
    }));
    const inProgress = this.phase !== 'lobby';
    return {
      secondsLeft: inProgress ? 0 : Math.max(0, this.lobbyLeft),
      total: this.lobbyTotal,
      slots,
      inProgress,
      round: this.round,
      score: { ...this.score },
    };
  }

  private broadcastLobby() {
    this.out('*', 'lobby', this.lobbyView());
  }

  /** Any seat still unpicked when the ring hits zero is filled by a bot. */
  private fillWithBots() {
    for (const alliance of ALLIANCE_IDS) {
      const seats = this.slots.filter((s) => s.alliance === alliance);
      const free = () => charactersOf(alliance).filter((c) => !seats.some((s) => s.characterId === c.id));
      // humans who never picked get a random free character first
      for (const s of seats.filter((x) => x.playerId && !x.characterId)) {
        const options = free();
        s.characterId = options[Math.floor(this.rng() * options.length)].id;
      }
      for (const s of seats.filter((x) => !x.characterId)) {
        const options = free();
        s.characterId = options[Math.floor(this.rng() * options.length)].id;
        s.name = CHARACTERS[s.characterId].name;
      }
    }
  }

  // ---------------- match ----------------

  private startMatch() {
    this.fillWithBots();
    this.broadcastLobby();
    const players: SimPlayer[] = this.slots.map((s) => {
      const def = CHARACTERS[s.characterId!];
      return {
        id: s.slotId,
        slotId: s.slotId,
        // everyone is shown by their character's name, human or bot
        name: def.name,
        humanId: s.playerId,
        botControlled: !s.playerId || !s.connected,
        def,
        alliance: s.alliance,
        spawnIndex: s.index,
        x: 0,
        y: 0,
        fx: s.alliance === 'rashtra_morcha' ? 1 : -1,
        fy: 0,
        hp: def.hp,
        alive: true,
        respawnIn: 0,
        attackCd: 0,
        specialCd: 0,
        stunTtl: 0,
        braceTtl: 0,
        braceFrac: 0,
        slowFactor: 1,
        hitSlowTtl: 0,
        recoilTtl: 0,
        dashTtl: 0,
        dashVx: 0,
        dashVy: 0,
        dashHit: new Set(),
        dashDamage: 0,
        dashRadius: 0,
        dashKnock: 0,
        dashThen: null,
        healFxCd: 0,
        input: { ...NO_INPUT },
        bot: { thinkIn: 0, input: { ...NO_INPUT }, jx: (this.rng() - 0.5) * 120, jy: (this.rng() - 0.5) * 160, detourSign: this.rng() < 0.5 ? 1 : -1, retreating: false },
        stats: newTally(),
        round: newTally(),
        hitBy: {},
        roundKills: 0,
        roundDeaths: 0,
      };
    });
    this.world = {
      map: MAP,
      players,
      projectiles: [],
      guards: { rashtra_morcha: this.makeGuard('rashtra_morcha', null), jan_ekta: this.makeGuard('jan_ekta', null) },
      slowZones: [],
      pending: [],
      hqCapture: { rashtra_morcha: 0, jan_ekta: 0 },
      booths: this.makeBooths(),
      votes: { rashtra_morcha: 0, jan_ekta: 0 },
      ruling: null,
      counting: false,
      sweepPaid: { rashtra_morcha: false, jan_ekta: false },
      fx: [],
      nextId: 1,
      rng: this.rng,
    };
    this.startRound();
    this.out('*', 'match_start', this.snapshot());
  }

  private makeBooths(): SimBooth[] {
    return ALLIANCE_IDS.flatMap((home) =>
      MAP.booths[home].map((b, i) => ({ id: `${home}-b${i + 1}`, home, x: b.x, y: b.y, r: b.r, owner: home, progress: 0, cd: 0, heldFor: 0, flips: 0, shield: 0 })),
    );
  }

  private makeGuard(alliance: AllianceId, ruling: AllianceId | null): SimGuard {
    const g = ruling === alliance ? GUARD_RULING : GUARD_BASE;
    const pos = MAP.guardPosts[alliance];
    return { alliance, x: pos.x, y: pos.y, hp: g.hp, maxHp: g.hp, alive: true, cd: 0, radius: g.radius, range: g.range, damage: g.damage };
  }

  private startRound() {
    const w = this.world;
    this.round++;
    this.phase = 'playing';
    this.timeLeft = this.roundSeconds;
    // the previous round's winner forms the government and defends a stronger gate
    w.guards = { rashtra_morcha: this.makeGuard('rashtra_morcha', w.ruling), jan_ekta: this.makeGuard('jan_ekta', w.ruling) };
    w.projectiles = [];
    w.slowZones = [];
    w.pending = [];
    w.hqCapture = { rashtra_morcha: 0, jan_ekta: 0 };
    w.booths = this.makeBooths();
    w.votes = { rashtra_morcha: 0, jan_ekta: 0 };
    w.counting = false;
    w.sweepPaid = { rashtra_morcha: false, jan_ekta: false };
    for (const p of w.players) {
      const sp = MAP.spawns[p.alliance][p.spawnIndex];
      Object.assign(p, {
        x: sp.x,
        y: sp.y,
        hp: p.def.hp,
        alive: true,
        respawnIn: 0,
        attackCd: 0,
        specialCd: p.def.special.cooldown * 0.4,
        hitSlowTtl: 0,
        recoilTtl: 0,
        stunTtl: 0,
        braceTtl: 0,
        dashThen: null,
        dashTtl: 0,
        roundKills: 0,
        roundDeaths: 0,
        round: newTally(),
        hitBy: {},
        input: { ...NO_INPUT },
        fx: p.alliance === 'rashtra_morcha' ? 1 : -1,
        fy: 0,
      });
    }
  }

  private endRound(winner: AllianceId, reason: RoundEnded['reason']) {
    const w = this.world;
    if (reason === 'hq_captured') {
      // credit whoever was standing in the tower ring when it fell
      const zone = w.map.hq[otherAlliance(winner)];
      for (const p of w.players) if (p.alive && p.alliance === winner && inCircle(p.x, p.y, zone)) bump(p, 'towerCaptures');
    }
    this.score[winner]++;
    w.ruling = winner;
    const msg: RoundEnded = {
      round: this.round,
      winner,
      reason,
      score: { ...this.score },
      votes: { rashtra_morcha: Math.floor(w.votes.rashtra_morcha), jan_ekta: Math.floor(w.votes.jan_ekta) },
      intermission: this.intermission,
      mvp: this.pickMvp(winner, (p) => p.round),
    };
    this.out('*', 'round_ended', msg);
    if (this.score[winner] >= ROUNDS_TO_WIN) {
      this.phase = 'match_over';
      this.out('*', 'snapshot', this.snapshot());
      this.out('*', 'match_ended', this.results(winner));
    } else {
      this.phase = 'round_over';
      this.intermissionLeft = this.intermission;
    }
  }

  private statsOf(p: SimPlayer, tally: PlayerTally): PlayerStats {
    return {
      id: p.id,
      name: p.name,
      characterId: p.def.id,
      alliance: p.alliance,
      isBot: !p.humanId,
      ...tally,
      damage: Math.round(tally.damage),
      captureSeconds: Math.round(tally.captureSeconds),
      gateDamage: Math.round(tally.gateDamage),
      score: Math.round(mvpScore(tally)),
    };
  }

  /** The best player overall; a winning-side player is preferred when they are within 10% of the top score. */
  private pickMvp(winner: AllianceId, tallyOf: (p: SimPlayer) => PlayerTally): RoundMvp {
    const all = this.world.players.map((p) => this.statsOf(p, tallyOf(p))).sort((x, y) => y.score - x.score);
    const top = all[0];
    const bestWinner = all.find((s) => s.alliance === winner) ?? top;
    const pick = bestWinner.score >= top.score * 0.9 ? bestWinner : top;
    return { ...pick, losingSide: pick.alliance !== winner };
  }

  private results(winner: AllianceId): MatchEnded {
    const stats = this.world.players.map((p) => this.statsOf(p, p.stats));
    const mvp = this.pickMvp(winner, (p) => p.stats);
    return { winner, mvp: mvp.id, score: { ...this.score }, stats };
  }

  private checkRoundEnd() {
    const w = this.world;
    for (const a of ALLIANCE_IDS) if (w.hqCapture[a] >= 1) return this.endRound(otherAlliance(a), 'hq_captured');
    if (this.timeLeft > 0) return;
    const rm = Math.floor(w.votes.rashtra_morcha);
    const je = Math.floor(w.votes.jan_ekta);
    if (rm !== je) return this.endRound(rm > je ? 'rashtra_morcha' : 'jan_ekta', 'votes');
    // level on votes: more booths wins, then the ruling party, then whoever got closer to the other tower
    const bm = boothsHeld(w, 'rashtra_morcha');
    const bj = boothsHeld(w, 'jan_ekta');
    if (bm !== bj) return this.endRound(bm > bj ? 'rashtra_morcha' : 'jan_ekta', 'votes');
    const tie = w.ruling ?? (w.hqCapture.jan_ekta >= w.hqCapture.rashtra_morcha ? 'rashtra_morcha' : 'jan_ekta');
    this.endRound(tie, 'tiebreak');
  }

  update(dt: number) {
    this.t += dt;
    if (this.world) this.expireReservations();
    if (this.phase === 'lobby') {
      this.lobbyLeft -= dt;
      this.lobbyAge += dt;
      const sec = Math.ceil(this.lobbyLeft);
      if (sec !== this.lastLobbySecond) {
        this.lastLobbySecond = sec;
        this.broadcastLobby();
      }
      // online rooms with nobody connected just wait
      if (this.lobbyLeft <= 0 && this.humanCount > 0) this.startMatch();
      return;
    }
    if (this.phase === 'match_over') return;
    if (this.phase === 'round_over') {
      this.intermissionLeft -= dt;
      if (this.intermissionLeft <= 0) this.startRound();
      return;
    }

    const w = this.world;
    this.timeLeft = Math.max(0, this.timeLeft - dt);
    w.counting = this.timeLeft <= COUNTING_HOUR_SECONDS && this.timeLeft > 0;
    for (const p of w.players) {
      if (!p.botControlled) continue;
      const level = this.teamDifficulty[p.alliance] ?? this.difficulty;
      const coaching = this.round === 1 && this.tutorialIdle > 0 && this.roundSeconds - this.timeLeft < this.tutorialIdle;
      if (level === 'passive' || coaching) p.input = { ...NO_INPUT };
      else thinkBot(w, p, level, dt, this.timeLeft);
    }
    for (const p of w.players) stepPlayer(w, p, dt);
    stepProjectiles(w, dt);
    stepPending(w, dt);
    stepGuards(w, dt);
    stepBooths(w, dt);
    stepSlowZones(w, dt);
    resolveCaptures(w, dt);
    this.checkRoundEnd();
  }

  /** `drainFx` false is for a one-off copy sent to a single player, so it does not swallow effects the others still need */
  snapshot(drainFx = true): Snapshot {
    const w = this.world;
    const fxOut = drainFx ? w.fx : [];
    if (drainFx) w.fx = [];
    const ruling = w.ruling;
    return {
      t: this.t,
      phase: this.phase,
      round: this.round,
      timeLeft: this.timeLeft,
      score: { ...this.score },
      votes: { rashtra_morcha: Math.floor(w.votes.rashtra_morcha), jan_ekta: Math.floor(w.votes.jan_ekta) },
      counting: w.counting,
      ruling,
      players: w.players.map((p) => ({
        id: p.id,
        name: p.name,
        characterId: p.def.id,
        alliance: p.alliance,
        isBot: p.botControlled,
        x: Math.round(p.x * 10) / 10,
        y: Math.round(p.y * 10) / 10,
        fx: p.fx,
        fy: p.fy,
        hp: Math.ceil(p.hp),
        maxHp: p.def.hp,
        alive: p.alive,
        respawnIn: Math.max(0, p.respawnIn),
        attackCd: p.attackCd,
        specialCd: p.specialCd,
        stunned: p.stunTtl > 0,
        slowed: p.slowFactor < 1,
        braced: p.braceTtl > 0,
        kills: p.stats.kills,
        deaths: p.stats.deaths,
      })),
      projectiles: w.projectiles.map((pr) => ({ id: pr.id, x: Math.round(pr.x), y: Math.round(pr.y), alliance: pr.alliance, owner: pr.owner, big: pr.big })),
      guards: ALLIANCE_IDS.map((a) => {
        const g = w.guards[a];
        return { alliance: a, x: g.x, y: g.y, hp: Math.ceil(g.hp), maxHp: g.maxHp, alive: g.alive };
      }),
      zones: {
        hqCapture: { ...w.hqCapture },
        booths: w.booths.map((b) => ({ id: b.id, x: b.x, y: b.y, r: b.r, home: b.home, owner: b.owner, progress: b.progress })),
      },
      slowZones: w.slowZones.map((z) => ({ id: z.id, x: z.x, y: z.y, r: z.r, alliance: z.alliance, ttl: z.ttl })),
      mediaVan: ruling ? { alliance: otherAlliance(ruling), ...MAP.mediaVan[otherAlliance(ruling)] } : null,
      fx: fxOut,
    };
  }

  /** Slot id a human controls in the match (same as their PlayerView id). */
  characterOf(playerId: string): string | null {
    return this.slots.find((s) => s.playerId === playerId)?.slotId ?? null;
  }

  /** test/balance hook: start an all-bot match immediately */
  startBotOnly() {
    this.startMatch();
  }
}
