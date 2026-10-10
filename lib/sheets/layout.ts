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

/** The fixed height of one kanji's block in the rows layout. */
export function rowsBlockHeightPx(rows: number): number {
  const g = ROWS_GEOMETRY;
  return g.headerHeightPx + g.headerGapPx + rows * g.rowHeightPx + g.borderSlackPx;
}

/**
 * How many kanji one printed page holds.
 *
 * One, for the page layout. For rows: as many blocks as fit above the credit,
 * with a gap between each pair and none after the last.
 */
export function kanjiPerPage(options: SheetOptions): number {
  if (options.layout === 'page') return 1;
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
