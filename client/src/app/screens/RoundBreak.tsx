// Between rounds: a newspaper-style "front page" for the round that just ended, the round's MVP,
// and a countdown into the next political event. Also a small banner when a round begins.
import { useEffect, useState } from 'react';
import { ALLIANCES, CHARACTERS, type CharacterId, headlineFor, themeFor, type RoundEnded, ROUNDS_TO_WIN } from '@netanchal/shared';
import { roundCard } from '../../game/shareHelpers';
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from '../../data/instagram';
import { InstagramIcon } from '../../ui/InstagramIcon';
import { ShareButton } from '../../ui/ShareButton';
import { gameAudio } from '../../game/audio';
import { eventBus } from '../../game/EventBus';
import { Portrait } from '../../ui/Portrait';
import { matchStore } from '../state/matchStore';

type View = { kind: 'intro'; round: number; until: number } | { kind: 'break'; r: RoundEnded; until: number } | null;

export function RoundBreak({ mySlot, myCharacter }: { mySlot: string; myCharacter: CharacterId | null }) {
  const [view, setView] = useState<View>({ kind: 'intro', round: 1, until: Date.now() + 4500 });
  const [now, setNow] = useState(Date.now());
  const coaching = matchStore((st) => st.coaching);

  useEffect(() => {
    return eventBus.on('game:round-ended', (r) => {
      // the last round goes straight to the results screen
      if (Math.max(r.score.rashtra_morcha, r.score.jan_ekta) >= ROUNDS_TO_WIN) return setView(null);
      gameAudio.sfx('sting');
      setView({ kind: 'break', r, until: Date.now() + r.intermission * 1000 });
    });
  }, []);

  useEffect(() => {
    if (!view) return;
    const t = window.setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n >= view.until) {
        if (view.kind === 'break') gameAudio.sfx('horn');
        setView((v) => (v?.kind === 'break' ? { kind: 'intro', round: v.r.round + 1, until: n + 4500 } : null));
      }
    }, 200);
    return () => window.clearInterval(t);
  }, [view]);

  if (!view) return null;

  if (view.kind === 'intro') {
    // the first-match coach uses this slot, so the two never stack
    if (coaching) return null;
    const th = themeFor(view.round);
    return (
      <div className="pointer-events-none absolute inset-x-0 top-[max(96px,calc(env(safe-area-inset-top)+88px))] z-10 flex justify-center px-3" role="status">
        <div className="pop-in rounded-lg border-2 border-nb bg-pop-yellow px-2 py-0.5 text-center shadow-nb-sm max-w-[60vw]">
          <p className="font-tag uppercase tracking-wider text-[10px] leading-none">Round {view.round}</p>
          <p className="font-brut uppercase text-xs sm:text-sm leading-tight">{th.title}</p>
          
        </div>
      </div>
    );
  }

  const { r } = view;
  const win = ALLIANCES[r.winner];
  const lose = ALLIANCES[r.winner === 'rashtra_morcha' ? 'jan_ekta' : 'rashtra_morcha'];
  const { kicker, headline } = headlineFor(win.name, r.reason, Math.abs(r.votes.rashtra_morcha - r.votes.jan_ekta));
  const next = themeFor(r.round + 1);
  const left = Math.max(0, Math.ceil((view.until - now) / 1000));
  const m = r.mvp;
  const char = CHARACTERS[m.characterId];
  return (
    <div className="absolute inset-0 z-20 grid place-items-center bg-black/60 p-3" role="alertdialog" aria-label={`Round ${r.round} result`}>
      <div className="pop-in w-full max-w-[720px] max-h-[92svh] overflow-hidden nb-card bg-pop-paper text-nb">
        <div className="px-3 py-1 sm:py-2 border-b-[3px] border-nb flex items-center justify-between gap-2" style={{ background: win.css, color: r.winner === 'jan_ekta' ? '#fff' : '#111' }}>
          <span className="font-tag uppercase tracking-widest text-xs sm:text-base leading-none">{kicker}</span>
          <span className="font-tag uppercase tracking-widest text-xs sm:text-base leading-none">{themeFor(r.round).title} · Round {r.round}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-[1.25fr_1fr] gap-2 sm:gap-4 p-3 sm:p-5 max-sm:grid-cols-[1.2fr_1fr] max-sm:landscape:grid-cols-[1.2fr_1fr]">
          <div className="min-w-0 flex flex-col gap-1.5 sm:gap-3">
            <h2 className="font-brut uppercase text-[clamp(1.05rem,6.2vh,2.4rem)] leading-[1.02]">{headline}</h2>
            <p className="text-[11px] sm:text-sm leading-snug text-nb/75 [@media(max-height:460px)]:hidden">
              {r.reason === 'votes' || r.reason === 'tiebreak' ? `Final votes: ${win.short} ${r.votes[r.winner]}, ${lose.short} ${r.votes[r.winner === 'rashtra_morcha' ? 'jan_ekta' : 'rashtra_morcha']}.` : `${lose.short} is now the opposition.`} {win.short} forms the government for the next round.
            </p>
            <div className="flex items-center gap-2" aria-label="Score">
              <span className="rounded-md border-[3px] border-nb px-2 pt-0.5 font-brut text-lg sm:text-2xl leading-tight tabular" style={{ background: ALLIANCES.rashtra_morcha.css }}>{r.score.rashtra_morcha}</span>
              <span className="font-tag uppercase text-sm">to</span>
              <span className="rounded-md border-[3px] border-nb px-2 pt-0.5 font-brut text-lg sm:text-2xl leading-tight tabular text-white" style={{ background: ALLIANCES.jan_ekta.css }}>{r.score.jan_ekta}</span>
            </div>
          </div>
          <div className="min-w-0 flex flex-col gap-1.5 sm:gap-3">
            <div className="flex items-center gap-2 rounded-lg border-[3px] border-nb bg-nb text-pop-paper p-2">
              <Portrait id={m.characterId} bg={ALLIANCES[m.alliance].css} className="w-11 h-11 sm:w-16 sm:h-16 shrink-0" />
              <div className="min-w-0">
                <p className="font-tag uppercase tracking-widest text-pop-yellow leading-none text-xs sm:text-sm">★ {m.losingSide ? 'Opposition MVP' : 'Round MVP'}</p>
                <p className="font-brut uppercase leading-tight truncate text-sm sm:text-lg">{char.name}</p>
                <p className="text-[11px] sm:text-xs text-pop-paper/80 tabular leading-tight">
                  {m.damage} dmg · {m.kills} KO · {m.assists} assist · {m.captureSeconds}s holding{m.gateBreaks ? ' · gate breaker' : ''}
                </p>
              </div>
            </div>
            <div className="rounded-lg border-[3px] border-nb bg-pop-yellow px-2 py-1 text-center">
              <p className="font-tag uppercase tracking-wider text-[11px] sm:text-sm leading-none">Next: {next.title}</p>
              <p className="font-brut uppercase text-base sm:text-xl leading-tight">Round {r.round + 1} in {left}</p>
            </div>
            <ShareButton
              build={() => roundCard(r, mySlot, myCharacter)}
              text={`${headline} (Round ${r.round}, Netanchal)`}
              label="Share this round"
              className="self-start rounded-lg border-[3px] border-nb bg-pop-paper px-3 min-h-[40px] font-brut uppercase text-xs sm:text-sm shadow-nb-sm"
            />
            <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label={`Follow @${INSTAGRAM_HANDLE} on Instagram`} className="self-start inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold underline">
              <InstagramIcon className="w-4 h-4" /> @{INSTAGRAM_HANDLE}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
