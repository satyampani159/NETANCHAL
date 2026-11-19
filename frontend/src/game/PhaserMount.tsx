import { useEffect, useRef } from 'react';
import type { Snapshot } from '@netanchal/shared';
import type { GameRoom } from '../phaser/net/RoomClient';

/** Mounts the Phaser.Game into a div it owns and destroys it (WebGL context + listeners) on unmount. */
export function PhaserMount({ room, initialState, mySlot }: { room: GameRoom; initialState: Snapshot; mySlot: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let game: { destroy: (removeCanvas: boolean) => void } | null = null;
    let disposed = false;
    // Phaser is its own chunk so the landing page stays light
    import('../phaser/createGame').then(({ createPhaserGame }) => {
      if (disposed || !ref.current) return;
      game = createPhaserGame(ref.current, { room, initialState, mySlot });
    });
    return () => {
      disposed = true;
      game?.destroy(true);
    };
  }, [room, initialState, mySlot]);
  return <div ref={ref} className="absolute inset-0" />;
}
