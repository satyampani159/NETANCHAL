import { INSTAGRAM_HANDLE, INSTAGRAM_URL, POSTS, cleanPostUrl, embedUrl } from '../data/instagram';
import { Carousel } from '../ui/Carousel';
import { InstagramIcon } from '../ui/InstagramIcon';

const SLOTS = 3;

function PostCard({ post, index }: { post: string | undefined; index: number }) {
  const href = post ? cleanPostUrl(post) : INSTAGRAM_URL;
  const src = post ? embedUrl(post) : null;
  return (
    <article className="nb-card bg-pop-paper flex flex-col overflow-hidden min-w-0">
      <div className="relative flex-1 min-h-[220px] h-[min(52svh,480px)] lg:h-[460px] bg-gradient-to-br from-[#feda75] via-[#d62976] to-[#4f5bd5]">
        {/* shown when there is no embed (or while it is blocked or still loading) */}
        <a href={href} target="_blank" rel="noopener noreferrer" className="absolute inset-0 grid place-items-center p-4 text-center text-white" aria-label={`Open Instagram post ${index + 1} on Instagram`}>
          <span className="flex flex-col items-center gap-2">
            <InstagramIcon className="w-12 h-12 drop-shadow-[2px_2px_0_rgba(17,17,17,0.5)]" />
            <span className="font-brut uppercase text-lg leading-tight [text-shadow:2px_2px_0_#111]">{post ? 'View this post' : `Post ${index + 1}`}</span>
            <span className="font-tag uppercase tracking-wider text-base leading-none opacity-90">@{INSTAGRAM_HANDLE}</span>
          </span>
        </a>
        {src && <iframe src={src} title={`Instagram post ${index + 1} from @${INSTAGRAM_HANDLE}`} loading="lazy" className="absolute inset-0 w-full h-full border-0 bg-white" allow="encrypted-media" referrerPolicy="strict-origin-when-cross-origin" />}
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
