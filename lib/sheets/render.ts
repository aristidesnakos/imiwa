/**
 * lib/sheets/render.ts
 *
 * The printable kanji practice sheet as HTML: pure functions from a kanji
 * entry and its prepared KanjiVG diagram to a finished document. No fetching,
 * no lookups, no headers. Those stay in `app/api/kanji-sheets/route.ts`, which
 * is the only thing that serves these documents.
 *
 * They live here, not in the route, because a route module may only export
 * its HTTP handlers, and `scripts/validate-sheets.ts` needs to render a sheet
 * without a server or a network: it holds these functions to golden fixtures
 * recorded from the route as it was before the move.
 *
 * Relative imports, because that validator imports this module under tsx.
 */

import type { KanjiWithLevel } from '../constants/kanji-types';

// KanjiVG's copyright notice is an XML comment sitting above the root element
// of every source file. It is returned separately from the diagram rather than
// carried on the SVG string because the same diagram is inlined nine times per
// sheet, and nine copies of the notice is not what "keep intact" asks for.
const KANJIVG_NOTICE_PATTERN = /<!--[\s\S]*?-->/;

export interface StrokeOrderAsset {
  /** The diagram, resized for the sheet. Safe to inline more than once. */
  svg: string;
  /** KanjiVG's own copyright comment, verbatim, or null if upstream dropped it. */
  notice: string | null;
}

/**
 * A KanjiVG source file, as fetched, made ready for the sheet: the copyright
 * notice lifted out, everything before the root element dropped, and the root
 * resized to fill whatever box it is inlined into.
 */
export function prepareStrokeOrder(svgContent: string): StrokeOrderAsset {
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
}

export function extractStrokeCount(svg: string): number {
  // Count path elements with IDs like "s1", "s2", etc.
  const matches = svg.match(/id="[^"]*-s\d+"/g);
  return matches ? matches.length : 0;
}

export interface PreparedSheet {
  kanjiData: KanjiWithLevel;
  strokeOrderSvg: string | null;
  strokeCount: number | null;
  licenceNotice: string | null;
}

// The document is assembled from three pieces — the head and stylesheet, one
// body per sheet, the closing tags — so the one-sheet and several-sheet
// documents share every line of the sheet itself. The one-sheet assembly is
// byte-for-byte the single template this used to be; keep it that way, since
// scripts/download-kanji-sheets.ts and every cached copy expect that document.

export function renderSheetDocument(
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

export function renderMultiSheetDocument(sheets: PreparedSheet[]): string {
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
