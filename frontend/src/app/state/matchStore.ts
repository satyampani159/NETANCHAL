import { create } from 'zustand';
import type { AllianceId, Difficulty, RoundEnded } from '@netanchal/shared';
import { serverConfig } from '../../phaser/net/RoomClient';

export type PlayMode = 'solo' | 'online';

interface MatchState {
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

const randomName = () => `Neta ${Math.floor(100 + Math.random() * 900)}`;

export const matchStore = create<MatchState>((set) => ({
  mode: HAS_SERVER_CONFIG ? 'online' : 'solo',
  difficulty: 'normal',
  playerName: randomName(),
  alliance: null,
  lastRound: null,
  notice: null,
  setMode: (mode) => set({ mode }),
  setDifficulty: (difficulty) => set({ difficulty }),
  setAlliance: (alliance) => set({ alliance }),
  setLastRound: (lastRound) => set({ lastRound }),
  setNotice: (notice) => set({ notice }),
}));
