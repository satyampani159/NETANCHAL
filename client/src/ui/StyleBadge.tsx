import type { FightStyle } from '@netanchal/shared';

const ICON: Record<FightStyle, string> = {
  // fist, crosshair
  melee: 'M7 10V6a2 2 0 014 0v3h1V5a2 2 0 014 0v4h1V7a2 2 0 014 0v7a7 7 0 01-7 7h-1a7 7 0 01-6-3.5L5 15a2 2 0 013-2.5z',
  ranged: 'M12 2a10 10 0 100 20 10 10 0 000-20zm0 3a7 7 0 110 14 7 7 0 010-14zm-1 3v3H8v2h3v3h2v-3h3v-2h-3V8z',
};

const LABEL: Record<FightStyle, string> = { melee: 'Melee', ranged: 'Ranged' };

export function StyleIcon({ fightStyle, className = 'w-4 h-4' }: { fightStyle: FightStyle; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d={ICON[fightStyle]} fill="currentColor" fillRule="evenodd" />
    </svg>
  );
}

export function StyleBadge({ fightStyle, tone = 'ink' }: { fightStyle: FightStyle; tone?: 'ink' | 'light' }) {
  return (
    <span
      className={`inline-flex items-center gap-1 font-tag text-sm uppercase tracking-wider leading-none px-2 pt-1 pb-0.5 rounded-sm ${
        tone === 'ink' ? 'bg-ink text-chalk' : 'bg-white/80 text-ink'
      }`}
    >
      <StyleIcon fightStyle={fightStyle} className="w-3.5 h-3.5 -mt-0.5" />
      {LABEL[fightStyle]}
    </span>
  );
}
