import { useEffect, useRef, useState } from 'react';
import { ALLIANCES, type AllianceId, CHARACTER_IDS, CHARACTERS, type CharacterId } from '@netanchal/shared';
import { gameAudio } from '../game/audio';
import { Carousel } from '../ui/Carousel';
import { useInView } from '../ui/hooks';
import { Portrait } from '../ui/Portrait';

function Tile({ step, title, body, hint, children, className = '' }: { step: number; title: string; body: string; hint: string; children: React.ReactNode; className?: string }) {
  return (
    <article className={`reveal nb-card bg-pop-paper flex flex-col overflow-hidden ${className}`}>
      <header className="flex items-start gap-3 p-3 sm:p-4 sm:pb-3 border-b-[3px] border-nb">
        <span className="shrink-0 grid place-items-center w-10 h-10 rounded-full border-[3px] border-nb bg-pop-yellow font-brut text-lg shadow-nb-sm">{step}</span>
        <div className="min-w-0">
          <h3 className="font-brut text-lg sm:text-xl uppercase leading-tight">{title}</h3>
          <p className="text-sm text-nb/75 leading-snug mt-0.5">{body}</p>
        </div>
      </header>
      <div className="relative flex-1 p-3 sm:p-4">{children}</div>
      <p className="px-4 pb-3 font-tag uppercase tracking-wider text-nb/60 leading-none max-sm:hidden">Plays on a loop · {hint}</p>
    </article>
  );
}

const Token = ({ id, className = 'w-12 h-12' }: { id: CharacterId; className?: string }) => <Portrait id={id} variant="token" className={className} />;

/** A looping clock for a demo: t runs 0..period in ms, then starts over. It only ticks while the demo is on screen. */
function useLoop(period: number): [React.RefObject<HTMLDivElement>, number] {
  const ref = useRef<HTMLDivElement>(null);
  const [t, setT] = useState(0);
  useEffect(() => {
    const el = ref.current;
    let visible = typeof IntersectionObserver === 'undefined';
    let timer: number | undefined;
    const start = performance.now();
    const run = () => {
      if (timer === undefined) timer = window.setInterval(() => setT((performance.now() - start) % period), 60);
    };
    const stop = () => {
      window.clearInterval(timer);
      timer = undefined;
    };
    if (visible) run();
    const io = typeof IntersectionObserver === 'undefined' || !el ? null : new IntersectionObserver(([e]) => (e.isIntersecting ? run() : stop()), { threshold: 0.2 });
    if (io && el) io.observe(el);
    return () => {
      stop();
      io?.disconnect();
    };
  }, [period]);
  return [ref, t];
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const Arena = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`relative h-40 sm:h-44 [@media(max-height:700px)]:h-28 rounded-lg border-[3px] border-nb bg-[#E8D9B5] halftone overflow-hidden ${className}`}>{children}</div>
);
const Caption = ({ children }: { children: React.ReactNode }) => <p className="text-sm font-semibold leading-snug min-h-[2.4em]">{children}</p>;
const Pop = ({ text, className = '' }: { text: string; className?: string }) => (
  <span className={`absolute font-sfx text-2xl text-pop-pink [text-shadow:2px_2px_0_#111] pointer-events-none ${className}`}>{text}</span>
);

// ---- 1. pick any neta; the pick decides the side (cycles on its own; tap to choose) ----
function PickDemo() {
  const [ref, t] = useLoop(CHARACTER_IDS.length * 1500);
  const [manual, setManual] = useState<{ id: CharacterId; until: number } | null>(null);
  const auto = CHARACTER_IDS[Math.floor(t / 1500) % CHARACTER_IDS.length];
  const pick = manual && manual.until > Date.now() ? manual.id : auto;
  const a = CHARACTERS[pick].alliance;
  return (
    <div ref={ref} className="flex flex-col gap-3">
      <div className="grid grid-cols-4 gap-2">
        {CHARACTER_IDS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setManual({ id, until: Date.now() + 6000 })}
            aria-pressed={pick === id}
            aria-label={CHARACTERS[id].name}
            className={`justify-self-center rounded-full transition ${pick === id ? 'scale-110 ring-[3px] ring-nb ring-offset-2' : 'opacity-70'}`}
          >
            <Token id={id} className="w-11 h-11 sm:w-12 sm:h-12" />
          </button>
        ))}
      </div>
      <div className="rounded-lg border-[3px] border-nb px-3 py-2 shadow-nb-sm transition-colors duration-300" style={{ background: ALLIANCES[a].css, color: a === 'jan_ekta' ? '#fff' : '#111' }}>
        <p className="font-tag uppercase tracking-wider leading-none text-sm opacity-80">You picked {CHARACTERS[pick].name}</p>
        <p className="font-brut uppercase leading-tight">You play for {ALLIANCES[a].name}</p>
      </div>
    </div>
  );
}

// ---- 2. move and fight: a thumb on the joystick, then the attack button ----
const FIGHT_PERIOD = 7600;
const PUNCHES = [2500, 3100, 3700, 4300, 4900];

function Joystick({ x, y }: { x: number; y: number }) {
  return (
    <div className="absolute left-2 bottom-2 w-16 h-16 rounded-full border-[3px] border-nb/70 bg-white/50" aria-hidden="true">
      <span className="absolute left-1/2 top-1/2 w-7 h-7 -ml-3.5 -mt-3.5 rounded-full border-[3px] border-nb bg-nb/80 transition-transform duration-100" style={{ transform: `translate(${x * 16}px, ${y * 16}px)` }} />
    </div>
  );
}

function FightDemo() {
  const [ref, t] = useLoop(FIGHT_PERIOD);
  const walk = clamp01(t / 2000);
  const moving = t < 2000;
  const hits = PUNCHES.filter((p) => t >= p).length;
  const lastPunch = [...PUNCHES].reverse().find((p) => t >= p);
  const punching = lastPunch !== undefined && t - lastPunch < 260;
  const ko = hits >= 5;
  const hp = Math.max(0, 100 - hits * 20);
  const meX = 14 + walk * 42;
  const enemyGone = ko && t > 5600;
  const keys = moving ? 'd' : '';
  const cap = (k: string, label = k.toUpperCase(), wide = false) => (
    <kbd className={`grid place-items-center h-8 ${wide ? 'w-20' : 'w-8'} rounded-md border-2 border-nb font-tag text-base leading-none pt-0.5 transition ${keys === k || (k === 'space' && punching) ? 'bg-pop-yellow translate-y-0.5 shadow-none' : 'bg-white shadow-nb-sm'}`}>{label}</kbd>
  );
  return (
    <div ref={ref} className="flex flex-col gap-3">
      <Arena>
        <div className="absolute inset-x-0 top-[44%] h-8 bg-[#8f8576]/60" />
        <div className={`absolute -translate-x-1/2 -translate-y-1/2 transition-opacity duration-500 ${enemyGone ? 'opacity-0' : ''}`} style={{ left: '82%', top: '42%', opacity: ko ? 0.35 : 1 }}>
          <div className="mx-auto mb-1 h-2 w-12 rounded-full border-2 border-nb bg-white overflow-hidden">
            <div className="h-full bg-[#E5484D] transition-all duration-200" style={{ width: `${enemyGone ? 0 : hp}%` }} />
          </div>
          <div key={hits} className={punching ? 'animate-[wiggle_0.25s]' : ''}>
            <Token id="toofan_rani" className="w-11 h-11" />
          </div>
          {punching && <Pop key={hits} text={ko ? 'KO!' : '-20'} className="left-1/2 -top-5 -translate-x-1/2 animate-[float-up_0.8s_ease-out_forwards]" />}
        </div>
        <div className="absolute -translate-y-1/2 -translate-x-1/2" style={{ left: `${meX}%`, top: '42%', transition: 'left 60ms linear' }}>
          <Token id="vikas_veer" className="w-11 h-11" />
          {punching && <span key={hits} className="absolute -right-4 top-1 w-7 h-7 rounded-full border-4 border-white border-l-transparent border-b-transparent animate-[ping_0.3s_ease-out_1]" />}
        </div>
        <Joystick x={moving ? 1 : 0} y={0} />
        <div className={`absolute right-2 bottom-2 w-14 h-14 rounded-full border-[3px] border-nb grid place-items-center font-tag text-sm uppercase leading-none transition ${punching ? 'bg-pop-yellow scale-90' : 'bg-white/70'}`} aria-hidden="true">
          Punch
        </div>
        <p className={`absolute top-2 left-2 font-tag uppercase text-sm leading-none rounded px-1.5 pt-1 pb-0.5 border-2 border-nb ${walk >= 0.95 ? 'bg-ekta text-white' : 'bg-white'}`}>{walk >= 0.95 ? 'In range' : 'Out of range'}</p>
      </Arena>
      <div className="flex items-center justify-between gap-3">
        <Caption>{moving ? 'Hold the joystick to walk' : ko ? 'KO! Back in 5 seconds' : 'Tap Punch: it auto-aims at the nearest enemy'}</Caption>
        <div className="hidden sm:flex items-center gap-3" aria-hidden="true">
          <div className="grid grid-cols-[repeat(3,2rem)] gap-1">
            <span />
            {cap('w')}
            <span />
            {cap('a')}
            {cap('s')}
            {cap('d')}
          </div>
          {cap('space', 'SPACE', true)}
        </div>
      </div>
    </div>
  );
}

// ---- 3. capture their vote booths ----
const DEMO_BOOTHS = [
  { id: 0, x: 22, y: 58 },
  { id: 1, x: 50, y: 78 },
  { id: 2, x: 80, y: 60 },
];
const BOOTH_SLOT = 2300;
const BOOTH_PERIOD = BOOTH_SLOT * 3 + 1800;

function BoothDemo() {
  const [ref, t] = useLoop(BOOTH_PERIOD);
  const slot = Math.min(2, Math.floor(t / BOOTH_SLOT));
  const inSlot = t - slot * BOOTH_SLOT;
  const capturing = t < BOOTH_SLOT * 3;
  const prog = (i: number) => (i < slot ? 1 : i === slot && capturing ? clamp01(inSlot / 1500) : 0);
  const owned = (i: number) => prog(i) >= 1;
  const held = DEMO_BOOTHS.filter((b) => owned(b.id)).length;
  const votes = held * 60 + (held ? ((t % 1000) / 1000) * 0.3 * held : 0);
  const r = 22;
  const circ = 2 * Math.PI * r;
  const target = DEMO_BOOTHS[slot];
  const fresh = (i: number) => owned(i) && (i === slot ? inSlot - 1500 : t - (i + 1) * BOOTH_SLOT) < 900 && capturing;
  return (
    <div ref={ref} className="flex flex-col gap-3">
      <Arena>
        <p className="absolute left-2 top-2 font-tag uppercase text-sm leading-none rounded px-1.5 pt-1 pb-0.5 border-2 border-nb bg-white">Jan Ekta booths</p>
        <div className="absolute right-2 top-2 rounded-md border-2 border-nb bg-white px-2 pt-1 pb-0.5 font-tag text-lg leading-none tabular">
          Votes <span className="font-brut">{Math.floor(votes)}</span>
        </div>
        {DEMO_BOOTHS.map((b) => (
          <div key={b.id} className="absolute -translate-x-1/2 -translate-y-1/2 grid place-items-center w-14 h-14" style={{ left: `${b.x}%`, top: `${b.y}%` }}>
            <svg viewBox="0 0 56 56" className="absolute inset-0 w-full h-full -rotate-90" aria-hidden="true">
              <circle cx="28" cy="28" r={r} fill={owned(b.id) ? '#FF8A1A44' : '#1FA46344'} stroke="#111" strokeWidth="2.5" />
              <circle cx="28" cy="28" r={r} fill="none" stroke="#FF8A1A" strokeWidth="6" strokeDasharray={circ} strokeDashoffset={circ * (1 - prog(b.id))} />
            </svg>
            <span className="relative text-lg" aria-hidden="true">{owned(b.id) ? '🟧' : '🗳️'}</span>
            {fresh(b.id) && <Pop key={b.id} text="+60!" className="top-1/2 left-[85%] -translate-y-1/2 text-xl whitespace-nowrap animate-[float-up_0.9s_ease-out_forwards]" />}
          </div>
        ))}
        <div className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${target.x + 6}%`, top: `${target.y + 18}%`, transition: 'left .6s ease, top .6s ease' }}>
          <Token id="chanakya_rao" className="w-9 h-9" />
        </div>
      </Arena>
      <Caption>{held === 3 ? 'All three booths are yours. Votes keep trickling in.' : 'Stand in an enemy booth to flip it. The deeper into their territory, the more votes it pays (about 15 to 70); retaking your own is worth less. Hold it for a growing trickle, and take all three for a sweep bonus.'}</Caption>
    </div>
  );
}

// ---- 4. break the gate, take the HQ ----
const HQ_PERIOD = 8400;
function HqDemo() {
  const [ref, t] = useLoop(HQ_PERIOD);
  const guard = Math.max(0, 5 - Math.floor(Math.max(0, t - 500) / 500));
  const gateDown = t >= 3000;
  const cap = gateDown ? Math.round(clamp01((t - 3200) / 3000) * 100) : 0;
  const hitFlash = !gateDown && t >= 500 && (t - 500) % 500 < 200;
  return (
    <div ref={ref} className="flex flex-col gap-3">
      <Arena>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 w-24 h-24 sm:w-28 sm:h-28 rounded-full border-[3px] border-nb grid place-items-center" style={{ background: `conic-gradient(#FF8A1A ${cap * 3.6}deg, #1FA46333 0)` }}>
          <span className="w-[72%] h-[72%] rounded-full bg-[#E8D9B5] border-[3px] border-nb grid place-items-center font-brut text-lg tabular">{cap}%</span>
        </div>
        <span className="absolute right-4 top-2 font-tag uppercase text-sm leading-none">JEG TOWER</span>
        <div className="absolute left-[34%] top-1/2 -translate-y-1/2 -translate-x-1/2 grid place-items-center">
          <span className={`block ${hitFlash ? 'animate-[wiggle_0.25s]' : ''}`}>
            {!gateDown ? (
              <svg viewBox="0 0 60 60" className="w-14 h-14" aria-hidden="true">
                <rect x="14" y="10" width="32" height="34" fill="#fff" stroke="#111" strokeWidth="3" />
                <rect x="10" y="4" width="40" height="10" fill="#1FA463" stroke="#111" strokeWidth="3" />
                <rect x="21" y="20" width="18" height="10" fill="#111" />
                <path d="M6 50h48" stroke="#C9B68A" strokeWidth="10" />
              </svg>
            ) : (
              <span className="font-sfx text-3xl text-nb">CRASH!</span>
            )}
          </span>
          <span className="mt-1 flex gap-1 justify-center">
            {Array.from({ length: 5 }, (_, i) => (
              <span key={i} className={`w-2.5 h-2.5 rounded-sm border-2 border-nb ${i < guard ? 'bg-ekta' : 'bg-white'}`} />
            ))}
          </span>
        </div>
        <div className="absolute bottom-3 transition-all duration-700" style={{ left: gateDown ? '56%' : '8%' }}>
          <Token id="vikas_veer" className="w-10 h-10" />
        </div>
        {cap >= 100 && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-nb">
            <div className="burst w-40 h-40 bg-pop-yellow grid place-items-center pop-in">
              <span className="font-sfx text-xl text-center leading-none">TOWER CAPTURED!<br />ROUND WON</span>
            </div>
          </div>
        )}
      </Arena>
      <Caption>{!gateDown ? `Hit the CRPF gate guard (${guard} hits left)` : cap < 100 ? 'Gate down! Stand in the tower ring…' : 'Captured. The round is won on the spot.'}</Caption>
    </div>
  );
}

// ---- 5. fire a special (auto-plays through everyone; tap Special to hear the war cry) ----
const SPECIAL_EACH = 3400;
function SpecialDemo() {
  const [ref, t] = useLoop(SPECIAL_EACH * CHARACTER_IDS.length);
  const [manual, setManual] = useState<{ id: CharacterId; at: number } | null>(null);
  const [, force] = useState(0);
  const manualOn = manual && Date.now() - manual.at < 6000;
  const autoId = CHARACTER_IDS[Math.floor(t / SPECIAL_EACH) % CHARACTER_IDS.length];
  const id = manualOn ? manual!.id : autoId;
  const phase = manualOn ? Date.now() - manual!.at : t % SPECIAL_EACH;
  const boom = phase > 400 && phase < 2600;
  const key = manualOn ? `m${manual!.at}` : `a${Math.floor(t / SPECIAL_EACH)}`;
  const c = CHARACTERS[id];
  const fire = () => {
    gameAudio.playSpecial(id, true);
    setManual({ id, at: Date.now() });
    force((n) => n + 1);
  };
  return (
    <div ref={ref} className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {CHARACTER_IDS.map((x) => (
          <button key={x} type="button" onClick={() => setManual({ id: x, at: Date.now() - 3000 })} aria-pressed={x === id} aria-label={CHARACTERS[x].name} className={`rounded-full transition ${x === id ? 'ring-[3px] ring-nb ring-offset-1 scale-110' : 'opacity-70'}`}>
            <Token id={x} className="w-9 h-9" />
          </button>
        ))}
      </div>
      <div className="relative h-32 sm:h-36 rounded-lg border-[3px] border-nb bg-nb overflow-hidden grid place-items-center">
        <div className="absolute inset-0 halftone-light opacity-40" />
        <div className="absolute left-3 bottom-3 z-10">
          <Portrait id={id} variant="token" className={`w-14 h-14 ${boom ? 'animate-[wiggle_0.3s_2]' : ''}`} />
        </div>
        {boom ? (
          <div key={key} className="relative burst w-56 h-44 bg-pop-yellow grid place-items-center pop-in">
            <span className="font-sfx text-2xl text-center px-12 leading-none text-nb">{c.special.name}!</span>
          </div>
        ) : (
          <p className="relative font-sfx text-xl text-pop-paper tracking-wide">{c.name} charges…</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <button type="button" onClick={fire} className="relative w-14 h-14 shrink-0 rounded-full border-[3px] border-nb shadow-nb-sm nb-press grid place-items-center font-tag uppercase leading-none text-xs" style={{ background: ALLIANCES[c.alliance].css }} aria-label={`Fire ${c.special.name}`}>
          Special
        </button>
        <p className="text-sm leading-snug min-w-0">
          <span className="font-semibold">{c.special.name}:</span> {c.special.description}
        </p>
      </div>
    </div>
  );
}

// ---- 6. best of three, the winner rules ----
const BEST_PERIOD = 9600;
function BestOfDemo() {
  const [ref, t] = useLoop(BEST_PERIOD);
  const rounds: AllianceId[] = [];
  if (t >= 800) rounds.push('rashtra_morcha');
  if (t >= 2900) rounds.push('jan_ekta');
  if (t >= 5000) rounds.push('rashtra_morcha');
  const score = { rashtra_morcha: rounds.filter((r) => r === 'rashtra_morcha').length, jan_ekta: rounds.filter((r) => r === 'jan_ekta').length };
  const done = score.rashtra_morcha >= 2 || score.jan_ekta >= 2;
  const ruling = rounds[rounds.length - 1] ?? null;
  return (
    <div ref={ref} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        {(['rashtra_morcha', 'jan_ekta'] as AllianceId[]).map((a) => (
          <div key={a} className="relative rounded-lg border-[3px] border-nb p-2.5 shadow-nb-sm" style={{ background: ALLIANCES[a].css, color: a === 'jan_ekta' ? '#fff' : '#111' }}>
            {ruling === a && <span className="absolute -top-4 right-2 font-sfx text-xl text-pop-yellow [text-shadow:2px_2px_0_#111] rotate-6">RULING</span>}
            <p className="font-tag uppercase leading-none text-sm">{ALLIANCES[a].short}</p>
            <p className="font-brut text-4xl leading-none tabular mt-1">{score[a]}</p>
            <p className="text-xs mt-1 font-semibold">{ruling ? (ruling === a ? 'Stronger gate guard' : 'Forward media van') : 'Round 1: equal footing'}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-1.5" aria-label="Rounds played">
        {[0, 1, 2].map((i) => (
          <span key={i} className="flex-1 h-3 rounded border-2 border-nb transition-colors" style={{ background: rounds[i] ? ALLIANCES[rounds[i]].css : '#fff' }} />
        ))}
      </div>
      <Caption>{done ? `${ALLIANCES[score.rashtra_morcha >= 2 ? 'rashtra_morcha' : 'jan_ekta'].name} forms the government!` : `Round ${rounds.length + 1} in progress…`}</Caption>
    </div>
  );
}

export function HowToPlay() {
  return (
    <section id="how" className="snap-panel gutter py-20 sm:py-28 bg-pop-sky/25 border-b-[3px] border-nb relative overflow-hidden" aria-labelledby="how-title">
      <div className="absolute inset-0 halftone opacity-40" aria-hidden="true" />
      <div className="relative w-full max-w-7xl mx-auto min-w-0">
        <div className="reveal">
          <p className="font-tag text-xl uppercase tracking-widest text-pop-pink leading-none">How to play</p>
          <h2 id="how-title" className="font-brut text-[1.65rem] sm:text-6xl uppercase leading-[1.12] sm:leading-[1.15] mt-1 sm:mt-2">
            Learn it in <span className="title-badge bg-white border-[3px] border-nb px-2 rotate-1 shadow-nb-sm whitespace-nowrap">60 seconds</span>
          </h2>
          <p className="mt-2 sm:mt-3 max-w-2xl text-nb/75 text-sm max-md:hidden">Each card plays on a loop. Swipe through them and you know the whole game.</p>
        </div>
        <div className="mt-3 sm:mt-12">
        <Carousel label="How to play" className="lg:grid lg:grid-cols-2 lg:gap-6 xl:grid-cols-3 lg:overflow-visible lg:m-0 lg:p-0">
          <Tile step={1} title="Pick any neta" body="All eight are open. Your pick decides your alliance." hint="tap a face to choose">
            <PickDemo />
          </Tile>
          <Tile step={2} title="Move & fight" body="Drag the joystick to walk, tap Punch to hit. Attacks auto-aim. (On a keyboard: WASD and Space.)" hint="watch the thumb">
            <FightDemo />
          </Tile>
          <Tile step={3} title="Capture their vote booths" body="Each party guards three booths. Stand in an enemy booth to flip it. The deeper into their territory, the more votes it pays (about 15 to 70); retaking your own is worth less. Hold it for a growing trickle, and take all three for a sweep bonus." hint="watch the booth ring fill">
            <BoothDemo />
          </Tile>
          <Tile step={4} title="Break the CRPF gate, take the tower" body="Destroy the CRPF gate guard, then stand in their Political Tower until the ring fills. That wins the round on the spot." hint="watch the gate fall">
            <HqDemo />
          </Tile>
          <Tile step={5} title="Fire your special" body="Every neta has one signature move that deals real damage, with their own war cry." hint="tap Special for the war cry">
            <SpecialDemo />
          </Tile>
          <Tile step={6} title="Best of three" body="Capture the tower, or lead on votes at 2:30. The winner rules next round." hint="watch the rounds">
            <BestOfDemo />
          </Tile>
        </Carousel>
        </div>
      </div>
    </section>
  );
}
