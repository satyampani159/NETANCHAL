// Message types shared by the Colyseus server, the in-browser solo worker and
// the client. Both hosts speak exactly this protocol, so the client cannot tell
// them apart beyond latency.
import type { AllianceId, CharacterId, Role } from './characters';

export const LOBBY_SECONDS = 8;
export const ROUND_SECONDS = 150;
export const ROUNDS_TO_WIN = 2; // best of 3
export const TEAM_SIZE = 4;
export const TICK_HZ = 30;
export const SNAPSHOT_HZ = 20;

export type Phase = 'lobby' | 'playing' | 'round_over' | 'match_over';
export type PingType = 'attack' | 'defend' | 'help' | 'enemy-hidden';

export interface SlotView {
  slotId: string;
  alliance: AllianceId;
  /** null until a human picks or the bot-fill assigns one */
  characterId: CharacterId | null;
  playerId: string | null;
  name: string;
  isBot: boolean;
  ready: boolean;
  /** the player dropped and the seat is held for them for a short while */
  reserved: boolean;
}

export interface LobbyView {
  secondsLeft: number;
  total: number;
  slots: SlotView[];
  /** a match is already running: picking a character takes over its bot instead of waiting for the countdown */
  inProgress: boolean;
  round: number;
  score: Record<AllianceId, number>;
}

export interface PlayerView {
  id: string;
  name: string;
  characterId: CharacterId;
  alliance: AllianceId;
  role: Role;
  isBot: boolean;
  x: number;
  y: number;
  fx: number; // facing unit vector
  fy: number;
  hp: number;
  maxHp: number;
  alive: boolean;
  respawnIn: number;
  attackCd: number;
  specialCd: number;
  shield: number;
  stunned: boolean;
  slowed: boolean;
  buffed: boolean;
  dharna: boolean;
  kills: number;
  deaths: number;
}

export interface ProjectileView { id: number; x: number; y: number; alliance: AllianceId; owner: CharacterId }

export interface GuardView { alliance: AllianceId; x: number; y: number; hp: number; maxHp: number; alive: boolean }

export interface BoothView {
  id: string;
  x: number;
  y: number;
  r: number;
  /** the party whose territory the booth sits in */
  home: AllianceId;
  owner: AllianceId;
  /** capture progress 0..1 toward the other party */
  progress: number;
}

export interface ZoneView {
  /** capture progress 0..1 on each alliance's tower (by the enemy) */
  hqCapture: Record<AllianceId, number>;
  booths: BoothView[];
}

export type FxKind = 'hit' | 'melee' | 'dash' | 'buff' | 'slow' | 'shield' | 'whirlwind' | 'stun' | 'heal' | 'dharna' | 'ko' | 'guard_shot' | 'booth_flip';

export interface FxEvent { id: number; kind: FxKind; x: number; y: number; r: number; alliance: AllianceId; tx?: number; ty?: number }

export interface SlowZoneView { id: number; x: number; y: number; r: number; alliance: AllianceId; ttl: number }

export interface Snapshot {
  t: number;
  phase: Phase;
  round: number;
  timeLeft: number;
  score: Record<AllianceId, number>;
  votes: Record<AllianceId, number>;
  ruling: AllianceId | null;
  players: PlayerView[];
  projectiles: ProjectileView[];
  guards: GuardView[];
  zones: ZoneView;
  slowZones: SlowZoneView[];
  mediaVan: { alliance: AllianceId; x: number; y: number } | null;
  fx: FxEvent[];
}

export interface InputMsg {
  /** movement vector, length <= 1 */
  mx: number;
  my: number;
  /** optional aim direction (mouse); otherwise auto-aims */
  ax?: number;
  ay?: number;
  attack: boolean;
  special: boolean;
}

export interface PlayerStats {
  id: string;
  name: string;
  characterId: CharacterId;
  alliance: AllianceId;
  isBot: boolean;
  kills: number;
  deaths: number;
  damage: number;
  captureSeconds: number;
}

export interface RoundEnded { round: number; winner: AllianceId; reason: 'hq_captured' | 'votes' | 'tiebreak'; score: Record<AllianceId, number> }

export interface MatchEnded { winner: AllianceId; mvp: string; score: Record<AllianceId, number>; stats: PlayerStats[] }

export interface Ping { type: PingType; x: number; y: number; from: string; alliance: AllianceId }

/** server -> client */
export interface ServerMessages {
  /** alliance is null for someone watching a running match who has not picked a character yet */
  welcome: { playerId: string; alliance: AllianceId | null; solo: boolean };
  lobby: LobbyView;
  match_start: Snapshot;
  snapshot: Snapshot;
  round_ended: RoundEnded;
  match_ended: MatchEnded;
  ping: Ping;
  error: { message: string };
}

/** client -> server */
export interface ClientMessages {
  pick: { characterId: CharacterId };
  ready: Record<string, never>;
  input: InputMsg;
  ping: { type: PingType; x: number; y: number };
}
