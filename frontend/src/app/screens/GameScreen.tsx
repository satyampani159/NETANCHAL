import { useEffect, useRef, useState } from 'react';
import type { Snapshot } from '@netanchal/shared';
import { gameAudio } from '../../game/audio';
import { eventBus } from '../../game/EventBus';
import { FullscreenChrome } from '../../game/FullscreenChrome';
import { exitFullscreen, isFullscreen, onFullscreenChange, requestFullscreen } from '../../game/fullscreen';
import { PhaserMount } from '../../game/PhaserMount';
import type { GameRoom, RoomStatus } from '../../phaser/net/RoomClient';
import { navigationStore } from '../state/navigationStore';

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

  useEffect(() => {
    // usually already fullscreen from the lobby tap; this only succeeds if that gesture is still fresh
    requestFullscreen(document.documentElement);
    let wasFullscreen = isFullscreen();
    gameAudio.startMusic();

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
      gameAudio.stopMusic();
      room.leave();
    };
  }, [room, mySlot]);

  return (
    <div ref={containerRef} className="fixed inset-0 bg-black overflow-hidden select-none touch-none">
      <PhaserMount room={room} initialState={initialState} mySlot={mySlot} />
      <FullscreenChrome onExit={() => eventBus.emit('ui:exit-requested')} />
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
