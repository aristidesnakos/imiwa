import config from '@/config';

/**
 * Single source of truth for absolute URLs and brand assets used in structured
 * data, the sitemap, and robots.txt.
 *
 * `config.domainName` is the canonical host (`www.michikanji.com`) and the apex
 * 301s to it. JSON-LD that hardcodes the apex hands Google entity URLs that
 * redirect, which splits the brand across two hostnames — exactly the entity
 * inconsistency that makes a site look like two half-authoritative properties
 * instead of one.
 */
export const SITE_URL = `https://${config.domainName}`;

/** Brand name as it should appear in every schema.org `name` / `author`. */
export const SITE_NAME = config.appName;

/**
 * Organization / publisher logo.
 *
 * This must be a real, crawlable raster image. The previous value
 * (`/logo.png`) was never committed and 404'd, which is worse for rich-result
 * eligibility than omitting the property entirely.
 */
export const SITE_LOGO = {
  url: `${SITE_URL}/assets/web-app-manifest-512x512.png`,
  width: 512,
  height: 512,
} as const;

/** Site-wide OG image rendered by `app/opengraph-image.tsx`. */
export const SITE_OG_IMAGE = {
  url: `${SITE_URL}/opengraph-image`,
  width: 1200,
  height: 630,
} as const;

/**
 * Content timestamps for sitemap `lastmod` and Article dates.
 *
 * Deliberately hand-maintained constants rather than `new Date()`. A timestamp
 * that moves on every deploy claims all ~1,900 URLs changed at the same
 * instant; Google treats `lastmod` it cannot trust as noise and stops using it,
 * which works directly against crawl efficiency. Bump a value only when the
 * underlying content actually changes.
 */
export const KANJI_CONTENT_PUBLISHED = '2025-10-20'; // dab4476 — dictionary launched

/**
 * The last significant change to the main content of the character pages,
 * whether it came from the kanji data or from the page template. It is every
 * kanji URL's sitemap `lastmod` and every Article's `dateModified`, so bump it
 * for a change a reader or crawler meets in the body of all ~1,900 pages, not
 * for chrome such as the header, footer or a restyle.
 *
 * 2026-09-28: the stroke-order diagram became a server-rendered, indexable
 * image (`/kanji/<char>/stroke-order.svg`: an <img> in the HTML, in the Article
 * JSON-LD and in the sitemap) instead of an SVG injected after hydration.
 * Before that, 2026-06-14 (ba5c8fd), the last kanji data edit.
 */
export const KANJI_CONTENT_LAST_MODIFIED = '2026-09-28';
