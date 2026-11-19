import { useEffect, useRef, useState } from 'react';

/** True once the element has scrolled into view (stays true). */
export function useInView<T extends Element>(threshold = 0.25) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return [ref, inView] as const;
}

/** Counts from 0 to `to` once `run` turns true. */
export function useCountUp(to: number, run: boolean, ms = 900) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!run) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return setV(to);
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / ms);
      setV(Math.round(to * (1 - (1 - k) ** 3)));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, run, ms]);
  return v;
}

/** Adds `.in` to every `.reveal` inside the page as it scrolls into view. */
export function useScrollReveal() {
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const root = document.documentElement;
    root.classList.add('reveal-ready');
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.12 },
    );
    const els = document.querySelectorAll('.reveal');
    els.forEach((el) => {
      // anything already on screen is shown straight away
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) el.classList.add('in');
      else io.observe(el);
    });
    return () => {
      io.disconnect();
      root.classList.remove('reveal-ready');
    };
  }, []);
}
