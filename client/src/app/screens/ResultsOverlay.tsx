import { ALLIANCES, CHARACTERS, type MatchEnded } from '@netanchal/shared';
import { exitFullscreen } from '../../game/fullscreen';
import { Portrait } from '../../ui/Portrait';
import { levelInfo } from '../../game/progression';
import { matchCard } from '../../game/shareHelpers';
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from '../../data/instagram';
import { InstagramIcon } from '../../ui/InstagramIcon';
import { ShareButton } from '../../ui/ShareButton';
import { HAS_SERVER_CONFIG, matchStore } from '../state/matchStore';
import { navigationStore } from '../state/navigationStore';
import { profileStore } from '../state/profileStore';

export function ResultsOverlay({ result, mySlot }: { result: MatchEnded; mySlot: string }) {
  const winner = ALLIANCES[result.winner];
  const me = result.stats.find((s) => s.id === mySlot);
  const won = me?.alliance === result.winner;
  const mvp = result.stats.find((s) => s.id === result.mvp)!;
  const orange = result.winner === 'rashtra_morcha';
  const rows = [...result.stats].sort((a, b) => (a.alliance === b.alliance ? b.kills - a.kills : a.alliance === result.winner ? -1 : 1));

  const gains = profileStore((st) => st.lastGains);
  const profile = profileStore((st) => st.profile);
  const lv = levelInfo(profile.xp);
  const online = matchStore.getState().mode === 'online';
  const rematch = () => navigationStore.getState().goTo({ name: 'lobby' });
  // a fresh private room, so the link goes to friends rather than to strangers
  const inviteFriends = () => {
    if (!HAS_SERVER_CONFIG) {
      // no game server on this site: share a link that starts a bot match straight away
      const link = `${location.origin}${location.pathname}?play=1`;
      const text = 'Come play Netanchal with me!';
      if (navigator.share) navigator.share({ title: 'Netanchal', text, url: link }).catch(() => {});
      else navigator.clipboard?.writeText(`${text} ${link}`).catch(() => {});
      return;
    }
    matchStore.getState().setMode('online');
    matchStore.getState().setRoomIntent({ mode: 'create', code: '' });
    navigationStore.getState().goTo({ name: 'lobby' });
  };
  const exit = () => {
    exitFullscreen();
    navigationStore.getState().goTo({ name: 'landing' });
  };

  return (
    <main className={`results-main relative h-[100svh] overflow-y-auto overflow-x-hidden ${orange ? 'bg-saffron' : 'bg-ekta'} text-nb`} aria-labelledby="results-title">
      <div className="absolute left-1/2 top-1/3 w-[220vmax] h-[220vmax] -translate-x-1/2 -translate-y-1/2 sunburst" aria-hidden="true" />
      <div className="absolute inset-0 halftone opacity-40" aria-hidden="true" />
      <div className="relative gutter max-w-4xl mx-auto py-[max(14px,env(safe-area-inset-top))] sm:py-[max(24px,env(safe-area-inset-top))] pb-[max(16px,env(safe-area-inset-bottom))] sm:pb-[max(32px,env(safe-area-inset-bottom))] grid gap-3 sm:gap-6 max-md:min-h-full max-md:grid-rows-[auto_auto_auto_minmax(0,1fr)_auto]">
        <header className="text-center rise">
          <p className="inline-block rotate-[-2deg] rounded-md border-[3px] border-nb bg-pop-paper px-3 pt-1.5 pb-1 font-brut uppercase tracking-wider text-sm sm:text-base leading-none shadow-nb-sm">
            {me ? (won ? 'You formed the government' : 'You are the opposition') : 'Result'}
          </p>
          <h1 id="results-title" style={{ animationDelay: '0.15s' }} className="title-slam font-brut uppercase text-3xl sm:text-7xl leading-[0.9] mt-2 sm:mt-3 text-pop-paper [-webkit-text-stroke:2px_#111] [text-shadow:6px_6px_0_#111]">
            {winner.name} wins
          </h1>
          <p className="inline-block mt-2 sm:mt-4 rounded-lg border-[3px] border-nb bg-pop-yellow px-3 sm:px-4 pt-1 font-sfx text-3xl sm:text-4xl tracking-wider tabular shadow-nb-sm">
            {result.score.rashtra_morcha} – {result.score.jan_ekta}
          </p>
        </header>

        <section className="flex items-center gap-3 sm:gap-4 nb-card bg-nb text-pop-paper p-2.5 sm:p-4">
          <Portrait id={mvp.characterId} bg={ALLIANCES[mvp.alliance].css} className="w-12 h-12 sm:w-20 sm:h-20 shrink-0" />
          <div className="min-w-0">
            <p className="font-tag uppercase tracking-widest text-saffron leading-none">MVP</p>
            <p className="font-display text-2xl leading-tight truncate">
              {CHARACTERS[mvp.characterId].name}{mvp.id === mySlot && <span className="text-chalk/60 text-lg"> · you</span>}
            </p>
            <p className="text-sm text-chalk/75 tabular">
              {mvp.kills} KOs · {mvp.assists} assists · {mvp.damage} damage · {mvp.captureSeconds}s holding booths and tower · {mvp.boothFlips} booths flipped{mvp.gateBreaks ? ` · ${mvp.gateBreaks} gate break` : ''}{mvp.towerCaptures ? ' · took the tower' : ''}
            </p>
          </div>
        </section>

        {gains && (
          <section className="nb-card bg-pop-paper px-3 py-2 sm:p-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm font-semibold" aria-label="Your progress">
            <span className="font-brut uppercase">+{gains.xp} XP</span>
            <span className="flex items-center gap-2 min-w-[120px]">
              Lv {lv.level}
              <span className="relative h-2.5 w-24 sm:w-32 rounded-full border-2 border-nb bg-white overflow-hidden">
                <span className="absolute inset-y-0 left-0 bg-pop-yellow" style={{ width: `${Math.round((100 * lv.into) / lv.need)}%` }} />
              </span>
              {gains.levelAfter > gains.levelBefore && <span className="font-brut uppercase text-saffron">Level up!</span>}
            </span>
            <span>🔥 {gains.dayStreak}-day streak{gains.streakExtended && gains.dayStreak > 1 ? ' (+1)' : ''}</span>
            <span className={gains.challengeJustCompleted ? 'font-brut uppercase text-ekta' : 'text-nb/75'}>
              Daily: {gains.challenge.title}{' '}
              {gains.challengeJustCompleted ? '✔ +60 XP' : `${Math.min(gains.challenge.target, Math.round(gains.challengeProgress))}/${gains.challenge.target}`}
            </span>
            {gains.unlocked.length > 0 && <span className="font-brut uppercase text-pink-600">New: {gains.unlocked.map((u) => u.name).join(', ')}</span>}
          </section>
        )}

        <div className="overflow-auto nb-card bg-pop-paper max-md:min-h-0">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="font-tag uppercase tracking-wider text-left text-ink/60">
                <th className="px-3 pt-3 pb-1 font-medium">Neta</th>
                <th className="px-3 pt-3 pb-1 font-medium text-right">KO</th>
                <th className="px-3 pt-3 pb-1 font-medium text-right">Assist</th>
                <th className="px-3 pt-3 pb-1 font-medium text-right">Down</th>
                <th className="px-3 pt-3 pb-1 font-medium text-right">Damage</th>
                <th className="px-3 pt-3 pb-1 font-medium text-right">Hold</th>
                <th className="px-3 pt-3 pb-1 font-medium text-right">MVP pts</th>
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
                  <td className="px-3 py-2 text-right">{s.assists}</td>
                  <td className="px-3 py-2 text-right">{s.deaths}</td>
                  <td className="px-3 py-2 text-right">{s.damage}</td>
                  <td className="px-3 py-2 text-right">{s.captureSeconds}s</td>
                  <td className="px-3 py-2 text-right">{s.score}{s.id === mvp.id ? ' ★' : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="results-actions sticky bottom-0 z-10 -mx-2 px-2 py-2 rounded-t-xl bg-pop-paper border-t-[3px] border-nb flex flex-wrap justify-center gap-1.5 sm:gap-3">
          <button type="button" onClick={rematch} className="min-h-[44px] sm:min-h-[60px] rounded-2xl border-[3px] border-nb bg-pop-yellow font-sfx text-xl sm:text-3xl tracking-wide px-3 sm:px-8 pt-1 shadow-nb-sm sm:shadow-nb nb-press">
            Rematch
          </button>
          <ShareButton
            build={() => matchCard(result, mySlot)}
            text={`${winner.name} ${won ? 'formed the government' : 'won the election'} in Netanchal!`}
            label="Share"
            className="min-h-[44px] sm:min-h-[60px] rounded-2xl border-[3px] border-nb bg-pop-pink text-white font-sfx text-xl sm:text-3xl tracking-wide px-3 sm:px-8 pt-1 shadow-nb-sm sm:shadow-nb"
          />
          <button type="button" onClick={inviteFriends} className="min-h-[44px] sm:min-h-[60px] rounded-2xl border-[3px] border-nb bg-pop-sky font-sfx text-xl sm:text-3xl tracking-wide px-3 sm:px-8 pt-1 shadow-nb-sm sm:shadow-nb nb-press">
            {online ? 'Invite' : 'Friends'}<span className="res-long max-md:hidden">{online ? ' friends' : ' (play together)'}</span>
          </button>
          <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label={`Follow @${INSTAGRAM_HANDLE} on Instagram`} className="ig-flash nb-press min-h-[44px] sm:min-h-[60px] inline-flex items-center gap-2 rounded-2xl border-[3px] border-nb px-3 sm:px-6 font-sfx text-xl sm:text-2xl tracking-wide text-white shadow-nb-sm sm:shadow-nb">
            <InstagramIcon className="w-5 h-5 sm:w-6 sm:h-6" /> <span className="res-long max-md:hidden">Follow us</span>
          </a>
          <button type="button" onClick={exit} className="min-h-[44px] sm:min-h-[60px] rounded-2xl border-[3px] border-nb bg-pop-paper font-sfx text-xl sm:text-3xl tracking-wide px-3 sm:px-8 pt-1 shadow-nb-sm sm:shadow-nb nb-press">
            Exit
          </button>
        </div>
      </div>
    </main>
  );
}
