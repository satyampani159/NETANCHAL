import { ALLIANCES, CHARACTERS, type MatchEnded } from '@netanchal/shared';
import { exitFullscreen } from '../../game/fullscreen';
import { Portrait } from '../../ui/Portrait';
import { navigationStore } from '../state/navigationStore';

export function ResultsOverlay({ result, mySlot }: { result: MatchEnded; mySlot: string }) {
  const winner = ALLIANCES[result.winner];
  const me = result.stats.find((s) => s.id === mySlot);
  const won = me?.alliance === result.winner;
  const mvp = result.stats.find((s) => s.id === result.mvp)!;
  const orange = result.winner === 'rashtra_morcha';
  const rows = [...result.stats].sort((a, b) => (a.alliance === b.alliance ? b.kills - a.kills : a.alliance === result.winner ? -1 : 1));

  const rematch = () => navigationStore.getState().goTo({ name: 'lobby' });
  const exit = () => {
    exitFullscreen();
    navigationStore.getState().goTo({ name: 'landing' });
  };

  return (
    <main className={`relative min-h-[100svh] overflow-hidden ${orange ? 'bg-saffron' : 'bg-ekta'} text-nb`} aria-labelledby="results-title">
      <div className="absolute left-1/2 top-1/3 w-[220vmax] h-[220vmax] -translate-x-1/2 -translate-y-1/2 sunburst" aria-hidden="true" />
      <div className="absolute inset-0 halftone opacity-40" aria-hidden="true" />
      <div className="relative gutter max-w-4xl mx-auto py-[max(24px,env(safe-area-inset-top))] pb-[max(32px,env(safe-area-inset-bottom))] grid gap-6">
        <header className="text-center rise">
          <p className="inline-block rotate-[-2deg] rounded-md border-[3px] border-nb bg-pop-paper px-3 pt-1.5 pb-1 font-brut uppercase tracking-wider text-sm sm:text-base leading-none shadow-nb-sm">
            {me ? (won ? 'You formed the government' : 'You are the opposition') : 'Result'}
          </p>
          <h1 id="results-title" style={{ animationDelay: '0.15s' }} className="title-slam font-brut uppercase text-5xl sm:text-7xl leading-[0.9] mt-3 text-pop-paper [-webkit-text-stroke:2px_#111] [text-shadow:6px_6px_0_#111]">
            {winner.name} wins
          </h1>
          <p className="inline-block mt-4 rounded-lg border-[3px] border-nb bg-pop-yellow px-4 pt-1 font-sfx text-4xl tracking-wider tabular shadow-nb-sm">
            {result.score.rashtra_morcha} – {result.score.jan_ekta}
          </p>
        </header>

        <section className="flex items-center gap-4 nb-card bg-nb text-pop-paper p-4">
          <Portrait id={mvp.characterId} bg={ALLIANCES[mvp.alliance].css} className="w-20 h-20 shrink-0" />
          <div className="min-w-0">
            <p className="font-tag uppercase tracking-widest text-saffron leading-none">MVP</p>
            <p className="font-display text-2xl leading-tight truncate">
              {CHARACTERS[mvp.characterId].name}{mvp.id === mySlot && <span className="text-chalk/60 text-lg"> · you</span>}
            </p>
            <p className="text-sm text-chalk/75 tabular">
              {mvp.kills} KOs · {mvp.damage} damage · {mvp.captureSeconds}s on capture zones
            </p>
          </div>
        </section>

        <div className="overflow-x-auto nb-card bg-pop-paper">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="font-tag uppercase tracking-wider text-left text-ink/60">
                <th className="px-3 pt-3 pb-1 font-medium">Neta</th>
                <th className="px-3 pt-3 pb-1 font-medium text-right">KO</th>
                <th className="px-3 pt-3 pb-1 font-medium text-right">Down</th>
                <th className="px-3 pt-3 pb-1 font-medium text-right">Damage</th>
                <th className="px-3 pt-3 pb-1 font-medium text-right">Capture</th>
              </tr>
            </thead>
            <tbody className="tabular">
              {rows.map((s) => (
                <tr key={s.id} className={`border-t border-ink/10 ${s.id === mySlot ? 'bg-ink/10 font-semibold' : ''}`}>
                  <td className="px-3 py-2">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-6 rounded-sm" style={{ background: ALLIANCES[s.alliance].css }} />
                      <Portrait id={s.characterId} variant="token" className="w-7 h-7" />
                      <span className="truncate">
                        {s.name}
                        {s.id === mySlot ? <span className="text-nb/60"> · you</span> : s.isBot && <span className="text-nb/50"> · bot</span>}
                      </span>
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">{s.kills}</td>
                  <td className="px-3 py-2 text-right">{s.deaths}</td>
                  <td className="px-3 py-2 text-right">{s.damage}</td>
                  <td className="px-3 py-2 text-right">{s.captureSeconds}s</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          <button type="button" onClick={rematch} className="min-h-[60px] min-w-[180px] rounded-2xl border-[3px] border-nb bg-pop-yellow font-sfx text-3xl tracking-wide px-8 pt-1 shadow-nb nb-press">
            Rematch
          </button>
          <button type="button" onClick={exit} className="min-h-[60px] min-w-[180px] rounded-2xl border-[3px] border-nb bg-pop-paper font-sfx text-3xl tracking-wide px-8 pt-1 shadow-nb nb-press">
            Exit
          </button>
        </div>
      </div>
    </main>
  );
}
