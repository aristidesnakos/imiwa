/**
 * Validator for the printable kanji practice sheets (`lib/sheets/render.ts`,
 * served by `app/api/kanji-sheets/route.ts`).
 *
 * Run: pnpm validate:sheets            offline, stub diagrams, no network
 *      pnpm validate:sheets --live     also compare against a live deployment
 *      pnpm validate:sheets --live=http://localhost:3000
 *
 * ---------------------------------------------------------------------------
 * Why this exists
 * ---------------------------------------------------------------------------
 *
 * The one-sheet document is a contract with things this repo cannot see:
 * `scripts/download-kanji-sheets.ts` prints it to build the PDF packs, and the
 * CDN holds a day of cached copies. A change to it that nobody meant shows up
 * as a pack that looks subtly different, or not at all. So the default
 * documents, one sheet and several, are held BYTE FOR BYTE to golden fixtures
 * in scripts/fixtures/sheets/. They were recorded from the route's own
 * rendering code before it moved into lib/sheets/render.ts, fed the stub
 * diagrams in stub-kanjivg.ts.
 *
 * The rows layout (several kanji to a page) has no golden fixture: it is new,
 * and what matters about it is structural. For every `rows` from 1 to 8, with
 * 1, 7 and 82 kanji, this asserts that no page holds more than its capacity,
 * no block splits across pages, every page carries exactly one credit line,
 * and the page count is the one lib/sheets/layout.ts promises the builder.
 * Genkōyōshi (grid=genkou) is held the same way, in both layouts: the squares,
 * ruby strips and models on every page are counted, and so are the blank
 * paper's, whose PDFs must exist where the page links them.
 * Every refusal the route makes is asserted by calling its own handler, and
 * every split the builder makes is asserted to pass the route's own parser.
 *
 * `--live` is the check the fixtures cannot make: that the code serving
 * production renders what this code renders. It fetches the sheets for 日 and
 * for 日本人 from a deployment, fetches the same three KanjiVG files from
 * jsDelivr, renders those here and compares. Run it against production before
 * a deploy that touches the renderer, and against `pnpm start` after one.
 * jsDelivr serves the latest KanjiVG release, so a mismatch right after an
 * upstream release can be the data, not the code; the diff says which.
 */

import fs from 'node:fs';
import path from 'node:path';
import { NextRequest } from 'next/server';
import { GET } from '../app/api/kanji-sheets/route';
import type { KanjiWithLevel } from '../lib/constants/kanji-types';
import { N5_KANJI } from '../lib/constants/n5-kanji';
import { N4_KANJI } from '../lib/constants/n4-kanji';
import { PAPER_DOWNLOADS } from '../lib/commerce/links';
import {
  GENKOUYOUSHI_FORMATS,
  GENKOUYOUSHI_FORMAT_IDS,
  genkouyoushiSvg,
  renderGenkouyoushiDocument,
  squareCount,
} from '../lib/sheets/genkouyoushi';
import {
  DEFAULT_SHEET_OPTIONS,
  MAX_ROWS,
  MAX_ROWS_KANJI_PER_REQUEST,
  MAX_SHEETS_PER_REQUEST,
  MIN_ROWS,
  customSheetsHref,
  isDefaultSheetOptions,
  kanjiSheetsHref,
  type SheetOptions,
} from '../lib/sheets/kanji-sheets';
import {
  GENKOU_GEOMETRY,
  genkouBandsPerPage,
  genkouStripsPerBand,
  kanjiPerPage,
  printChunks,
  printedPageCount,
  totalPrintedPages,
} from '../lib/sheets/layout';
import { parseCharacters, parseSheetOptions } from '../lib/sheets/request';
import {
  extractStrokeCount,
  prepareStrokeOrder,
  renderCustomDocument,
  renderMultiSheetDocument,
  renderRowsDocument,
  renderSheetDocument,
  type PreparedSheet,
} from '../lib/sheets/render';
import { stubKanjiVgSource } from './fixtures/sheets/stub-kanjivg';

const FIXTURES = path.join(__dirname, 'fixtures', 'sheets');
const PRODUCTION = 'https://www.michikanji.com';

/** The stub diagrams' stroke counts: the real ones, so a fixture reads true. */
const STUB_STROKES: Record<string, number> = { 日: 4, 本: 5, 人: 2 };

let checks = 0;
let failures = 0;

function section(title: string): void {
  console.log(`\n${title}`);
}

function check(ok: boolean, label: string, detail?: string): void {
  checks++;
  if (ok) {
    console.log(`  ok    ${label}`);
  } else {
    failures++;
    console.log(`  FAIL  ${label}${detail ? `\n        ${detail}` : ''}`);
  }
}

/** Where two documents first differ, with a little context either side. */
function firstDifference(expected: string, actual: string): string {
  let i = 0;
  while (i < expected.length && i < actual.length && expected[i] === actual[i]) i++;
  const around = (s: string) => JSON.stringify(s.slice(Math.max(0, i - 40), i + 40));
  return `first difference at char ${i} (lengths ${expected.length} / ${actual.length})\n        expected ${around(expected)}\n        actual   ${around(actual)}`;
}

function checkIdentical(expected: string, actual: string, label: string): void {
  check(expected === actual, label, expected === actual ? undefined : firstDifference(expected, actual));
}

function n5Entry(character: string): KanjiWithLevel {
  const entry = N5_KANJI.find((k) => k.kanji === character);
  if (!entry) throw new Error(`${character} is not in the N5 list`);
  return { ...entry, level: 'N5' };
}

function prepare(entry: KanjiWithLevel, source: string | null): PreparedSheet {
  const asset = source === null ? null : prepareStrokeOrder(source);
  return {
    kanjiData: entry,
    strokeOrderSvg: asset?.svg ?? null,
    strokeCount: asset ? extractStrokeCount(asset.svg) : null,
    licenceNotice: asset?.notice ?? null,
  };
}

function stubSheet(character: string): PreparedSheet {
  return prepare(n5Entry(character), stubKanjiVgSource(character, STUB_STROKES[character]));
}

function oneSheetDocument(sheet: PreparedSheet): string {
  return renderSheetDocument(sheet.kanjiData, sheet.strokeOrderSvg, sheet.strokeCount, sheet.licenceNotice);
}

function fixture(name: string): string {
  return fs.readFileSync(path.join(FIXTURES, name), 'utf8');
}

function validateGoldenFixtures(): void {
  section('Default documents are byte-identical to the golden fixtures');

  checkIdentical(fixture('one-sheet.html'), oneSheetDocument(stubSheet('日')), 'one sheet: ?character=日');
  checkIdentical(
    fixture('one-sheet-no-diagram.html'),
    oneSheetDocument(prepare(n5Entry('日'), null)),
    'one sheet with KanjiVG unreachable (the degraded, never-cached sheet)'
  );
  checkIdentical(
    fixture('multi-sheet.html'),
    renderMultiSheetDocument(['日', '本', '人'].map(stubSheet)),
    'several sheets: ?characters=日本人'
  );
}

/** Count the non-overlapping occurrences of `needle` in `haystack`. */
function count(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

/** Every N5 kanji with a stub diagram; the stroke count does not matter here. */
const N5_STUB_SHEETS: PreparedSheet[] = N5_KANJI.map((k) =>
  prepare({ ...k, level: 'N5' }, stubKanjiVgSource(k.kanji, 3))
);

function validateRowsLayout(): void {
  section('Rows layout: pagination, blocks, credit lines (rows 1-8 × 1, 7 and 82 kanji)');

  for (let rows = MIN_ROWS; rows <= MAX_ROWS; rows++) {
    const options: SheetOptions = { layout: 'rows', rows, grid: 'cross' };
    const capacity = kanjiPerPage(options);

    for (const n of [1, 7, 82]) {
      const sheets = N5_STUB_SHEETS.slice(0, n);
      const html = renderRowsDocument(sheets, rows);
      const label = `rows=${rows}, ${n} kanji`;
      const problems: string[] = [];

      // Everything after the first page box, split at each page box.
      const pages = html.split('<div class="page-container rows-page">').slice(1);
      const expectedPages = printedPageCount(n, options);
      if (pages.length !== expectedPages) problems.push(`${pages.length} pages, the formula says ${expectedPages}`);

      const kanjiInOrder: string[] = [];
      pages.forEach((page, i) => {
        // A page's own markup ends at its closing </div> before the next box;
        // the last also carries the document end, which holds no block.
        const blocks = count(page, '<section class="rows-block">');
        if (blocks > capacity) problems.push(`page ${i + 1} holds ${blocks} blocks, capacity ${capacity}`);
        if (blocks === 0) problems.push(`page ${i + 1} holds no block`);
        if (count(page, '</section>') !== blocks) problems.push(`page ${i + 1} opens ${blocks} blocks and closes ${count(page, '</section>')}`);
        if (count(page, 'class="sheet-credit"') !== 1) problems.push(`page ${i + 1} has ${count(page, 'class="sheet-credit"')} credit lines`);
        if (i < pages.length - 1 && blocks !== capacity) problems.push(`page ${i + 1} is not full but is not the last`);
        for (const match of page.matchAll(/<div class="rows-kanji">([^<]*)<\/div>/g)) kanjiInOrder.push(match[1]);

        for (const block of page.split('<section class="rows-block">').slice(1)) {
          const rowsInBlock = count(block, '<tr>');
          const squares = count(block, '<td class="grid-cell');
          const models = count(block, '<td class="grid-cell with-guide"><svg');
          if (rowsInBlock !== rows || squares !== rows * 10 || models !== rows) {
            problems.push(`a block has ${rowsInBlock} rows, ${squares} squares, ${models} models`);
          }
        }
      });

      if (kanjiInOrder.join('') !== sheets.map((sh) => sh.kanjiData.kanji).join('')) {
        problems.push('the kanji are not each printed once, in the order asked for');
      }
      if (count(html, '<symbol id="kvg-') !== n) problems.push(`${count(html, '<symbol id="kvg-')} diagram symbols for ${n} kanji`);

      check(problems.length === 0, `${label}: ${pages.length} page${pages.length === 1 ? "" : "s"} of up to ${capacity}`, problems.slice(0, 3).join('; '));
    }
  }

  // Credit on every page even when KanjiVG was unreachable for some kanji, and
  // the block keeps its shape: no symbol, no model, same squares.
  const degraded = renderRowsDocument(
    [prepare(n5Entry('日'), null), ...N5_STUB_SHEETS.slice(1, 8)],
    1
  );
  check(
    count(degraded, '<symbol id="kvg-') === 7 &&
      count(degraded, '<td class="grid-cell') === 80 &&
      count(degraded, 'class="sheet-credit"') === printedPageCount(8, { layout: 'rows', rows: 1, grid: 'cross' }),
    'a kanji whose diagram is missing keeps its block, without a model'
  );

  check(
    renderRowsDocument(N5_STUB_SHEETS.slice(0, 1), 1).includes('stroke numbers enlarged'),
    'the credit says the stroke numbers were enlarged'
  );
}

function validateGenkou(): void {
  const g = GENKOU_GEOMETRY;

  section('Genkōyōshi, one page per kanji: 10 columns of 10, a ruby strip and a model per column');
  for (const n of [1, 7, 20]) {
    const sheets = N5_STUB_SHEETS.slice(0, n);
    const html = renderCustomDocument(sheets, { layout: 'page', rows: 2, grid: 'genkou' });
    const pages = html.split('<div class="page-container">').slice(1);
    const problems: string[] = [];
    if (pages.length !== n) problems.push(`${pages.length} pages for ${n} kanji`);
    pages.forEach((page, i) => {
      const squares = count(page, 'class="gk-sq"');
      const rubies = count(page, 'class="gk-ruby"');
      const models = count(page, 'class="gk-model"');
      if (squares !== g.pageColumns * g.pageSquares || rubies !== g.pageColumns || models !== g.pageColumns) {
        problems.push(`page ${i + 1}: ${squares} squares, ${rubies} ruby strips, ${models} models`);
      }
      if (count(page, 'class="sheet-credit"') !== 1) problems.push(`page ${i + 1} has ${count(page, 'class="sheet-credit"')} credit lines`);
      if (count(page, 'grid-cell') !== 0) problems.push(`page ${i + 1} still has crosshair cells`);
    });
    check(problems.length === 0, `${n} kanji: ${pages.length} pages of ${g.pageColumns * g.pageSquares} squares`, problems.slice(0, 3).join('; '));
  }

  section('Genkōyōshi in rows: strips in bands, right to left (rows 1-8 × 1, 7 and 82 kanji)');
  for (let rows = MIN_ROWS; rows <= MAX_ROWS; rows++) {
    const options: SheetOptions = { layout: 'rows', rows, grid: 'genkou' };
    const capacity = kanjiPerPage(options);
    const perBand = genkouStripsPerBand(rows);
    if (capacity !== perBand * genkouBandsPerPage()) {
      check(false, `rows=${rows}: capacity is bands × strips`);
      continue;
    }

    for (const n of [1, 7, 82]) {
      const sheets = N5_STUB_SHEETS.slice(0, n);
      const html = renderCustomDocument(sheets, options);
      const pages = html.split('<div class="page-container rows-page">').slice(1);
      const problems: string[] = [];
      if (pages.length !== printedPageCount(n, options)) problems.push(`${pages.length} pages, the formula says ${printedPageCount(n, options)}`);

      const kanjiInOrder: string[] = [];
      pages.forEach((page, i) => {
        const strips = count(page, '<section class="gk-strip">');
        const bands = page.split('<div class="gk-band">').slice(1);
        if (strips > capacity) problems.push(`page ${i + 1} holds ${strips} strips, capacity ${capacity}`);
        if (i < pages.length - 1 && strips !== capacity) problems.push(`page ${i + 1} is not full but is not the last`);
        if (bands.length > genkouBandsPerPage()) problems.push(`page ${i + 1} has ${bands.length} bands`);
        for (const band of bands) {
          if (count(band, '<section class="gk-strip">') > perBand) problems.push(`a band holds ${count(band, '<section class="gk-strip">')} strips, room for ${perBand}`);
        }
        if (count(page, '</section>') !== strips) problems.push(`page ${i + 1} opens ${strips} strips and closes ${count(page, '</section>')}`);
        if (count(page, 'class="gk-sq"') !== strips * rows * 10) problems.push(`page ${i + 1}: ${count(page, 'class="gk-sq"')} squares for ${strips} kanji`);
        if (count(page, 'class="gk-ruby"') !== strips * rows) problems.push(`page ${i + 1}: ${count(page, 'class="gk-ruby"')} ruby strips for ${strips} kanji`);
        if (count(page, 'class="gk-model"') !== strips * rows) problems.push(`page ${i + 1}: ${count(page, 'class="gk-model"')} models for ${strips} kanji`);
        if (count(page, 'class="sheet-credit"') !== 1) problems.push(`page ${i + 1} has ${count(page, 'class="sheet-credit"')} credit lines`);
        for (const match of page.matchAll(/<div class="gk-kanji">([^<]*)<\/div>/g)) kanjiInOrder.push(match[1]);
      });
      if (kanjiInOrder.join('') !== sheets.map((sh) => sh.kanjiData.kanji).join('')) {
        problems.push('the kanji are not each printed once, in the order asked for');
      }
      check(
        problems.length === 0,
        `rows=${rows}, ${n} kanji: ${pages.length} page${pages.length === 1 ? '' : 's'} of up to ${capacity} (${perBand} a band)`,
        problems.slice(0, 3).join('; ')
      );
    }
  }

  section('Blank genkōyōshi paper: the squares, the strips, the PDFs');
  const expected = { standard: { squares: 400, rubies: 20, centre: 1 }, large: { squares: 120, rubies: 12, centre: 0 } };
  for (const id of GENKOUYOUSHI_FORMAT_IDS) {
    const format = GENKOUYOUSHI_FORMATS[id];
    const svg = genkouyoushiSvg(format);
    const want = expected[id];
    check(
      squareCount(format) === want.squares &&
        count(svg, 'class="gk-sq"') === want.squares &&
        count(svg, 'class="gk-ruby"') === want.rubies &&
        count(svg, 'class="gk-centre"') === want.centre,
      `${id}: ${count(svg, 'class="gk-sq"')} squares, ${count(svg, 'class="gk-ruby"')} ruby strips, ${want.centre ? 'a' : 'no'} centre column`
    );
    const document = renderGenkouyoushiDocument(id);
    check(document.includes('michikanji.com') && !document.includes('KanjiVG'), `${id}: the document credits the site and no diagram`);
    const pdf = path.join(__dirname, '..', 'public', PAPER_DOWNLOADS[id]);
    check(fs.existsSync(pdf) && fs.statSync(pdf).size > 1000, `${id}: ${PAPER_DOWNLOADS[id]} exists (pnpm sheets:genkouyoushi-pdfs makes it)`);
  }
}

/** The route's handler, called in-process. Only ever for requests it refuses before fetching. */
async function routeStatus(query: string): Promise<{ status: number; body: string }> {
  const response = await GET(new NextRequest(`http://localhost/api/kanji-sheets?${query}`));
  return { status: response.status, body: await response.text() };
}

function enc(value: string): string {
  return encodeURIComponent(value);
}

async function validateRequests(): Promise<void> {
  section('Requests: every refusal names its parameter; caps refuse, never truncate');

  const n5 = N5_KANJI.map((k) => k.kanji);
  const n4 = N4_KANJI.map((k) => k.kanji);
  const twentyOne = n5.slice(0, MAX_SHEETS_PER_REQUEST + 1).join('');
  const overRowsCap = [...n5, ...n4].slice(0, MAX_ROWS_KANJI_PER_REQUEST + 1).join('');

  const refusals: { query: string; status: number; message: string }[] = [
    { query: `characters=${enc('日')}&layout=grid`, status: 400, message: 'Unknown layout "grid": use page or rows' },
    { query: `characters=${enc('日')}&layout=`, status: 400, message: 'Unknown layout "": use page or rows' },
    { query: `characters=${enc('日')}&grid=lined`, status: 400, message: 'Unknown grid "lined": use cross or genkou' },
    { query: `characters=${enc('日')}&layout=rows&grid=`, status: 400, message: 'Unknown grid "": use cross or genkou' },
    { query: `characters=${enc('日')}&grid=genkou&rows=3`, status: 400, message: 'rows only applies with layout=rows' },
    { query: `characters=${enc(twentyOne)}&grid=genkou`, status: 400, message: `Too many kanji: one request prints at most ${MAX_SHEETS_PER_REQUEST} sheets` },
    { query: `characters=${enc('日')}&rows=2`, status: 400, message: 'rows only applies with layout=rows' },
    { query: `characters=${enc('日')}&layout=page&rows=2`, status: 400, message: 'rows only applies with layout=rows' },
    { query: `character=${enc('日')}&rows=2`, status: 400, message: 'rows only applies with layout=rows' },
    ...['0', '9', 'two', '2.5', '', ' 2', '02x'].map((rows) => ({
      query: `characters=${enc('日')}&layout=rows&rows=${enc(rows)}`,
      status: 400,
      message: `rows must be a whole number from ${MIN_ROWS} to ${MAX_ROWS}`,
    })),
    { query: `characters=${enc(twentyOne)}`, status: 400, message: `Too many kanji: one request prints at most ${MAX_SHEETS_PER_REQUEST} sheets` },
    { query: `characters=${enc(twentyOne)}&layout=page`, status: 400, message: `Too many kanji: one request prints at most ${MAX_SHEETS_PER_REQUEST} sheets` },
    {
      query: `characters=${enc(overRowsCap)}&layout=rows&rows=1`,
      status: 400,
      message: `Too many kanji: one request prints at most ${MAX_ROWS_KANJI_PER_REQUEST} kanji with layout=rows`,
    },
    { query: `characters=${enc('日住')}&layout=rows`, status: 400, message: '"住" (U+4F4F) is not a kanji in our JLPT N5-N1 dataset' },
    { query: `characters=${enc('日 本')}&layout=rows`, status: 400, message: '" " (U+0020) is not a kanji in our JLPT N5-N1 dataset' },
    { query: 'characters=&layout=rows', status: 400, message: 'Missing characters parameter' },
    { query: `character=${enc('日')}&characters=${enc('本')}&layout=rows`, status: 400, message: 'Pass character or characters, not both' },
    { query: `character=${enc('住')}&layout=rows`, status: 404, message: 'Kanji "住" is not in our JLPT N5-N1 dataset' },
    // The default path's own refusals, unchanged.
    { query: '', status: 400, message: 'Missing character parameter' },
    { query: `character=${enc('住')}`, status: 404, message: 'Kanji "住" is not in our JLPT N5-N1 dataset' },
    { query: `characters=${enc('日x')}`, status: 400, message: '"x" (U+0078) is not a kanji in our JLPT N5-N1 dataset' },
  ];

  for (const { query, status, message } of refusals) {
    const response = await routeStatus(query);
    check(
      response.status === status && response.body === message,
      `${status} for ?${decodeURIComponent(query).slice(0, 60)}`,
      `got ${response.status} "${response.body}"`
    );
  }

  const lookup = new Map([...N4_KANJI, ...N5_KANJI].map((k) => [k.kanji, k]));
  const atRowsCap = [...n5, ...n4].slice(0, MAX_ROWS_KANJI_PER_REQUEST).join('');
  const parsedAtCap = parseCharacters(atRowsCap, lookup, { layout: 'rows', rows: 1, grid: 'cross' });
  check(
    'kanji' in parsedAtCap && parsedAtCap.kanji.length === MAX_ROWS_KANJI_PER_REQUEST,
    `exactly ${MAX_ROWS_KANJI_PER_REQUEST} kanji with layout=rows is accepted`
  );
  const allN5 = parseCharacters(n5.join(''), lookup, { layout: 'rows', rows: 1, grid: 'genkou' });
  check('kanji' in allN5 && allN5.kanji.length === n5.length, `all ${n5.length} N5 kanji fit one rows request`);

  const explicitDefault = parseSheetOptions(new URLSearchParams('layout=page&grid=cross'));
  check(
    !('error' in explicitDefault) && isDefaultSheetOptions(explicitDefault) && isDefaultSheetOptions(DEFAULT_SHEET_OPTIONS),
    'layout=page&grid=cross is the default document, not a new one'
  );
  const genkouPage = parseSheetOptions(new URLSearchParams('grid=genkou'));
  check(
    !('error' in genkouPage) && genkouPage.layout === 'page' && genkouPage.grid === 'genkou' && !isDefaultSheetOptions(genkouPage),
    'grid=genkou alone is one page per kanji on genkōyōshi'
  );
  const rowsDefault = parseSheetOptions(new URLSearchParams('layout=rows'));
  check(!('error' in rowsDefault) && rowsDefault.rows === 2, 'layout=rows without rows means 2 rows');

  section("The builder's links: never a refusal, never a lost kanji");

  check(
    customSheetsHref(['日', '本'], DEFAULT_SHEET_OPTIONS) === kanjiSheetsHref(['日', '本']),
    'a one-page-per-kanji set links to the same URL as a group print (one CDN entry)'
  );
  check(
    customSheetsHref(['日'], { layout: 'rows', rows: 2, grid: 'cross' }) === `/api/kanji-sheets?characters=${enc('日')}&layout=rows&rows=2`,
    'a rows link names layout and rows, and leaves out the default grid'
  );
  check(
    customSheetsHref(['日'], { layout: 'page', rows: 2, grid: 'genkou' }) === `/api/kanji-sheets?characters=${enc('日')}&grid=genkou`,
    'a genkōyōshi link names the grid'
  );

  // The largest sets the builder offers: every level, and the whole dataset.
  const everything = [...n5, ...n4];
  const allOptions: SheetOptions[] = [
    DEFAULT_SHEET_OPTIONS,
    { layout: 'page', rows: 2, grid: 'genkou' },
    ...(['cross', 'genkou'] as const).flatMap((grid) =>
      Array.from({ length: MAX_ROWS }, (_, i) => ({ layout: 'rows' as const, rows: i + 1, grid }))
    ),
  ];
  for (const options of allOptions) {
    const chunks = printChunks(everything, options);
    const problems: string[] = [];
    if (chunks.flat().join('') !== everything.join('')) problems.push('the parts do not add up to the set');
    chunks.forEach((chunk, i) => {
      const parsed = parseCharacters(chunk.join(''), lookup, options);
      if ('error' in parsed) problems.push(`part ${i + 1}: ${parsed.error}`);
      if (i < chunks.length - 1 && printedPageCount(chunk.length, options) * kanjiPerPage(options) !== chunk.length) {
        problems.push(`part ${i + 1} ends on a part-filled page`);
      }
    });
    if (totalPrintedPages(everything.length, options) !== chunks.reduce((p, c) => p + printedPageCount(c.length, options), 0)) {
      problems.push('the page total disagrees with the parts');
    }
    check(
      problems.length === 0,
      `${everything.length} kanji, ${options.layout}${options.layout === 'rows' ? ` rows=${options.rows}` : ''} ${options.grid}: ${chunks.length} links, each accepted`,
      problems.slice(0, 3).join('; ')
    );
  }
}

async function fetchText(url: string): Promise<{ status: number; text: string }> {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KanjiApp/1.0)' },
  });
  return { status: response.status, text: await response.text() };
}

async function upstreamSheet(character: string): Promise<PreparedSheet> {
  const hex = (character.codePointAt(0) ?? 0).toString(16).padStart(5, '0');
  const { status, text } = await fetchText(`https://cdn.jsdelivr.net/gh/KanjiVG/kanjivg/kanji/${hex}.svg`);
  if (status !== 200) throw new Error(`jsDelivr answered ${status} for ${hex}.svg`);
  return prepare(n5Entry(character), text);
}

async function validateLive(base: string): Promise<void> {
  section(`A live deployment renders what this code renders (${base})`);

  const [day, book, person] = await Promise.all(['日', '本', '人'].map(upstreamSheet));
  const sheetsPath = `${base.replace(/\/$/, '')}/api/kanji-sheets`;

  const one = await fetchText(`${sheetsPath}?character=${encodeURIComponent('日')}`);
  check(one.status === 200, `?character=日 answers 200 (got ${one.status})`);
  checkIdentical(one.text, oneSheetDocument(day), '?character=日 is byte-identical');

  const multi = await fetchText(`${sheetsPath}?characters=${encodeURIComponent('日本人')}`);
  check(multi.status === 200, `?characters=日本人 answers 200 (got ${multi.status})`);
  checkIdentical(multi.text, renderMultiSheetDocument([day, book, person]), '?characters=日本人 is byte-identical');
}

async function main(): Promise<void> {
  validateGoldenFixtures();
  validateRowsLayout();
  validateGenkou();
  await validateRequests();

  const live = process.argv.find((arg) => arg === '--live' || arg.startsWith('--live='));
  if (live) {
    await validateLive(live.includes('=') ? live.slice('--live='.length) : PRODUCTION);
  }

  console.log(`\n${checks - failures}/${checks} checks passed`);
  if (failures > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
