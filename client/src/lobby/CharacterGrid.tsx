import { ALLIANCES, ALLIANCE_IDS, type CharacterId, charactersOf, type SlotView, styleOf } from '@netanchal/shared';
import { Portrait } from '../ui/Portrait';
import { StyleBadge } from '../ui/StyleBadge';

/** All eight netas. Picking one also picks your alliance. */
export function CharacterGrid({ slots, me, onPick, inProgress = false }: { slots: SlotView[]; me: string | null; onPick: (id: CharacterId) => void; inProgress?: boolean }) {
  const mine = slots.find((s) => s.playerId === me)?.characterId ?? null;
  return (
    <div className="grid gap-3 sm:gap-5">
      {ALLIANCE_IDS.map((alliance) => {
        const orange = alliance === 'rashtra_morcha';
        const seatsFree = slots.some((s) => s.alliance === alliance && (!s.playerId || s.playerId === me));
        return (
          <section key={alliance} aria-label={ALLIANCES[alliance].name} className={`nb-card p-2 sm:p-4 relative overflow-hidden ${orange ? 'bg-saffron' : 'bg-ekta'}`}>
            <div className="absolute inset-0 halftone opacity-40" aria-hidden="true" />
            <div className="relative flex items-center justify-between gap-2 mb-2 sm:mb-3">
              <h3 className="rounded-md border-[3px] border-nb bg-pop-paper px-2 pt-1 pb-0.5 font-brut uppercase text-xs sm:text-base shadow-nb-sm -rotate-1">{ALLIANCES[alliance].name}</h3>
              {!seatsFree && <span className="font-tag uppercase text-lg leading-none bg-nb text-pop-paper px-2 pt-1 rounded">Full</span>}
            </div>
            <ul className="relative grid grid-cols-4 gap-1.5 sm:gap-3">
              {charactersOf(alliance).map((c) => {
                const holder = slots.find((s) => s.characterId === c.id);
                const isMine = mine === c.id;
                const locked = (!!holder && !isMine && !holder.isBot) || (!seatsFree && !isMine);
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      disabled={locked}
                      onClick={() => onPick(c.id)}
                      aria-pressed={isMine}
                      className={`group relative w-full rounded-lg sm:rounded-xl border-[3px] border-nb overflow-hidden text-left bg-pop-paper transition ${
                        isMine ? 'shadow-none translate-x-1 translate-y-1 ring-4 ring-pop-yellow' : 'shadow-nb-sm hover:-translate-y-1 hover:shadow-nb'
                      } ${locked ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                    >
                      <span className="lobby-card-art block relative aspect-[4/5] sm:aspect-[5/6] max-h-[300px] bg-gradient-to-b from-transparent to-black/10">
                        <Portrait id={c.id} alt="" className="absolute inset-0 w-full h-full p-1 transition duration-200 group-hover:scale-105" />
                        {isMine && <span className="absolute top-1 right-1 burst w-8 h-8 sm:w-12 sm:h-12 bg-pop-yellow grid place-items-center font-sfx text-xs sm:text-lg">YOU</span>}
                      </span>
                      <span className="block px-1 sm:px-2.5 pb-1 sm:pb-2.5 pt-0.5 sm:pt-1 border-t-[3px] border-nb">
                        <span className="name-2l block font-brut uppercase text-[10px] sm:text-sm leading-tight truncate" title={c.name}>{c.name}</span>
                        <span className="mt-0.5 sm:mt-1.5 flex items-center justify-between gap-1">
                          <span className="badge-wrap max-sm:hidden"><StyleBadge fightStyle={styleOf(c)} /></span>
                          {locked && holder && <span className="text-[9px] sm:text-xs font-semibold truncate">{holder.reserved ? 'Away' : inProgress ? 'Playing' : 'Picked'}<span className="max-sm:hidden"> · {holder.name}</span></span>}
                          {inProgress && !locked && holder?.isBot && <span className="text-[9px] sm:text-xs font-bold truncate rounded bg-pop-yellow border-2 border-nb px-1 sm:px-1.5 leading-tight">Bot<span className="max-sm:hidden"> · take over</span></span>}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
