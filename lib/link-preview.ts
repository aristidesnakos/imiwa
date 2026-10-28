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
 * It never throws and never returns half a card: a failed request, a non-HTML answer, a
 * redirect to another host, or a page with no title or no description is `null`, and the caller
 * keeps what it already had. A build must not depend on someone else's site being up. The
 * redirect rule is what keeps "the card says only what that page says" true: the link is the
 * caller's constant, so text read from a different host would sit under a link to this one.
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

/**
 * True when the answer came from the host that was asked. `fetch` follows redirects, and a
 * `www.` hop counts as another host: the caller's image check and its link name one host, so a
 * page that moves is better served by the pinned copy than by text from somewhere else. An empty
 * `landed` (a runtime that does not report it) is taken as no redirect.
 */
export function answeredByRequestedHost(requested: string, landed: string): boolean {
  if (!landed) return true;
  try {
    return new URL(landed).hostname === new URL(requested).hostname;
  } catch {
    return false;
  }
}

export async function fetchLinkPreview(url: string): Promise<LinkPreview | null> {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' },
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok || !(response.headers.get('content-type') ?? '').includes('text/html')) return null;
    if (!answeredByRequestedHost(url, response.url)) return null;
    return parsePreview(await response.text(), response.url || url);
  } catch {
    return null;
  }
}
