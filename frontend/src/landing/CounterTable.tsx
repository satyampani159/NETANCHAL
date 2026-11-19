import { ALLIANCES, CHARACTER_IDS, CHARACTERS } from '@netanchal/shared';
import { Portrait } from '../ui/Portrait';

export function CounterTable() {
  return (
    <section id="counters" className="gutter py-20 sm:py-28 bg-pop-paper border-b-[3px] border-nb" aria-labelledby="counter-title">
      <div className="max-w-7xl mx-auto">
        <div className="reveal">
          <p className="font-tag text-xl uppercase tracking-widest text-pop-pink leading-none">Soft counters</p>
          <h2 id="counter-title" className="font-brut text-4xl sm:text-6xl uppercase leading-[0.95] mt-2">
            Who beats <span className="inline-block bg-pop-pink text-white border-[3px] border-nb px-2 -rotate-1 shadow-nb-sm">who</span>
          </h2>
          <p className="mt-3 max-w-2xl text-nb/75">Nobody is unbeatable. These matchups tilt a fight; they don't decide it.</p>
        </div>
        <div className="reveal mt-10 overflow-x-auto nb-card bg-white">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-nb text-pop-paper">
              <tr className="font-tag uppercase tracking-wider text-lg">
                <th className="px-4 pt-3 pb-2 font-medium">Neta</th>
                <th className="px-4 pt-3 pb-2 font-medium">Beats</th>
                <th className="px-4 pt-3 pb-2 font-medium">Loses to</th>
                <th className="px-4 pt-3 pb-2 font-medium">Why</th>
              </tr>
            </thead>
            <tbody>
              {CHARACTER_IDS.map((id) => {
                const c = CHARACTERS[id];
                return (
                  <tr key={id} className="border-t-[3px] border-nb/10 align-middle transition-colors hover:bg-pop-yellow/40">
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-3">
                        <Portrait id={id} variant="token" className="w-11 h-11 shrink-0 transition hover:scale-125 hover:-rotate-6" />
                        <span>
                          <span className="block font-brut uppercase whitespace-nowrap">{c.name}</span>
                          <span className="block font-tag uppercase tracking-wider leading-none" style={{ color: ALLIANCES[c.alliance].accent }}>
                            {ALLIANCES[c.alliance].short} · {c.role}
                          </span>
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex flex-wrap gap-1.5">
                        {c.strongAgainst.map((x) => (
                          <span key={x} className="rounded-md border-2 border-nb bg-ekta-pale px-2 py-0.5 font-semibold whitespace-nowrap">{CHARACTERS[x].name}</span>
                        ))}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex flex-wrap gap-1.5">
                        {c.weakAgainst.map((x) => (
                          <span key={x} className="rounded-md border-2 border-nb bg-[#FFD9DD] px-2 py-0.5 font-semibold whitespace-nowrap">{CHARACTERS[x].name}</span>
                        ))}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-nb/80 max-w-[36ch]">{c.counterNote}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
