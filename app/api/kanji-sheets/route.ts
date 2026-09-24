import { NextRequest, NextResponse } from 'next/server';
import type { KanjiWithLevel } from '@/lib/constants/kanji-types';
import { N5_KANJI } from '@/lib/constants/n5-kanji';
import { N4_KANJI } from '@/lib/constants/n4-kanji';
import { N3_KANJI } from '@/lib/constants/n3-kanji';
import { N2_KANJI } from '@/lib/constants/n2-kanji';
import { N1_KANJI } from '@/lib/constants/n1-kanji';
import { MAX_SHEETS_PER_REQUEST } from '@/lib/sheets/kanji-sheets';

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
  const html = generatePracticeSheetHTML(
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

interface PreparedSheet {
  kanjiData: KanjiWithLevel;
  strokeOrderSvg: string | null;
  strokeCount: number | null;
  licenceNotice: string | null;
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

  return new NextResponse(generateMultiSheetHTML(sheets), {
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

// KanjiVG's copyright notice is an XML comment sitting above the root element
// of every source file. It is returned separately from the diagram rather than
// carried on the SVG string because the same diagram is inlined nine times per
// sheet, and nine copies of the notice is not what "keep intact" asks for.
const KANJIVG_NOTICE_PATTERN = /<!--[\s\S]*?-->/;

interface StrokeOrderAsset {
  /** The diagram, resized for the sheet. Safe to inline more than once. */
  svg: string;
  /** KanjiVG's own copyright comment, verbatim, or null if upstream dropped it. */
  notice: string | null;
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

    const svgContent = await response.text();

    // Lifted before the slice below throws away everything preceding <svg>.
    // This sheet is a copy of the Work that leaves the site on paper, so
    // CC BY-SA 3.0 4(c) applies to it: the notice has to survive into the
    // document. It previously did not — the slice removed it and an explicit
    // comment-strip removed any that survived.
    const notice = svgContent.match(KANJIVG_NOTICE_PATTERN)?.[0] ?? null;

    // Clean SVG
    let cleanedSvg = svgContent;
    const svgStart = cleanedSvg.indexOf('<svg');
    if (svgStart > 0) {
      cleanedSvg = cleanedSvg.substring(svgStart);
    }
    cleanedSvg = cleanedSvg
      .replace(/width="[^"]*"/g, 'width="100%"')
      .replace(/height="[^"]*"/g, 'height="100%"');

    return { svg: cleanedSvg, notice };
  } catch (error) {
    console.error(`Failed to fetch stroke order for ${character}:`, error);
    return null;
  }
}

function extractStrokeCount(svg: string): number {
  // Count path elements with IDs like "s1", "s2", etc.
  const matches = svg.match(/id="[^"]*-s\d+"/g);
  return matches ? matches.length : 0;
}

// The document is assembled from three pieces — the head and stylesheet, one
// body per sheet, the closing tags — so the one-sheet and several-sheet
// documents share every line of the sheet itself. The one-sheet assembly is
// byte-for-byte the single template this used to be; keep it that way, since
// scripts/download-kanji-sheets.ts and every cached copy expect that document.

function generatePracticeSheetHTML(
  kanjiData: KanjiWithLevel,
  strokeOrderSvg: string | null,
  strokeCount: number | null,
  licenceNotice: string | null
): string {
  return `${documentStart(`${kanjiData.kanji} Practice Sheet`)}${licenceNotice ?? ''}
${renderSheet(kanjiData, strokeOrderSvg, strokeCount)}${DOCUMENT_END}`;
}

// Added to the shared stylesheet for the several-sheet document only. No
// colours: this is a print document with no access to the site's palette
// tokens, so anything new here inherits the sheet's own ink rather than adding
// another literal.
const MULTI_SHEET_STYLES = `
    /* One sheet per printed page. A break BEFORE every sheet after the first,
       not after every sheet, so the document never ends on a blank page. */
    .page-container + .page-container {
      break-before: page;
      page-break-before: always;
    }

    .print-hint {
      max-width: 210mm;
      margin: 0 auto 24px;
      font-size: 13px;
      line-height: 1.5;
    }

    /* On screen the sheets would otherwise run together into one long page;
       on paper the page break already separates them. */
    @media screen {
      .page-container + .page-container {
        margin-top: 48px;
        padding-top: 48px;
        border-top: 1px dashed;
      }
    }

    @media print {
      .print-hint {
        display: none;
      }
    }
`;

function generateMultiSheetHTML(sheets: PreparedSheet[]): string {
  const sheetsLabel = sheets.length === 1 ? 'Practice Sheet' : 'Practice Sheets';
  // The title is also the file name the browser suggests under Save as PDF,
  // so it names the characters rather than just counting them.
  const title = `${sheets.map((sheet) => sheet.kanjiData.kanji).join('')} ${sheetsLabel}`;

  // Every KanjiVG file carries the same notice, and the one-sheet document
  // already keeps a single copy rather than one per inlined diagram. One copy
  // of each DISTINCT notice keeps every source's notice intact without printing
  // the same comment twenty times.
  const notices = Array.from(
    new Set(sheets.map((sheet) => sheet.licenceNotice).filter((notice): notice is string => notice !== null))
  ).join('\n');

  return `${documentStart(title, MULTI_SHEET_STYLES)}${notices}
  <p class="print-hint" lang="en">${sheets.length} ${sheetsLabel.toLowerCase()}, one per printed page. Press Ctrl+P (&#8984;P on a Mac) to print, or choose Save as PDF in the print dialog to keep them all in one file.</p>
${sheets.map((sheet) => renderSheet(sheet.kanjiData, sheet.strokeOrderSvg, sheet.strokeCount)).join('')}${DOCUMENT_END}`;
}

function documentStart(title: string, extraStyles = ''): string {
  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 15mm;
    }

    * {
      box-sizing: border-box;
    }

    body {
      font-family: 'Noto Sans JP', 'MS PGothic', 'Hiragino Sans', 'Yu Gothic', sans-serif;
      margin: 0;
      padding: 20px;
      background: white;
      color: black;
    }

    .page-container {
      width: 100%;
      max-width: 210mm;
      margin: 0 auto;
    }

    /* Header Section - 25% */
    .header-section {
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 2px solid #333;
    }

    .kanji-display {
      display: flex;
      align-items: center;
      gap: 20px;
      margin-bottom: 15px;
    }

    .large-kanji {
      font-size: 72px;
      font-weight: bold;
      line-height: 1;
    }

    .kanji-info {
      flex: 1;
    }

    .info-row {
      margin-bottom: 8px;
    }

    .info-label {
      font-weight: bold;
      font-size: 12px;
      color: #666;
      display: inline-block;
      width: 100px;
    }

    .info-value {
      font-size: 14px;
      color: #333;
    }

    /* Stroke Order Section */
    .stroke-order-section {
      margin-bottom: 20px;
      text-align: center;
    }

    .stroke-order-title {
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 10px;
    }

    .stroke-order-container {
      width: 150px;
      height: 150px;
      margin: 0 auto;
      border: 2px solid #ccc;
      padding: 10px;
    }

    .stroke-order-container svg {
      width: 100%;
      height: 100%;
    }

    /* Practice Grid - 75% */
    .practice-grid {
      margin-top: 20px;
    }

    .grid-title {
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 10px;
    }

    .grid-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }

    .grid-cell {
      width: 10%;
      height: 60px;
      border: 1px solid #333;
      position: relative;
    }

    /* Crosshair guides for practice */
    .grid-cell::before,
    .grid-cell::after {
      content: '';
      position: absolute;
      background: #e0e0e0;
    }

    .grid-cell::before {
      left: 50%;
      top: 0;
      bottom: 0;
      width: 1px;
      transform: translateX(-50%);
    }

    .grid-cell::after {
      top: 50%;
      left: 0;
      right: 0;
      height: 1px;
      transform: translateY(-50%);
    }

    /* Stroke order in first column */
    .grid-cell.with-guide {
      padding: 3px;
    }

    .grid-cell.with-guide svg {
      width: 100%;
      height: 100%;
      opacity: 0.3;
    }

    /* Attribution travels with the sheet, not just with the website. The
       diagram is CC BY-SA 3.0 and this page is printed and handed out, so a
       credit that only exists in the site footer does not reach the person
       holding the paper. Small, but never display:none and never print-hidden. */
    .sheet-credit {
      margin-top: 14px;
      padding-top: 8px;
      border-top: 1px solid #ccc;
      font-size: 8px;
      line-height: 1.5;
      color: #666;
    }

    @media print {
      body {
        padding: 0;
      }

      .page-container {
        page-break-inside: avoid;
      }
    }
${extraStyles}  </style>
</head>
<body>
`;
}

function renderSheet(
  kanjiData: KanjiWithLevel,
  strokeOrderSvg: string | null,
  strokeCount: number | null
): string {
  return `  <div class="page-container">
    <!-- Header Section -->
    <div class="header-section">
      <div class="kanji-display">
        <div class="large-kanji">${kanjiData.kanji}</div>
        <div class="kanji-info">
          <div class="info-row">
            <span class="info-label">Meaning:</span>
            <span class="info-value">${kanjiData.meaning}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Onyomi:</span>
            <span class="info-value">${kanjiData.onyomi}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Kunyomi:</span>
            <span class="info-value">${kanjiData.kunyomi}</span>
          </div>
          <div class="info-row">
            <span class="info-label">JLPT Level:</span>
            <span class="info-value">${kanjiData.level}</span>
          </div>
          ${strokeCount ? `
          <div class="info-row">
            <span class="info-label">Stroke Count:</span>
            <span class="info-value">${strokeCount} strokes</span>
          </div>
          ` : ''}
        </div>
      </div>
    </div>

    <!-- Stroke Order Section -->
    ${strokeOrderSvg ? `
    <div class="stroke-order-section">
      <div class="stroke-order-title">Stroke Order Reference</div>
      <div class="stroke-order-container">
        ${strokeOrderSvg}
      </div>
    </div>
    ` : ''}

    <!-- Practice Grid -->
    <div class="practice-grid">
      <div class="grid-title">Practice Grid (80 squares)</div>
      <table class="grid-table">
        ${Array.from({ length: 8 }, () => `
          <tr>
            ${Array.from({ length: 10 }, (_, colIndex) => `
              <td class="grid-cell ${colIndex === 0 ? 'with-guide' : ''}">
                ${colIndex === 0 && strokeOrderSvg ? strokeOrderSvg : ''}
              </td>
            `).join('')}
          </tr>
        `).join('')}
      </table>
    </div>

    <!-- Attribution Section -->
    <p class="sheet-credit">
      Stroke order diagram from the KanjiVG project (kanjivg.tagaini.net), copyright
      &copy; 2009&ndash;2011 Ulrich Apel, released under the Creative Commons
      Attribution-Share Alike 3.0 licence (creativecommons.org/licenses/by-sa/3.0/).
      The diagram has been rescaled and, in the practice grid, lightened; those
      modified diagrams are shared under the same licence.
      Practice sheet from michikanji.com.
    </p>
  </div>
`;
}

const DOCUMENT_END = `</body>
</html>`;
