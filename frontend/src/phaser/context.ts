import type { Snapshot } from '@netanchal/shared';
import type { GameRoom } from './net/RoomClient';

export interface GameContext {
  room: GameRoom;
  initialState: Snapshot;
  mySlot: string;
}

/** Written by HUDScene (touch controls), read by MatchScene when it builds the input message. */
export interface TouchInput {
  mx: number;
  my: number;
  attack: boolean;
  special: boolean;
}

export const TOUCH_UI = () =>
  typeof window !== 'undefined' && (window.matchMedia?.('(pointer: coarse)').matches || navigator.maxTouchPoints > 0);
