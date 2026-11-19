type FsDoc = Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => Promise<void> };
type FsEl = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };

export const isFullscreen = () => !!(document.fullscreenElement || (document as FsDoc).webkitFullscreenElement);

/** Must run inside a user gesture; falls back silently if the browser refuses. */
export function requestFullscreen(el: HTMLElement = document.documentElement) {
  if (isFullscreen()) return;
  const e = el as FsEl;
  try {
    const p = e.requestFullscreen ? e.requestFullscreen({ navigationUI: 'hide' }) : e.webkitRequestFullscreen?.();
    // landscape is the intended orientation on phones
    Promise.resolve(p)
      .then(() => (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> })?.lock?.('landscape'))
      .catch(() => {});
  } catch {
    /* blocked: play windowed */
  }
}

export function exitFullscreen() {
  if (!isFullscreen()) return;
  const d = document as FsDoc;
  try {
    Promise.resolve(d.exitFullscreen ? d.exitFullscreen() : d.webkitExitFullscreen?.()).catch(() => {});
  } catch {
    /* ignore */
  }
}

export function onFullscreenChange(fn: () => void) {
  document.addEventListener('fullscreenchange', fn);
  document.addEventListener('webkitfullscreenchange', fn);
  return () => {
    document.removeEventListener('fullscreenchange', fn);
    document.removeEventListener('webkitfullscreenchange', fn);
  };
}

type LockableOrientation = ScreenOrientation & { lock?: (o: string) => Promise<void> };

/** Asks the phone to stay sideways. Android Chrome allows it once fullscreen; iPhones never do (the game then asks the player to turn the phone). */
export function lockLandscape() {
  try {
    (screen.orientation as LockableOrientation | undefined)?.lock?.('landscape')?.catch(() => {});
  } catch {
    /* not supported */
  }
}

export function unlockOrientation() {
  try {
    screen.orientation?.unlock?.();
  } catch {
    /* not supported */
  }
}

/** a phone or tablet held upright (portrait) */
export function isPortraitTouch(): boolean {
  if (typeof window === 'undefined') return false;
  const touch = window.matchMedia?.('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
  return touch && window.innerHeight > window.innerWidth;
}
