/**
 * lib/sheets/kanji-sheets.ts
 *
 * Where a printable kanji practice sheet lives — for one character, or for a
 * set of them printed as a single document.
 *
 * The sheets are HTML documents served by `app/api/kanji-sheets/route.ts` and
 * turned into paper or a PDF by the browser's own print dialog. Pages link to
 * them with a plain `<a>`, never `<Link>`: client navigation cannot render an
 * API route's HTML.
 *
 * The caps live here, not in the route, for two reasons. A route module may
 * only export its HTTP handlers — Next type-checks those exports and fails the
 * build on anything else — and the pages that build group links need the same
 * number the route enforces, or they can render a link that answers 400.
 *
 * Client-safe: no kanji data is imported here, so the sheet builder's client
 * island (components/sheets/SheetBuilder.tsx) can share these numbers too.
 */

export const KANJI_SHEETS_PATH = '/api/kanji-sheets';

/** The sheet builder: any set, any layout. A page, so links to it use <Link>. */
export const CUSTOM_SHEETS_PATH = '/free-resources/kanji-sheets/custom';

/**
 * The most sheets one request can print.
 *
 * 20 covers the largest N5 theme (13 characters) with room for a hand-built
 * set — a textbook lesson, a week of homework — while bounding what a single
 * request costs: one KanjiVG fetch per character, and a document that inlines
 * each character's diagram nine times.
 *
 * Over the cap is refused, never truncated. Someone who asked for 25 sheets and
 * was handed 20 would not notice the five that never printed.
 */
export const MAX_SHEETS_PER_REQUEST = 20;

/**
 * The most kanji one `layout=rows` request can print.
 *
 * 100 covers all 82 N5 kanji in one document, which is the set people most
 * often want on paper, and leaves room for a textbook's worth of a level. It is
 * not the page cap above because a rows document costs far less per kanji: the
 * diagram is fetched through the Data Cache the diagram routes share, and it is
 * written into the document once, then referenced from every practice square.
 * Measured against a production build on 2026-10-10: see the header of
 * app/api/kanji-sheets/route.ts.
 *
 * Over the cap is refused, never truncated, for the reason given above. The
 * builder splits a larger set into several print links instead, each inside
 * this number, so a visitor using it never meets the refusal.
 */
export const MAX_ROWS_KANJI_PER_REQUEST = 100;

/**
 * How a set is laid out on paper.
 *
 * `page` is the sheet the site has always printed: one kanji per A4 page, with
 * a large stroke-order reference and an 80-square grid. `rows` stacks several
 * kanji on each page, each with a one-line header and `rows` rows of ten
 * squares.
 */
export const SHEET_LAYOUTS = ['page', 'rows'] as const;
export type SheetLayout = (typeof SHEET_LAYOUTS)[number];

/** Rows of ten squares per kanji, `layout=rows` only. */
export const MIN_ROWS = 1;
export const MAX_ROWS = 8;
export const DEFAULT_ROWS = 2;

/**
 * What the practice squares look like, in either layout.
 *
 * `cross` is the site's square with crosshair guides. `genkou` is genkōyōshi
 * (原稿用紙): plain squares in columns read top to bottom, right to left, each
 * with a narrow ruby column on its right. In the rows layout a kanji's `rows`
 * become columns of ten.
 */
export const SHEET_GRIDS = ['cross', 'genkou'] as const;
export type SheetGrid = (typeof SHEET_GRIDS)[number];

export interface SheetOptions {
  layout: SheetLayout;
  /** Rows per kanji. Meaningful only for `layout: 'rows'`; DEFAULT_ROWS otherwise. */
  rows: number;
  grid: SheetGrid;
}

export const DEFAULT_SHEET_OPTIONS: SheetOptions = { layout: 'page', rows: DEFAULT_ROWS, grid: 'cross' };

/** True for the options a request with none of the new parameters gets. */
export function isDefaultSheetOptions(options: SheetOptions): boolean {
  return options.layout === 'page' && options.grid === 'cross';
}

/** The cap for one request with these options. */
export function maxKanjiPerRequest(options: SheetOptions): number {
  return options.layout === 'rows' ? MAX_ROWS_KANJI_PER_REQUEST : MAX_SHEETS_PER_REQUEST;
}

/** One character's sheet. */
export function kanjiSheetHref(character: string): string {
  return `${KANJI_SHEETS_PATH}?character=${encodeURIComponent(character)}`;
}

/**
 * Several characters' sheets as one document, one sheet per printed page, in
 * the order given.
 *
 * Throws rather than return a link the route would refuse. The pages that call
 * this are prerendered, so an oversized group fails the build — which is the
 * point: a print link that answers 400 on a page built to rank is worse than a
 * loud error in CI.
 */
export function kanjiSheetsHref(characters: readonly string[]): string {
  if (characters.length === 0 || characters.length > MAX_SHEETS_PER_REQUEST) {
    throw new Error(
      `A kanji sheet link takes 1–${MAX_SHEETS_PER_REQUEST} characters, got ${characters.length}: ${characters.join('')}`
    );
  }
  return `${KANJI_SHEETS_PATH}?characters=${encodeURIComponent(characters.join(''))}`;
}

/**
 * A custom set, laid out as asked: the sheet builder's print links.
 *
 * Default options produce exactly the `?characters=` link above, so a set
 * printed one page per kanji lands on the same URL, and the same CDN-cached
 * document, as a group print. A rows link always names `rows`, even at its
 * default, so one set at one size has one URL; `grid` appears only when it is
 * not the default. Throws over the cap, like
 * kanjiSheetsHref: the builder splits a large set before it gets here.
 */
export function customSheetsHref(characters: readonly string[], options: SheetOptions): string {
  const cap = maxKanjiPerRequest(options);
  if (characters.length === 0 || characters.length > cap) {
    throw new Error(`A ${options.layout} sheet link takes 1–${cap} characters, got ${characters.length}`);
  }
  const params = new URLSearchParams({ characters: characters.join('') });
  if (options.layout === 'rows') {
    params.set('layout', 'rows');
    params.set('rows', String(options.rows));
  }
  if (options.grid !== 'cross') params.set('grid', options.grid);
  return `${KANJI_SHEETS_PATH}?${params.toString()}`;
}
