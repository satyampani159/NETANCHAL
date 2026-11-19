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
