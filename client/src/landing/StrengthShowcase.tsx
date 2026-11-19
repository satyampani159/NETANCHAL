import { ALLIANCES, CHARACTER_IDS, CHARACTERS, type CharacterId, styleOf } from '@netanchal/shared';
import bios from '../data/characters.json';
import { useCountUp, useInView } from '../ui/hooks';
import { Portrait } from '../ui/Portrait';
import { Carousel } from '../ui/Carousel';
import { StyleIcon } from '../ui/StyleBadge';
import { MAX, power, specialDamageText, strength } from './stats';

const BIOS = bios as Record<string, { title: string; quote: string; tip: string }>;

function Meter({ label, value, max, unit, run, delay, color }: { label: string; value: number; max: number; unit?: string; run: boolean; delay: number; color: string }) {
  const segs = 10;
  const filled = Math.round((value / max) * segs);
  return (
    <div className="grid grid-cols-[4.2rem_1fr_3.6rem] items-center gap-2">
      <span className="font-tag uppercase tracking-wider text-base leading-none pt-1">{label}</span>
      <span className="flex gap-[3px]" aria-hidden="true">
        {Array.from({ length: segs }, (_, i) => (
          <span
            key={i}
            className="h-3 sm:h-3.5 flex-1 border-2 border-nb rounded-[3px] transition-colors"
            style={{
              background: run && i < filled ? color : '#FFFBF0',
              transitionDelay: `${delay + i * 0.045}s`,
              transitionDuration: '0.15s',
            }}
          />
        ))}
      </span>
      <span className="tabular text-right font-semibold text-sm">
        {value}
        {unit}
      </span>
    </div>
  );
}

function Panel({ id, index, onOpen }: { id: CharacterId; index: number; onOpen: (id: CharacterId) => void }) {
  const c = CHARACTERS[id];
  const s = strength(c);
  const [ref, inView] = useInView<HTMLElement>(0.3);
  const rating = useCountUp(power(c), inView);
  const orange = c.alliance === 'rashtra_morcha';
  const accent = orange ? '#FF8A1A' : '#1FA463';
  const flip = index % 2 === 1;

  return (
    <article
      ref={ref}
      className={`reveal hover-wiggle group relative nb-card nb-press overflow-hidden ${orange ? 'bg-saffron-pale' : 'bg-ekta-pale'} ${flip ? 'lg:rotate-[0.6deg]' : 'lg:-rotate-[0.6deg]'}`}
    >
      <div className={`absolute inset-y-0 ${flip ? 'right-0' : 'left-0'} w-full sm:w-[46%] halftone opacity-50`} aria-hidden="true" />
      <div className={`relative grid grid-cols-1 sm:grid-cols-[42%_1fr] ${flip ? 'sm:grid-cols-[1fr_42%]' : ''}`}>
        <div className={`relative flex items-end justify-center pt-3 sm:pt-6 ${flip ? 'sm:order-2' : ''}`} style={{ background: `linear-gradient(180deg, transparent 40%, ${accent}33)` }}>
          {/* power burst */}
          <div className="absolute top-3 left-3 z-10 burst w-14 h-14 sm:w-[4.6rem] sm:h-[4.6rem] bg-nb grid place-items-center -rotate-6">
            <div className="burst w-[88%] h-[88%] bg-pop-yellow grid place-items-center">
              <span className="font-sfx text-xl sm:text-2xl leading-none tabular text-nb">{rating}</span>
            </div>
          </div>
          <Portrait id={id} alt="" className="wiggle-target relative w-auto max-h-[104px] sm:w-[92%] sm:max-h-[260px] transition duration-300 group-hover:scale-105 drop-shadow-[5px_6px_0_rgba(17,17,17,0.3)]" />
        </div>

        <div className="p-3 sm:p-5 flex flex-col gap-2 sm:gap-3 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-md border-2 border-nb bg-nb text-pop-paper px-2 pt-1 pb-0.5 font-tag uppercase tracking-wider leading-none text-sm">
              <StyleIcon fightStyle={styleOf(c)} className="w-3.5 h-3.5 -mt-0.5" />
              {styleOf(c)}
            </span>
            <span className="rounded-md border-2 border-nb px-2 pt-1 pb-0.5 font-tag uppercase tracking-wider leading-none text-sm" style={{ background: accent, color: orange ? '#111' : '#fff' }}>
              {ALLIANCES[c.alliance].short}
            </span>
          </div>
          <div>
            <h3 className="font-brut text-2xl sm:text-3xl leading-none uppercase">{c.name}</h3>
            <p className="font-semibold text-nb/70 mt-0.5 sm:mt-1 text-sm sm:text-base">{BIOS[id].title}</p>
          </div>
          <div className="grid gap-1">
            <Meter label="HP" value={s.hp} max={MAX.hp} run={inView} delay={0} color={accent} />
            <Meter label="Speed" value={s.speed} max={MAX.speed} run={inView} delay={0.15} color={accent} />
            <Meter label="Dmg/s" value={s.dps} max={MAX.dps} run={inView} delay={0.3} color={accent} />
            <Meter label="Range" value={s.range} max={MAX.range} run={inView} delay={0.45} color={accent} />
          </div>
          <div className="rounded-lg border-[3px] border-nb bg-pop-paper p-2.5 shadow-nb-sm">
            <p className="font-sfx text-xl tracking-wide leading-none text-pop-pink">
              {c.special.name}!
            </p>
            <p className="font-tag uppercase tracking-wider text-sm leading-none mt-1 text-nb/70">
              {specialDamageText(c)} damage · every {c.special.cooldown}s
            </p>
            <p className="text-xs sm:text-sm mt-1 leading-snug">{c.special.description}</p>
          </div>
          <button type="button" onClick={() => onOpen(id)} className="mt-auto self-start max-sm:hidden rounded-md border-[3px] border-nb bg-nb text-pop-paper px-3 pt-1.5 pb-1 font-tag text-lg uppercase tracking-wider leading-none nb-press shadow-nb-sm">
            Full dossier →
          </button>
        </div>
      </div>
    </article>
  );
}

export function StrengthShowcase({ onOpen }: { onOpen: (id: CharacterId) => void }) {
  return (
    <section id="strength" className="snap-panel gutter py-20 sm:py-28 bg-pop-paper border-b-[3px] border-nb" aria-labelledby="strength-title">
      <div className="w-full max-w-7xl mx-auto min-w-0">
        <div className="reveal flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-tag text-xl uppercase tracking-widest text-pop-pink leading-none">Showcase of strength</p>
            <h2 id="strength-title" className="font-brut text-3xl sm:text-6xl uppercase leading-[1.12] sm:leading-[1.15] mt-1 sm:mt-2">
              Know your <span className="title-badge bg-pop-yellow border-[3px] border-nb px-2 -rotate-1 shadow-nb-sm">neta</span>
            </h2>
          </div>
          <p className="max-w-md text-nb/75 max-md:hidden">Every number here comes straight from the match engine. The burst is an overall power rating out of 100.</p>
        </div>
        <div className="mt-3 sm:mt-12">
          <Carousel label="Characters" className="lg:grid lg:grid-cols-2 lg:gap-8 lg:overflow-visible lg:m-0 lg:p-0">
            {CHARACTER_IDS.map((id, i) => (
              <Panel key={id} id={id} index={i} onOpen={onOpen} />
            ))}
          </Carousel>
        </div>
      </div>
    </section>
  );
}
