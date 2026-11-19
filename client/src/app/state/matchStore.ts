import { create } from 'zustand';
import type { AllianceId, Difficulty, JoinMode, RoundEnded } from '@netanchal/shared';
import { serverConfig } from '../../phaser/net/RoomClient';
import { profileStore } from './profileStore';

export type PlayMode = 'solo' | 'online';

export interface RoomIntent {
  mode: JoinMode;
  code: string;
}

interface MatchState {
  /** the current match is the guided first match */
  coaching: boolean;
  setCoaching: (c: boolean) => void;
  /** what the next lobby visit should do: quick match, make a private room, or join one by code */
  roomIntent: RoomIntent;
  setRoomIntent: (i: RoomIntent) => void;
  mode: PlayMode;
  difficulty: Difficulty;
  playerName: string;
  /** set by the lobby once the room says which alliance we're on */
  alliance: AllianceId | null;
  lastRound: RoundEnded | null;
  notice: string | null;
  setMode: (mode: PlayMode) => void;
  setDifficulty: (d: Difficulty) => void;
  setAlliance: (a: AllianceId | null) => void;
  setLastRound: (r: RoundEnded | null) => void;
  setNotice: (n: string | null) => void;
}

/**
 * Where the game server is. `VITE_SERVER_URL` (or `?server=`) when set; otherwise the page's own origin,
 * which works when the server also serves the site. `HAS_SERVER_CONFIG` says whether it was set on purpose.
 */
const config = serverConfig();
export const SERVER_URL: string = config.url;
export const HAS_SERVER_CONFIG: boolean = config.configured;


export const matchStore = create<MatchState>((set) => ({
  coaching: false,
  setCoaching: (coaching) => set({ coaching }),
  roomIntent: { mode: 'quick', code: '' },
  setRoomIntent: (roomIntent) => set({ roomIntent }),
  mode: HAS_SERVER_CONFIG ? 'online' : 'solo',
  difficulty: 'normal',
  playerName: profileStore.getState().profile.name,
  alliance: null,
  lastRound: null,
  notice: null,
  setMode: (mode) => set({ mode }),
  setDifficulty: (difficulty) => set({ difficulty }),
  setAlliance: (alliance) => set({ alliance }),
  setLastRound: (lastRound) => set({ lastRound }),
  setNotice: (notice) => set({ notice }),
}));
