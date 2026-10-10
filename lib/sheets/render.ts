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
import { ROWS_GEOMETRY, kanjiPerPage, rowsBlockHeightPx } from './layout';

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

  return `${documentStart(title, MULTI_SHEET_STYLES)}${distinctNotices(sheets)}
  <p class="print-hint" lang="en">${sheets.length} ${sheetsLabel.toLowerCase()}, one per printed page. Press Ctrl+P (&#8984;P on a Mac) to print, or choose Save as PDF in the print dialog to keep them all in one file.</p>
${sheets.map((sheet) => renderSheet(sheet.kanjiData, sheet.strokeOrderSvg, sheet.strokeCount)).join('')}${DOCUMENT_END}`;
}

// Every KanjiVG file carries the same notice, and the one-sheet document
// already keeps a single copy rather than one per inlined diagram. One copy
// of each DISTINCT notice keeps every source's notice intact without printing
// the same comment twenty times.
function distinctNotices(sheets: readonly PreparedSheet[]): string {
  return Array.from(
    new Set(sheets.map((sheet) => sheet.licenceNotice).filter((notice): notice is string => notice !== null))
  ).join('\n');
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

// ─────────────────────────────────────────────────────────────────────────────
// THE ROWS LAYOUT: several kanji to a page
// ─────────────────────────────────────────────────────────────────────────────
//
// Each kanji gets a block: a header line (the kanji, its meaning and readings,
// its level and stroke count, and a small stroke-order diagram with KanjiVG's
// stroke numbers), then `rows` rows of ten squares with the faded model in the
// first square of each row. The squares are the one-page sheet's own cells,
// 10% of the width by 60px, so a learner who knows that sheet knows these.
//
// Pages are cut here, not by the print engine: see lib/sheets/layout.ts. Every
// block and every page box has a fixed height taken from ROWS_GEOMETRY, which
// is what lets the builder's page count and this document agree.
//
// The diagram is written ONCE per kanji, as a <symbol>, and every place that
// shows it references it with <use>. A 100-kanji document at eight rows would
// otherwise inline 900 copies of a 2-7 kB file: megabytes of HTML, against a
// 4.5 MB response limit, for the same drawing over and over.

const ROWS_CREDIT = `Stroke order diagrams from the KanjiVG project (kanjivg.tagaini.net), copyright
      &copy; 2009&ndash;2011 Ulrich Apel, released under the Creative Commons
      Attribution-Share Alike 3.0 licence (creativecommons.org/licenses/by-sa/3.0/).
      The diagrams have been rescaled, their stroke numbers enlarged and, in the
      practice squares, lightened; those modified diagrams are shared under the
      same licence.
      Practice sheet from michikanji.com.`;

function rowsStyles(rows: number): string {
  const g = ROWS_GEOMETRY;
  return `
    /* The rows layout. Every height here comes from ROWS_GEOMETRY in
       lib/sheets/layout.ts, which is also what decides how many blocks go on a
       page: change one there, never here. */
    .rows-block {
      height: ${rowsBlockHeightPx(rows)}px;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .rows-block + .rows-block {
      margin-top: ${g.blockGapPx}px;
    }

    /* The one-page sheet's cell, held to exactly its declared 60px. There the
       first cell's 3px padding is added to the row (Chrome renders those rows
       66px tall), which is harmless on a page with one grid and would push a
       stack of them off the page. Here the padding moves onto the diagram, so
       every row is 60px in every engine and the page arithmetic holds. */
    .rows-block .grid-cell,
    .rows-block .grid-cell.with-guide {
      height: ${g.rowHeightPx}px;
      padding: 0;
    }

    .rows-block .grid-cell.with-guide svg {
      display: block;
      padding: 3px;
    }

    .rows-header {
      display: flex;
      align-items: center;
      gap: 14px;
      height: ${g.headerHeightPx}px;
      margin-bottom: ${g.headerGapPx}px;
      overflow: hidden;
    }

    .rows-kanji {
      flex: none;
      font-size: 52px;
      font-weight: bold;
      line-height: 1;
    }

    .rows-info {
      flex: 1;
      min-width: 0;
      max-height: ${g.headerHeightPx}px;
      overflow: hidden;
      font-size: 12px;
      line-height: 16px;
      color: #333;
    }

    .rows-label {
      font-weight: bold;
      color: #666;
      margin-right: 4px;
    }

    .rows-label + .rows-label,
    .rows-value + .rows-label {
      margin-left: 12px;
    }

    .rows-ref {
      flex: none;
      width: ${g.headerHeightPx}px;
      height: ${g.headerHeightPx}px;
      border: 1px solid #ccc;
      padding: 2px;
    }

    .rows-ref svg {
      display: block;
      width: 100%;
      height: 100%;
    }

    .diagram-defs {
      position: absolute;
      width: 0;
      height: 0;
      overflow: hidden;
    }

    @media print {
      /* The page box, with the credit pinned to its foot. Print only: on
         screen the pages run on with the dashed rule between them. */
      .rows-page {
        display: flex;
        flex-direction: column;
        height: ${g.pageHeightPx}px;
      }

      .rows-page .sheet-credit {
        margin-top: auto;
      }
    }
`;
}

/** The symbol id for a kanji's diagram. One per kanji in the document. */
function diagramId(character: string): string {
  return `kvg-${(character.codePointAt(0) ?? 0).toString(16)}`;
}

/**
 * KanjiVG's stroke numbers are `font-size:8` in a 109-unit drawing. On the
 * one-page sheet the reference is 130px across and they read at 9.5px; in a
 * header line's 70px box they would be 5px, which is not a number anyone can
 * read off paper. 13 units puts them at about 8px there. The credit line says
 * they were enlarged, as CC BY-SA 3.0 §3(b) asks of a change.
 */
const STROKE_NUMBER_SIZE = 13;

/**
 * A prepared diagram as a <symbol>: the root's viewBox, its contents, with
 * the stroke numbers enlarged. Null for a diagram with no root to take apart,
 * which then prints like a missing one.
 */
function diagramSymbol(character: string, svg: string): string | null {
  const root = /<svg\b([^>]*)>([\s\S]*)<\/svg>\s*$/.exec(svg);
  if (!root) return null;
  const viewBox = /\sviewBox="([^"]*)"/.exec(root[1])?.[1] ?? '0 0 109 109';
  const body = root[2].replace(
    /(<g id="kvg:StrokeNumbers_[^"]*" style="[^"]*?)font-size:[\d.]+/,
    `$1font-size:${STROKE_NUMBER_SIZE}`
  );
  return `<symbol id="${diagramId(character)}" viewBox="${viewBox}">${body}</symbol>`;
}

function diagramUse(character: string): string {
  return `<svg aria-hidden="true"><use href="#${diagramId(character)}"/></svg>`;
}

function renderRowsBlock(sheet: PreparedSheet, rows: number, hasDiagram: boolean): string {
  const { kanjiData, strokeCount } = sheet;
  const model = hasDiagram ? diagramUse(kanjiData.kanji) : '';
  const facts = [`JLPT ${kanjiData.level}`, strokeCount ? `${strokeCount} ${strokeCount === 1 ? 'stroke' : 'strokes'}` : null]
    .filter(Boolean)
    .join(' &middot; ');

  return `    <section class="rows-block">
      <div class="rows-header">
        <div class="rows-kanji">${kanjiData.kanji}</div>
        <div class="rows-info">
          <div><span class="rows-label">Meaning</span><span class="rows-value">${kanjiData.meaning}</span></div>
          <div><span class="rows-label">On</span><span class="rows-value">${kanjiData.onyomi}</span><span class="rows-label">Kun</span><span class="rows-value">${kanjiData.kunyomi}</span></div>
          <div>${facts}</div>
        </div>
        <div class="rows-ref">${model}</div>
      </div>
      <table class="grid-table">
        ${Array.from({ length: rows }, () => `<tr>${Array.from({ length: 10 }, (_, col) =>
          col === 0 ? `<td class="grid-cell with-guide">${model}</td>` : '<td class="grid-cell"></td>'
        ).join('')}</tr>`).join('\n        ')}
      </table>
    </section>
`;
}

/**
 * Several kanji to a printed page: `rows` rows of practice each, paginated by
 * kanjiPerPage. Same head and stylesheet as every other sheet, so the squares
 * are the squares people already print.
 */
export function renderRowsDocument(sheets: readonly PreparedSheet[], rows: number): string {
  const characters = sheets.map((sheet) => sheet.kanjiData.kanji);
  // The title is the file name Save as PDF suggests, and a hundred characters
  // of it would be cut off mid-set by the file system anyway.
  const title =
    characters.length <= 12
      ? `${characters.join('')} Practice Sheets`
      : `${characters.slice(0, 10).join('')}… ${characters.length} Kanji Practice Sheets`;

  const symbols = new Map<string, string>();
  for (const sheet of sheets) {
    const symbol = sheet.strokeOrderSvg ? diagramSymbol(sheet.kanjiData.kanji, sheet.strokeOrderSvg) : null;
    if (symbol) symbols.set(sheet.kanjiData.kanji, symbol);
  }

  const perPage = kanjiPerPage({ layout: 'rows', rows });
  const pages: PreparedSheet[][] = [];
  for (let i = 0; i < sheets.length; i += perPage) pages.push(sheets.slice(i, i + perPage));

  const kanjiLabel = sheets.length === 1 ? '1 kanji' : `${sheets.length} kanji`;
  const rowsLabel = rows === 1 ? '1 row' : `${rows} rows`;
  const pagesLabel = pages.length === 1 ? '1 printed page' : `${pages.length} printed pages`;

  return `${documentStart(title, MULTI_SHEET_STYLES + rowsStyles(rows))}${distinctNotices(sheets)}
  <p class="print-hint" lang="en">${kanjiLabel}, ${rowsLabel} of practice each, on ${pagesLabel}. Press Ctrl+P (&#8984;P on a Mac) to print, or choose Save as PDF in the print dialog to keep them all in one file.</p>
  <svg class="diagram-defs" aria-hidden="true"><defs>
${Array.from(symbols.values()).join('\n')}
  </defs></svg>
${pages.map((page) => `  <div class="page-container rows-page">
${page.map((sheet) => renderRowsBlock(sheet, rows, symbols.has(sheet.kanjiData.kanji))).join('')}    <p class="sheet-credit">
      ${ROWS_CREDIT}
    </p>
  </div>
`).join('')}${DOCUMENT_END}`;
}
