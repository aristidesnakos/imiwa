import { NextRequest, NextResponse } from 'next/server';
import type { KanjiWithLevel } from '@/lib/constants/kanji-types';
import { N5_KANJI } from '@/lib/constants/n5-kanji';
import { N4_KANJI } from '@/lib/constants/n4-kanji';
import { N3_KANJI } from '@/lib/constants/n3-kanji';
import { N2_KANJI } from '@/lib/constants/n2-kanji';
import { N1_KANJI } from '@/lib/constants/n1-kanji';
import { MAX_SHEETS_PER_REQUEST } from '@/lib/sheets/kanji-sheets';
import {
  extractStrokeCount,
  prepareStrokeOrder,
  renderMultiSheetDocument,
  renderSheetDocument,
  type PreparedSheet,
  type StrokeOrderAsset,
} from '@/lib/sheets/render';

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

  // `characters` is the several-sheets form. It is branched on first so that a
  // request which does not name it takes exactly the path it always took —
  // same statuses, same messages, byte for byte the same sheet. Naming both is
  // refused rather than guessed at.
  if (characters !== null) {
    if (character !== null) {
      return new NextResponse('Pass character or characters, not both', { status: 400 });
    }
    return multiSheetResponse(characters);
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
  const parsed = parseCharacters(value);
  if ('error' in parsed) {
    return new NextResponse(parsed.error, { status: 400 });
  }

  // In parallel: at the cap that is twenty KanjiVG fetches, and in series the
  // document could not start until the last of them had come back.
  const sheets: PreparedSheet[] = await Promise.all(
    parsed.kanji.map(async (kanjiData) => {
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

  const complete = sheets.every((sheet) => sheet.strokeOrderSvg !== null);

  return new NextResponse(renderMultiSheetDocument(sheets), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': complete ? CACHE_COMPLETE_SHEET : CACHE_INCOMPLETE_SHEET,
    },
  });
}

/**
 * The `characters` value as an ordered, de-duplicated list of entries — or why
 * it was refused.
 *
 * `for…of` walks a string by code point, never by UTF-16 unit, for the reason
 * `fetchKanjiStrokeOrder` uses codePointAt: split by unit, a character above
 * U+FFFF is two lone surrogates, neither of which is in the data, and a request
 * naming a real kanji would be refused.
 *
 * Nothing is trimmed or normalised. A space, a comma or a variation selector is
 * a code point the data does not contain, so it is refused like any other — the
 * one-character path accepts exactly what KANJI_MAP holds, and so does this.
 */
function parseCharacters(value: string): { kanji: KanjiWithLevel[] } | { error: string } {
  const kanji: KanjiWithLevel[] = [];
  const seen = new Set<string>();

  for (const char of value) {
    if (seen.has(char)) continue;

    const entry = KANJI_MAP.get(char);
    if (!entry) {
      // The code point as well as the character: the offender is often
      // invisible (a space, a zero-width joiner) or renders as a box.
      const codePoint = (char.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, '0');
      return { error: `"${char}" (U+${codePoint}) is not a kanji in our JLPT N5-N1 dataset` };
    }

    seen.add(char);
    kanji.push(entry);

    if (kanji.length > MAX_SHEETS_PER_REQUEST) {
      return {
        error: `Too many kanji: one request prints at most ${MAX_SHEETS_PER_REQUEST} sheets`,
      };
    }
  }

  if (kanji.length === 0) {
    return { error: 'Missing characters parameter' };
  }

  return { kanji };
}


async function fetchKanjiStrokeOrder(character: string): Promise<StrokeOrderAsset | null> {
  try {
    // codePointAt, not charCodeAt: KanjiVG filenames are the full code point, and
    // charCodeAt would hand back a lone surrogate for anything above U+FFFF —
    // a filename that cannot exist, so the sheet would silently print without its
    // stroke-order reference. Every kanji in the N5-N1 dataset is BMP today, so
    // this is guarding the door before anyone walks through it, not fixing a
    // sheet that is currently broken.
    const unicode = character.codePointAt(0) ?? 0;
    const hex = unicode.toString(16).padStart(5, '0');
    const response = await fetch(`https://cdn.jsdelivr.net/gh/KanjiVG/kanjivg/kanji/${hex}.svg`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; KanjiApp/1.0)',
        'Accept': 'image/svg+xml,text/xml,application/xml,*/*',
      },
    });

    if (!response.ok) {
      return null;
    }

    // The notice is lifted and the diagram resized in lib/sheets/render.ts,
    // next to the document that has to carry them.
    return prepareStrokeOrder(await response.text());
  } catch (error) {
    console.error(`Failed to fetch stroke order for ${character}:`, error);
    return null;
  }
}
