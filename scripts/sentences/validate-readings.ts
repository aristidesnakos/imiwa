/**
 * scripts/sentences/validate-readings.ts
 *
 * CI entry point:  pnpm validate:readings
 *
 * Guards `lib/sentences/reading-corrections.ts`, in the two halves the
 * romaji validator uses — and for the same reason. Pinning the rules alone
 * proves the function is right about cases someone thought of; sweeping the
 * real data proves the function actually ran.
 *
 *   PART 1  Pin the readings a naive implementation gets wrong. Every case
 *           here is one IPADIC produced incorrectly in the N5 queue, plus the
 *           negative cases that must NOT be touched — regular counters, the
 *           lexicalised 十分, and the ambiguous pairs deliberately left out of
 *           the table.
 *
 *   PART 2  Sweep every committed queue and assert the pass is IDEMPOTENT on
 *           it: re-running `correctReadings` over a queue's own tokens must
 *           produce no corrections. A queue regenerated without the pass wired
 *           in fails here immediately, which is the failure mode worth
 *           catching — the wrong readings look completely plausible on the
 *           page, and nothing else in the pipeline would notice.
 *
 *   PART 3  Pin the correction-KEY round trip, then sweep the decision log.
 *           `ReviewDecision.readingCorrections` is keyed `<surface>#<n>` rather
 *           than by token index precisely BECAUSE the pass in PART 1 merges
 *           tokens and renumbers everything after the merge. The key format and
 *           this module are therefore one contract and are validated together:
 *           the load-bearing case is a key taken before a merge still naming
 *           the same token after it, where a raw index is off by one.
 *
 * Why this matters more than it looks: the furigana IPADIC gets wrong is never
 * flagged, never null, and never crashes. 「九時」 renders きゅうじ perfectly
 * happily. Before this pass existed, 42 of 514 N5 candidates carried a wrong
 * reading and 17 sat in a slot that would have published.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import {
  correctionKey,
  resolveCorrectionKey,
  toIndexed,
  toKeyed,
} from '../../lib/sentences/correction-keys';
import { correctReadings, parseNumeral } from '../../lib/sentences/reading-corrections';
import type { DecisionLog, Level, ReviewQueue, Token } from '../../lib/sentences/types';

const LEVELS: Level[] = ['N5', 'N4', 'N3', 'N2', 'N1'];
const DATA_DIR = join(resolve(__dirname, '..', '..'), 'data', 'sentences');
const QUEUE_DIR = join(DATA_DIR, 'queue');
const DECISIONS_DIR = join(DATA_DIR, 'decisions');

let failures = 0;
const fail = (msg: string): void => {
  failures += 1;
  console.error(`  ✗ ${msg}`);
};

/* ═══════════════════ PART 1 — pinned rules ═══════════════════ */

const T = (surface: string, reading?: string): Token =>
  reading ? { surface, reading } : { surface };

/** Render a token list the way the page does, so a diff reads like the page. */
const render = (tokens: Token[]): string =>
  tokens.map((t) => (t.reading ? `${t.surface}《${t.reading}》` : t.surface)).join('');

interface Case {
  name: string;
  input: Token[];
  want: string;
}

/** Readings IPADIC produced wrong, and what the pass must turn them into. */
const MUST_CORRECT: Case[] = [
  // ── 日 as a date or a span. Every one of 2–10, 14, 20, 24 is irregular.
  { name: '八日 (八月八日)', input: [T('八', 'はち'), T('日', 'にち')], want: '八日《ようか》' },
  { name: '９日 after a digit', input: [T('９'), T('日', 'にち')], want: '９日《ここのか》' },
  { name: '６日 after a digit', input: [T('６'), T('日', 'にち')], want: '６日《むいか》' },
  { name: '二十日', input: [T('二', 'に'), T('十', 'じゅう'), T('日', 'にち')], want: '二十日《はつか》' },
  {
    name: '十四日',
    input: [T('十', 'じゅう'), T('四', 'よん'), T('日', 'にち')],
    want: '十四日《じゅうよっか》',
  },
  { name: '３日 (毎)', input: [T('３'), T('日', 'にち'), T('毎', 'ごと')], want: '３日《みっか》毎《ごと》' },

  // ── 日間, the explicit span.
  { name: '６日間', input: [T('６'), T('日間', 'にちかん')], want: '６日間《むいかかん》' },
  { name: '3日間', input: [T('3'), T('日間', 'にちかん')], want: '3日間《みっかかん》' },

  // ── 人. Only 1 and 2.
  { name: '二人', input: [T('二', 'に'), T('人', 'にん')], want: '二人《ふたり》' },
  { name: '一人', input: [T('一', 'いち'), T('人', 'にん')], want: '一人《ひとり》' },
  { name: '１人 after a digit', input: [T('１'), T('人', 'にん')], want: '１人《ひとり》' },
  { name: '2人 after a digit', input: [T('2'), T('人', 'にん')], want: '2人《ふたり》' },

  // ── 時 and 時間.
  { name: '九時', input: [T('九', 'きゅう'), T('時', 'じ')], want: '九時《くじ》' },
  { name: '七時', input: [T('七', 'なな'), T('時', 'じ')], want: '七時《しちじ》' },
  { name: '四時', input: [T('四', 'よん'), T('時', 'じ')], want: '四時《よじ》' },
  { name: '４時間', input: [T('４'), T('時間', 'じかん')], want: '４時間《よじかん》' },
  {
    name: '二十四時間',
    input: [T('二', 'に'), T('十', 'じゅう'), T('四', 'よん'), T('時間', 'じかん')],
    want: '二十四時間《にじゅうよじかん》',
  },

  // ── 本, the counter — the reason 木は一本も見えなかった was wrong at rank 1.
  { name: '一本', input: [T('一', 'いち'), T('本', 'ほん')], want: '一本《いっぽん》' },
  { name: '三本', input: [T('三', 'さん'), T('本', 'ほん')], want: '三本《さんぼん》' },

  // ── 分 and 月.
  { name: '一分', input: [T('一', 'いち'), T('分', 'ふん')], want: '一分《いっぷん》' },
  { name: '四月', input: [T('四', 'よん'), T('月', 'がつ')], want: '四月《しがつ》' },

  // ── The families a first pass at this table missed entirely.
  { name: '四人 is よにん, not よんにん', input: [T('四', 'よん'), T('人', 'にん')], want: '四人《よにん》' },
  {
    name: '十九日 is the く family, not きゅう',
    input: [T('十', 'じゅう'), T('九', 'きゅう'), T('日', 'にち')],
    want: '十九日《じゅうくにち》',
  },
  {
    name: '三十分 — the alternation recurs at every multiple of ten',
    input: [T('三', 'さん'), T('十', 'じゅう'), T('分', 'ふん')],
    want: '三十分《さんじゅっぷん》',
  },
  {
    name: '二十日間 keeps the はつか stem',
    input: [T('二', 'に'), T('十', 'じゅう'), T('日間', 'にちかん')],
    want: '二十日間《はつかかん》',
  },
  {
    name: '十四時間',
    input: [T('十', 'じゅう'), T('四', 'よん'), T('時間', 'じかん')],
    want: '十四時間《じゅうよじかん》',
  },
  { name: '二十本', input: [T('二', 'に'), T('十', 'じゅう'), T('本', 'ほん')], want: '二十本《にじゅっぽん》' },
  { name: '一ヵ月 (small ヵ variant)', input: [T('一', 'いち'), T('ヵ月', 'かげつ')], want: '一ヵ月《いっかげつ》' },
  { name: '一ケ月 (large ケ variant)', input: [T('一', 'いち'), T('ケ月', 'かげつ')], want: '一ケ月《いっかげつ》' },

  { name: '四時半 — 時半 is its own token', input: [T('四', 'よん'), T('時半', 'じはん')], want: '四時半《よじはん》' },
  {
    name: '一分間 — 分間 is its own token',
    input: [T('一', 'いち'), T('分間', 'ふんかん')],
    want: '一分間《いっぷんかん》',
  },
  {
    name: '十四人',
    input: [T('十', 'じゅう'), T('四', 'よん'), T('人', 'にん')],
    want: '十四人《じゅうよにん》',
  },
  {
    name: '一分のうちに — 分 + genitive の is a duration, not a fraction',
    input: [T('一', 'いち'), T('分', 'ふん'), T('の'), T('うち')],
    want: '一分《いっぷん》のうち',
  },

  // ── 日本's にっぽん default.
  { name: '日本', input: [T('日本', 'にっぽん')], want: '日本《にほん》' },
  { name: '日本人', input: [T('日本人', 'にっぽんじん')], want: '日本人《にほんじん》' },
  // ── 階, the floor counter. Not reached by the N5 queue (階 is N3), but 三階
  //    and 五階 already appear as N5 sentences, so the counter is in the corpus.
  { name: '一階', input: [T('一', 'いち'), T('階', 'かい')], want: '一階《いっかい》' },
  { name: '六階', input: [T('六', 'ろく'), T('階', 'かい')], want: '六階《ろっかい》' },
  { name: '十階', input: [T('十', 'じゅう'), T('階', 'かい')], want: '十階《じゅっかい》' },

  // ── 百 and 千. IPADIC read 「三百ドル」 as さんひゃく; 三百 is さんびゃく.
  { name: '三百 (三百ドル)', input: [T('三', 'さん'), T('百', 'ひゃく')], want: '三百《さんびゃく》' },
  { name: '六百', input: [T('六', 'ろく'), T('百', 'ひゃく')], want: '六百《ろっぴゃく》' },
  { name: '一千 (一千万円)', input: [T('一', 'いち'), T('千', 'せん')], want: '一千《いっせん》' },
  { name: '三千', input: [T('三', 'さん'), T('千', 'せん')], want: '三千《さんぜん》' },
  {
    // Two merges compose: 千:1 fires first, then 万 walks back over the merged
    // 一千 token — which is still a numeral surface — and finds no 万:1000 row.
    name: '一千万 merges the 千, leaves the 万 regular',
    input: [T('一', 'いち'), T('千', 'せん'), T('万', 'まん')],
    want: '一千《いっせん》万《まん》',
  },
  // ── Counter rows that were short while 分 was complete (adversarial review).
  { name: '十一本', input: [T('十', 'じゅう'), T('一', 'いち'), T('本', 'ほん')], want: '十一本《じゅういっぽん》' },
  { name: '十三本', input: [T('十', 'じゅう'), T('三', 'さん'), T('本', 'ほん')], want: '十三本《じゅうさんぼん》' },
  { name: '四十本', input: [T('四', 'よん'), T('十', 'じゅう'), T('本', 'ほん')], want: '四十本《よんじゅっぽん》' },
  { name: '十一階', input: [T('十', 'じゅう'), T('一', 'いち'), T('階', 'かい')], want: '十一階《じゅういっかい》' },
  { name: '三十階', input: [T('三', 'さん'), T('十', 'じゅう'), T('階', 'かい')], want: '三十階《さんじゅっかい》' },
  { name: '十四時', input: [T('十', 'じゅう'), T('四', 'よん'), T('時', 'じ')], want: '十四時《じゅうよじ》' },
  {
    name: '十九日間',
    input: [T('十', 'じゅう'), T('九', 'きゅう'), T('日間', 'にちかん')],
    want: '十九日間《じゅうくにちかん》',
  },
];

/**
 * Readings that are already right, or genuinely ambiguous. A correction firing
 * here would be the exact defect this module exists to remove, just pointing
 * the other way — so these assertions matter as much as the ones above.
 */
const MUST_NOT_TOUCH: Case[] = [
  // Regular counters: IPADIC's split reading is already correct.
  { name: '三年 is regular', input: [T('三', 'さん'), T('年', 'ねん')], want: '三《さん》年《ねん》' },
  { name: '二本 is regular (にほん)', input: [T('二', 'に'), T('本', 'ほん')], want: '二《に》本《ほん》' },
  { name: '五分 is regular', input: [T('五', 'ご'), T('分', 'ふん')], want: '五《ご》分《ふん》' },
  {
    name: '二十三日 is regular',
    input: [T('二', 'に'), T('十', 'じゅう'), T('三', 'さん'), T('日', 'にち')],
    want: '二《に》十《じゅう》三《さん》日《にち》',
  },
  { name: '十月 is regular', input: [T('十', 'じゅう'), T('月', 'がつ')], want: '十《じゅう》月《がつ》' },

  // Ambiguous — see AMBIGUOUS in reading-corrections.ts. Flagged, never rewritten.
  {
    name: '一日 is ついたち or いちにち — never auto-corrected',
    input: [T('一', 'いち'), T('日', 'にち')],
    want: '一《いち》日《にち》',
  },
  {
    name: '十分 is lexicalised by IPADIC and must survive as じゅうぶん',
    input: [T('十分', 'じゅうぶん')],
    want: '十分《じゅうぶん》',
  },
  {
    name: '七時間 is しち or なな — left out of the table',
    input: [T('七', 'なな'), T('時間', 'じかん')],
    want: '七《なな》時間《じかん》',
  },

  // 分の is a different token from 分; 三分の一 is よんぶんのいち-shaped, not minutes.
  {
    name: '三分の一 is not a minute count',
    input: [T('三', 'さん'), T('分の', 'ぶんの'), T('一', 'いち')],
    want: '三《さん》分の《ぶんの》一《いち》',
  },

  {
    name: '八ヶ月 is はっかげつ or はちかげつ — left out of the table',
    input: [T('八', 'はち'), T('ヶ月', 'かげつ')],
    want: '八《はち》ヶ月《かげつ》',
  },
  {
    name: '第 blocks the merge — 第八日 is だいはちにち, not だいようか',
    input: [T('第', 'だい'), T('八', 'はち'), T('日', 'にち')],
    want: '第《だい》八《はち》日《にち》',
  },
  {
    name: '分 followed by の is a fraction, even if the tokenizer splits it',
    input: [T('三', 'さん'), T('分', 'ふん'), T('の'), T('一', 'いち')],
    want: '三《さん》分《ふん》の一《いち》',
  },

  // 時 as the noun "when", with no numeral in front of it.
  {
    name: '小学校の時 has no numeral to absorb',
    input: [T('小学校', 'しょうがっこう'), T('の'), T('時', 'とき')],
    want: '小学校《しょうがっこう》の時《とき》',
  },
  // Ambiguous floors — see AMBIGUOUS. Flagged in select.ts, never rewritten.
  {
    name: '三階 is さんがい or さんかい — left out of the table',
    input: [T('三', 'さん'), T('階', 'かい')],
    want: '三《さん》階《かい》',
  },
  {
    name: '八階 is はっかい or はちかい — left out of the table',
    input: [T('八', 'はち'), T('階', 'かい')],
    want: '八《はち》階《かい》',
  },

  // 千万 has no 一 in front of it and is せんまん, not いっせんまん. This is the
  // reason 万:1000 is NOT a table row: parseNumeral('千') is 1000, so such a row
  // would fire here and invent a 一 the sentence never wrote.
  {
    name: '千万 without a leading 一 is せんまん',
    input: [T('千', 'せん'), T('万', 'まん')],
    want: '千《せん》万《まん》',
  },
  { name: '一万 is regular', input: [T('一', 'いち'), T('万', 'まん')], want: '一《いち》万《まん》' },
  { name: '百万 is regular', input: [T('百', 'ひゃく'), T('万', 'まん')], want: '百《ひゃく》万《まん》' },
  { name: '五千円 is regular', input: [T('五', 'ご'), T('千', 'せん')], want: '五《ご》千《せん》' },
  {
    name: '二千人 is regular',
    input: [T('二', 'に'), T('千', 'せん'), T('人', 'にん')],
    want: '二《に》千《せん》人《にん》',
  },
  {
    // The walk-back is maximal, so the run here parses as 2300 and finds no
    // key. Documented as a known limit rather than papered over.
    name: '二千三百 finds no key — the run is maximal, not the ones digit',
    input: [T('二', 'に'), T('千', 'せん'), T('三', 'さん'), T('百', 'ひゃく')],
    want: '二《に》千《せん》三《さん》百《ひゃく》',
  },
  // ── Every case below is a defect an adversarial review produced with a
  //    concrete input. They are pinned here because each one is a way the pass
  //    made a reading WORSE than IPADIC's — the failure mode the whole module
  //    is supposed to be incapable of.

  // 「二、三日」 is a range — にさんにち, "a couple of days" — not the 3rd. The
  // walk-back stops at the 、 and used to read the trailing numeral alone.
  {
    name: '二、三日 is a range, not the 3rd of the month',
    input: [T('二', 'に'), T('、'), T('三', 'さん'), T('日', 'にち')],
    want: '二《に》、三《さん》日《にち》',
  },
  {
    name: '五、六日 is a range',
    input: [T('五', 'ご'), T('、'), T('六', 'ろく'), T('日', 'にち')],
    want: '五《ご》、六《ろく》日《にち》',
  },
  {
    name: '一、二人 is a range',
    input: [T('一', 'いち'), T('、'), T('二', 'に'), T('人', 'にん')],
    want: '一《いち》、二《に》人《にん》',
  },

  // 八百万 is やおよろず as readily as はっぴゃくまん, and IPADIC does not
  // lexicalise it the way it does 八百屋 and 八百長.
  {
    name: '八百万 is ambiguous — 百 before 万 never merges',
    input: [T('八', 'はち'), T('百', 'ひゃく'), T('万', 'まん')],
    want: '八《はち》百《ひゃく》万《まん》',
  },

  // A merged token must never be re-absorbed. 千:1 fires first; without the
  // guard the 本 walk-back re-read the run as 本:1000 and overwrote いっせん
  // with せんぼん — losing the correction it had just applied.
  {
    name: '一千本 — a merged 一千 is not re-absorbed by 本',
    input: [T('一', 'いち'), T('千', 'せん'), T('本', 'ほん')],
    want: '一千《いっせん》本《ほん》',
  },
  {
    name: '一千階 — same guard, a row keyed at 100/1000',
    input: [T('一', 'いち'), T('千', 'せん'), T('階', 'かい')],
    want: '一千《いっせん》階《かい》',
  },
];

function runCases(label: string, cases: Case[]): void {
  console.log(`\n${label}`);
  for (const c of cases) {
    const result = correctReadings(c.input);
    const got = render(result.tokens);

    if (got !== c.want) {
      fail(`${c.name}\n      got  ${got}\n      want ${c.want}`);
      continue;
    }

    // The invariant that makes merging safe at all.
    const before = c.input.map((t) => t.surface).join('');
    const after = result.tokens.map((t) => t.surface).join('');
    if (before !== after) {
      fail(`${c.name}: surface changed — "${before}" became "${after}"`);
      continue;
    }

    // Alignment, which select.ts relies on to pair a KanjiTarget's word with
    // its reading. A stale index here silently mislabels furigana.
    const map = result.sourceIndex;
    if (map.length !== c.input.length || map.some((i) => i < 0 || i >= result.tokens.length)) {
      fail(`${c.name}: sourceIndex does not map every input token into range`);
      continue;
    }

    console.log(`  ✓ ${c.name}`);
  }
}

function runNumeralParser(): void {
  console.log('\nNumeral parsing');
  const cases: [string, number | null][] = [
    ['一', 1],
    ['六', 6],
    ['十', 10],
    ['十四', 14],
    ['二十', 20],
    ['二十四', 24],
    ['二千十六', 2016],
    ['６', 6],
    ['１０', 10],
    ['24', 24],
    ['', null],
    ['日', null],
  ];
  for (const [input, want] of cases) {
    const got = parseNumeral(input);
    if (got === want) console.log(`  ✓ parseNumeral(${JSON.stringify(input)}) = ${got}`);
    else fail(`parseNumeral(${JSON.stringify(input)}) = ${got}, want ${want}`);
  }
}

/* ═════════════ PART 2 — sweep the committed queues ═════════════ */

/**
 * Assert the pass is a no-op on data it has already been applied to.
 *
 * This is the check that actually catches regressions. A queue regenerated by a
 * select.ts that no longer calls `correctReadings` looks completely normal —
 * same shape, same counts, every structural contract still passing — and the
 * only visible symptom is furigana that is quietly wrong. Idempotence turns
 * that into a hard failure.
 */
function sweepQueues(): void {
  console.log('\nQueue sweep (corrections must already be applied)');
  let swept = 0;

  for (const level of LEVELS) {
    const file = join(QUEUE_DIR, `${level}.json`);
    if (!existsSync(file)) continue;

    const queue = JSON.parse(readFileSync(file, 'utf8')) as ReviewQueue;
    let candidates = 0;
    let dirty = 0;

    for (const entry of queue.entries) {
      for (const candidate of entry.candidates) {
        candidates += 1;

        const result = correctReadings(candidate.tokens);
        if (result.corrections.length > 0) {
          dirty += 1;
          if (dirty <= 5) {
            fail(
              `${level} ${candidate.id} (${entry.kanji}) still needs correction: ` +
                result.corrections
                  .map((c) => `「${c.surface}」 ${c.was} → ${c.now}`)
                  .join('; ') +
                `\n      ${candidate.japanese}`
            );
          }
        }

        // Re-assert the hard invariant on the committed data, not just in-flight.
        if (candidate.tokens.map((t) => t.surface).join('') !== candidate.japanese) {
          fail(`${level} ${candidate.id}: tokens do not reconstruct japanese`);
        }
      }
    }

    if (dirty > 5) fail(`${level}: …and ${dirty - 5} more uncorrected candidate(s)`);
    if (dirty === 0) console.log(`  ✓ ${level}: ${candidates} candidates, all corrections applied`);
    swept += 1;
  }

  if (swept === 0) console.log('  – no queue files on disk; sweep skipped');
}

/* ═════════ PART 3 — correction keys survive what indices do not ═════════ */

const ok = (msg: string): void => console.log(`  ✓ ${msg}`);

/**
 * Pin the key format itself: build a key for a token, resolve it back, and
 * assert the round trip lands on the token it named.
 *
 * The repeated-surface cases are the ones that make the occurrence number
 * load-bearing — 日 appears twice in almost every date, and a key that only
 * carried the surface would resolve to the first one every time.
 */
function runCorrectionKeys(): void {
  console.log('\nCorrection keys (surface + occurrence)');

  // ── Round trip over an array with a repeated surface.
  const repeated = [T('日', 'ひ'), T('は'), T('日', 'ひ')];
  const first = correctionKey(repeated, 0);
  const second = correctionKey(repeated, 2);
  if (first !== '日#1') fail(`correctionKey(tokens, 0) = ${first}, want 日#1`);
  else ok('the first 日 keys as 日#1');
  if (second !== '日#2') fail(`correctionKey(tokens, 2) = ${second}, want 日#2`);
  else ok('the second 日 keys as 日#2');
  for (const [key, want] of [
    [first, 0],
    [second, 2],
    ['は#1', 1],
  ] as [string, number][]) {
    const got = resolveCorrectionKey(repeated, key);
    if (got === want) ok(`resolve("${key}") = ${got}`);
    else fail(`resolve("${key}") = ${got}, want ${want}`);
  }

  // ── A key naming a surface this sentence does not contain resolves to
  //    NOTHING. -1 is the whole design: see correction-keys.ts. A best-effort
  //    nearest match would put a human's kana on a token they never saw.
  for (const key of ['月#1', '日#3', '日', '日#0', '日#x', '#1']) {
    const got = resolveCorrectionKey(repeated, key);
    if (got === -1) ok(`resolve("${key}") = -1 — names no token, and says so`);
    else fail(`resolve("${key}") = ${got}, want -1`);
  }

  // ── A surface containing the separator. Tatoeba text is arbitrary and 「#」 is
  //    an ordinary thing to write, so the occurrence number is parsed off the
  //    END of the key, never the first separator.
  const hashy = [T('#'), T('1'), T('#')];
  const hashKey = correctionKey(hashy, 2);
  if (hashKey !== '##2') fail(`correctionKey over a 「#」 surface = ${hashKey}, want ##2`);
  else ok('a 「#」 surface keys as ##2 (occurrence parsed at the LAST #)');
  if (resolveCorrectionKey(hashy, hashKey) === 2) ok('resolve("##2") = 2');
  else fail(`resolve("##2") = ${resolveCorrectionKey(hashy, hashKey)}, want 2`);

  // ── toKeyed / toIndexed round trip, and unresolved keys coming BACK rather
  //    than being dropped.
  const keyed = toKeyed(repeated, { 0: 'にち', 2: 'び' });
  if (keyed['日#1'] === 'にち' && keyed['日#2'] === 'び') ok('toKeyed distinguishes the two 日');
  else fail(`toKeyed produced ${JSON.stringify(keyed)}`);
  const back = toIndexed(repeated, { ...keyed, '月#1': 'つき' });
  if (back.corrections[0] === 'にち' && back.corrections[2] === 'び') {
    ok('toIndexed restores both corrections to their own tokens');
  } else {
    fail(`toIndexed produced ${JSON.stringify(back.corrections)}`);
  }
  if (back.unresolved.length === 1 && back.unresolved[0] === '月#1') {
    ok('toIndexed RETURNS the unresolved key instead of dropping it');
  } else {
    fail(`toIndexed unresolved = ${JSON.stringify(back.unresolved)}`);
  }

  /* ── THE CASE THIS FORMAT EXISTS FOR ─────────────────────────────────────
   *
   * A correction recorded against a token AFTER a numeral, and then the
   * irregular-counter table grows a row that merges 八 + 日. The merge removes
   * one token, so every index past it shifts down by one — the decision still
   * loads under its stable pair id, and a positional correction would write the
   * reviewer's kana onto the wrong word, plausibly and silently.
   */
  const preMerge = [
    T('八', 'はち'),
    T('日', 'にち'),
    T('に'),
    T('学校', 'がっこう'),
    T('へ'),
    T('行く', 'いく'),
  ];
  const targetIndex = 3; // 学校
  const key = correctionKey(preMerge, targetIndex);
  const postMerge = correctReadings(preMerge).tokens;

  if (postMerge.length !== preMerge.length - 1) {
    fail(`the 八日 merge did not fire — ${render(postMerge)}`);
  } else {
    const resolved = resolveCorrectionKey(postMerge, key);
    if (postMerge[resolved]?.surface === preMerge[targetIndex].surface) {
      ok(`"${key}" still names 「${preMerge[targetIndex].surface}」 after the 八日 merge (index ${targetIndex} → ${resolved})`);
    } else {
      fail(
        `"${key}" resolved to ${resolved} (「${postMerge[resolved]?.surface}」) after the merge, ` +
          `want the token 「${preMerge[targetIndex].surface}」`
      );
    }
    // And the counterfactual, so the justification is pinned and not merely
    // asserted in a comment: the raw index now points at a DIFFERENT token.
    if (postMerge[targetIndex]?.surface !== preMerge[targetIndex].surface) {
      ok(
        `index ${targetIndex} would now be 「${postMerge[targetIndex]?.surface}」 — ` +
          'which is exactly the silent mis-write the key format removes'
      );
    } else {
      fail(`index ${targetIndex} did not shift — this case no longer proves anything`);
    }
  }
}

/**
 * Sweep the committed decision logs: every `readingCorrections` key on every
 * decision must resolve against its candidate's tokens in the queue.
 *
 * publish.ts refuses to write a level containing a stranded key, so this is CI
 * finding out before a publish does. A decision whose candidate has left the
 * queue entirely is an ORPHAN — retained on purpose, unpublishable, and with no
 * tokens to check against — so it is counted, not failed.
 */
function sweepDecisionCorrections(): void {
  console.log('\nDecision sweep (every correction key must name a real token)');

  let logsSeen = 0;
  let keysChecked = 0;
  let orphanDecisions = 0;

  for (const level of LEVELS) {
    const decisionsFile = join(DECISIONS_DIR, `${level}.json`);
    if (!existsSync(decisionsFile)) continue;
    logsSeen += 1;

    const log = JSON.parse(readFileSync(decisionsFile, 'utf8')) as DecisionLog;
    const queueFile = join(QUEUE_DIR, `${level}.json`);
    const queue = existsSync(queueFile)
      ? (JSON.parse(readFileSync(queueFile, 'utf8')) as ReviewQueue)
      : null;

    const tokensById = new Map<string, Token[]>();
    for (const entry of queue?.entries ?? []) {
      for (const candidate of entry.candidates) tokensById.set(candidate.id, candidate.tokens);
    }

    for (const decision of log.decisions) {
      const corrections = decision.readingCorrections;
      if (!corrections || Object.keys(corrections).length === 0) continue;

      const tokens = tokensById.get(decision.candidateId);
      if (!tokens) {
        orphanDecisions += 1;
        continue;
      }

      keysChecked += Object.keys(corrections).length;
      const { unresolved } = toIndexed(tokens, corrections);
      for (const strandedKey of unresolved) {
        fail(
          `${level} ${decision.candidateId}: reading correction "${strandedKey}" names no ` +
            'token in the queue — the queue was regenerated after it was recorded'
        );
      }
    }
  }

  if (logsSeen === 0) {
    console.log('  – no decision logs on disk; sweep skipped');
    return;
  }
  if (keysChecked === 0) {
    // Said out loud rather than printing nothing: today every decision in the
    // log is a rejection with no corrections on it, so this sweep passes
    // vacuously — and a reader has to be able to tell "ran, found nothing to
    // check" apart from "did not run".
    console.log(
      `  ✓ ${logsSeen} decision log(s) read; no reading corrections recorded yet — ` +
        'the key check passes vacuously'
    );
  } else {
    console.log(`  ✓ ${keysChecked} correction key(s) across ${logsSeen} log(s) all resolve`);
  }
  if (orphanDecisions > 0) {
    console.log(
      `  – ${orphanDecisions} decision(s) with corrections are orphaned (candidate not in ` +
        'the queue); nothing to resolve against, so not checked'
    );
  }
}

/* ═════════════════════════════ Entry point ════════════════════════════════ */

function main(): void {
  console.log('Validating example-sentence reading corrections');

  runNumeralParser();
  runCases('Readings that MUST be corrected', MUST_CORRECT);
  runCases('Readings that MUST NOT be touched', MUST_NOT_TOUCH);
  sweepQueues();
  runCorrectionKeys();
  sweepDecisionCorrections();

  if (failures > 0) {
    console.error(`\n${failures} failure(s). See lib/sentences/reading-corrections.ts.`);
    process.exit(1);
  }
  console.log('\nAll reading-correction rules hold.');
}

main();
