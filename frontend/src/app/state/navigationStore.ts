import { create } from 'zustand';
import type { MatchEnded, Snapshot } from '@netanchal/shared';
import type { GameRoom } from '../../phaser/net/RoomClient';

// Exactly the states from the screen-flow diagram, plus the payload each needs.
export type Screen =
  | { name: 'landing' }
  | { name: 'lobby' }
  | { name: 'game'; room: GameRoom; initialState: Snapshot; mySlot: string }
  | { name: 'results'; result: MatchEnded; mySlot: string };

interface NavigationState {
  screen: Screen;
  goTo: (screen: Screen) => void;
}

export const navigationStore = create<NavigationState>((set) => ({
  screen: { name: 'landing' },
  goTo: (screen) => {
    set({ screen });
    if (typeof window !== 'undefined') window.scrollTo(0, 0);
  },
}));

export const useScreen = () => navigationStore((s) => s.screen);
