import { useRef, useState } from 'react';
import { ALLIANCES, type AllianceId, CHARACTERS, type CharacterId, LEADS, charactersOf } from '@netanchal/shared';
import bios from '../data/characters.json';
import { Portrait } from '../ui/Portrait';

const BIOS = bios as Record<string, { title: string; quote: string }>;

// lead in front and biggest, the other three around them like a party poster
const SLOTS = [
  { w: 'w-[34%]', z: 'z-30', y: '0px', tilt: '-2deg' },
  { w: 'w-[26%]', z: 'z-20', y: '-6%', tilt: '2deg' },
  { w: 'w-[24%]', z: 'z-10', y: '-14%', tilt: '-1.5deg' },
  { w: 'w-[26%]', z: 'z-20', y: '-4%', tilt: '1.5deg' },
];

function orderFor(alliance: AllianceId): CharacterId[] {
  const lead = LEADS[alliance];
  const rest = charactersOf(alliance)
    .map((c) => c.id)
    .filter((id) => id !== lead);
  // visual order left→right: back, lead, back, front
  return alliance === 'rashtra_morcha' ? [rest[2], rest[0], lead, rest[1]] : [rest[1], lead, rest[0], rest[2]];
}

function Fighter({ id, index, slot, onOpen, delay }: { id: CharacterId; index: number; slot: (typeof SLOTS)[number]; onOpen: (id: CharacterId) => void; delay: number }) {
  const c = CHARACTERS[id];
  const [hover, setHover] = useState(false);
  const depth = slot.z === 'z-30' ? 14 : slot.z === 'z-20' ? 9 : 5;
  return (
    <button
      type="button"
      onClick={() => onOpen(id)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      aria-label={`${c.name}, ${BIOS[id].title}. Open dossier`}
      className={`group relative ${slot.w} ${slot.z} shrink-0 -mx-[3%] pop-in focus-visible:outline-none`}
      style={{ animationDelay: `${delay}s`, marginTop: slot.y }}
    >
      {/* speech bubble on hover */}
      <span
        className={`bubble block absolute left-1/2 bottom-[92%] -translate-x-1/2 w-[clamp(150px,18vw,220px)] px-3 py-2 text-left font-body font-semibold text-[13px] sm:text-sm leading-snug text-nb transition duration-200 pointer-events-none ${
          hover ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-90'
        }`}
        style={{ zIndex: 40 }}
      >
        “{BIOS[id].quote}”
      </span>
      {/* mouse parallax lives on its own layer so the pop-in/bob animations don't overwrite it */}
      <span className="block transition-transform duration-300 ease-out" style={{ transform: `translate(calc(var(--px, 0) * ${depth}px), calc(var(--py, 0) * ${depth * 0.6}px))` }}>
      <span className="block bob" style={{ animationDelay: `${(index * 0.37) % 1.4}s`, ['--tilt' as string]: slot.tilt }}>
        <Portrait
          id={id}
          alt=""
          className="w-full transition duration-200 ease-out group-hover:-translate-y-3 group-hover:scale-[1.07] group-focus-visible:-translate-y-3 drop-shadow-[6px_8px_0_rgba(17,17,17,0.35)]"
        />
      </span>
      </span>
      <span
        className={`absolute left-1/2 -bottom-2 -translate-x-1/2 whitespace-nowrap rounded-md border-[3px] border-nb bg-pop-paper px-2 pt-1 pb-0.5 font-tag text-base sm:text-lg uppercase tracking-wider leading-none shadow-nb-sm transition ${
          hover ? 'opacity-100 -rotate-2' : 'opacity-0 sm:opacity-0 rotate-0'
        }`}
      >
        {c.name}
      </span>
    </button>
  );
}

function Team({ alliance, onOpen, baseDelay }: { alliance: AllianceId; onOpen: (id: CharacterId) => void; baseDelay: number }) {
  const left = alliance === 'rashtra_morcha';
  return (
    <div className="relative flex flex-col items-center min-w-0">
      <p
        className={`relative z-40 inline-block rounded-md border-[3px] border-nb px-3 pt-1.5 pb-1 font-brut text-sm sm:text-base uppercase tracking-wide shadow-nb-sm ${
          left ? 'bg-pop-paper -rotate-2' : 'bg-pop-paper rotate-2'
        }`}
      >
        <span className="inline-block w-3 h-3 rounded-full border-2 border-nb mr-2 align-middle" style={{ background: ALLIANCES[alliance].css }} />
        {ALLIANCES[alliance].name}
      </p>
      <div className="mt-[6%] w-full flex items-end justify-center">
        {(() => {
          let next = 1;
          return orderFor(alliance).map((id, i) => (
            <Fighter key={id} id={id} index={i} slot={SLOTS[id === LEADS[alliance] ? 0 : next++]} onOpen={onOpen} delay={baseDelay + i * 0.12} />
          ));
        })()}
      </div>
    </div>
  );
}

export function HeroLineup({ onOpen, children }: { onOpen: (id: CharacterId) => void; children?: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const onMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || e.pointerType !== 'mouse') return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty('--mx', `${x * 100}%`);
    el.style.setProperty('--my', `${y * 100}%`);
    el.style.setProperty('--px', `${(x - 0.5) * 2}`);
    el.style.setProperty('--py', `${(y - 0.5) * 2}`);
  };

  return (
    <section ref={ref} onPointerMove={onMove} className="relative overflow-hidden border-b-[3px] border-nb" aria-labelledby="hero-title">
      {/* split backdrop, rotating sunburst, halftone, cursor spotlight, vignette */}
      <div className="absolute inset-0 grid grid-cols-1 grid-rows-2 lg:grid-cols-2 lg:grid-rows-1" aria-hidden="true">
        <div className="bg-saffron" />
        <div className="bg-ekta" />
      </div>
      <div className="absolute left-1/2 top-1/2 w-[260vmax] h-[260vmax] -translate-x-1/2 -translate-y-1/2 sunburst" aria-hidden="true" />
      <div className="absolute inset-0 halftone opacity-60" aria-hidden="true" />
      <div className="absolute inset-0 spotlight" aria-hidden="true" />
      <div className="absolute inset-0 shadow-[inset_0_0_160px_rgba(0,0,0,0.45)]" aria-hidden="true" />
      <div className="letterbox-top" aria-hidden="true" />
      <div className="letterbox-bottom" aria-hidden="true" />

      <div className="relative camera-settle gutter pt-[max(88px,calc(env(safe-area-inset-top)+80px))] pb-10 sm:pb-14">
        <header className="text-center">
          <p className="inline-block rotate-[-2deg] rounded-md border-[3px] border-nb bg-pop-yellow px-3 pt-1.5 pb-1 font-brut text-xs sm:text-sm uppercase tracking-widest shadow-nb-sm">
            Election season · 4v4 · Best of 3
          </p>
          <h1
            id="hero-title"
            className="title-slam light-sweep mt-4 font-brut text-[clamp(3.2rem,12vw,9.5rem)] leading-[0.85] tracking-tight text-pop-paper [-webkit-text-stroke:3px_#111] [text-shadow:6px_6px_0_#111] sm:[text-shadow:10px_10px_0_#111]"
          >
            NETANCHAL
          </h1>
          <p className="mx-auto mt-5 w-fit max-w-full rotate-1 rounded-md border-[3px] border-nb bg-nb px-4 pt-2 pb-1.5 font-body font-semibold text-sm sm:text-lg text-pop-paper shadow-[4px_4px_0_#FFD60A]">
            Eight netas. Two alliances. Whoever holds the HQ forms the government.
          </p>
        </header>

        <div className="relative mt-10 sm:mt-14 grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] items-end gap-12 lg:gap-2 max-w-7xl mx-auto">
          <Team alliance="rashtra_morcha" onOpen={onOpen} baseDelay={1.2} />
          <div className="relative z-40 self-center grid place-items-center" aria-hidden="true">
            <div className="burst w-28 h-28 sm:w-36 sm:h-36 bg-nb grid place-items-center rotate-6 animate-[pulse_2.4s_ease-in-out_infinite]">
              <div className="burst w-[88%] h-[88%] bg-pop-yellow grid place-items-center">
                <span className="font-sfx text-5xl sm:text-6xl text-nb -rotate-6 tracking-wider">VS</span>
              </div>
            </div>
          </div>
          <Team alliance="jan_ekta" onOpen={onOpen} baseDelay={1.5} />
        </div>

        <p className="relative z-40 mt-6 text-center font-tag text-lg uppercase tracking-widest text-nb/80">Hover a neta to hear them out · tap for their dossier</p>

        <div className="relative z-40 mt-8 flex flex-col items-center gap-4">{children}</div>
      </div>
    </section>
  );
}
