/**
 * lib/sheets/layout.ts
 *
 * The page arithmetic for printed kanji sheets: how many kanji fit on one A4
 * page, how many pages a set prints on, and how a set too big for one request
 * is split. The renderer (lib/sheets/render.ts) draws to these numbers and
 * paginates by them, and the sheet builder's page-count preview calls the same
 * functions, so the preview and the paper cannot disagree.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THE SERVER PAGINATES
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Left to CSS, a stack of kanji blocks flows onto paper wherever the print
 * engine breaks it, and every engine breaks it differently: `break-inside:
 * avoid` is a request, not a rule. The credit line, which CC BY-SA 3.0 §4(c)
 * puts on every printed page, would land on one page in the whole document.
 * So the renderer decides which blocks go on which page and emits each page as
 * its own box, with the credit at its foot. That needs every block to have a
 * fixed height, which is what the numbers below are.
 *
 * The heights are CSS pixels (96 to the inch, which is what print engines lay
 * out in). A4 is 297mm and the sheets print with 15mm margins (`@page` in
 * render.ts), leaving 267mm, which is 1009px. The page box claims 1000px, so a
 * rounding difference in a print engine cannot push the credit onto a page of
 * its own.
 *
 * Client-safe: no data and no rendering here, only arithmetic.
 */

import {
  MAX_SHEETS_PER_REQUEST,
  maxKanjiPerRequest,
  type SheetOptions,
} from './kanji-sheets';

export const ROWS_GEOMETRY = {
  /** The page box: 267mm of printable A4 height is 1009px; 9px of slack. */
  pageHeightPx: 1000,
  /** Reserved at the foot of every page for the credit line, gap included. */
  creditHeightPx: 64,
  /** One kanji's header line: the kanji, its readings, its stroke diagram. */
  headerHeightPx: 76,
  /** Between the header line and the first row of squares. */
  headerGapPx: 6,
  /** One row of ten practice squares: the cell height of the one-page sheet. */
  rowHeightPx: 60,
  /** For the grid's collapsed outer border, which adds a pixel to the table. */
  borderSlackPx: 2,
  /** Between one kanji's block and the next. */
  blockGapPx: 12,
} as const;

/**
 * Genkōyōshi (原稿用紙) squares, for `grid=genkou`.
 *
 * The conventions, checked 2026-10-10 against JIS S 5508:2010 (原稿用紙), the
 * ja.wikipedia article 原稿用紙 and KOKUYO's own sheets (ケ-10, ケ-20-5N,
 * ケ-70N-G): plain squares with no crosshair guides, in columns read top to
 * bottom and right to left, each column with a narrow strip on its RIGHT for
 * furigana and corrections (Wikipedia: 「文字右隣り余白」; JIS calls it the
 * 添削けい). JIS pairs the square and strip at 10 + 4.5, 8.5 + 3.5 and
 * 8 + 4 mm, a strip 0.41-0.5 of a square, and the ratios below sit in that
 * range. Reading in from the right edge: the frame, a strip, squares; the last
 * column's squares meet the left edge of the frame.
 *
 * The one-page sheet keeps its 680px width: ten columns of ten squares, a
 * model in the top square of each column, 100 squares where the crosshair
 * grid has 80 in about the same height.
 *
 * In the rows layout a kanji's `rows` become columns of ten squares, so it
 * still gets rows × 10 squares and one model per line. A kanji is a vertical
 * strip: a header column on the right (the kanji, its diagram and readings,
 * where a vertical text puts its title), then its columns to the left. Strips
 * fill a band right to left, and two bands fill a page.
 */
export const GENKOU_GEOMETRY = {
  /** The width every sheet prints at: 180mm of A4 between 15mm margins. */
  contentWidthPx: 680,
  /** One-page sheet: 10 columns of 10, 48 + 20 = 68px a column, 680 across. */
  pageColumns: 10,
  pageSquares: 10,
  pageSquarePx: 48,
  pageRubyPx: 20,
  /** Rows layout: 44px squares (11.6mm) with an 18px strip (0.41). */
  squarePx: 44,
  rubyPx: 18,
  squaresPerColumn: 10,
  /** The header column on the right of each kanji's strip. */
  headerWidthPx: 84,
  /** Between two kanji's strips in a band, and between bands. */
  stripGapPx: 10,
  bandGapPx: 12,
  /** For the grid's frame, which overhangs its squares by a fraction of a pixel. */
  borderSlackPx: 2,
} as const;

/** One kanji's strip in the genkōyōshi rows layout: header plus `rows` columns. */
export function genkouStripWidthPx(rows: number): number {
  const g = GENKOU_GEOMETRY;
  return g.headerWidthPx + rows * (g.squarePx + g.rubyPx);
}

/** A band of strips: one column of squares tall. */
export function genkouBandHeightPx(): number {
  const g = GENKOU_GEOMETRY;
  return g.squaresPerColumn * g.squarePx + g.borderSlackPx;
}

/** How many kanji's strips fit side by side in one band. */
export function genkouStripsPerBand(rows: number): number {
  const g = GENKOU_GEOMETRY;
  return Math.max(1, Math.floor((g.contentWidthPx + g.stripGapPx) / (genkouStripWidthPx(rows) + g.stripGapPx)));
}

/** How many bands fit above the credit line. */
export function genkouBandsPerPage(): number {
  const g = GENKOU_GEOMETRY;
  const available = ROWS_GEOMETRY.pageHeightPx - ROWS_GEOMETRY.creditHeightPx;
  return Math.max(1, Math.floor((available + g.bandGapPx) / (genkouBandHeightPx() + g.bandGapPx)));
}

/** The fixed height of one kanji's block in the rows layout. */
export function rowsBlockHeightPx(rows: number): number {
  const g = ROWS_GEOMETRY;
  return g.headerHeightPx + g.headerGapPx + rows * g.rowHeightPx + g.borderSlackPx;
}

/**
 * How many kanji one printed page holds.
 *
 * One, for the page layout. For rows: as many blocks as fit above the credit,
 * with a gap between each pair and none after the last. For rows on
 * genkōyōshi: bands per page times strips per band.
 */
export function kanjiPerPage(options: SheetOptions): number {
  if (options.layout === 'page') return 1;
  if (options.grid === 'genkou') return genkouBandsPerPage() * genkouStripsPerBand(options.rows);
  const g = ROWS_GEOMETRY;
  const available = g.pageHeightPx - g.creditHeightPx;
  return Math.max(1, Math.floor((available + g.blockGapPx) / (rowsBlockHeightPx(options.rows) + g.blockGapPx)));
}

/** Printed pages for `count` kanji in ONE document. */
export function printedPageCount(count: number, options: SheetOptions): number {
  return Math.ceil(count / kanjiPerPage(options));
}

/**
 * How many kanji the builder puts in each print link when a set is over the
 * request cap.
 *
 * For rows, the largest multiple of a page's capacity within the cap. Splitting
 * 171 kanji at exactly 100 with five to a page would end the first document on
 * a page holding none and start the second mid-page; at 100 it ends full.
 */
export function printChunkSize(options: SheetOptions): number {
  if (options.layout === 'page') return MAX_SHEETS_PER_REQUEST;
  const perPage = kanjiPerPage(options);
  return Math.max(perPage, Math.floor(maxKanjiPerRequest(options) / perPage) * perPage);
}

/** A set split into request-sized parts, in order. One part when it fits. */
export function printChunks<T>(items: readonly T[], options: SheetOptions): T[][] {
  const size = printChunkSize(options);
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

/** Printed pages across every part of a split set. */
export function totalPrintedPages(count: number, options: SheetOptions): number {
  return printChunks(Array.from({ length: count }), options).reduce(
    (pages, chunk) => pages + printedPageCount(chunk.length, options),
    0
  );
}
