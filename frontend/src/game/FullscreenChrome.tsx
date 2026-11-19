import { useEffect, useState } from 'react';
import { gameAudio } from './audio';
import { isFullscreen, onFullscreenChange, requestFullscreen } from './fullscreen';

/** DOM layer over the canvas: the exit cross (never drawn by Phaser, so it stays tappable if a scene stalls). */
export function FullscreenChrome({ onExit }: { onExit: () => void }) {
  const [fs, setFs] = useState(isFullscreen());
  const [muted, setMuted] = useState(gameAudio.muted);
  useEffect(() => onFullscreenChange(() => setFs(isFullscreen())), []);
  useEffect(() => gameAudio.onChange(setMuted), []);
  const canFs = typeof document !== 'undefined' && (document.fullscreenEnabled || 'webkitFullscreenEnabled' in document);

  return (
    <div
      className="absolute top-0 right-0 flex gap-2 z-10"
      style={{ paddingTop: 'max(10px, env(safe-area-inset-top))', paddingRight: 'max(10px, env(safe-area-inset-right))' }}
    >
      <button
        type="button"
        onClick={() => {
          gameAudio.unlock();
          gameAudio.setMuted(!muted);
        }}
        className="w-12 h-12 grid place-items-center rounded-full bg-black/55 text-white ring-1 ring-white/30 backdrop-blur"
        aria-label={muted ? 'Turn sound on' : 'Mute sound'}
        aria-pressed={muted}
      >
        <svg viewBox="0 0 24 24" className="w-6 h-6" aria-hidden="true">
          <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
          {muted ? (
            <path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          ) : (
            <path d="M16 8.5a5 5 0 010 7M18.5 6a8.5 8.5 0 010 12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
          )}
        </svg>
      </button>
      {!fs && canFs && (
        <button
          type="button"
          onClick={() => requestFullscreen()}
          className="w-12 h-12 grid place-items-center rounded-full bg-black/55 text-white ring-1 ring-white/30 backdrop-blur"
          aria-label="Go fullscreen"
        >
          <svg viewBox="0 0 24 24" className="w-6 h-6" aria-hidden="true">
            <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </svg>
        </button>
      )}
      <button
        type="button"
        onClick={onExit}
        className="w-12 h-12 grid place-items-center rounded-full bg-black/55 text-white ring-1 ring-white/30 backdrop-blur"
        aria-label="Leave match"
      >
        <svg viewBox="0 0 24 24" className="w-6 h-6" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
