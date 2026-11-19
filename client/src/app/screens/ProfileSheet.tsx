import { useEffect, useState } from 'react';
import { CHARACTERS, type CharacterId } from '@netanchal/shared';
import { COSMETICS, type CosmeticKind, challengeFor, dayKey, isUnlocked, levelInfo, unlockText } from '../../game/progression';
import { Portrait } from '../../ui/Portrait';
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from '../../data/instagram';
import { InstagramIcon } from '../../ui/InstagramIcon';
import { matchStore } from '../state/matchStore';
import { profileStore } from '../state/profileStore';

const KINDS: { kind: CosmeticKind; label: string }[] = [
  { kind: 'hat', label: 'Hats' },
  { kind: 'plate', label: 'Name plates' },
  { kind: 'banner', label: 'Banners' },
  { kind: 'frame', label: 'Card frames' },
];

export function ProfileSheet({ onClose }: { onClose: () => void }) {
  const p = profileStore((s) => s.profile);
  const [tab, setTab] = useState<CosmeticKind>('hat');
  const [name, setName] = useState(p.name);
  const lv = levelInfo(p.xp);
  const today = dayKey();
  const ch = challengeFor(today);
  const done = p.challengeDay === today && p.challengeComplete;
  const prog = p.challengeDay === today ? Math.min(ch.target, Math.round(p.challengeProgress)) : 0;
  const favourite = (Object.entries(p.plays) as [CharacterId, number][]).sort((a, b) => b[1] - a[1])[0]?.[0];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const saveName = () => {
    profileStore.getState().setName(name);
    matchStore.setState({ playerName: profileStore.getState().profile.name });
  };
  const stat = (label: string, value: string | number) => (
    <div className="rounded-lg border-2 border-nb bg-white px-2 py-1.5 text-center">
      <p className="font-brut text-lg sm:text-xl leading-none tabular">{value}</p>
      <p className="font-tag uppercase tracking-wider text-[11px] sm:text-xs text-nb/60 leading-none mt-1">{label}</p>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[60] bg-nb/60 grid place-items-end sm:place-items-center" role="dialog" aria-modal="true" aria-label="Your profile" onClick={onClose}>
      <div className="w-full sm:max-w-xl max-h-[92svh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border-[3px] border-nb bg-pop-paper p-4 pb-[max(16px,env(safe-area-inset-bottom))] text-nb" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3">
          {favourite ? <Portrait id={favourite} variant="token" className="w-14 h-14 shrink-0" /> : <div className="w-14 h-14 shrink-0 rounded-full border-[3px] border-nb bg-pop-yellow grid place-items-center font-brut text-2xl">★</div>}
          <div className="min-w-0 flex-1">
            <label className="font-tag uppercase tracking-widest text-xs text-nb/60 leading-none" htmlFor="profile-name">
              Your name
            </label>
            <input
              id="profile-name"
              value={name}
              maxLength={16}
              onChange={(e) => setName(e.target.value)}
              onBlur={saveName}
              onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget.blur(), undefined)}
              className="block w-full rounded-lg border-[3px] border-nb bg-white px-2 py-1 font-brut uppercase text-lg"
            />
          </div>
          <button type="button" onClick={onClose} className="w-10 h-10 shrink-0 rounded-full border-[3px] border-nb bg-pop-yellow nb-press" aria-label="Close profile">
            ✕
          </button>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <span className="font-brut uppercase text-lg">Level {lv.level}</span>
          <span className="relative h-3 flex-1 rounded-full border-2 border-nb bg-white overflow-hidden">
            <span className="absolute inset-y-0 left-0 bg-pop-yellow" style={{ width: `${Math.round((100 * lv.into) / lv.need)}%` }} />
          </span>
          <span className="text-xs font-semibold tabular">
            {lv.into}/{lv.need} XP
          </span>
        </div>

        <div className="mt-3 rounded-xl border-[3px] border-nb bg-pop-yellow p-3">
          <p className="font-tag uppercase tracking-widest text-xs leading-none">Daily challenge · resets at midnight</p>
          <p className="font-brut uppercase text-base sm:text-lg leading-tight mt-1">{ch.title}</p>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="relative h-3 flex-1 rounded-full border-2 border-nb bg-white overflow-hidden">
              <span className="absolute inset-y-0 left-0 bg-ekta" style={{ width: `${done ? 100 : Math.round((100 * prog) / ch.target)}%` }} />
            </span>
            <span className="text-xs font-semibold tabular">{done ? 'Done +60 XP' : `${prog}/${ch.target}`}</span>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-4 gap-2">
          {stat('Matches', p.matches)}
          {stat('Wins', p.wins)}
          {stat('MVPs', p.mvps)}
          {stat('KOs', p.kills)}
          {stat('Day streak', `🔥${p.dayStreak}`)}
          {stat('Best streak', p.bestDayStreak)}
          {stat('Win streak', p.winStreak)}
          {stat('Freezes', p.freezes)}
        </div>
        {favourite && <p className="mt-2 text-xs sm:text-sm">Most played: <b>{CHARACTERS[favourite].name}</b></p>}

        <h3 className="mt-4 font-brut uppercase text-base">Looks (they never change how you play)</h3>
        <div className="mt-2 flex flex-wrap gap-1.5" role="tablist" aria-label="Cosmetic type">
          {KINDS.map((k) => (
            <button key={k.kind} type="button" role="tab" aria-selected={tab === k.kind} onClick={() => setTab(k.kind)} className={`rounded-full border-[3px] border-nb px-3 py-1 text-xs sm:text-sm font-semibold ${tab === k.kind ? 'bg-nb text-pop-paper' : 'bg-white'}`}>
              {k.label}
            </button>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
          {COSMETICS.filter((c) => c.kind === tab).map((c) => {
            const open = isUnlocked(c, p);
            const fallback = tab === 'plate' ? 'plate-plain' : tab === 'frame' ? 'frame-plain' : `${tab}-none`;
            const on = (p.equipped[tab] ?? fallback) === c.id;
            return (
              <button
                key={c.id}
                type="button"
                disabled={!open}
                onClick={() => profileStore.getState().equip(tab, c.id)}
                aria-pressed={on}
                className={`rounded-xl border-[3px] px-2 py-2 text-left ${on ? 'border-nb bg-pop-yellow' : 'border-nb/50 bg-white'} ${open ? 'nb-press' : 'opacity-55'}`}
              >
                <span className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full border-2 border-nb shrink-0" style={{ background: c.color || '#fff' }} aria-hidden="true" />
                  <span className="font-semibold text-xs sm:text-sm leading-tight">{c.name}</span>
                </span>
                <span className="block text-[11px] text-nb/65 mt-1">{open ? (on ? 'Equipped' : 'Tap to equip') : `🔒 ${unlockText(c)}`}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
          <button
            type="button"
            onClick={() => {
              profileStore.getState().replayTutorial();
              onClose();
            }}
            className="rounded-lg border-[3px] border-nb bg-white px-3 py-1.5 font-brut uppercase nb-press"
          >
            Replay the tutorial
          </button>
          <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border-[3px] border-nb bg-white px-3 py-1.5 font-brut uppercase nb-press">
            <InstagramIcon className="w-4 h-4" /> @{INSTAGRAM_HANDLE}
          </a>
          <span className="text-nb/65">Saved on this device. Clearing browser data resets it. Other players do not see your hats yet.</span>
        </div>
      </div>
    </div>
  );
}
