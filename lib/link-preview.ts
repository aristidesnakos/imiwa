/**
 * lib/link-preview.ts
 *
 * What a page says about itself to a link card: its Open Graph title, description, image and
 * site name, read from its own HTML. It is how YenConverterSection shows the partner's page in
 * the partner's words, so the card cannot say more than the page does and follows it when it
 * changes.
 *
 * SERVER ONLY. It uses the Data Cache through `fetch`, and a client component importing it
 * would ship a parser for nothing. The one page that calls it is statically generated with
 * `revalidate = 86400`, so the request happens at build and then at most once a day.
 *
 * It never throws and never returns half a card: a failed request, a non-HTML answer, or a
 * page with no title or no description is `null`, and the caller keeps what it already had. A
 * build must not depend on someone else's site being up.
 *
 * The caller owns the link. This returns text for display only, so a page cannot point a card
 * somewhere else by changing its own `og:url`, and the image is returned as the page gave it
 * and left for the caller to check, because only the caller knows which hosts next/image may
 * proxy (next.config.js `images.remotePatterns`).
 */

export interface LinkPreview {
  title: string;
  description: string;
  siteName: string | null;
  /** Absolute URL as the page gave it. Untrusted until the caller has checked it. */
  image: string | null;
}

const USER_AGENT = 'Mozilla/5.0 (compatible; MichiKanji link preview; +https://www.michikanji.com)';
const TIMEOUT_MS = 8000;
const REVALIDATE_SECONDS = 86400;
const MAX_TITLE = 100;
const MAX_DESCRIPTION = 220;

const META_TAG = /<meta\b[^>]*>/gi;
const ATTRIBUTE = /([a-zA-Z:_-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
const ENTITY = /&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi;
const NAMED: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

function decode(text: string): string {
  return text.replace(ENTITY, (whole, body: string) => {
    const lower = body.toLowerCase();
    if (lower in NAMED) return NAMED[lower];
    const code = lower.startsWith('#x') ? parseInt(lower.slice(2), 16) : parseInt(lower.slice(1), 10);
    return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
  });
}

/** Collapse whitespace, then cut at a code point rather than mid-surrogate. */
function tidy(text: string, max: number): string {
  const flat = decode(text).replace(/\s+/g, ' ').trim();
  const points = Array.from(flat);
  return points.length <= max ? flat : `${points.slice(0, max - 1).join('').trimEnd()}…`;
}

/** Every <meta> that carries a `property` or `name` and a `content`; the first of a key wins. */
function metaTags(html: string): Map<string, string> {
  const found = new Map<string, string>();
  for (const [tag] of html.matchAll(META_TAG)) {
    const attrs: Record<string, string> = {};
    for (const [, name, double, single] of tag.matchAll(ATTRIBUTE)) attrs[name.toLowerCase()] = double ?? single;
    const key = (attrs.property ?? attrs.name)?.toLowerCase();
    if (key && attrs.content !== undefined && !found.has(key)) found.set(key, attrs.content);
  }
  return found;
}

/** Pure, so it can be checked against a saved page. `pageUrl` resolves a relative image. */
export function parsePreview(html: string, pageUrl: string): LinkPreview | null {
  const meta = metaTags(html);
  const title = meta.get('og:title') ?? meta.get('twitter:title');
  const description = meta.get('og:description') ?? meta.get('twitter:description') ?? meta.get('description');
  if (!title?.trim() || !description?.trim()) return null;

  const rawImage = meta.get('og:image') ?? meta.get('twitter:image');
  let image: string | null = null;
  if (rawImage) {
    try {
      image = new URL(decode(rawImage).trim(), pageUrl).toString();
    } catch {
      image = null;
    }
  }

  const siteName = meta.get('og:site_name');
  return {
    title: tidy(title, MAX_TITLE),
    description: tidy(description, MAX_DESCRIPTION),
    siteName: siteName?.trim() ? tidy(siteName, MAX_TITLE) : null,
    image,
  };
}

export async function fetchLinkPreview(url: string): Promise<LinkPreview | null> {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' },
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok || !(response.headers.get('content-type') ?? '').includes('text/html')) return null;
    return parsePreview(await response.text(), response.url || url);
  } catch {
    return null;
  }
}
