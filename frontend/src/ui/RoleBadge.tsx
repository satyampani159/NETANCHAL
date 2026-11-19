import type { Role } from '@netanchal/shared';

const ICON: Record<Role, string> = {
  // fist, hand-on-shoulder, shield
  attacker: 'M7 10V6a2 2 0 014 0v3h1V5a2 2 0 014 0v4h1V7a2 2 0 014 0v7a7 7 0 01-7 7h-1a7 7 0 01-6-3.5L5 15a2 2 0 013-2.5z',
  helper: 'M12 21s-7-4.5-7-10a4 4 0 017-2.6A4 4 0 0119 11c0 5.5-7 10-7 10z',
  defender: 'M12 2l8 3v6c0 5-3.5 9.5-8 11-4.5-1.5-8-6-8-11V5z',
};

export function RoleIcon({ role, className = 'w-4 h-4' }: { role: Role; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d={ICON[role]} fill="currentColor" />
    </svg>
  );
}

export function RoleBadge({ role, tone = 'ink' }: { role: Role; tone?: 'ink' | 'light' }) {
  return (
    <span
      className={`inline-flex items-center gap-1 font-tag text-sm uppercase tracking-wider leading-none px-2 pt-1 pb-0.5 rounded-sm ${
        tone === 'ink' ? 'bg-ink text-chalk' : 'bg-white/80 text-ink'
      }`}
    >
      <RoleIcon role={role} className="w-3.5 h-3.5 -mt-0.5" />
      {role}
    </span>
  );
}
