import { useState } from 'react';

/** The code to give friends, with copy and share buttons, and the host's Start now. */
export function RoomCodeCard({ code, isHost, onStart, canStart }: { code: string; isHost: boolean; onStart: () => void; canStart: boolean }) {
  const [copied, setCopied] = useState(false);
  const link = `${location.origin}${location.pathname}?room=${code}`;
  const text = `Join my Netanchal room! Code: ${code}\n${link}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt('Copy this link', link);
    }
  };
  const share = async () => {
    try {
      if (navigator.share) return void (await navigator.share({ title: 'Netanchal', text, url: link }));
    } catch {
      return; // the person closed the share sheet
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  };
  return (
    <div className="relative gutter mb-3 max-w-7xl w-full mx-auto">
      <div className="nb-card bg-pop-yellow p-2.5 sm:p-4 flex flex-wrap items-center gap-2 sm:gap-4">
        <div className="min-w-0">
          <p className="font-tag uppercase tracking-widest text-xs sm:text-sm leading-none">Private room · share this code</p>
          <p className="font-sfx text-4xl sm:text-6xl tracking-[0.25em] leading-none tabular" aria-label={`Room code ${code.split('').join(' ')}`}>
            {code}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 ml-auto">
          <button type="button" onClick={copy} className="min-h-[40px] rounded-lg border-[3px] border-nb bg-pop-paper px-3 font-brut uppercase text-xs sm:text-sm shadow-nb-sm nb-press">
            {copied ? 'Link copied' : 'Copy link'}
          </button>
          <button type="button" onClick={share} className="min-h-[40px] rounded-lg border-[3px] border-nb bg-pop-paper px-3 font-brut uppercase text-xs sm:text-sm shadow-nb-sm nb-press">
            Share
          </button>
          {isHost && (
            <button type="button" onClick={onStart} disabled={!canStart} className="min-h-[40px] rounded-lg border-[3px] border-nb bg-nb text-pop-paper px-3 font-brut uppercase text-xs sm:text-sm shadow-nb-sm nb-press disabled:opacity-40">
              Start now
            </button>
          )}
        </div>
        <p className="w-full text-xs sm:text-sm leading-snug">
          Friends open the site, choose Join with code, and type it. Empty seats are filled by bots when you start.{!isHost && ' The host starts the match.'}
        </p>
      </div>
    </div>
  );
}
