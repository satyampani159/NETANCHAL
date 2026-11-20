import { useEffect, useRef, useState } from 'react';
import { INSTAGRAM_HANDLE, INSTAGRAM_URL, POSTS, cleanPostUrl, embedUrl } from '../data/instagram';
import { Carousel } from '../ui/Carousel';
import { InstagramIcon } from '../ui/InstagramIcon';

const SLOTS = 3;
/** how long an embed may take to draw after its page loads before we retry it (once) and then give up */
const DRAW_TIMEOUT_MS = 8000;

/** true when a message from an Instagram embed says the post has been drawn */
function isDrawnMessage(data: unknown): boolean {
  try {
    const msg = typeof data === 'string' ? JSON.parse(data) : data;
    return !!msg && typeof msg === 'object' && ['MEASURE', 'MOUNTED'].includes((msg as { type?: string }).type ?? '');
  } catch {
    return false;
  }
}

function PostCard({ post, index }: { post: string | undefined; index: number }) {
  const href = post ? cleanPostUrl(post) : INSTAGRAM_URL;
  const base = post ? embedUrl(post) : null;
  const frame = useRef<HTMLIFrameElement>(null);
  const [attempt, setAttempt] = useState(0); // 0 = first try, 1 = retry, 2 = gave up (show the fallback card)
  const [drawn, setDrawn] = useState(false);
  const [pageLoaded, setPageLoaded] = useState(false);

  // Instagram's embed posts a message to this page once it has drawn the post
  useEffect(() => {
    if (!base) return;
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== 'https://www.instagram.com' || e.source !== frame.current?.contentWindow) return;
      if (isDrawnMessage(e.data)) setDrawn(true);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [base]);

  // if the embed page loaded but never drew the post, reload it once, then fall back to the link card
  useEffect(() => {
    if (!pageLoaded || drawn || attempt > 1) return;
    const t = window.setTimeout(() => {
      setPageLoaded(false);
      setAttempt((a) => a + 1);
    }, DRAW_TIMEOUT_MS);
    return () => window.clearTimeout(t);
  }, [pageLoaded, drawn, attempt]);

  const src = base && attempt < 2 ? (attempt === 1 ? `${base}?r=1` : base) : null;
  return (
    <article className="nb-card bg-pop-paper flex flex-col overflow-hidden min-w-0">
      <div className="relative flex-1 min-h-[220px] aspect-[3/4] bg-gradient-to-br from-[#feda75] via-[#d62976] to-[#4f5bd5]">
        {/* shown when there is no embed (or while it is blocked or still loading) */}
        <a href={href} target="_blank" rel="noopener noreferrer" className="absolute inset-0 grid place-items-center p-4 text-center text-white" aria-label={`Open Instagram post ${index + 1} on Instagram`}>
          <span className="flex flex-col items-center gap-2">
            <InstagramIcon className="w-12 h-12 drop-shadow-[2px_2px_0_rgba(17,17,17,0.5)]" />
            <span className="font-brut uppercase text-lg leading-tight [text-shadow:2px_2px_0_#111]">{post ? 'View this post' : `Post ${index + 1}`}</span>
            <span className="font-tag uppercase tracking-wider text-base leading-none opacity-90">@{INSTAGRAM_HANDLE}</span>
          </span>
        </a>
        {src && (
          <iframe
            key={attempt}
            ref={frame}
            src={src}
            title={`Instagram post ${index + 1} from @${INSTAGRAM_HANDLE}`}
            loading="lazy"
            onLoad={() => setPageLoaded(true)}
            className={`absolute inset-0 w-full h-full border-0 transition-opacity duration-300 ${drawn ? 'opacity-100 bg-white' : 'opacity-0 pointer-events-none'}`}
            allow="encrypted-media"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        )}
      </div>
      <a href={href} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 border-t-[3px] border-nb bg-pop-yellow px-3 py-2 font-brut uppercase text-sm leading-none nb-press">
        <InstagramIcon className="w-4 h-4" /> Open on Instagram
      </a>
    </article>
  );
}

/** Three recent posts (Instagram's own embeds), plus a button to the profile. Everything here opens Instagram in a new tab. */
export function InstagramGallery() {
  const posts = Array.from({ length: SLOTS }, (_, i) => POSTS[i]);
  return (
    <section id="instagram" className="snap-panel gutter py-20 sm:py-28 bg-pop-paper border-b-[3px] border-nb" aria-labelledby="ig-title">
      <div className="w-full max-w-7xl mx-auto min-w-0">
        <div className="reveal flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-tag text-xl uppercase tracking-widest text-pop-pink leading-none">Follow the campaign</p>
            <h2 id="ig-title" className="font-brut text-3xl sm:text-6xl uppercase leading-[1.12] sm:leading-[1.15] mt-1 sm:mt-2">
              From our <span className="title-badge bg-pop-yellow border-[3px] border-nb px-2 -rotate-1 shadow-nb-sm">Instagram</span>
            </h2>
          </div>
          <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="ig-flash nb-press inline-flex items-center gap-2 rounded-xl border-[3px] border-nb px-4 py-2 font-sfx text-xl tracking-wide text-white shadow-nb-sm">
            <InstagramIcon className="w-5 h-5" /> Follow @{INSTAGRAM_HANDLE}
          </a>
        </div>
        <div className="mt-4 sm:mt-8">
          <Carousel label="Instagram posts" className="lg:grid lg:grid-cols-3 lg:gap-6 lg:overflow-visible lg:m-0 lg:p-0">
            {posts.map((p, i) => (
              <PostCard key={i} post={p} index={i} />
            ))}
          </Carousel>
        </div>
      </div>
    </section>
  );
}
