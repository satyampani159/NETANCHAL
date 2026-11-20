import { useEffect, useState } from 'react';
import type { CharacterId, Difficulty } from '@netanchal/shared';
import { CharacterSheet } from '../../landing/CharacterSheet';
import { InstagramGallery } from '../../landing/InstagramGallery';
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from '../../data/instagram';
import { InstagramIcon } from '../../ui/InstagramIcon';
import { HeroLineup } from '../../landing/HeroLineup';
import { HowToPlay } from '../../landing/HowToPlay';
import { NewsTicker } from '../../landing/NewsTicker';
import { SectionDots } from '../../landing/SectionDots';
import { SiteNav } from '../../landing/SiteNav';
import { DailyChip } from '../../landing/DailyChip';
import { ProfileSheet } from './ProfileSheet';
import { StrengthShowcase } from '../../landing/StrengthShowcase';
import { wakeServer } from '../../phaser/net/RoomClient';
import { useScrollReveal } from '../../ui/hooks';
import { HAS_SERVER_CONFIG, matchStore, SERVER_URL } from '../state/matchStore';
import { navigationStore } from '../state/navigationStore';

const DIFFS: Difficulty[] = ['easy', 'normal', 'hard'];

function Chips<T extends string>({ label, value, options, onChange, names }: { label: string; value: T; options: T[]; onChange: (v: T) => void; names?: Record<string, string> }) {
  return (
    <div className="flex items-center rounded-full border-[3px] border-nb bg-pop-paper p-1 shadow-nb-sm" role="group" aria-label={label}>
      <span className="px-2 font-tag uppercase tracking-wider text-nb/60 leading-none pt-0.5 [@media(max-height:700px)]:hidden">{label}</span>
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          aria-pressed={value === o}
          className={`px-2.5 sm:px-3 min-h-[34px] rounded-full font-semibold capitalize transition ${value === o ? 'bg-nb text-pop-paper' : 'hover:bg-pop-yellow'}`}
        >
          {names?.[o] ?? o}
        </button>
      ))}
    </div>
  );
}

function ServerStatus() {
  const [state, setState] = useState<{ kind: 'checking' } | { kind: 'ok'; players: number } | { kind: 'down' }>({ kind: 'checking' });
  useEffect(() => {
    if (!HAS_SERVER_CONFIG) return;
    let alive = true;
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 12000);
    fetch(`${SERVER_URL}/`, { cache: 'no-store', mode: 'cors', signal: ctl.signal })
      .then((r) => r.json())
      .then((j) => alive && setState({ kind: 'ok', players: Number(j.players) || 0 }))
      .catch(() => alive && setState({ kind: 'down' }))
      .finally(() => clearTimeout(timer));
    return () => {
      alive = false;
      ctl.abort();
    };
  }, []);
  if (!HAS_SERVER_CONFIG)
    return <p className="max-w-xs text-center text-xs sm:text-sm font-semibold text-nb/75">Online play needs a game server, and this site has none connected yet. Vs bots works right now.</p>;
  const dot = state.kind === 'ok' ? '#1FA463' : state.kind === 'down' ? '#E5484D' : '#9a9a9a';
  const text = state.kind === 'ok' ? `Server online · ${state.players} playing` : state.kind === 'down' ? 'Slow server due to heavy traffic' : 'Checking the server…';
  return (
    <p className="flex items-center gap-2 max-w-xs text-xs sm:text-sm font-semibold text-nb/80" role="status">
      <span className="w-3 h-3 rounded-full border-2 border-nb shrink-0" style={{ background: dot }} aria-hidden="true" />
      {text}
    </p>
  );
}

function RoomChoices() {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const go = (mode: 'create' | 'join', c = '') => {
    matchStore.getState().setRoomIntent({ mode, code: c });
    matchStore.getState().setNotice(null);
    navigationStore.getState().goTo({ name: 'lobby' });
  };
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" onClick={() => go('create')} className="nb-press rounded-xl border-[3px] border-nb bg-pop-paper px-4 min-h-[44px] font-brut uppercase text-sm shadow-nb-sm">
          Create room
        </button>
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="nb-press rounded-xl border-[3px] border-nb bg-pop-paper px-4 min-h-[44px] font-brut uppercase text-sm shadow-nb-sm">
          Join with code
        </button>
      </div>
      {open && (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (code.length === 4) go('join', code);
          }}
        >
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4))}
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="off"
            maxLength={4}
            placeholder="CODE"
            aria-label="Room code"
            className="w-28 rounded-xl border-[3px] border-nb bg-white text-center font-sfx text-3xl tracking-[0.3em] pt-1 uppercase"
          />
          <button type="submit" disabled={code.length !== 4} className="nb-press rounded-xl border-[3px] border-nb bg-pop-yellow px-4 min-h-[44px] font-brut uppercase text-sm shadow-nb-sm disabled:opacity-40">
            Join
          </button>
        </form>
      )}
    </div>
  );
}

function PlayBlock({ onPlay, onProfile }: { onPlay: () => void; onProfile?: () => void }) {
  const { mode, difficulty, setMode, setDifficulty } = matchStore();
  return (
    <>
      <button
        type="button"
        onClick={onPlay}
        className="nb-press group relative rounded-2xl border-[4px] border-nb bg-pop-yellow px-10 sm:px-16 pt-2 sm:pt-3 pb-1.5 sm:pb-2 shadow-nb-lg font-sfx text-4xl sm:text-6xl [@media(max-height:700px)]:text-3xl [@media(max-height:700px)]:px-8 tracking-wider"
      >
        <span className="inline-block transition group-hover:-rotate-3 group-hover:scale-105">Play now!</span>
      </button>
      <div className="flex flex-wrap justify-center gap-2 text-sm">
        <Chips label="Mode" value={mode} options={['online', 'solo']} onChange={setMode} names={{ online: 'Online', solo: 'Vs bots' }} />
        <Chips label="Bots" value={difficulty} options={DIFFS} onChange={setDifficulty} />
      </div>
      {onProfile && <DailyChip onOpen={onProfile} />}
      {mode === 'online' && <ServerStatus />}
      {mode === 'online' && HAS_SERVER_CONFIG && <RoomChoices />}
    </>
  );
}

export function LandingScreen() {
  const [open, setOpen] = useState<CharacterId | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  useScrollReveal();
  const notice = matchStore((st) => st.notice);
  // a shared link (?room=ABCD) goes straight to joining that room
  useEffect(() => {
    // ?play=1 is the link for friends who just want a game: straight into a bot match
    if (new URLSearchParams(location.search).get('play') === '1') {
      history.replaceState(null, '', location.pathname);
      matchStore.getState().setMode('solo');
      navigationStore.getState().goTo({ name: 'lobby' });
      return;
    }
    const code = new URLSearchParams(location.search).get('room')?.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
    if (code && code.length === 4) {
      history.replaceState(null, '', location.pathname);
      matchStore.getState().setMode('online');
      matchStore.getState().setRoomIntent({ mode: 'join', code });
      navigationStore.getState().goTo({ name: 'lobby' });
    }
  }, []);
  // a sleeping free-tier server takes about a minute to start: begin waking it now
  useEffect(() => {
    if (HAS_SERVER_CONFIG) wakeServer(SERVER_URL);
  }, []);
  // scrolling never navigates; Play is the only way into the lobby
  const play = () => {
    matchStore.getState().setNotice(null);
    navigationStore.getState().goTo({ name: 'lobby' });
  };
  return (
    <main id="top" className="grain bg-pop-paper text-nb">
      {notice && (
        <div role="alert" className="fixed top-20 inset-x-0 z-40 flex justify-center px-3">
          <p className="rounded-lg border-[3px] border-nb bg-pop-yellow px-4 py-2 font-semibold shadow-nb-sm max-w-md text-center">
            {notice} <button type="button" onClick={() => matchStore.getState().setNotice(null)} className="underline ml-1">OK</button>
          </p>
        </div>
      )}
      <SiteNav onPlay={play} onProfile={() => setProfileOpen(true)} />
      <SectionDots />
      <HeroLineup onOpen={setOpen}>
        <PlayBlock onPlay={play} onProfile={() => setProfileOpen(true)} />
      </HeroLineup>
      <NewsTicker />
      <StrengthShowcase onOpen={setOpen} />
      <HowToPlay />
      <InstagramGallery />
      <section id="play" className="snap-panel relative overflow-hidden gutter py-20 sm:py-28 bg-nb text-pop-paper" aria-labelledby="cta-title">
        <div className="absolute left-1/2 top-1/2 w-[200vmax] h-[200vmax] -translate-x-1/2 -translate-y-1/2 sunburst opacity-40" aria-hidden="true" />
        <div className="reveal relative max-w-3xl mx-auto text-center flex flex-col items-center gap-6">
          <h2 id="cta-title" className="font-brut uppercase text-4xl sm:text-6xl leading-[1.22] sm:leading-[1.2]">
            The polls are <span className="text-pop-yellow">open</span>
          </h2>
          <p className="text-pop-paper/75 max-w-xl">Matches take about five minutes. Bots fill any empty seat, so you never wait more than eight seconds.</p>
          <div className="flex flex-col items-center gap-4 text-nb">
            <PlayBlock onPlay={play} />
          </div>
          <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="nb-press inline-flex items-center gap-2 rounded-xl border-[3px] border-nb bg-pop-paper px-4 min-h-[44px] font-brut uppercase text-sm text-nb shadow-nb-sm">
            <InstagramIcon className="w-5 h-5" /> Follow @{INSTAGRAM_HANDLE} on Instagram
          </a>
        </div>
      </section>
      <footer className="gutter py-8 bg-nb text-pop-paper/70 text-sm border-t-[3px] border-pop-paper/10">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-between gap-4">
          <p>
            <span className="font-brut uppercase text-pop-paper">Netanchal</span> · a fictional election, fought on a phone.
          </p>
          <p>All parties and netas are made up. Any resemblance is the voters' problem.</p>
          <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 font-semibold text-pop-paper hover:text-pop-yellow" aria-label={`Follow @${INSTAGRAM_HANDLE} on Instagram`}>
            <InstagramIcon className="w-5 h-5" /> @{INSTAGRAM_HANDLE}
          </a>
        </div>
      </footer>
      {profileOpen && <ProfileSheet onClose={() => setProfileOpen(false)} />}
      {open && <CharacterSheet id={open} onClose={() => setOpen(null)} />}
    </main>
  );
}
