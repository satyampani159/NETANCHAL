import { useEffect, useRef } from 'react';
import { ALLIANCES, CHARACTERS, type CharacterId } from '@netanchal/shared';
import bios from '../data/characters.json';
import { Portrait } from '../ui/Portrait';
import { RoleBadge } from '../ui/RoleBadge';

const MAX = { hp: 220, speed: 180 };

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div className="grid grid-cols-[4.5rem_1fr_3rem] items-center gap-3">
      <span className="font-tag uppercase tracking-wider text-ink/60 leading-none pt-1">{label}</span>
      <span className="h-3.5 rounded-md border-2 border-nb bg-white overflow-hidden">
        <span className="block h-full border-r-2 border-nb" style={{ width: `${(value / max) * 100}%`, background: color }} />
      </span>
      <span className="tabular text-right font-semibold">{value}</span>
    </div>
  );
}

export function CharacterSheet({ id, onClose }: { id: CharacterId; onClose: () => void }) {
  const c = CHARACTERS[id];
  const a = ALLIANCES[c.alliance];
  const bio = (bios as Record<string, { title: string; bio: string; tip: string }>)[id];
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current!;
    if (!d.open) d.showModal();
    const close = () => onClose();
    d.addEventListener('close', close);
    return () => d.removeEventListener('close', close);
  }, [onClose]);

  return (
    <dialog
      ref={ref}
      className="backdrop:bg-nb/70 backdrop:backdrop-blur-sm rounded-2xl p-0 w-[min(680px,calc(100vw-32px))] max-h-[calc(100svh-32px)] bg-pop-paper text-nb border-[3px] border-nb shadow-nb-lg pop-in"
      onClick={(e) => e.target === ref.current && ref.current?.close()}
      aria-labelledby="sheet-title"
    >
      <div className="relative border-b-[3px] border-nb overflow-hidden" style={{ background: a.css }}>
        <div className="absolute inset-0 halftone opacity-50" aria-hidden="true" />
        <div className="relative flex items-end gap-4 px-5 pt-5">
          <Portrait id={id} className="w-32 sm:w-40 -mb-px drop-shadow-[5px_5px_0_rgba(17,17,17,0.35)]" alt="" />
          <div className="pb-4 min-w-0">
            <p className="inline-block rounded border-2 border-nb bg-pop-paper px-2 pt-1 pb-0.5 font-tag uppercase tracking-widest leading-none">{a.name}</p>
            <h3 id="sheet-title" className={`font-brut uppercase text-3xl sm:text-4xl leading-none mt-2 ${c.alliance === 'jan_ekta' ? 'text-white [text-shadow:3px_3px_0_#111]' : ''}`}>
              {c.name}
            </h3>
            <p className={`font-semibold mt-1 ${c.alliance === 'jan_ekta' ? 'text-white' : 'text-nb/75'}`}>{bio.title}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => ref.current?.close()}
          className="absolute top-3 right-3 w-11 h-11 grid place-items-center rounded-full border-[3px] border-nb bg-pop-paper text-nb text-xl nb-press shadow-nb-sm"
          aria-label="Close"
        >
          ✕
        </button>
      </div>
      <div className="px-5 py-5 grid gap-5 overflow-y-auto">
        <div className="flex flex-wrap gap-2 items-center">
          <RoleBadge role={c.role} />
        </div>
        <p className="bubble relative px-4 py-3 font-semibold mb-2">“{(bio as unknown as { quote: string }).quote}”</p>
        <p className="max-w-[60ch]">{bio.bio}</p>
        <div className="grid gap-2">
          <Bar label="HP" value={c.hp} max={MAX.hp} color={a.css} />
          <Bar label="Speed" value={c.speed} max={MAX.speed} color={a.css} />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="border-t-[3px] border-nb pt-2">
            <p className="font-tag uppercase tracking-wider text-ink/60 leading-none">Basic</p>
            <p className="font-brut uppercase text-lg">{c.basic.name}</p>
            <p className="text-sm text-ink/80 tabular">
              {c.basic.damage} dmg · {c.basic.kind === 'melee' ? 'melee' : `${c.basic.range}px range`} · every {c.basic.cooldown}s
            </p>
          </div>
          <div className="border-t-[3px] border-nb pt-2">
            <p className="font-tag uppercase tracking-wider text-ink/60 leading-none">Special · {c.special.cooldown}s</p>
            <p className="font-sfx text-2xl tracking-wide text-pop-pink leading-none mt-1">{c.special.name}!</p>
            <p className="text-sm text-ink/80">{c.special.description}</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-tag uppercase tracking-wider text-ekta-deep leading-none">Strong against</p>
            <p className="font-semibold">{c.strongAgainst.map((x) => CHARACTERS[x].name).join(', ')}</p>
          </div>
          <div>
            <p className="font-tag uppercase tracking-wider text-[#B3261E] leading-none">Weak against</p>
            <p className="font-semibold">{c.weakAgainst.map((x) => CHARACTERS[x].name).join(', ')}</p>
          </div>
        </div>
        <p className="text-sm bg-pop-yellow border-[3px] border-nb rounded-lg px-3 py-2 shadow-nb-sm">
          <span className="font-semibold">Tip: </span>
          {bio.tip}
        </p>
      </div>
    </dialog>
  );
}
