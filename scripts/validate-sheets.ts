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
import type { KanjiWithLevel } from '../lib/constants/kanji-types';
import { N5_KANJI } from '../lib/constants/n5-kanji';
import {
  extractStrokeCount,
  prepareStrokeOrder,
  renderMultiSheetDocument,
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
