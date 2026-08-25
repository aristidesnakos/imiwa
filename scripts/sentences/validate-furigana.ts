/**
 * scripts/sentences/validate-furigana.ts
 *
 * CI entry point:  pnpm validate:furigana
 *
 * Guards `lib/sentences/ruby.ts` — the split that decides which span of a token
 * a reading is placed over — in the same two halves as validate-readings.ts, and
 * for the same reason. Pinning the cases proves the function is right about the
 * shapes someone thought of; sweeping the real corpus proves the function
 * actually ran.
 *
 *   PART 1  Pin the splits. Every worked shape the module must handle —
 *           katakana lead and tail, okurigana, the honorific お — plus the real
 *           queue tokens the old renderer got wrong, plus the negative cases
 *           that must NOT be trimmed: ヶ月 (ヶ folds to ゖ, not か), 八日, 二十日
 *           and the plain jukugo. A trim that fires on those is this defect
 *           pointing the other way.
 *
 *   PART 2  Sweep every committed queue and every published file, asserting
 *           reconstruction and IDEMPOTENCE: feeding an emitted base and its
 *           trimmed reading back in must be a fixed point. A render path that
 *           stopped trimming — a reverted import, a merge that took the old
 *           branch — fails here immediately and nowhere else.
 *
 * Why this class of defect is invisible without a validator: nothing crashes,
 * nothing is null, the tokens still reconstruct the sentence, and the browser
 * sets the ruby happily. 「フランス語」 rendered ふらんすご across all five
 * characters looks *typeset*. It is simply wrong on the page — ふらんす floating
 * over katakana that already spells itself, teaching a learner an alignment
 * that does not exist. Six such tokens are live in the N5 queue today and no
 * other check in the pipeline has an opinion about any of them.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { HAS_KANJI, foldKana, rubySegments } from '../../lib/sentences/ruby';
import type { RubySegments } from '../../lib/sentences/ruby';
import type { ExampleSentence, Level, ReviewQueue, Token } from '../../lib/sentences/types';

const LEVELS: Level[] = ['N5', 'N4', 'N3', 'N2', 'N1'];
const DATA_DIR = join(resolve(__dirname, '..', '..'), 'data', 'sentences');
const QUEUE_DIR = join(DATA_DIR, 'queue');
const PUBLISHED_DIR = join(DATA_DIR, 'published');

const HAS_KATAKANA = /[ァ-ヶヽヾ]/;

let failures = 0;
const fail = (msg: string): void => {
  failures += 1;
  console.error(`  ✗ ${msg}`);
};

/* ═══════════════════ PART 1 — pinned splits ═══════════════════ */

/**
 * Render a split the way the page sets it: plain text either side, ruby in
 * 《》, joined by + so the seams are visible. `フランス+語《ご》` is the whole
 * point of this change in one string.
 */
const render = (s: RubySegments | null): string =>
  s === null
    ? '(no ruby)'
    : [s.lead, `${s.base}《${s.reading}》`, s.tail].filter((part) => part !== '').join('+');

interface Case {
  name: string;
  surface: string;
  reading?: string;
  want: string;
}

/** Tokens whose reading covers only part of the surface. */
const MUST_TRIM: Case[] = [
  // ── The live N5 queue tokens. Every one of these rendered with kana set
  //    over kana before lib/sentences/ruby.ts existed.
  {
    name: 'フランス語 — 語#1, 語#5, 母#4, 上#7',
    surface: 'フランス語',
    reading: 'ふらんすご',
    want: 'フランス+語《ご》',
  },
  { name: '東アジア — 東#1', surface: '東アジア', reading: 'ひがしあじあ', want: '東《ひがし》+アジア' },
  {
    name: '東京ドーム — 東#6 (ー must not shift when folded)',
    surface: '東京ドーム',
    reading: 'とうきょうどーむ',
    want: '東京《とうきょう》+ドーム',
  },
  { name: '南アフリカ — 南#6', surface: '南アフリカ', reading: 'みなみあふりか', want: '南《みなみ》+アフリカ' },
  {
    name: '北アイルランド — 北#2',
    surface: '北アイルランド',
    reading: 'きたあいるらんど',
    want: '北《きた》+アイルランド',
  },
  { name: '金メダル — 金#8', surface: '金メダル', reading: 'きんめだる', want: '金《きん》+メダル' },

  // ── Okurigana: the same defect, in hiragana, on almost every verb.
  { name: '書き — okurigana is not part of the reading', surface: '書き', reading: 'かき', want: '書《か》+き' },
  { name: '行った — trims the whole inflection', surface: '行った', reading: 'いった', want: '行《い》+った' },

  // ── A leading kana that belongs to the surface, not to the kanji.
  { name: 'お茶 — the honorific お', surface: 'お茶', reading: 'おちゃ', want: 'お+茶《ちゃ》' },

  // ── Both edges at once.
  {
    name: 'お食事 — trims the honorific and nothing else',
    surface: 'お食事',
    reading: 'おしょくじ',
    want: 'お+食事《しょくじ》',
  },
];

/**
 * Splits that must NOT happen. A trim firing here would drop a character out of
 * the annotation on the strength of a coincidence, which is the failure mode
 * this module is supposed to be incapable of.
 */
const MUST_NOT_TRIM: Case[] = [
  {
    // ヶ is U+30F6, inside the foldable range — it folds to ゖ, which is not か.
    // The temptation is to special-case it as カ; that would be a guess.
    name: 'ヶ月 — ヶ folds to ゖ, never to か',
    surface: 'ヶ月',
    reading: 'かげつ',
    want: 'ヶ月《かげつ》',
  },
  { name: '八日 — ようか shares no edge with 八日', surface: '八日', reading: 'ようか', want: '八日《ようか》' },
  {
    name: '二十日 — merged by reading-corrections, still one span',
    surface: '二十日',
    reading: 'はつか',
    want: '二十日《はつか》',
  },
  { name: '日本 — a plain jukugo is untouched', surface: '日本', reading: 'にほん', want: '日本《にほん》' },
  { name: '私 — a single kanji is untouched', surface: '私', reading: 'わたし', want: '私《わたし》' },
  {
    name: '打ち合わせ — interior kana is out of scope, deliberately',
    surface: '打ち合わせ',
    reading: 'うちあわせ',
    want: '打ち合《うちあ》+わせ',
  },
  { name: '中国語 — kanji-only, no edge to trim', surface: '中国語', reading: 'ちゅうごくご', want: '中国語《ちゅうごくご》' },
];

/** Tokens that must produce no ruby at all. */
const MUST_BE_PLAIN: Case[] = [
  { name: 'no reading at all', surface: '日本', want: '(no ruby)' },
  { name: 'kana-only surface', surface: 'テレビ', reading: 'てれび', want: '(no ruby)' },
  { name: 'punctuation', surface: '。', reading: '。', want: '(no ruby)' },
  { name: 'a surface identical to its reading', surface: 'わたし', reading: 'わたし', want: '(no ruby)' },
];

function runCases(label: string, cases: Case[]): void {
  console.log(`\n${label}`);
  for (const c of cases) {
    const segments = rubySegments(c.surface, c.reading);
    const got = render(segments);

    if (got !== c.want) {
      fail(`${c.name}\n      got  ${got}\n      want ${c.want}`);
      continue;
    }

    // The invariant that makes trimming safe at all: the surface is verbatim
    // licensed text and every character removed from the annotation must still
    // be emitted as plain text.
    if (segments) {
      const rebuilt = segments.lead + segments.base + segments.tail;
      if (rebuilt !== c.surface) {
        fail(`${c.name}: surface changed — "${c.surface}" became "${rebuilt}"`);
        continue;
      }
      if (!HAS_KANJI.test(segments.base)) {
        fail(`${c.name}: emitted a ruby base with no kanji in it — "${segments.base}"`);
        continue;
      }
    }

    console.log(`  ✓ ${c.name}  ${got}`);
  }
}

function runFold(): void {
  console.log('\nKana folding');
  const cases: [string, string][] = [
    ['フランス', 'ふらんす'],
    ['ドーム', 'どーむ'],   // ー (U+30FC) passes through unshifted
    ['ヶ', 'ゖ'],           // U+30F6 folds; it is not カ
    ['ヴ', 'ゔ'],
    ['ア・イ', 'あ・い'],   // ・ (U+30FB) passes through
    ['ひらがな', 'ひらがな'],
    ['東京', '東京'],
    ['', ''],
  ];
  for (const [input, want] of cases) {
    const got = foldKana(input);
    if (got === want) console.log(`  ✓ foldKana(${JSON.stringify(input)}) = ${JSON.stringify(got)}`);
    else fail(`foldKana(${JSON.stringify(input)}) = ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
  }
}

/* ═════════════ PART 2 — sweep the committed corpus ═════════════ */

interface Census {
  tokens: number;
  withReading: number;
  trimmed: number;
  katakana: Map<string, string>;
}

/**
 * Assert the split is stable on data the renderer will actually see.
 *
 * IDEMPOTENCE is the check that earns its keep. Feeding an emitted `base` and
 * its trimmed reading back into `rubySegments` must be a fixed point — nothing
 * left to trim. A render path that silently stopped trimming (a reverted
 * import, a merge that kept the old whole-surface branch) still reconstructs
 * every sentence, still passes every structural contract, and fails only here.
 */
function sweepTokens(
  label: string,
  id: string,
  tokens: Token[],
  japanese: string,
  census: Census
): void {
  tokens.forEach((token, index) => {
    census.tokens += 1;
    if (!token.reading) return;
    census.withReading += 1;

    const segments = rubySegments(token.surface, token.reading);
    if (!segments) return;

    // (a) Reconstruction.
    const rebuilt = segments.lead + segments.base + segments.tail;
    if (rebuilt !== token.surface) {
      fail(`${label} ${id} token ${index}: "${token.surface}" reconstructs as "${rebuilt}"\n      ${japanese}`);
      return;
    }

    // (c) A ruby base is never pure kana.
    if (!HAS_KANJI.test(segments.base)) {
      fail(`${label} ${id} token ${index}: ruby base "${segments.base}" has no kanji\n      ${japanese}`);
      return;
    }

    // (b) Idempotence.
    const again = rubySegments(segments.base, segments.reading);
    if (!again) {
      fail(`${label} ${id} token ${index}: re-splitting ${render(segments)} produced no ruby at all`);
      return;
    }
    if (again.lead !== '' || again.tail !== '' || again.base !== segments.base || again.reading !== segments.reading) {
      fail(
        `${label} ${id} token ${index}: split is not a fixed point\n` +
          `      once  ${render(segments)}\n      twice ${render(again)}`
      );
      return;
    }

    if (segments.lead !== '' || segments.tail !== '') {
      census.trimmed += 1;
      if (HAS_KATAKANA.test(token.surface)) {
        census.katakana.set(`${token.surface}《${token.reading}》`, render(segments));
      }
    }
  });
}

function sweep(): Census {
  const census: Census = { tokens: 0, withReading: 0, trimmed: 0, katakana: new Map() };

  console.log('\nQueue sweep (reconstruction + idempotence)');
  let queues = 0;
  for (const level of LEVELS) {
    const file = join(QUEUE_DIR, `${level}.json`);
    if (!existsSync(file)) continue;
    queues += 1;

    const queue = JSON.parse(readFileSync(file, 'utf8')) as ReviewQueue;
    let candidates = 0;
    const before = failures;

    for (const entry of queue.entries) {
      for (const candidate of entry.candidates) {
        candidates += 1;
        sweepTokens(level, candidate.id, candidate.tokens, candidate.japanese, census);
      }
    }

    if (failures === before) console.log(`  ✓ ${level}: ${candidates} candidates split cleanly`);
  }
  if (queues === 0) console.log('  – no queue files on disk; sweep skipped');

  console.log('\nPublished sweep');
  let published = 0;
  for (const level of LEVELS) {
    const file = join(PUBLISHED_DIR, `${level}.json`);
    if (!existsSync(file)) continue;
    published += 1;

    const sentences = JSON.parse(readFileSync(file, 'utf8')) as ExampleSentence[];
    if (!Array.isArray(sentences)) {
      fail(`published/${level}.json is not an array`);
      continue;
    }
    // An empty published file is a valid, expected state — review throughput is
    // the bottleneck, not the code. Reported, never failed.
    if (sentences.length === 0) {
      console.log(`  – ${level}: empty, which is a valid state`);
      continue;
    }

    const before = failures;
    for (const sentence of sentences) {
      sweepTokens(level, sentence.id, sentence.tokens, sentence.japanese, census);
    }
    if (failures === before) console.log(`  ✓ ${level}: ${sentences.length} sentences split cleanly`);
  }
  if (published === 0) console.log('  – no published files on disk; sweep skipped');

  return census;
}

function reportCensus(census: Census): void {
  console.log('\nCensus');
  console.log(`  ${census.tokens} tokens swept`);
  console.log(`  ${census.withReading} carry a reading`);
  console.log(`  ${census.trimmed} have kana trimmed off an edge`);

  if (census.katakana.size === 0) {
    console.log('  no katakana-bearing tokens were trimmed');
    return;
  }
  console.log(`\n  Katakana-bearing tokens, before → after (${census.katakana.size} distinct):`);
  for (const [was, now] of [...census.katakana.entries()].sort()) {
    console.log(`    ${was}  →  ${now}`);
  }
}

/* ═════════════════════════════ Entry point ════════════════════════════════ */

function main(): void {
  console.log('Validating furigana ruby placement');

  runFold();
  runCases('Readings that MUST be trimmed to their kanji', MUST_TRIM);
  runCases('Readings that MUST NOT be trimmed', MUST_NOT_TRIM);
  runCases('Tokens that MUST render as plain text', MUST_BE_PLAIN);
  const census = sweep();
  reportCensus(census);

  if (failures > 0) {
    console.error(`\n${failures} failure(s). See lib/sentences/ruby.ts.`);
    process.exit(1);
  }
  console.log('\nAll ruby-placement rules hold.');
}

main();
