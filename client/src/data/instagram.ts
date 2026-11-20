// Your Instagram account and the three posts shown in the gallery on the landing page.
// To change the gallery, paste three post (or reel) links into POSTS below. Nothing else needs editing.

export const INSTAGRAM_HANDLE = 'netanchal';
export const INSTAGRAM_URL = 'https://www.instagram.com/netanchal/';

/**
 * Links to your three most recent posts, for example:
 *   'https://www.instagram.com/p/AbCdEfGhIjK/'
 *   'https://www.instagram.com/reel/AbCdEfGhIjK/'
 * While this list is empty the gallery shows three cards that open the profile.
 */
export const POSTS: string[] = [
  'https://www.instagram.com/reel/Df9ck1nhHOV/',
  'https://www.instagram.com/reel/Df9ceyOOQDu/',
  'https://www.instagram.com/p/Df7Lwqioxwu/',
];

/** the embeddable address of a post link, or null if it is not a post or reel link */
export function embedUrl(post: string): string | null {
  const m = post.match(/instagram\.com\/(p|reel|tv)\/([A-Za-z0-9_-]+)/);
  return m ? `https://www.instagram.com/${m[1]}/${m[2]}/embed` : null;
}

/** a plain post link (no tracking parameters) */
export function cleanPostUrl(post: string): string {
  const m = post.match(/instagram\.com\/(p|reel|tv)\/([A-Za-z0-9_-]+)/);
  return m ? `https://www.instagram.com/${m[1]}/${m[2]}/` : INSTAGRAM_URL;
}
