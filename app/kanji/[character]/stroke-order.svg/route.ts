import { N5_KANJI } from '@/lib/constants/n5-kanji';
import { N4_KANJI } from '@/lib/constants/n4-kanji';
import { N3_KANJI } from '@/lib/constants/n3-kanji';
import { N2_KANJI } from '@/lib/constants/n2-kanji';
import { N1_KANJI } from '@/lib/constants/n1-kanji';
import { getPrimaryMeaning } from '@/lib/seo/kanji-optimization';
import {
  fetchKanjiVgSource,
  kanjiVgHex,
  toStandaloneStrokeOrderSvg,
  type KanjiVgSource,
} from '@/lib/kanjivg';
import { strokeOrderImageAlt } from '@/lib/stroke-order-image';

/**
 * GET /kanji/<char>/stroke-order.svg: a character's stroke-order diagram as a
 * real image.
 *
 * The page's viewer used to fetch the diagram after hydration and inject it as
 * inline <svg>, which Google Images cannot index: it finds images through
 * <img src> and image sitemaps, not markup a script adds. This route serves the
 * same KanjiVG diagram as a standalone file styled like the viewer at rest, so
 * the page can render it as an <img> in its server HTML, declare it in the
 * Article JSON-LD, and list it in the sitemap.
 *
 * The file is KanjiVG's own (CC BY-SA 3.0), restyled. lib/kanjivg.ts keeps its
 * copyright header intact and adds a notice saying what MichiKanji changed.
 */

// Never prerendered. 1,906 SVGs are not worth a build step or a jsDelivr fetch
// each at build time. A request renders on demand, the upstream fetch is held
// in the Data Cache for a day, and the response in the CDN for a day.
export const dynamic = 'force-dynamic';

// The same merge as app/kanji/[character]/page.tsx: N5 first, and `.find`
// takes the first match, so a character on two lists resolves to its lowest
// level, exactly as its page does. Only characters with a page get an image.
const ALL_KANJI_DATA = [...N5_KANJI, ...N4_KANJI, ...N3_KANJI, ...N2_KANJI, ...N1_KANJI];

// A day in the browser and the CDN, then a week of serving stale while the CDN
// refreshes. The diagram changes only when KanjiVG or this styling does, and a
// deploy purges the CDN anyway.
const CACHE_IMAGE = 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800';

// Nothing that is not the image is cached anywhere. A failed upstream fetch is
// usually transient (see lib/kanjivg.ts), and pinning it for a day would hand
// Google a broken image for every character that missed in that minute.
const CACHE_NONE = 'no-store';

// Malformed percent-encoding (a crawler requesting /kanji/%E6/...) makes
// decodeURIComponent throw. Fall back to the raw segment, which matches no
// kanji and so 404s, as the page does.
function safeDecode(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function textResponse(status: number, message: string): Response {
  return new Response(message, {
    status,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': CACHE_NONE,
    },
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ character: string }> }
) {
  const { character } = await params;
  const kanjiData = ALL_KANJI_DATA.find(k => k.kanji === safeDecode(character));

  if (!kanjiData) {
    return textResponse(404, 'No stroke order diagram for this character.');
  }

  // Any upstream failure is a 502, never a pass-through 404: to a crawler a 404
  // says the image is gone for good, while a 5xx says try again later, which is
  // what a jsDelivr hiccup is. Every character with a page has a KanjiVG file
  // (checked for all 1,906 on 2026-09-28).
  let source: KanjiVgSource;
  try {
    source = await fetchKanjiVgSource(kanjiVgHex(kanjiData.kanji));
  } catch (error) {
    console.error(`stroke-order.svg: fetching KanjiVG failed for ${kanjiData.kanji}:`, error);
    return textResponse(502, 'The stroke order diagram is temporarily unavailable.');
  }

  if (source.svg === null) {
    console.error(`stroke-order.svg: KanjiVG answered ${source.status} for ${kanjiData.kanji}`);
    return textResponse(502, 'The stroke order diagram is temporarily unavailable.');
  }

  const svg = toStandaloneStrokeOrderSvg(source.svg, {
    character: kanjiData.kanji,
    title: strokeOrderImageAlt(kanjiData.kanji, getPrimaryMeaning(kanjiData.meaning)),
  });

  if (svg === null) {
    console.error(`stroke-order.svg: KanjiVG's file for ${kanjiData.kanji} has no <svg> root`);
    return textResponse(502, 'The stroke order diagram is temporarily unavailable.');
  }

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': CACHE_IMAGE,
    },
  });
}
