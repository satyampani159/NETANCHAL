import { useEffect, useState } from 'react';
import type { CharacterId, Difficulty } from '@netanchal/shared';
import { CharacterSheet } from '../../landing/CharacterSheet';
import { CounterTable } from '../../landing/CounterTable';
import { HeroLineup } from '../../landing/HeroLineup';
import { HowToPlay } from '../../landing/HowToPlay';
import { NewsTicker } from '../../landing/NewsTicker';
import { SiteNav } from '../../landing/SiteNav';
import { StrengthShowcase } from '../../landing/StrengthShowcase';
import { wakeServer } from '../../phaser/net/RoomClient';
import { useScrollReveal } from '../../ui/hooks';
import { HAS_SERVER_CONFIG, matchStore, SERVER_URL } from '../state/matchStore';
import { navigationStore } from '../state/navigationStore';

const DIFFS: Difficulty[] = ['easy', 'normal', 'hard'];

function Chips<T extends string>({ label, value, options, onChange, names }: { label: string; value: T; options: T[]; onChange: (v: T) => void; names?: Record<string, string> }) {
  return (
    <div className="flex items-center rounded-full border-[3px] border-nb bg-pop-paper p-1 shadow-nb-sm" role="group" aria-label={label}>
      <span className="px-2 font-tag uppercase tracking-wider text-nb/60 leading-none pt-0.5">{label}</span>
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          aria-pressed={value === o}
          className={`px-3 min-h-[34px] rounded-full font-semibold capitalize transition ${value === o ? 'bg-nb text-pop-paper' : 'hover:bg-pop-yellow'}`}
        >
          {names?.[o] ?? o}
        </button>
      ))}
    </div>
  );
}

function PlayBlock({ onPlay }: { onPlay: () => void }) {
  const { mode, difficulty, setMode, setDifficulty } = matchStore();
  return (
    <>
      <button
        type="button"
        onClick={onPlay}
        className="nb-press group relative rounded-2xl border-[4px] border-nb bg-pop-yellow px-12 sm:px-16 pt-3 pb-2 shadow-nb-lg font-sfx text-5xl sm:text-6xl tracking-wider"
      >
        <span className="inline-block transition group-hover:-rotate-3 group-hover:scale-105">Play now!</span>
      </button>
      <div className="flex flex-wrap justify-center gap-2 text-sm">
        <Chips label="Mode" value={mode} options={['online', 'solo']} onChange={setMode} names={{ online: 'Online', solo: 'Vs bots' }} />
        <Chips label="Bots" value={difficulty} options={DIFFS} onChange={setDifficulty} />
      </div>
    </>
  );
}

export function LandingScreen() {
  const [open, setOpen] = useState<CharacterId | null>(null);
  useScrollReveal();
  // a sleeping free-tier server takes about a minute to start: begin waking it now
  useEffect(() => {
    if (HAS_SERVER_CONFIG) wakeServer(SERVER_URL);
  }, []);
  // scrolling never navigates; Play is the only way into the lobby
  const play = () => navigationStore.getState().goTo({ name: 'lobby' });
  return (
    <main id="top" className="grain bg-pop-paper text-nb">
      <SiteNav onPlay={play} />
      <HeroLineup onOpen={setOpen}>
        <PlayBlock onPlay={play} />
      </HeroLineup>
      <NewsTicker />
      <StrengthShowcase onOpen={setOpen} />
      <HowToPlay />
      <CounterTable />
      <section className="relative overflow-hidden gutter py-20 sm:py-28 bg-nb text-pop-paper" aria-labelledby="cta-title">
        <div className="absolute left-1/2 top-1/2 w-[200vmax] h-[200vmax] -translate-x-1/2 -translate-y-1/2 sunburst opacity-40" aria-hidden="true" />
        <div className="reveal relative max-w-3xl mx-auto text-center flex flex-col items-center gap-6">
          <h2 id="cta-title" className="font-brut uppercase text-4xl sm:text-6xl leading-[0.95]">
            The polls are <span className="text-pop-yellow">open</span>
          </h2>
          <p className="text-pop-paper/75 max-w-xl">Matches take about five minutes. Bots fill any empty seat, so you never wait more than eight seconds.</p>
          <div className="flex flex-col items-center gap-4 text-nb">
            <PlayBlock onPlay={play} />
          </div>
        </div>
      </section>
      <footer className="gutter py-8 bg-nb text-pop-paper/70 text-sm border-t-[3px] border-pop-paper/10">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-between gap-4">
          <p>
            <span className="font-brut uppercase text-pop-paper">Netanchal</span> · a fictional election, fought on a phone.
          </p>
          <p>All parties and netas are made up. Any resemblance is the voters' problem.</p>
        </div>
      </footer>
      {open && <CharacterSheet id={open} onClose={() => setOpen(null)} />}
    </main>
  );
}
