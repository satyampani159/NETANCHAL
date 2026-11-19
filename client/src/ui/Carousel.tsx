import { Children, useEffect, useRef, useState } from 'react';

/** A row of cards you swipe sideways on phones (and lay out as a normal grid on desktop, via the class passed in). */
export function Carousel({ children, className = '', label }: { children: React.ReactNode; className?: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const count = Children.count(children);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => {
      const first = el.children[0] as HTMLElement | undefined;
      if (!first) return;
      const step = first.getBoundingClientRect().width + 14;
      setIndex(Math.min(count - 1, Math.max(0, Math.round(el.scrollLeft / step))));
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [count]);

  const go = (i: number) => (ref.current?.children[i] as HTMLElement | undefined)?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });

  return (
    <>
      <div ref={ref} className={`carousel ${className}`} role="group" aria-label={label}>
        {children}
      </div>
      <div className="lg:hidden flex items-center justify-center gap-1.5 -mt-1" role="tablist" aria-label={`${label} position`}>
        {Array.from({ length: count }, (_, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={`Card ${i + 1} of ${count}`}
            onClick={() => go(i)}
            className={`h-2.5 rounded-full border-2 border-nb transition-all ${i === index ? 'w-7 bg-nb' : 'w-2.5 bg-pop-paper'}`}
          />
        ))}
      </div>
    </>
  );
}
