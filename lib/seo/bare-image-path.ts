/**
 * The guard the two on-demand image routes (`/kanji/<char>/share-card.png` and
 * `/kanji/<char>/stroke-order.svg`) call before they do any work.
 *
 * Both draw the same bytes for a character whatever the query string says, but
 * the CDN keys its cache on the whole URL, so `?cb=<anything>` skipped it and
 * cost a full render each time: measured on 2026-10-24, 1.3 s for the share
 * card against 0.29 s for a cache hit, with nothing to stop one client asking
 * for a new query every request. Nothing of ours links either image with a
 * query (`kanjiShareCardPath`, `strokeOrderImagePath`), so a request that has
 * one is sent to the bare path, where the cache is. A 308 costs one cheap
 * function call and still serves a scraper that appends a tracking parameter,
 * which a 404 would not.
 */

/** A redirect to the bare path when the request carries a query string, else null. */
export function redirectToBareImagePath(request: Request): Response | null {
  const { pathname, search } = new URL(request.url);
  if (!search) return null;

  return new Response(null, {
    status: 308,
    headers: {
      Location: pathname,
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
