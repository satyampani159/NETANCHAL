import { useEffect, useRef, useState } from 'react';
import { ALLIANCES, type AllianceId, CHARACTER_IDS, CHARACTERS, type CharacterId } from '@netanchal/shared';
import { gameAudio } from '../game/audio';
import { useInView } from '../ui/hooks';
import { Portrait } from '../ui/Portrait';

function Tile({ step, title, body, hint, children, className = '' }: { step: number; title: string; body: string; hint: string; children: React.ReactNode; className?: string }) {
  return (
    <article className={`reveal nb-card bg-pop-paper flex flex-col overflow-hidden ${className}`}>
      <header className="flex items-start gap-3 p-4 pb-3 border-b-[3px] border-nb">
        <span className="shrink-0 grid place-items-center w-10 h-10 rounded-full border-[3px] border-nb bg-pop-yellow font-brut text-lg shadow-nb-sm">{step}</span>
        <div className="min-w-0">
          <h3 className="font-brut text-lg sm:text-xl uppercase leading-tight">{title}</h3>
          <p className="text-sm text-nb/75 leading-snug mt-0.5">{body}</p>
        </div>
      </header>
      <div className="relative flex-1 p-4">{children}</div>
      <p className="px-4 pb-3 font-tag uppercase tracking-wider text-nb/60 leading-none">Try it · {hint}</p>
    </article>
  );
}

const Token = ({ id, className = 'w-12 h-12' }: { id: CharacterId; className?: string }) => <Portrait id={id} variant="token" className={className} />;

// ---- 1. pick any neta; the pick decides the side ----
function PickDemo() {
  const [pick, setPick] = useState<CharacterId>('vikas_veer');
  const a = CHARACTERS[pick].alliance;
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-4 gap-2">
        {CHARACTER_IDS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setPick(id)}
            aria-pressed={pick === id}
            aria-label={CHARACTERS[id].name}
            className={`justify-self-center rounded-full transition ${pick === id ? 'scale-110 ring-[3px] ring-nb ring-offset-2' : 'hover:-translate-y-1 opacity-80 hover:opacity-100'}`}
          >
            <Token id={id} />
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

// ---- 2. move and fight ----
function FightDemo() {
  const [me, setMe] = useState({ x: 18, y: 55 });
  const [hp, setHp] = useState(100);
  const [pops, setPops] = useState<{ id: number; text: string }[]>([]);
  const [swing, setSwing] = useState(0);
  const [keys, setKeys] = useState<Set<string>>(new Set());
  const enemy = { x: 78, y: 50 };
  const near = Math.hypot(me.x - enemy.x, (me.y - enemy.y) * 0.6) < 22;

  const pop = (text: string) => {
    const id = Date.now() + Math.random();
    setPops((p) => [...p, { id, text }]);
    setTimeout(() => setPops((p) => p.filter((x) => x.id !== id)), 800);
  };
  const hit = () => {
    setSwing((s) => s + 1);
    if (!near) return pop('Too far!');
    if (hp <= 0) return;
    const next = Math.max(0, hp - 19);
    setHp(next);
    pop(next === 0 ? 'KO!' : '-19');
    if (next === 0) setTimeout(() => setHp(100), 1300);
  };
  const move = (dx: number, dy: number) => setMe((m) => ({ x: Math.min(92, Math.max(8, m.x + dx)), y: Math.min(85, Math.max(15, m.y + dy)) }));
  const onKey = (e: React.KeyboardEvent) => {
    const k = e.key.toLowerCase();
    const map: Record<string, [number, number]> = { w: [0, -8], arrowup: [0, -8], s: [0, 8], arrowdown: [0, 8], a: [-6, 0], arrowleft: [-6, 0], d: [6, 0], arrowright: [6, 0] };
    if (map[k]) {
      e.preventDefault();
      move(...map[k]);
    }
    if (k === ' ' || k === 'j') {
      e.preventDefault();
      hit();
    }
    setKeys((s) => new Set(s).add(k === ' ' ? 'space' : k));
  };
  const onKeyUp = (e: React.KeyboardEvent) => setKeys((s) => {
    const n = new Set(s);
    n.delete(e.key.toLowerCase() === ' ' ? 'space' : e.key.toLowerCase());
    return n;
  });
  const cap = (k: string, label = k.toUpperCase(), wide = false) => (
    <kbd className={`grid place-items-center h-8 ${wide ? 'w-20' : 'w-8'} rounded-md border-2 border-nb font-tag text-base leading-none pt-0.5 transition ${keys.has(k) ? 'bg-pop-yellow translate-y-0.5 shadow-none' : 'bg-white shadow-nb-sm'}`}>{label}</kbd>
  );

  return (
    <div className="flex flex-col gap-3">
      <div
        tabIndex={0}
        onKeyDown={onKey}
        onKeyUp={onKeyUp}
        onPointerDown={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setMe({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
        }}
        className="relative h-44 rounded-lg border-[3px] border-nb bg-[#E8D9B5] halftone cursor-crosshair overflow-hidden focus-visible:ring-4 focus-visible:ring-pop-sky"
        aria-label="Practice arena. Click to walk, or focus and use W A S D and Space."
      >
        <div className="absolute inset-x-0 top-1/2 h-8 -translate-y-1/2 bg-[#8f8576]/60" />
        {/* dummy */}
        <div className="absolute -translate-x-1/2 -translate-y-1/2 transition" style={{ left: `${enemy.x}%`, top: `${enemy.y}%` }}>
          <div className="mx-auto mb-1 h-2 w-14 rounded-full border-2 border-nb bg-white overflow-hidden">
            <div className="h-full bg-[#E5484D] transition-all" style={{ width: `${hp}%` }} />
          </div>
          <div className={hp === 0 ? 'opacity-30 scale-90 transition' : swing && near ? 'animate-[wiggle_0.25s]' : ''} key={swing}>
            <Token id="toofan_rani" />
          </div>
          {pops.map((p) => (
            <span key={p.id} className="absolute left-1/2 -top-6 -translate-x-1/2 font-sfx text-2xl text-pop-pink [text-shadow:2px_2px_0_#111] animate-[float-up_0.8s_ease-out_forwards]">
              {p.text}
            </span>
          ))}
        </div>
        {/* you */}
        <div className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ease-out" style={{ left: `${me.x}%`, top: `${me.y}%` }}>
          <div className="relative">
            <Token id="vikas_veer" />
            <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 font-tag text-sm leading-none bg-nb text-pop-paper px-1.5 pt-0.5 rounded">YOU</span>
            {swing > 0 && <span key={swing} className="absolute -right-5 top-1 w-8 h-8 rounded-full border-4 border-white border-l-transparent border-b-transparent animate-[ping_0.3s_ease-out_1]" />}
          </div>
        </div>
        <p className={`absolute top-2 right-2 font-tag uppercase text-sm leading-none rounded px-1.5 pt-1 pb-0.5 border-2 border-nb ${near ? 'bg-ekta text-white' : 'bg-white'}`}>{near ? 'In range' : 'Out of range'}</p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="hidden sm:grid grid-cols-[repeat(3,2rem)] gap-1" aria-hidden="true">
          <span />
          {cap('w')}
          <span />
          {cap('a')}
          {cap('s')}
          {cap('d')}
        </div>
        <div className="hidden sm:block" aria-hidden="true">{cap('space', 'SPACE', true)}</div>
        <button type="button" onClick={hit} className="nb-press rounded-full border-[3px] border-nb bg-pop-pink text-white font-sfx text-2xl tracking-wide px-6 pt-1.5 pb-0.5 shadow-nb-sm">
          Punch!
        </button>
      </div>
    </div>
  );
}

// ---- 3. capture their vote booths ----
const DEMO_BOOTHS = [
  { id: 0, x: 24, y: 28 },
  { id: 1, x: 52, y: 66 },
  { id: 2, x: 80, y: 30 },
];

function BoothDemo() {
  const [progress, setProgress] = useState<number[]>([0, 0, 0]);
  const [owned, setOwned] = useState<boolean[]>([false, false, false]);
  const [target, setTarget] = useState<number | null>(null);
  const [votes, setVotes] = useState(0);
  const [burst, setBurst] = useState<{ id: number; key: number } | null>(null);

  useEffect(() => {
    const t = setInterval(() => {
      setProgress((p) =>
        p.map((v, i) => (i === target && !owned[i] ? Math.min(1, v + 0.1 / 0.35) : Math.max(0, v - 0.04))),
      );
    }, 100);
    return () => clearInterval(t);
  }, [target, owned]);

  useEffect(() => {
    const done = progress.findIndex((v, i) => v >= 1 && !owned[i]);
    if (done === -1) return;
    setOwned((o) => o.map((x, i) => (i === done ? true : x)));
    setVotes((v) => v + 20);
    setBurst({ id: done, key: Date.now() });
    setTarget(null);
    setProgress((p) => p.map((v, i) => (i === done ? 0 : v)));
  }, [progress, owned]);

  const held = owned.filter(Boolean).length;
  useEffect(() => {
    if (!held) return;
    const t = setInterval(() => setVotes((v) => v + 0.6 * held), 1000);
    return () => clearInterval(t);
  }, [held]);

  const reset = () => {
    setProgress([0, 0, 0]);
    setOwned([false, false, false]);
    setTarget(null);
    setVotes(0);
    setBurst(null);
  };
  const r = 22;
  const circ = 2 * Math.PI * r;

  return (
    <div className="flex flex-col gap-3">
      <div className="relative h-44 rounded-lg border-[3px] border-nb bg-[#E8D9B5] overflow-hidden halftone">
        <p className="absolute left-2 top-2 font-tag uppercase text-sm leading-none rounded px-1.5 pt-1 pb-0.5 border-2 border-nb bg-white">Jan Ekta territory</p>
        <div className="absolute right-2 top-2 rounded-md border-2 border-nb bg-white px-2 pt-1 pb-0.5 font-tag text-lg leading-none tabular">
          Votes <span className="font-brut">{Math.floor(votes)}</span>
        </div>
        {DEMO_BOOTHS.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => !owned[b.id] && setTarget(b.id)}
            aria-label={owned[b.id] ? `Booth ${b.id + 1} captured` : `Send a helper to booth ${b.id + 1}`}
            className="absolute -translate-x-1/2 -translate-y-1/2 grid place-items-center w-14 h-14"
            style={{ left: `${b.x}%`, top: `${b.y}%` }}
          >
            <svg viewBox="0 0 56 56" className="absolute inset-0 w-full h-full -rotate-90" aria-hidden="true">
              <circle cx="28" cy="28" r={r} fill={owned[b.id] ? '#FF8A1A44' : '#1FA46344'} stroke="#111" strokeWidth="2.5" />
              <circle cx="28" cy="28" r={r} fill="none" stroke="#FF8A1A" strokeWidth="6" strokeDasharray={circ} strokeDashoffset={circ * (1 - progress[b.id])} />
            </svg>
            <span className="relative text-lg" aria-hidden="true">
              {owned[b.id] ? '🟧' : '🗳️'}
            </span>
            {target === b.id && <Token id="chanakya_rao" className="absolute -bottom-3 -right-3 w-8 h-8" />}
            {burst?.id === b.id && (
              <span key={burst.key} className="absolute -top-5 left-1/2 font-sfx text-xl text-pop-pink [text-shadow:2px_2px_0_#111] whitespace-nowrap animate-[float-up_0.9s_ease-out_forwards]">
                +20!
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold">
          {held === 3 ? 'All three booths are yours.' : target === null ? 'Tap a booth to send a helper in' : 'Capturing… the CRPF post fires on you, so be quick'}
        </p>
        {held > 0 && (
          <button type="button" onClick={reset} className="nb-press rounded-full border-[3px] border-nb bg-white font-brut uppercase text-sm px-3 py-1.5 shadow-nb-sm">
            Again
          </button>
        )}
      </div>
    </div>
  );
}

// ---- 4. break the gate, take the HQ ----
function HqDemo() {
  const [guard, setGuard] = useState(5);
  const [cap, setCap] = useState(0);
  const [shake, setShake] = useState(0);
  useEffect(() => {
    if (guard > 0 || cap >= 100) return;
    const t = setInterval(() => setCap((c) => Math.min(100, c + 4)), 90);
    return () => clearInterval(t);
  }, [guard, cap]);
  const reset = () => {
    setGuard(5);
    setCap(0);
  };
  return (
    <div className="flex flex-col gap-3">
      <div className="relative h-44 rounded-lg border-[3px] border-nb bg-[#E8D9B5] overflow-hidden">
        <div className="absolute right-3 top-1/2 -translate-y-1/2 w-28 h-28 rounded-full border-[3px] border-nb grid place-items-center" style={{ background: `conic-gradient(#FF8A1A ${cap * 3.6}deg, #1FA46333 0)` }}>
          <span className="w-20 h-20 rounded-full bg-[#E8D9B5] border-[3px] border-nb grid place-items-center font-brut text-lg tabular">{cap}%</span>
        </div>
        <span className="absolute right-6 top-2 font-tag uppercase text-sm leading-none">JEG TOWER</span>
        <button
          type="button"
          disabled={guard === 0}
          onClick={() => {
            setGuard((g) => Math.max(0, g - 1));
            setShake((s) => s + 1);
          }}
          className="absolute left-[30%] top-1/2 -translate-y-1/2 -translate-x-1/2 disabled:cursor-default"
          aria-label={guard ? `Hit the gate guard, ${guard} hits left` : 'Gate guard destroyed'}
        >
          <span key={shake} className={`block ${shake ? 'animate-[wiggle_0.25s]' : ''}`}>
            {guard > 0 ? (
              <svg viewBox="0 0 60 60" className="w-16 h-16" aria-hidden="true">
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
        </button>
        <div className="absolute left-3 bottom-3">
          <Token id="vikas_veer" className="w-10 h-10" />
        </div>
        {cap >= 100 && (
          <div className="absolute inset-0 grid place-items-center bg-nb/40">
            <div className="burst w-44 h-44 bg-pop-yellow grid place-items-center pop-in">
              <span className="font-sfx text-2xl text-center leading-none">TOWER CAPTURED!<br />ROUND WON</span>
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <p className="text-sm font-semibold">{guard > 0 ? `Tap the gate guard (${guard} hits left)` : cap < 100 ? 'Gate down! Capturing…' : 'Captured.'}</p>
        {cap >= 100 && (
          <button type="button" onClick={reset} className="nb-press rounded-full border-[3px] border-nb bg-white font-brut uppercase text-sm px-3 py-1.5 shadow-nb-sm">
            Again
          </button>
        )}
      </div>
    </div>
  );
}

// ---- 5. fire a special (with the character's own voice) ----
function SpecialDemo() {
  const [id, setId] = useState<CharacterId>('bijli_babu');
  const [cd, setCd] = useState(0);
  const [boom, setBoom] = useState(0);
  const timer = useRef<number>();
  useEffect(() => () => window.clearInterval(timer.current), []);
  const fire = () => {
    if (cd > 0) return;
    gameAudio.playSpecial(id, true);
    setBoom((b) => b + 1);
    setCd(100);
    window.clearInterval(timer.current);
    timer.current = window.setInterval(() => setCd((c) => (c <= 0 ? (window.clearInterval(timer.current), 0) : c - 4)), 100);
  };
  const c = CHARACTERS[id];
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {CHARACTER_IDS.map((x) => (
          <button key={x} type="button" onClick={() => setId(x)} aria-pressed={x === id} aria-label={CHARACTERS[x].name} className={`rounded-full transition ${x === id ? 'ring-[3px] ring-nb ring-offset-1 scale-110' : 'opacity-70 hover:opacity-100'}`}>
            <Token id={x} className="w-9 h-9" />
          </button>
        ))}
      </div>
      <div className="relative h-36 rounded-lg border-[3px] border-nb bg-nb overflow-hidden grid place-items-center">
        <div className="absolute inset-0 halftone-light opacity-40" />
        <div className="absolute left-3 bottom-3 z-10 transition" key={`t${boom}`}>
          <Portrait id={id} variant="token" className={`w-16 h-16 ${boom ? 'animate-[wiggle_0.3s_2]' : ''}`} />
        </div>
        {boom > 0 ? (
          <div key={boom} className="relative burst w-60 h-48 bg-pop-yellow grid place-items-center pop-in">
            <span className="font-sfx text-3xl text-center px-12 leading-none text-nb">{c.special.name}!</span>
          </div>
        ) : (
          <p className="relative font-sfx text-2xl text-pop-paper tracking-wide">Hit special →</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={fire}
          disabled={cd > 0}
          className="relative w-16 h-16 shrink-0 rounded-full border-[3px] border-nb shadow-nb-sm nb-press grid place-items-center font-tag uppercase leading-none text-sm"
          style={{ background: cd > 0 ? `conic-gradient(#FFFBF0 ${(100 - cd) * 3.6}deg, #CFC8B8 0)` : ALLIANCES[c.alliance].css }}
          aria-label={`Fire ${c.special.name}`}
        >
          {cd > 0 ? Math.ceil(cd / 25) : 'Special'}
        </button>
        <p className="text-sm leading-snug min-w-0">
          <span className="font-semibold">{c.special.name}:</span> {c.special.description} <span className="text-nb/60">(sound on)</span>
        </p>
      </div>
    </div>
  );
}

// ---- 6. best of three, the winner rules ----
function BestOfDemo() {
  const [rounds, setRounds] = useState<AllianceId[]>(['rashtra_morcha']);
  const score = { rashtra_morcha: rounds.filter((r) => r === 'rashtra_morcha').length, jan_ekta: rounds.filter((r) => r === 'jan_ekta').length };
  const done = score.rashtra_morcha >= 2 || score.jan_ekta >= 2;
  const ruling = rounds[rounds.length - 1] ?? null;
  const next = () => setRounds((r) => (done ? [] : [...r, r.length % 2 ? 'rashtra_morcha' : 'jan_ekta']));
  return (
    <div className="flex flex-col gap-3">
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
          <span key={i} className="flex-1 h-3 rounded border-2 border-nb" style={{ background: rounds[i] ? ALLIANCES[rounds[i]].css : '#fff' }} />
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button type="button" onClick={next} className="nb-press rounded-full border-[3px] border-nb bg-pop-yellow font-brut uppercase text-sm px-4 py-2 shadow-nb-sm">
          {done ? 'New match' : `Play round ${rounds.length + 1}`}
        </button>
        {done && <p className="font-brut uppercase text-sm leading-tight">{ALLIANCES[score.rashtra_morcha >= 2 ? 'rashtra_morcha' : 'jan_ekta'].name} forms the government!</p>}
      </div>
    </div>
  );
}

export function HowToPlay() {
  return (
    <section id="how" className="gutter py-20 sm:py-28 bg-pop-sky/25 border-b-[3px] border-nb relative overflow-hidden" aria-labelledby="how-title">
      <div className="absolute inset-0 halftone opacity-40" aria-hidden="true" />
      <div className="relative max-w-7xl mx-auto">
        <div className="reveal">
          <p className="font-tag text-xl uppercase tracking-widest text-pop-pink leading-none">How to play</p>
          <h2 id="how-title" className="font-brut text-4xl sm:text-6xl uppercase leading-[0.95] mt-2">
            Learn it in <span className="inline-block bg-white border-[3px] border-nb px-2 rotate-1 shadow-nb-sm">60 seconds</span>
          </h2>
          <p className="mt-3 max-w-2xl text-nb/75">Every card below is playable. Poke them in order and you know the whole game.</p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <Tile step={1} title="Pick any neta" body="All eight are open. Your pick decides your alliance." hint="tap a face">
            <PickDemo />
          </Tile>
          <Tile step={2} title="Move & fight" body="Walk with WASD or the joystick. Attacks auto-aim at whoever is in range." hint="click to walk, punch when in range">
            <FightDemo />
          </Tile>
          <Tile step={3} title="Capture their vote booths" body="Each party guards three booths. Stand in an enemy booth to flip it: +20 votes, then a trickle every second." hint="tap a booth">
            <BoothDemo />
          </Tile>
          <Tile step={4} title="Break the CRPF gate, take the tower" body="Destroy the CRPF gate guard, then stand in their Political Tower until the ring fills. That wins the round on the spot." hint="tap the guard">
            <HqDemo />
          </Tile>
          <Tile step={5} title="Fire your special" body="Each neta has one signature move, with their own war cry." hint="pick a neta, hit special">
            <SpecialDemo />
          </Tile>
          <Tile step={6} title="Best of three" body="Capture the tower, or lead on votes at 2:30. The winner rules next round." hint="play the rounds">
            <BestOfDemo />
          </Tile>
        </div>
      </div>
    </section>
  );
}
