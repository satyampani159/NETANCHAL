import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ALLIANCES, type AllianceId, CHARACTERS, type CharacterId, LEADS, charactersOf } from '@netanchal/shared';
import bios from '../data/characters.json';
import { Portrait } from '../ui/Portrait';

const BIOS = bios as Record<string, { title: string; quote: string }>;

// lead in front and biggest, the other three around them like a party poster
const SLOTS = [
  { w: 'w-[32%] sm:w-[34%]', z: 'z-30', y: '0px', tilt: '-2deg' },
  { w: 'w-[25%] sm:w-[26%]', z: 'z-20', y: '-6%', tilt: '2deg' },
  { w: 'w-[23%] sm:w-[24%]', z: 'z-10', y: '-14%', tilt: '-1.5deg' },
  { w: 'w-[25%] sm:w-[26%]', z: 'z-20', y: '-4%', tilt: '1.5deg' },
];

function orderFor(alliance: AllianceId): CharacterId[] {
  const lead = LEADS[alliance];
  const rest = charactersOf(alliance)
    .map((c) => c.id)
    .filter((id) => id !== lead);
  // visual order left→right: back, lead, back, front
  return alliance === 'rashtra_morcha' ? [rest[2], rest[0], lead, rest[1]] : [rest[1], lead, rest[0], rest[2]];
}

/** The quote bubble and name tag are drawn in a portal on top of the whole page, so nothing can paint over them. */
function HoverTags({ rect, quote, name }: { rect: DOMRect; quote: string; name: string }) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const bw = Math.min(220, Math.max(150, vw * 0.18));
  const cx = rect.left + rect.width / 2;
  const left = Math.min(Math.max(8, cx - bw / 2), vw - bw - 8);
  const roomAbove = rect.top > 110;
  return createPortal(
    <div aria-hidden="true" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999 }}>
      <span
        className="bubble block px-3 py-2 text-left font-body font-semibold text-[13px] sm:text-sm leading-snug text-nb"
        style={{ position: 'absolute', left, width: bw, ...(roomAbove ? { bottom: vh - rect.top + 6 } : { top: rect.bottom + 34 }) }}
      >
        “{quote}”
      </span>
      <span
        className="whitespace-nowrap rounded-md border-[3px] border-nb bg-pop-paper px-2 pt-1 pb-0.5 font-tag text-base sm:text-lg uppercase tracking-wider leading-none shadow-nb-sm -rotate-2"
        style={{ position: 'absolute', left: Math.min(Math.max(8, cx - 60), vw - 128), top: rect.bottom - 6 }}
      >
        {name}
      </span>
    </div>,
    document.body,
  );
}

function Fighter({ id, index, slot, onOpen, delay }: { id: CharacterId; index: number; slot: (typeof SLOTS)[number]; onOpen: (id: CharacterId) => void; delay: number }) {
  const c = CHARACTERS[id];
  const ref = useRef<HTMLButtonElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const show = () => ref.current && setRect(ref.current.getBoundingClientRect());
  const hide = () => setRect(null);
  // the tags are positioned from the character's box, so any scroll or resize just hides them
  useEffect(() => {
    if (!rect) return;
    window.addEventListener('scroll', hide, { passive: true, capture: true });
    window.addEventListener('resize', hide);
    return () => {
      window.removeEventListener('scroll', hide, { capture: true } as EventListenerOptions);
      window.removeEventListener('resize', hide);
    };
  }, [rect]);
  const depth = slot.z === 'z-30' ? 14 : slot.z === 'z-20' ? 9 : 5;
  return (
    <button
      ref={ref}
      type="button"
      onClick={() => onOpen(id)}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      aria-label={`${c.name}, ${BIOS[id].title}. Open dossier`}
      className={`group relative ${slot.w} ${slot.z} shrink-0 -mx-[3%] pop-in focus-visible:outline-none`}
      style={{ animationDelay: `${delay}s`, marginTop: slot.y }}
    >
      {rect && <HoverTags rect={rect} quote={BIOS[id].quote} name={c.name} />}
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
      <div className="mt-[4%] w-full max-md:max-w-[240px] [@media(max-height:700px)]:max-md:max-w-[170px] flex items-end justify-center">
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
    <section id="hero" ref={ref} onPointerMove={onMove} className="relative overflow-hidden border-b-[3px] border-nb snap-start max-md:min-h-[100svh] max-md:flex max-md:flex-col max-md:justify-center" aria-labelledby="hero-title">
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

      <div className="relative camera-settle gutter pt-[max(5.25rem,calc(env(safe-area-inset-top)+4.9rem))] md:pt-[max(6.25rem,calc(env(safe-area-inset-top)+5.9rem))] pb-2 sm:pb-14">
        <header className="text-center">
          <p className="inline-block rotate-[-2deg] rounded-md border-[3px] border-nb bg-pop-yellow px-3 pt-1.5 pb-1 font-brut text-xs sm:text-sm uppercase tracking-widest shadow-nb-sm">
            Election season · 4v4 · Best of 3
          </p>
          <h1
            id="hero-title"
            className="title-slam light-sweep mt-2 sm:mt-4 font-brut text-[clamp(2.2rem,11vw,9.5rem)] leading-[0.85] tracking-tight text-pop-paper [-webkit-text-stroke:3px_#111] [text-shadow:6px_6px_0_#111] sm:[text-shadow:10px_10px_0_#111]"
          >
            NETANCHAL
          </h1>
          <p className="mx-auto mt-3 sm:mt-5 w-fit max-w-full [@media(max-height:700px)]:hidden rotate-1 rounded-md border-[3px] border-nb bg-nb px-3 sm:px-4 pt-1.5 sm:pt-2 pb-1 sm:pb-1.5 font-body font-semibold text-xs sm:text-lg text-pop-paper shadow-[4px_4px_0_#FFD60A]">
            Eight netas. Two alliances. Whoever holds the HQ forms the government.
          </p>
        </header>

        <div className="hero-grid relative mt-2 sm:mt-14 grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] items-end gap-5 lg:gap-2 max-w-7xl mx-auto">
          <Team alliance="rashtra_morcha" onOpen={onOpen} baseDelay={1.2} />
          <div className="relative z-50 self-center grid place-items-center max-lg:h-12 [@media(max-height:700px)]:max-lg:h-8 sm:max-lg:h-24" aria-hidden="true">
            <div className="burst w-14 h-14 sm:w-24 sm:h-24 lg:w-36 lg:h-36 bg-nb grid place-items-center rotate-6 animate-[pulse_2.4s_ease-in-out_infinite]">
              <div className="burst w-[88%] h-[88%] bg-pop-yellow grid place-items-center">
                <span className="font-sfx text-2xl sm:text-4xl lg:text-6xl text-nb -rotate-6 tracking-wider">VS</span>
              </div>
            </div>
          </div>
          <Team alliance="jan_ekta" onOpen={onOpen} baseDelay={1.5} />
        </div>

        <p className="relative z-40 mt-2 sm:mt-6 max-md:hidden text-center font-tag text-base sm:text-lg uppercase tracking-widest text-nb/80"><span className="max-md:hidden">Hover a neta to hear them out · </span>Tap a neta for their dossier</p>

        <div className="relative z-40 mt-2 sm:mt-8 flex flex-col items-center gap-1.5 sm:gap-4">{children}</div>
      </div>
    </section>
  );
}
