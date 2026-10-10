/**
 * lib/sheets/request.ts
 *
 * What a request to /api/kanji-sheets asks for, or why it was refused. The
 * route calls these and turns an `error` into a 400; scripts/validate-sheets.ts
 * calls them directly to hold every refusal in place.
 *
 * The API is strict on purpose. The sheet builder cleans what a visitor typed
 * before it builds a link, so anything malformed reaching here came from a
 * hand-edited URL, and the honest answer to that is a message naming the
 * parameter, not a guess. Above all a character is never silently dropped: a
 * shorter stack of paper than was asked for carries nothing to say so.
 *
 * Server-side by use, not by necessity: nothing here imports kanji data. The
 * caller passes the lookup in, keyed by character.
 */

import {
  DEFAULT_ROWS,
  DEFAULT_SHEET_OPTIONS,
  MAX_ROWS,
  MAX_SHEETS_PER_REQUEST,
  MIN_ROWS,
  SHEET_GRIDS,
  SHEET_LAYOUTS,
  maxKanjiPerRequest,
  type SheetGrid,
  type SheetLayout,
  type SheetOptions,
} from './kanji-sheets';

/**
 * The layout parameters, defaulted, or the first thing wrong with them.
 *
 * A request naming none of them gets DEFAULT_SHEET_OPTIONS, and so does one
 * naming only their default values: `layout=page` or `grid=cross` is today's
 * sheet, byte for byte, not a new document that happens to look like it.
 */
export function parseSheetOptions(params: URLSearchParams): SheetOptions | { error: string } {
  const layoutParam = params.get('layout');
  const rowsParam = params.get('rows');
  const gridParam = params.get('grid');

  let layout: SheetLayout = DEFAULT_SHEET_OPTIONS.layout;
  if (layoutParam !== null) {
    if (!(SHEET_LAYOUTS as readonly string[]).includes(layoutParam)) {
      return { error: `Unknown layout "${layoutParam}": use ${SHEET_LAYOUTS.join(' or ')}` };
    }
    layout = layoutParam as SheetLayout;
  }

  // Valid with either layout.
  let grid: SheetGrid = DEFAULT_SHEET_OPTIONS.grid;
  if (gridParam !== null) {
    if (!(SHEET_GRIDS as readonly string[]).includes(gridParam)) {
      return { error: `Unknown grid "${gridParam}": use ${SHEET_GRIDS.join(' or ')}` };
    }
    grid = gridParam as SheetGrid;
  }

  if (rowsParam === null) return { layout, rows: DEFAULT_ROWS, grid };

  if (layout !== 'rows') {
    return { error: 'rows only applies with layout=rows' };
  }
  // Digits only: Number() would also take "2.0", "0x2", " 2" and "1e0".
  if (!/^\d+$/.test(rowsParam) || Number(rowsParam) < MIN_ROWS || Number(rowsParam) > MAX_ROWS) {
    return { error: `rows must be a whole number from ${MIN_ROWS} to ${MAX_ROWS}` };
  }
  return { layout, rows: Number(rowsParam), grid };
}

/**
 * The `characters` value as an ordered, de-duplicated list of entries — or why
 * it was refused.
 *
 * `for…of` walks a string by code point, never by UTF-16 unit, for the reason
 * the KanjiVG fetch uses codePointAt: split by unit, a character above U+FFFF
 * is two lone surrogates, neither of which is in the data, and a request
 * naming a real kanji would be refused.
 *
 * Nothing is trimmed or normalised. A space, a comma or a variation selector is
 * a code point the data does not contain, so it is refused like any other — the
 * one-character path accepts exactly what the lookup holds, and so does this.
 *
 * The cap is the one for the requested layout. The page layout keeps its
 * original wording, so a request without the new parameters is refused in
 * exactly the words it always was.
 */
export function parseCharacters<T>(
  value: string,
  lookup: ReadonlyMap<string, T>,
  options: SheetOptions
): { kanji: T[] } | { error: string } {
  const cap = maxKanjiPerRequest(options);
  const kanji: T[] = [];
  const seen = new Set<string>();

  for (const char of value) {
    if (seen.has(char)) continue;

    const entry = lookup.get(char);
    if (!entry) {
      // The code point as well as the character: the offender is often
      // invisible (a space, a zero-width joiner) or renders as a box.
      const codePoint = (char.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, '0');
      return { error: `"${char}" (U+${codePoint}) is not a kanji in our JLPT N5-N1 dataset` };
    }

    seen.add(char);
    kanji.push(entry);

    if (kanji.length > cap) {
      return {
        error:
          options.layout === 'page'
            ? `Too many kanji: one request prints at most ${MAX_SHEETS_PER_REQUEST} sheets`
            : `Too many kanji: one request prints at most ${cap} kanji with layout=rows`,
      };
    }
  }

  if (kanji.length === 0) {
    return { error: 'Missing characters parameter' };
  }

  return { kanji };
}
