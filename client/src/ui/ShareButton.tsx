import { useState } from 'react';
import { type CardOptions, renderShareCard } from '../game/shareCard';
import { profileStore } from '../app/state/profileStore';

export const siteLink = () => `${location.origin}${location.pathname}`;

/** One tap: draws the card, then opens the phone's share sheet with the image, or saves it and copies the link. */
export function ShareButton({ build, text, link = siteLink(), label = 'Share', className = '' }: { build: () => CardOptions; text: string; link?: string; label?: string; className?: string }) {
  const [state, setState] = useState<'idle' | 'busy' | 'saved' | 'error'>('idle');

  const go = async () => {
    if (state === 'busy') return;
    setState('busy');
    try {
      const blob = await renderShareCard(build());
      const file = new File([blob], 'netanchal-result.png', { type: 'image/png' });
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.share && nav.canShare?.({ files: [file] })) {
        try {
          await nav.share({ files: [file], title: 'Netanchal', text: `${text}\n${link}\nFollow @netanchal on Instagram` });
          profileStore.getState().addShare();
          setState('idle');
          return;
        } catch (err) {
          if ((err as Error).name === 'AbortError') return setState('idle'); // they closed the sheet
          /* otherwise fall through to the download fallback */
        }
      }
      // no file sharing here (most desktops): save the picture and copy the link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'netanchal-result.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      try {
        await navigator.clipboard.writeText(`${text}\n${link}`);
      } catch {
        /* clipboard blocked */
      }
      profileStore.getState().addShare();
      setState('saved');
      setTimeout(() => setState('idle'), 2600);
    } catch {
      setState('error');
      setTimeout(() => setState('idle'), 2600);
    }
  };

  return (
    <button type="button" onClick={go} disabled={state === 'busy'} className={`nb-press ${className}`} aria-live="polite">
      {state === 'busy' ? 'Drawing…' : state === 'saved' ? 'Saved · link copied' : state === 'error' ? 'Try again' : label}
    </button>
  );
}
