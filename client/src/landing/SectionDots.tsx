import { useEffect, useState } from 'react';

const SECTIONS: Array<[string, string]> = [
  ['hero', 'Start'],
  ['strength', 'Characters'],
  ['how', 'How to play'],
  ['instagram', 'Instagram'],
  ['play', 'Play'],
];

/** Phones only: dots down the right edge show which section you are in and jump to another one. */
export function SectionDots() {
  const [active, setActive] = useState('top');
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { threshold: 0.55 },
    );
    for (const [id] of SECTIONS) {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, []);
  return (
    <nav className="md:hidden fixed right-1.5 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-3" aria-label="Sections">
      {SECTIONS.map(([id, label]) => (
        <a
          key={id}
          href={`#${id}`}
          aria-label={label}
          aria-current={active === id ? 'true' : undefined}
          className={`block rounded-full border-2 border-nb transition-all ${active === id ? 'h-6 w-3 bg-pop-yellow' : 'h-3 w-3 bg-pop-paper/90'}`}
        />
      ))}
    </nav>
  );
}
