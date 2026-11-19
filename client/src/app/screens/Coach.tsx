// The guided first match: a few plain steps, each one finished by something the player actually does.
// Reads the same snapshots the game uses; never touches the sim. About 20 seconds if you follow along.
import { useEffect, useRef, useState } from 'react';
import type { GameRoom } from '../../phaser/net/RoomClient';
import type { PlayerView, Snapshot } from '@netanchal/shared';
import { eventBus } from '../../game/EventBus';
import { gameAudio } from '../../game/audio';
import { matchStore } from '../state/matchStore';
import { profileStore } from '../state/profileStore';

const TOUCH = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

interface StepDef {
  title: string;
  text: (me: PlayerView) => string;
}

const STEPS: StepDef[] = [
  { title: 'Move', text: () => (TOUCH ? 'Drag the left stick to walk' : 'Walk with W A S D') },
  { title: 'Find a booth', text: () => 'Follow the arrow to a booth' },
  { title: 'Capture it', text: () => 'Stay inside until it fills' },
  { title: 'Punch', text: () => (TOUCH ? 'Tap PUNCH (auto-aims)' : 'Space or click to punch') },
  { title: 'Special', text: (me) => (me.specialCd > 0 ? `Special in ${Math.ceil(me.specialCd)}s` : TOUCH ? 'Special ready! Tap it' : 'Special ready! Press E') },
];

export function Coach({ room, mySlot }: { room: GameRoom; mySlot: string }) {
  const [step, setStep] = useState(0);
  const [finished, setFinished] = useState(false);
  const [me, setMe] = useState<PlayerView | null>(null);
  const st = useRef({ step: 0, start: null as { x: number; y: number } | null, booth: null as string | null, attacked: false, wasReady: false });

  const finish = () => {
    profileStore.getState().finishTutorial();
    matchStore.getState().setCoaching(false);
    eventBus.emit('coach:target', null);
  };

  useEffect(() => {
    const advance = (to: number) => {
      st.current.step = to;
      setStep(to);
      gameAudio.sfx('tick');
    };
    const handle = (snap: Snapshot) => {
      const p = snap.players.find((x) => x.id === mySlot);
      if (!p || snap.phase !== 'playing') return;
      setMe(p);
      const c = st.current;
      if (c.step === 0) {
        c.start ??= { x: p.x, y: p.y };
        if (Math.hypot(p.x - c.start.x, p.y - c.start.y) > 250) advance(1);
      }
      if (c.step === 1 || c.step === 2) {
        const enemy = snap.zones.booths.filter((b) => b.owner !== p.alliance);
        const target = c.booth ? snap.zones.booths.find((b) => b.id === c.booth) : enemy.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
        if (target) {
          if (c.step === 1) {
            c.booth = target.id;
            eventBus.emit('coach:target', { x: target.x, y: target.y, r: target.r });
            if (Math.hypot(target.x - p.x, target.y - p.y) < target.r) advance(2);
          } else {
            if (target.owner === p.alliance) {
              eventBus.emit('coach:target', null);
              advance(3);
            }
          }
        } else if (c.step === 2) advance(3); // someone else already took it
      }
      if (c.step === 3) {
        if (p.attackCd > 0.02) c.attacked = true;
        if (c.attacked) advance(4);
      }
      if (c.step === 4) {
        if (p.specialCd <= 0) c.wasReady = true;
        if (c.wasReady && p.specialCd > 0) {
          advance(5);
          setFinished(true);
          gameAudio.sfx('success');
          setTimeout(finish, 3800);
        }
      }
    };
    if (room.latest.snapshot) handle(room.latest.snapshot);
    const off = room.on('snapshot', handle);
    return () => {
      off();
      eventBus.emit('coach:target', null);
    };
  }, [room, mySlot]);

  const def = STEPS[Math.min(step, STEPS.length - 1)];
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[max(96px,calc(env(safe-area-inset-top)+88px))] z-10 flex justify-center px-3" role="status" aria-live="polite">
      <div className="pointer-events-auto pop-in max-w-[min(60vw,340px)] min-w-[180px] rounded-lg border-2 border-nb bg-pop-yellow px-2 py-1 shadow-nb-sm">
        {finished ? (
          <p className="font-brut uppercase text-[11px] sm:text-xs leading-tight text-center">You're ready! Win on votes or take their tower.</p>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <span className="font-tag uppercase tracking-wider text-[11px] leading-none">
                Step {Math.min(step + 1, STEPS.length)} of {STEPS.length} · {def.title}
              </span>
              <span className="ml-auto flex gap-1" aria-hidden="true">
                {STEPS.map((_, i) => (
                  <span key={i} className={`w-2 h-2 rounded-full border border-nb ${i <= step ? 'bg-nb' : 'bg-white'}`} />
                ))}
              </span>
              <button type="button" onClick={finish} className="rounded border-2 border-nb bg-white px-1.5 py-0.5 text-[10px] font-brut uppercase leading-none">
                Skip
              </button>
            </div>
            <p className="font-brut uppercase text-[11px] sm:text-xs leading-tight mt-0.5">{me ? def.text(me) : 'Get ready…'}</p>
          </>
        )}
      </div>
    </div>
  );
}
