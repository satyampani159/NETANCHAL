import { challengeFor, dayKey, levelInfo } from '../game/progression';
import { profileStore } from '../app/state/profileStore';

/** "Today: Flip 2 booths · 0/2" in one line; tap to open the profile. */
export function DailyChip({ onOpen, className = '' }: { onOpen: () => void; className?: string }) {
  const p = profileStore((s) => s.profile);
  const today = dayKey();
  const ch = challengeFor(today);
  const done = p.challengeDay === today && p.challengeComplete;
  const prog = p.challengeDay === today ? Math.min(ch.target, Math.round(p.challengeProgress)) : 0;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`nb-press inline-flex items-center gap-2 rounded-full border-[3px] border-nb bg-pop-paper px-3 py-1 text-xs sm:text-sm font-semibold shadow-nb-sm max-w-[92vw] ${className}`}
      aria-label={`Daily challenge: ${ch.title}. ${done ? 'Complete' : `${prog} of ${ch.target}`}. Open profile`}
    >
      <span aria-hidden="true">{done ? '✅' : '🎯'}</span>
      <span className="truncate">
        Today: {ch.title} · {done ? 'done' : `${prog}/${ch.target}`}
      </span>
      <span className="font-tag uppercase tracking-wider text-nb/60 shrink-0 max-sm:hidden">Lv {levelInfo(p.xp).level}</span>
    </button>
  );
}
