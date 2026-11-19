// Website-wide sound: the first tap anywhere unlocks audio (browsers require it), then buttons click,
// scrolling ticks, carousels whoosh, and a calm menu loop plays until a match starts.
import { gameAudio } from './audio';

let started = false;
let listeners = new Set<() => void>();
let unlocked = false;
export let unlockedAt = 0;

export const soundUnlocked = () => unlocked;
export const onSoundUnlocked = (fn: () => void) => {
  listeners.add(fn);
  return () => void listeners.delete(fn);
};

export function initSiteSound() {
  if (started || typeof document === 'undefined') return;
  started = true;
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const unlock = () => {
    if (unlocked) return;
    unlocked = true;
    unlockedAt = Date.now();
    gameAudio.unlock();
    // a match starts its own full track; everywhere else the calm loop plays
    if (!gameAudio.musicOn) gameAudio.startMusic('menu');
    listeners.forEach((fn) => fn());
  };
  document.addEventListener('pointerdown', unlock, { capture: true });
  document.addEventListener('keydown', unlock, { capture: true });

  // every button, link and tab gets a click, so new screens are covered without touching them
  document.addEventListener(
    'click',
    (e) => {
      const el = (e.target as Element | null)?.closest?.('button, a[href], [role="tab"], [role="button"]');
      if (!el || el.closest('canvas') || (el as HTMLButtonElement).disabled) return;
      unlock();
      gameAudio.sfx(el.getAttribute('aria-pressed') !== null ? 'toggle' : 'click');
    },
    { capture: true },
  );

  if (window.matchMedia?.('(hover: hover)').matches && !reduced) {
    document.addEventListener(
      'pointerover',
      (e) => {
        const el = (e.target as Element | null)?.closest?.('button, a[href]');
        if (el && !el.contains(e.relatedTarget as Node | null)) gameAudio.sfx('hover');
      },
      { capture: true, passive: true },
    );
  }

  // scrolling: a light tick every so often on the page, a whoosh as a carousel moves
  let lastY = window.scrollY;
  const carouselAt = new WeakMap<Element, number>();
  document.addEventListener(
    'scroll',
    (e) => {
      if (reduced) return;
      const t = e.target;
      if (t === document || t === document.documentElement) {
        if (Math.abs(window.scrollY - lastY) > 360) {
          lastY = window.scrollY;
          gameAudio.sfx('tick');
        }
      } else if (t instanceof Element && t.classList.contains('carousel')) {
        const last = carouselAt.get(t) ?? t.scrollLeft;
        if (Math.abs(t.scrollLeft - last) > 120) {
          carouselAt.set(t, t.scrollLeft);
          gameAudio.sfx('whoosh');
        } else if (!carouselAt.has(t)) carouselAt.set(t, t.scrollLeft);
      }
    },
    { capture: true, passive: true },
  );
}
