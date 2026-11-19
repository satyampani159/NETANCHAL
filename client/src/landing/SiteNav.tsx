import { useEffect, useRef, useState } from 'react';
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from '../data/instagram';
import { InstagramIcon } from '../ui/InstagramIcon';
import { gameAudio } from '../game/audio';
import { profileStore } from '../app/state/profileStore';
import { levelInfo } from '../game/progression';
import { onSoundUnlocked, soundUnlocked, unlockedAt } from '../game/siteSound';

export function SoundButton({ label = false }: { label?: boolean } = {}) {
  const [muted, setMuted] = useState(gameAudio.muted);
  const [unlocked, setUnlocked] = useState(soundUnlocked());
  useEffect(() => gameAudio.onChange(setMuted), []);
  useEffect(() => onSoundUnlocked(() => setUnlocked(true)), []);
  const off = muted || !unlocked;
  return (
    <button
      type="button"
      onClick={() => {
        gameAudio.unlock();
        // this very tap is what unlocked sound: leave it on
        if (Date.now() - unlockedAt < 500) return;
        if (!unlocked) {
          // the very first tap only turns sound on
          gameAudio.setMuted(false);
          if (!gameAudio.musicOn) gameAudio.startMusic('menu');
          setUnlocked(true);
          return;
        }
        gameAudio.setMuted(!muted);
      }}
      className="nb-press flex shrink-0 items-center rounded-lg border-[3px] border-nb bg-pop-paper px-2 sm:px-2.5 py-1 shadow-nb-sm"
      aria-label={off ? 'Turn sound on' : 'Mute sound'}
      title={unlocked ? undefined : 'Tap for sound'}
    >
      <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] sm:w-5 sm:h-5" aria-hidden="true">
        <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
        {off ? <path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /> : <path d="M16 8.5a5 5 0 010 7M18.5 6a8.5 8.5 0 010 12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />}
      </svg>
    </button>
  );
}

const LINKS: [string, string][] = [
  ['#strength', 'Strength'],
  ['#how', 'How to play'],
  ['#instagram', 'Instagram'],
];

export function SiteNav({ onPlay, onProfile }: { onPlay: () => void; onProfile?: () => void }) {
  const profile = profileStore((st) => st.profile);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const lv = levelInfo(profile.xp).level;

  // the menu closes on Escape, on a tap outside, and when the page scrolls
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    const onDown = (e: Event) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !btnRef.current?.contains(t)) setOpen(false);
    };
    const onScroll = () => setOpen(false);
    window.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    window.addEventListener('scroll', onScroll, { passive: true });
    menuRef.current?.querySelector<HTMLElement>('a,button')?.focus();
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
      window.removeEventListener('scroll', onScroll);
    };
  }, [open]);

  const item = 'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left font-brut uppercase text-base leading-none hover:bg-pop-yellow focus-visible:bg-pop-yellow';

  return (
    <nav className="fixed top-0 inset-x-0 z-50 gutter pt-[max(10px,env(safe-area-inset-top))]" aria-label="Main">
      <div className="relative max-w-7xl mx-auto">
        <div className="flex flex-nowrap items-center gap-1.5 sm:gap-3 rounded-xl border-[3px] border-nb bg-pop-paper/95 backdrop-blur px-2 sm:px-3 py-1.5 sm:py-2 shadow-nb">
          <a href="#top" className="font-brut text-[14px] sm:text-xl uppercase tracking-tight leading-none shrink-0">
            Neta<span className="text-saffron [-webkit-text-stroke:1px_#111]">nchal</span>
          </a>
          <div className="hidden lg:flex items-center gap-1 ml-4">
            {LINKS.map(([href, label]) => (
              <a key={href} href={href} className="rounded-md px-3 py-1.5 font-tag uppercase tracking-wider text-lg leading-none hover:bg-pop-yellow hover:-rotate-2 transition">
                {label}
              </a>
            ))}
          </div>
          <div className="ml-auto flex flex-nowrap items-center gap-1.5 sm:gap-2">
            {onProfile && (
              <button type="button" onClick={onProfile} className="nb-press hidden min-[480px]:flex items-center gap-1 whitespace-nowrap rounded-lg border-[3px] border-nb bg-pop-paper px-2 py-1 shadow-nb-sm font-tag uppercase tracking-wider text-base leading-none pt-1.5" aria-label="Open your profile">
                <span aria-hidden="true">{profile.dayStreak > 0 ? '🔥' : '★'}</span>
                {profile.dayStreak > 0 ? profile.dayStreak : ''} Lv {lv}
              </button>
            )}
            <SoundButton />
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="ig-flash nb-press flex shrink-0 items-center gap-1 sm:gap-1.5 whitespace-nowrap rounded-lg border-[3px] border-nb px-2 sm:px-3.5 pt-1 pb-0.5 font-sfx text-[15px] sm:text-xl leading-tight tracking-wide text-white shadow-nb-sm"
              aria-label={`Visit @${INSTAGRAM_HANDLE} on Instagram`}
            >
              <InstagramIcon className="w-4 h-4 sm:w-5 sm:h-5 -mt-0.5" /> Visit
            </a>
            <button
              ref={btnRef}
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="nb-press lg:hidden flex shrink-0 items-center rounded-lg border-[3px] border-nb bg-pop-yellow px-2 py-1 shadow-nb-sm"
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              aria-controls="site-menu"
            >
              <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] sm:w-5 sm:h-5" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
                {open ? <path d="M5 5l14 14M19 5L5 19" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>
          </div>
        </div>
        {open && (
          <div id="site-menu" ref={menuRef} className="pop-in lg:hidden absolute inset-x-0 top-full mt-2 rounded-xl border-[3px] border-nb bg-pop-paper p-2 shadow-nb max-h-[calc(100svh-90px)] overflow-y-auto" role="menu" aria-label="Site menu">
            <a role="menuitem" href="#top" onClick={() => setOpen(false)} className={item}>Home</a>
            {LINKS.map(([href, label]) => (
              <a role="menuitem" key={href} href={href} onClick={() => setOpen(false)} className={item}>
                {label}
              </a>
            ))}
            <button
              role="menuitem"
              type="button"
              onClick={() => {
                setOpen(false);
                onPlay();
              }}
              className={`${item} bg-pop-yellow`}
            >
              Play now
            </button>
            {onProfile && (
              <button
                role="menuitem"
                type="button"
                onClick={() => {
                  setOpen(false);
                  onProfile();
                }}
                className={item}
              >
                Profile <span className="font-tag tracking-wider text-nb/60 normal-case">{profile.dayStreak > 0 ? `🔥${profile.dayStreak} · ` : ''}Lv {lv}</span>
              </button>
            )}
            <a role="menuitem" href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)} className={item}>
              <InstagramIcon className="w-5 h-5" /> Instagram @{INSTAGRAM_HANDLE}
            </a>
          </div>
        )}
      </div>
    </nav>
  );
}
