import { useEffect, useRef, useState } from 'react';
import type { Snapshot } from '@netanchal/shared';
import { gameAudio } from '../../game/audio';
import { eventBus } from '../../game/EventBus';
import { FullscreenChrome } from '../../game/FullscreenChrome';
import { exitFullscreen, isFullscreen, isPortraitTouch, lockLandscape, onFullscreenChange, requestFullscreen, unlockOrientation } from '../../game/fullscreen';
import { PhaserMount } from '../../game/PhaserMount';
import type { GameRoom, RoomStatus } from '../../phaser/net/RoomClient';
import { navigationStore } from '../state/navigationStore';
import { Coach } from './Coach';
import { matchStore } from '../state/matchStore';
import { RoundBreak } from './RoundBreak';
import { profileStore } from '../state/profileStore';

export interface GameScreenProps {
  room: GameRoom;
  initialState: Snapshot;
  mySlot: string;
}

export function GameScreen({ room, initialState, mySlot }: GameScreenProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const leaving = useRef(false);
  const [status, setStatus] = useState<RoomStatus>(room.status);
  const [lostMessage, setLostMessage] = useState<string | null>(null);
  const [portrait, setPortrait] = useState(isPortraitTouch());
  const coaching = matchStore((st) => st.coaching);

  // phones play sideways: ask for it, and show a "turn your phone" screen while it is upright
  useEffect(() => {
    lockLandscape();
    const update = () => setPortrait(isPortraitTouch());
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      unlockOrientation();
    };
  }, []);

  useEffect(() => {
    // usually already fullscreen from the lobby tap; this only succeeds if that gesture is still fresh
    requestFullscreen(document.documentElement);
    let wasFullscreen = isFullscreen();
    gameAudio.startMusic('match');

    const exitToLobby = () => {
      if (leaving.current) return;
      leaving.current = true;
      exitFullscreen();
      navigationStore.getState().goTo({ name: 'lobby' });
    };

    const offs = [
      room.onStatus(setStatus),
      room.on('error', (e) => setLostMessage(e.message)),
      eventBus.on('ui:exit-requested', exitToLobby),
      eventBus.on('game:match-ended', (result) => {
        leaving.current = true;
        matchStore.getState().setCoaching(false);
        const me = result.stats.find((x) => x.id === mySlot);
        if (me) {
          profileStore.getState().recordMatch({
            won: me.alliance === result.winner,
            roundsWon: result.score[me.alliance],
            mvp: result.mvp === mySlot,
            character: me.characterId,
            stats: me,
            privateRoom: !!room.latest.lobby?.isPrivate,
          });
        }
        navigationStore.getState().goTo({ name: 'results', result, mySlot });
      }),
      // the OS left fullscreen (swipe-up, Android back, Esc): same as pressing X
      onFullscreenChange(() => {
        const now = isFullscreen();
        if (wasFullscreen && !now) exitToLobby();
        wasFullscreen = now;
      }),
    ];
    return () => {
      offs.forEach((off) => off());
      gameAudio.startMusic('menu');
      room.leave();
    };
  }, [room, mySlot]);

  return (
    <div ref={containerRef} className="fixed inset-0 bg-black overflow-hidden select-none touch-none">
      <PhaserMount room={room} initialState={initialState} mySlot={mySlot} />
      {coaching && <Coach room={room} mySlot={mySlot} />}
      <RoundBreak mySlot={mySlot} myCharacter={initialState.players.find((p) => p.id === mySlot)?.characterId ?? null} />
      <FullscreenChrome onExit={() => eventBus.emit('ui:exit-requested')} />
      {portrait && (
        <div role="alertdialog" aria-label="Turn your phone sideways" className="absolute inset-0 z-40 grid place-items-center bg-nb p-6 text-center text-pop-paper">
          <div className="flex flex-col items-center gap-5">
            <svg viewBox="0 0 64 64" className="w-24 h-24 animate-[turn_2.4s_ease-in-out_infinite]" aria-hidden="true">
              <rect x="20" y="6" width="24" height="52" rx="5" fill="none" stroke="#FFD60A" strokeWidth="4" />
              <circle cx="32" cy="51" r="2.5" fill="#FFD60A" />
            </svg>
            <p className="font-brut uppercase text-2xl leading-tight">Turn your phone sideways</p>
            <p className="text-sm text-pop-paper/75 max-w-[26ch]">Netanchal is played in landscape. A bot is playing for you until you turn it.</p>
            <button
              type="button"
              onClick={() => {
                requestFullscreen(document.documentElement);
                lockLandscape();
              }}
              className="nb-press rounded-xl border-[3px] border-pop-paper bg-pop-yellow text-nb font-sfx text-2xl px-6 pt-1 shadow-nb-sm"
            >
              Go fullscreen
            </button>
          </div>
        </div>
      )}
      {status === 'reconnecting' && (
        <div role="status" className="absolute inset-x-0 top-[max(64px,calc(env(safe-area-inset-top)+56px))] z-20 mx-auto w-fit max-w-[90vw] rounded-lg border-[3px] border-nb bg-pop-yellow px-4 py-2 text-center font-brut uppercase text-sm shadow-nb-sm">
          Connection lost. Reconnecting… a bot is playing for you.
        </div>
      )}
      {status === 'closed' && (
        <div role="alertdialog" aria-label="Disconnected" className="absolute inset-0 z-30 grid place-items-center bg-black/70 p-4">
          <div className="nb-card bg-pop-paper p-5 text-center max-w-sm">
            <p className="font-brut uppercase text-xl">Disconnected</p>
            <p className="mt-2 text-sm">{lostMessage ?? 'You left the match.'}</p>
            <button type="button" onClick={() => eventBus.emit('ui:exit-requested')} className="mt-4 nb-press rounded-xl border-[3px] border-nb bg-pop-yellow font-sfx text-2xl px-6 pt-1 shadow-nb-sm">
              Back to lobby
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
