import { NextRequest, NextResponse } from 'next/server';
import type { KanjiWithLevel } from '@/lib/constants/kanji-types';
import { N5_KANJI } from '@/lib/constants/n5-kanji';
import { N4_KANJI } from '@/lib/constants/n4-kanji';
import { N3_KANJI } from '@/lib/constants/n3-kanji';
import { N2_KANJI } from '@/lib/constants/n2-kanji';
import { N1_KANJI } from '@/lib/constants/n1-kanji';
import { fetchKanjiVgSource, kanjiVgHex } from '@/lib/kanjivg';
import {
  DEFAULT_SHEET_OPTIONS,
  isDefaultSheetOptions,
  type SheetOptions,
} from '@/lib/sheets/kanji-sheets';
import { parseCharacters, parseSheetOptions } from '@/lib/sheets/request';
import {
  extractStrokeCount,
  prepareStrokeOrder,
  renderMultiSheetDocument,
  renderRowsDocument,
  renderSheetDocument,
  type PreparedSheet,
  type StrokeOrderAsset,
} from '@/lib/sheets/render';

/**
 * /api/kanji-sheets — printable kanji practice sheets, as HTML documents the
 * browser prints or saves as a PDF.
 *
 *   ?character=日                   one sheet (the document the PDF packs are
 *                                   printed from: byte for byte unchanged)
 *   ?characters=日本人              several sheets, one per page, max 20
 *   &layout=page                    the default: the two documents above
 *   &layout=rows&rows=1..8          several kanji per page, `rows` rows of ten
 *                                   squares each (default 2), max 100 kanji
 *
 * A request with none of the layout parameters, or only their defaults, takes
 * the path it always took: same statuses, same messages, the same bytes,
 * which pnpm validate:sheets holds to golden fixtures. Everything malformed is
 * refused with a 400 naming the parameter (lib/sheets/request.ts); over a cap
 * is refused, never truncated.
 *
 * TIMINGS, measured 2026-10-10 against `pnpm build && pnpm start` on Ari's Mac
 * (not a Vercel function: no cold start in these, and jsDelivr from Europe):
 *
 *   82 N5, layout=rows&rows=1        0.56 s with an empty Data Cache, 15 ms warm
 *   100 N4, layout=rows&rows=1       1.76 s cold, 83 ms warm
 *   100 N1, layout=rows&rows=8       2.0-2.5 s cold, 37 ms warm; 689 kB of HTML
 *
 * Far under the 8 s that would have called for `maxDuration` or a lower cap,
 * so MAX_ROWS_KANJI_PER_REQUEST stays at 100 and there is no maxDuration. The
 * largest document is a sixth of the 4.5 MB response limit because each
 * diagram is written once and referenced (lib/sheets/render.ts). If a cold
 * production request ever nears 8 s, add `export const maxDuration = 30` as
 * the stroke-order.svg route does before touching the cap.
 */

// Built once at module scope: this route is hit on every sheet open, so a
// ~2000-entry lookup should not be rebuilt per request.
// Insertion order runs N1 -> N5 so that a kanji appearing in several level
// lists is overwritten by the LOWEST level, matching how the rest of the site
// (KanjiSearchClient, ReviewClient) resolves duplicates.
const KANJI_MAP = new Map<string, KanjiWithLevel>([
  ...N1_KANJI.map((k) => [k.kanji, { ...k, level: 'N1' }] as [string, KanjiWithLevel]),
  ...N2_KANJI.map((k) => [k.kanji, { ...k, level: 'N2' }] as [string, KanjiWithLevel]),
  ...N3_KANJI.map((k) => [k.kanji, { ...k, level: 'N3' }] as [string, KanjiWithLevel]),
  ...N4_KANJI.map((k) => [k.kanji, { ...k, level: 'N4' }] as [string, KanjiWithLevel]),
  ...N5_KANJI.map((k) => [k.kanji, { ...k, level: 'N5' }] as [string, KanjiWithLevel]),
]);

// A finished sheet is cached for a day by the browser and the CDN, the same
// policy as the stroke-diagram proxy (app/api/kanji-svg/[hex]/route.ts). Until
// this, every open re-ran the KanjiVG fetch for a document that only changes
// when our data or KanjiVG does, and a deploy purges the CDN anyway. Roadmap
// P3-3.
//
// A sheet printed WITHOUT its diagram is never cached. When KanjiVG cannot be
// reached this route degrades rather than fails — the sheet still prints, minus
// the stroke order — and a day-long cache would pin one bad upstream minute onto
// everyone who opened that sheet afterwards. That is not hypothetical: on
// 2026-09-24 jsDelivr answered 403, and 404 "Failed to fetch KanjiVG/kanjivg@latest
// from GitHub", for files that exist and loaded fine minutes later.
const CACHE_COMPLETE_SHEET = 'public, max-age=86400, s-maxage=86400';
const CACHE_INCOMPLETE_SHEET = 'no-store';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const character = searchParams.get('character');
  const characters = searchParams.get('characters');

  // The layout parameters first, so a malformed one is named whatever else is
  // wrong. A request naming none of them gets the defaults and no error, and
  // every branch below then runs exactly as it did before they existed.
  const options = parseSheetOptions(searchParams);
  if ('error' in options) {
    return new NextResponse(options.error, { status: 400 });
  }
  const custom = !isDefaultSheetOptions(options);

  // `characters` is the several-sheets form. It is branched on first so that a
  // request which does not name it takes exactly the path it always took —
  // same statuses, same messages, byte for byte the same sheet. Naming both is
  // refused rather than guessed at.
  if (characters !== null) {
    if (character !== null) {
      return new NextResponse('Pass character or characters, not both', { status: 400 });
    }
    return custom ? customSheetsResponse(characters, options) : multiSheetResponse(characters);
  }

  if (!character) {
    return new NextResponse('Missing character parameter', { status: 400 });
  }

  // Find kanji data across every JLPT level
  const kanjiData = KANJI_MAP.get(character);

  if (!kanjiData) {
    return new NextResponse(
      `Kanji "${character}" is not in our JLPT N5-N1 dataset`,
      { status: 404 }
    );
  }

  // One character in a new layout is a set of one.
  if (custom) {
    return customSheetsResponse(character, options);
  }

  // Fetch stroke order SVG
  const strokeOrder = await fetchKanjiStrokeOrder(character);
  const strokeOrderSvg = strokeOrder?.svg ?? null;
  const strokeCount = strokeOrderSvg ? extractStrokeCount(strokeOrderSvg) : null;

  // Generate HTML for practice sheet
  const html = renderSheetDocument(
    kanjiData,
    strokeOrderSvg,
    strokeCount,
    strokeOrder?.notice ?? null
  );

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': strokeOrderSvg ? CACHE_COMPLETE_SHEET : CACHE_INCOMPLETE_SHEET,
    }
  });
}

/**
 * Several sheets as ONE printable document, one per page, in the order asked
 * for. This is what the "print a whole group" links open: a themed set of N5
 * kanji printed, or saved as a single PDF, in one go instead of one tab each.
 *
 * Every character has to pass the lookup the single-sheet path uses — the same
 * KANJI_MAP, so lowest-level-wins holds here too — or the request is refused
 * with the first offender named. Dropping a bad character quietly would hand
 * someone a shorter stack of paper than they asked for, with nothing on it to
 * say so.
 */
async function multiSheetResponse(value: string): Promise<NextResponse> {
  const parsed = parseCharacters(value, KANJI_MAP, DEFAULT_SHEET_OPTIONS);
  if ('error' in parsed) {
    return new NextResponse(parsed.error, { status: 400 });
  }

  const sheets = await prepareSheets(parsed.kanji);
  return documentResponse(renderMultiSheetDocument(sheets), sheets);
}

/**
 * A set in a non-default layout: today, several kanji to a page. Every
 * character passes the same lookup and the same refusals as the several-sheets
 * form, against the cap for the layout asked for.
 */
async function customSheetsResponse(value: string, options: SheetOptions): Promise<NextResponse> {
  const parsed = parseCharacters(value, KANJI_MAP, options);
  if ('error' in parsed) {
    return new NextResponse(parsed.error, { status: 400 });
  }

  const sheets = await prepareSheets(parsed.kanji);
  return documentResponse(renderRowsDocument(sheets, options.rows), sheets);
}

/**
 * Every character's diagram, fetched in parallel: in series the document could
 * not start until the last of them had come back. At the rows cap that is a
 * hundred fetches, most of them answered by the Data Cache the diagram routes
 * share (see fetchKanjiStrokeOrder).
 */
function prepareSheets(kanji: readonly KanjiWithLevel[]): Promise<PreparedSheet[]> {
  return Promise.all(
    kanji.map(async (kanjiData) => {
      const strokeOrder = await fetchKanjiStrokeOrder(kanjiData.kanji);
      const strokeOrderSvg = strokeOrder?.svg ?? null;
      return {
        kanjiData,
        strokeOrderSvg,
        strokeCount: strokeOrderSvg ? extractStrokeCount(strokeOrderSvg) : null,
        licenceNotice: strokeOrder?.notice ?? null,
      };
    })
  );
}

/** Cached for a day only if every sheet in it got its diagram. */
function documentResponse(html: string, sheets: readonly PreparedSheet[]): NextResponse {
  const complete = sheets.every((sheet) => sheet.strokeOrderSvg !== null);
  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': complete ? CACHE_COMPLETE_SHEET : CACHE_INCOMPLETE_SHEET,
    },
  });
}

/**
 * One character's diagram, ready for the sheet, or null if KanjiVG could not
 * be reached (the sheet then prints without it, and is not cached).
 *
 * Through fetchKanjiVgSource, the fetch both diagram routes use, so a file is
 * one Data Cache entry for a day whichever of them asked first. A 100-kanji
 * set mostly reads that cache instead of making a hundred trips to jsDelivr.
 * The hex comes from codePointAt, never charCodeAt (see kanjiVgHex).
 */
async function fetchKanjiStrokeOrder(character: string): Promise<StrokeOrderAsset | null> {
  try {
    const source = await fetchKanjiVgSource(kanjiVgHex(character));
    if (source.svg === null) {
      return null;
    }

    // The notice is lifted and the diagram resized in lib/sheets/render.ts,
    // next to the document that has to carry them.
    return prepareStrokeOrder(source.svg);
  } catch (error) {
    console.error(`Failed to fetch stroke order for ${character}:`, error);
    return null;
  }
}
