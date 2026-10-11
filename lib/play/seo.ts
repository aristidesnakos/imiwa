/**
 * Where /play lives, the image it shares as, and when its content last
 * changed: one place for the page, the share card, the sitemap and
 * `pnpm validate:schema`.
 *
 * Relative import, not `@/`, so scripts/validate-schema.ts can import it under
 * tsx (the reason lib/play/build.ts does the same).
 */

import { SITE_URL } from '../seo/site';

export const PLAY_PATH = '/play';

/** Canonical, on the www host (lib/seo/site.ts). */
export const PLAY_URL = `${SITE_URL}${PLAY_PATH}`;

/**
 * The sitemap `lastmod` for /play. A hand-kept date, like every other entry in
 * app/sitemap.xml/route.ts: bump it when the page's content changes (the copy,
 * the worlds it lists, the game itself), never on a deploy.
 *
 * 2026-10-11: the page launched with Tan Dash.
 */
export const PLAY_CONTENT_LAST_MODIFIED = '2026-10-11';

/**
 * The share card drawn by app/play/opengraph-image.tsx, served by Next at
 * /play/opengraph-image. The page names it in its openGraph metadata (and
 * twitter inherits it), and the VideoGame JSON-LD uses it as `image`.
 */
export const PLAY_OG_IMAGE = {
  url: `${PLAY_URL}/opengraph-image`,
  width: 1200,
  height: 630,
  alt: 'Tan Dash, a free one-thumb kanji game: Tan the tanuki jumps for the kanji the sign asks for, 山 for "mountain".',
} as const;
