export function CountdownRing({ seconds, total, children }: { seconds: number; total: number; children?: React.ReactNode }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const frac = Math.max(0, Math.min(1, seconds / total));
  return (
    <div className="relative w-36 h-36 sm:w-40 sm:h-40 shrink-0" role="timer" aria-label={`${Math.ceil(seconds)} seconds until the match starts`}>
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="currentColor" strokeOpacity=".15" strokeWidth="9" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
          style={{ transition: 'stroke-dashoffset 0.25s linear' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}
