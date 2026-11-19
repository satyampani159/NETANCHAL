export function SiteNav({ onPlay }: { onPlay: () => void }) {
  return (
    <nav className="fixed top-0 inset-x-0 z-50 gutter pt-[max(10px,env(safe-area-inset-top))]" aria-label="Main">
      <div className="max-w-7xl mx-auto flex items-center gap-3 rounded-xl border-[3px] border-nb bg-pop-paper/95 backdrop-blur px-3 py-2 shadow-nb">
        <a href="#top" className="font-brut text-lg sm:text-xl uppercase tracking-tight leading-none">
          Neta<span className="text-saffron [-webkit-text-stroke:1px_#111]">nchal</span>
        </a>
        <div className="hidden md:flex items-center gap-1 ml-4">
          {[
            ['#strength', 'Strength'],
            ['#how', 'How to play'],
            ['#counters', 'Counters'],
          ].map(([href, label]) => (
            <a key={href} href={href} className="rounded-md px-3 py-1.5 font-tag uppercase tracking-wider text-lg leading-none hover:bg-pop-yellow hover:-rotate-2 transition">
              {label}
            </a>
          ))}
        </div>
        <button type="button" onClick={onPlay} className="ml-auto nb-press rounded-lg border-[3px] border-nb bg-pop-yellow font-sfx text-xl tracking-wide px-4 pt-1 pb-0.5 shadow-nb-sm">
          Play now
        </button>
      </div>
    </nav>
  );
}
