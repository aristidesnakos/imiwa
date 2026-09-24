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
 * The cap lives here, not in the route, for two reasons. A route module may
 * only export its HTTP handlers — Next type-checks those exports and fails the
 * build on anything else — and the pages that build group links need the same
 * number the route enforces, or they can render a link that answers 400.
 */

export const KANJI_SHEETS_PATH = '/api/kanji-sheets';

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
