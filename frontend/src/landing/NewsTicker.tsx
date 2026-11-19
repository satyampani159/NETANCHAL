import headlines from '../data/headlines.json';

export function NewsTicker() {
  const items = [...headlines, ...headlines];
  return (
    <div className="relative flex items-stretch bg-nb text-pop-paper border-b-[3px] border-nb overflow-hidden" role="marquee" aria-label="Satirical headlines">
      <span className="relative z-10 shrink-0 flex items-center gap-2 bg-pop-pink text-white font-brut uppercase text-sm px-4 border-r-[3px] border-nb">
        <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
        Breaking
      </span>
      <div className="flex-1 overflow-hidden">
        <div className="marquee flex w-max gap-10 py-3 pl-6">
          {items.map((h, i) => (
            <span key={i} className="font-tag uppercase tracking-wider text-lg leading-none whitespace-nowrap">
              {h} <span className="text-pop-yellow">★</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
