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
 * without a server or a network: it holds these functions to golden fixtures,
 * first recorded from the route as it was before the move, and re-recorded on
 * 2026-10-10 when the default sheet was changed to fit one A4 page.
 *
 * Relative imports, because that validator imports this module under tsx.
 */

import type { KanjiWithLevel } from '../constants/kanji-types';
import type { SheetOptions } from './kanji-sheets';
import {
  GENKOU_GEOMETRY,
  ROWS_GEOMETRY,
  genkouBandHeightPx,
  genkouBandsPerPage,
  genkouStripsPerBand,
  kanjiPerPage,
  rowsBlockHeightPx,
} from './layout';

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
// documents share every line of the sheet itself. Never change either one by
// accident: scripts/download-kanji-sheets.ts screenshots the one-sheet
// document, and the CDN serves a day of cached copies of both, so
// pnpm validate:sheets holds them byte for byte to golden fixtures.
//
// They have changed once on purpose since this was a single template. Until
// 2026-10-10, Chrome printed every sheet that has its stroke diagram (all
// but the never-cached, degraded one) as two A4 pages: the practice rows
// came to 66px, not 60 (see `.grid-cell.with-guide`), and the header's lines
// were as tall as the font made them, so the 267mm (1009px) between the 15mm
// margins overflowed and the KanjiVG credit printed alone on a second page,
// leaving the sheet itself uncredited. Now a sheet is 946px for most kanji and
// 988px for the tallest (監 and 貫, whose meanings wrap to three lines). A
// deliberate change like that one re-records the fixtures in the same commit.

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
    }

    .large-kanji {
      font-size: 72px;
      font-weight: bold;
      line-height: 1;
    }

    .kanji-info {
      flex: 1;
    }

    /* A fixed line, not the font's "normal" one: a long meaning wraps (監's
       runs to three lines) and every line it adds has to fit on the page. */
    .info-row {
      line-height: 20px;
    }

    .info-row + .info-row {
      margin-top: 8px;
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

    /* Stroke order in first column. The 3px inset is on the diagram, not the
       cell: on the cell, Chrome added it to the row (66px, not 60), the eight
       rows came to 528px, and a sheet printed as two A4 pages with the credit
       alone on the second. As a block, the diagram is exactly 60px. */
    .grid-cell.with-guide {
      padding: 0;
    }

    .grid-cell.with-guide svg {
      display: block;
      width: 100%;
      height: 100%;
      padding: 3px;
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

// The one-page sheet's practice grid and its credit. renderSheet takes them as
// parameters so the genkōyōshi sheet can swap the grid and say what it
// changed; at their defaults the output is the default document, byte for
// byte (pnpm validate:sheets).
function crossPracticeGrid(strokeOrderSvg: string | null): string {
  return `    <!-- Practice Grid -->
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

`;
}

const PAGE_SHEET_CREDIT = `      Stroke order diagram from the KanjiVG project (kanjivg.tagaini.net), copyright
      &copy; 2009&ndash;2011 Ulrich Apel, released under the Creative Commons
      Attribution-Share Alike 3.0 licence (creativecommons.org/licenses/by-sa/3.0/).
      The diagram has been rescaled and, in the practice grid, lightened; those
      modified diagrams are shared under the same licence.
      Practice sheet from michikanji.com.
`;

function renderSheet(
  kanjiData: KanjiWithLevel,
  strokeOrderSvg: string | null,
  strokeCount: number | null,
  practice: string = crossPracticeGrid(strokeOrderSvg),
  credit: string = PAGE_SHEET_CREDIT
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

${practice}    <!-- Attribution Section -->
    <p class="sheet-credit">
${credit}    </p>
  </div>
`;
}

const DOCUMENT_END = `</body>
</html>`;

// ─────────────────────────────────────────────────────────────────────────────
// THE NEW DOCUMENTS: several kanji to a page, and genkōyōshi squares
// ─────────────────────────────────────────────────────────────────────────────
//
// Everything below is reached only through non-default options, so none of it
// can touch the two documents above.
//
// ROWS (grid=cross). Each kanji gets a block: a header line (the kanji, its
// meaning and readings, its level and stroke count, and a small stroke-order
// diagram with KanjiVG's stroke numbers), then `rows` rows of ten squares with
// the faded model in the first square of each row. The squares are the
// one-page sheet's own cells, 10% of the width by 60px, so a learner who knows
// that sheet knows these.
//
// GENKŌYŌSHI (grid=genkou). The conventions and their sources are in
// lib/sheets/layout.ts (GENKOU_GEOMETRY). On the one-page sheet the 80-square
// table becomes ten columns of ten. In rows, a kanji is a vertical strip: a
// header column on the right, then its `rows` columns of ten to the left.
//
// Pages are cut here, not by the print engine: see lib/sheets/layout.ts. Every
// block, strip and page box has a fixed height taken from there, which is what
// lets the builder's page count and this document agree.
//
// The diagram is written ONCE per kanji, as a <symbol>, and every place that
// shows it references it with <use>. A 100-kanji document at eight rows would
// otherwise inline 900 copies of a 2-7 kB file: megabytes of HTML, against a
// 4.5 MB response limit, for the same drawing over and over.

const CUSTOM_CREDIT = `Stroke order diagrams from the KanjiVG project (kanjivg.tagaini.net), copyright
      &copy; 2009&ndash;2011 Ulrich Apel, released under the Creative Commons
      Attribution-Share Alike 3.0 licence (creativecommons.org/licenses/by-sa/3.0/).
      The diagrams have been rescaled, their stroke numbers enlarged and, in the
      practice squares, lightened; those modified diagrams are shared under the
      same licence.
      Practice sheet from michikanji.com.`;

const PRINT_INSTRUCTIONS =
  'Press Ctrl+P (&#8984;P on a Mac) to print, or choose Save as PDF in the print dialog to keep them all in one file.';

// The page box every several-to-a-page document prints in, and the hidden
// sprite its diagrams live in.
const PAGE_BOX_STYLES = `
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
        height: ${ROWS_GEOMETRY.pageHeightPx}px;
      }

      .rows-page .sheet-credit {
        margin-top: auto;
      }
    }
`;

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

    /* The one-page sheet's cell, held to exactly its declared 60px. Since
       2026-10-10 that sheet does the same itself: its first cell's 3px padding
       used to be added to the row (66px in Chrome), which pushed its credit
       onto a second page. Restated here because this layout's page arithmetic
       depends on every row being 60px in every engine. */
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
`;
}

// The genkōyōshi squares. The rules are the sheet's own greys: plain squares,
// no guides, the frame heavier than the rules inside it, as on the real paper.
const GENKOU_STYLES = `
    .genkou-grid {
      display: block;
    }

    .genkou-grid rect {
      fill: none;
      stroke: #666;
      stroke-width: 0.75;
    }

    .genkou-grid .gk-frame {
      stroke: #333;
      stroke-width: 1.5;
    }

    .genkou-grid .gk-model {
      opacity: 0.3;
    }

    .practice-grid .genkou-grid {
      width: 100%;
      height: auto;
    }
`;

function genkouRowsStyles(): string {
  const g = GENKOU_GEOMETRY;
  return `
    /* Genkōyōshi in rows: kanji are vertical strips filling bands right to
       left. Widths and heights from GENKOU_GEOMETRY in lib/sheets/layout.ts. */
    .gk-band {
      display: flex;
      flex-direction: row-reverse;
      gap: ${g.stripGapPx}px;
      height: ${genkouBandHeightPx()}px;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .gk-band + .gk-band {
      margin-top: ${g.bandGapPx}px;
    }

    .gk-strip {
      display: flex;
      flex: none;
      flex-direction: row-reverse;
      align-items: flex-start;
    }

    .gk-header {
      display: flex;
      flex: none;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      width: ${g.headerWidthPx}px;
      height: ${g.squaresPerColumn * g.squarePx}px;
      padding-left: 6px;
      overflow: hidden;
      font-size: 10.5px;
      line-height: 13px;
      text-align: center;
      color: #333;
    }

    .gk-kanji {
      font-size: 44px;
      font-weight: bold;
      line-height: 1;
    }

    .gk-ref {
      width: 72px;
      height: 72px;
      border: 1px solid #ccc;
      padding: 2px;
    }

    .gk-ref svg {
      display: block;
      width: 100%;
      height: 100%;
    }

    .gk-label {
      display: block;
      font-weight: bold;
      color: #666;
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

/** Every kanji's symbol that could be built, keyed by character. */
function diagramSymbols(sheets: readonly PreparedSheet[]): Map<string, string> {
  const symbols = new Map<string, string>();
  for (const sheet of sheets) {
    const symbol = sheet.strokeOrderSvg ? diagramSymbol(sheet.kanjiData.kanji, sheet.strokeOrderSvg) : null;
    if (symbol) symbols.set(sheet.kanjiData.kanji, symbol);
  }
  return symbols;
}

function diagramSprite(symbols: ReadonlyMap<string, string>): string {
  return `  <svg class="diagram-defs" aria-hidden="true"><defs>
${Array.from(symbols.values()).join('\n')}
  </defs></svg>`;
}

function diagramUse(character: string): string {
  return `<svg aria-hidden="true"><use href="#${diagramId(character)}"/></svg>`;
}

// The title is the file name Save as PDF suggests, and a hundred characters of
// it would be cut off mid-set by the file system anyway.
function customTitle(sheets: readonly PreparedSheet[]): string {
  const characters = sheets.map((sheet) => sheet.kanjiData.kanji);
  if (characters.length === 1) return `${characters[0]} Practice Sheet`;
  return characters.length <= 12
    ? `${characters.join('')} Practice Sheets`
    : `${characters.slice(0, 10).join('')}… ${characters.length} Kanji Practice Sheets`;
}

function strokesLabel(strokeCount: number | null): string | null {
  return strokeCount ? `${strokeCount} ${strokeCount === 1 ? 'stroke' : 'strokes'}` : null;
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

/** A page box of the several-to-a-page documents, with its credit. */
function pageBox(content: string): string {
  return `  <div class="page-container rows-page">
${content}    <p class="sheet-credit">
      ${CUSTOM_CREDIT}
    </p>
  </div>
`;
}

/**
 * A genkōyōshi grid as one SVG: `columns` columns of `squares` squares, the
 * first column at the right, each with its ruby strip on its right, and the
 * faded model in the top square of every column. Every square and strip is its
 * own rect so scripts/validate-sheets.ts can count them.
 */
function genkouGridSvg(
  columns: number,
  squares: number,
  squarePx: number,
  rubyPx: number,
  modelId: string | null
): string {
  const pitch = squarePx + rubyPx;
  const width = columns * pitch;
  const height = squares * squarePx;
  const parts: string[] = [];
  for (let column = 0; column < columns; column++) {
    const right = width - column * pitch;
    const left = right - pitch;
    parts.push(`<rect class="gk-ruby" x="${right - rubyPx}" y="0" width="${rubyPx}" height="${height}"/>`);
    for (let square = 0; square < squares; square++) {
      parts.push(`<rect class="gk-sq" x="${left}" y="${square * squarePx}" width="${squarePx}" height="${squarePx}"/>`);
    }
    if (modelId) {
      parts.push(
        `<use class="gk-model" href="#${modelId}" x="${left + 3}" y="3" width="${squarePx - 6}" height="${squarePx - 6}"/>`
      );
    }
  }
  // Inset by half its stroke, so the viewBox does not clip the frame.
  parts.push(`<rect class="gk-frame" x="0.75" y="0.75" width="${width - 1.5}" height="${height - 1.5}"/>`);
  return `<svg class="genkou-grid" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" aria-hidden="true">${parts.join('')}</svg>`;
}

function renderRowsBlock(sheet: PreparedSheet, rows: number, hasDiagram: boolean): string {
  const { kanjiData, strokeCount } = sheet;
  const model = hasDiagram ? diagramUse(kanjiData.kanji) : '';
  const facts = [`JLPT ${kanjiData.level}`, strokesLabel(strokeCount)].filter(Boolean).join(' &middot; ');

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
  const symbols = diagramSymbols(sheets);
  const pages = chunk(sheets, kanjiPerPage({ layout: 'rows', rows, grid: 'cross' }));

  return `${documentStart(customTitle(sheets), MULTI_SHEET_STYLES + PAGE_BOX_STYLES + rowsStyles(rows))}${distinctNotices(sheets)}
  <p class="print-hint" lang="en">${plural(sheets.length, 'kanji', 'kanji')}, ${plural(rows, 'row', 'rows')} of practice each, on ${plural(pages.length, 'printed page', 'printed pages')}. ${PRINT_INSTRUCTIONS}</p>
${diagramSprite(symbols)}
${pages.map((page) => pageBox(page.map((sheet) => renderRowsBlock(sheet, rows, symbols.has(sheet.kanjiData.kanji))).join(''))).join('')}${DOCUMENT_END}`;
}

/** The one-page sheet's grid on genkōyōshi: ten columns of ten. */
function genkouPracticeGrid(modelId: string | null): string {
  const g = GENKOU_GEOMETRY;
  const squares = g.pageColumns * g.pageSquares;
  return `    <!-- Practice Grid -->
    <div class="practice-grid">
      <div class="grid-title">Practice Grid (${squares} squares, genk&#333;y&#333;shi: top to bottom, columns right to left)</div>
      ${genkouGridSvg(g.pageColumns, g.pageSquares, g.pageSquarePx, g.pageRubyPx, modelId)}
    </div>

`;
}

/**
 * One kanji per page, with genkōyōshi squares: the one-page sheet's header and
 * large stroke-order reference unchanged, the grid swapped.
 */
export function renderGenkouPageDocument(sheets: readonly PreparedSheet[]): string {
  const symbols = diagramSymbols(sheets);
  return `${documentStart(customTitle(sheets), MULTI_SHEET_STYLES + PAGE_BOX_STYLES + GENKOU_STYLES)}${distinctNotices(sheets)}
  <p class="print-hint" lang="en">${plural(sheets.length, 'practice sheet', 'practice sheets')} on genk&#333;y&#333;shi squares, one per printed page. ${PRINT_INSTRUCTIONS}</p>
${diagramSprite(symbols)}
${sheets
  .map((sheet) =>
    renderSheet(
      sheet.kanjiData,
      sheet.strokeOrderSvg,
      sheet.strokeCount,
      genkouPracticeGrid(symbols.has(sheet.kanjiData.kanji) ? diagramId(sheet.kanjiData.kanji) : null),
      `      ${CUSTOM_CREDIT}\n`
    )
  )
  .join('')}${DOCUMENT_END}`;
}

function renderGenkouStrip(sheet: PreparedSheet, rows: number, hasDiagram: boolean): string {
  const g = GENKOU_GEOMETRY;
  const { kanjiData, strokeCount } = sheet;
  const facts = [`JLPT ${kanjiData.level}`, strokesLabel(strokeCount)].filter(Boolean).join('<br>');
  return `      <section class="gk-strip">
        <div class="gk-header">
          <div class="gk-kanji">${kanjiData.kanji}</div>
          <div class="gk-ref">${hasDiagram ? diagramUse(kanjiData.kanji) : ''}</div>
          <div>${kanjiData.meaning}</div>
          <div><span class="gk-label">On</span>${kanjiData.onyomi}</div>
          <div><span class="gk-label">Kun</span>${kanjiData.kunyomi}</div>
          <div>${facts}</div>
        </div>
        ${genkouGridSvg(rows, g.squaresPerColumn, g.squarePx, g.rubyPx, hasDiagram ? diagramId(kanjiData.kanji) : null)}
      </section>
`;
}

/**
 * Several kanji to a page on genkōyōshi: each kanji `rows` columns of ten,
 * strips filling bands right to left, two bands to a page.
 */
export function renderGenkouRowsDocument(sheets: readonly PreparedSheet[], rows: number): string {
  const symbols = diagramSymbols(sheets);
  const perBand = genkouStripsPerBand(rows);
  const pages = chunk(sheets, perBand * genkouBandsPerPage());

  return `${documentStart(customTitle(sheets), MULTI_SHEET_STYLES + PAGE_BOX_STYLES + GENKOU_STYLES + genkouRowsStyles())}${distinctNotices(sheets)}
  <p class="print-hint" lang="en">${plural(sheets.length, 'kanji', 'kanji')}, ${plural(rows, 'column', 'columns')} of genk&#333;y&#333;shi each, on ${plural(pages.length, 'printed page', 'printed pages')}. ${PRINT_INSTRUCTIONS}</p>
${diagramSprite(symbols)}
${pages
  .map((page) =>
    pageBox(
      chunk(page, perBand)
        .map(
          (band) => `    <div class="gk-band">
${band.map((sheet) => renderGenkouStrip(sheet, rows, symbols.has(sheet.kanjiData.kanji))).join('')}    </div>
`
        )
        .join('')
    )
  )
  .join('')}${DOCUMENT_END}`;
}

/**
 * The document for any non-default options: rows on either grid, or one page
 * per kanji on genkōyōshi. The default options never come here; they take
 * renderSheetDocument or renderMultiSheetDocument, untouched by any of this.
 */
export function renderCustomDocument(sheets: readonly PreparedSheet[], options: SheetOptions): string {
  if (options.layout === 'page') return renderGenkouPageDocument(sheets);
  return options.grid === 'genkou' ? renderGenkouRowsDocument(sheets, options.rows) : renderRowsDocument(sheets, options.rows);
}
