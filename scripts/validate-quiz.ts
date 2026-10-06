/**
 * Validator for the level quiz (`components/levels/quiz/quiz-logic.ts`), run
 * against the N5 data /kanji/n5/quiz ships with.
 *
 * Run: npx tsx --tsconfig tsconfig.json scripts/validate-quiz.ts
 *
 * ---------------------------------------------------------------------------
 * Why this exists
 * ---------------------------------------------------------------------------
 *
 * The quiz makes one promise per question: four options, exactly one of them
 * right. Nothing renders a broken question differently from a good one — a
 * second true option looks exactly like a distractor — so the only way to know
 * the promise holds is to generate every question and look.
 *
 * It is also a promise the data can break without anyone touching the quiz.
 * The distractor rules key off meanings and readings, and the level lists are
 * due to be re-sourced (docs/3rdVersion/level-pages-and-zero-click-review.md
 * §3.2). An edited gloss that makes two N5 kanji share a sense, or an entry
 * that arrives without a reading, changes what the quiz can ask, silently.
 *
 * So this generates every kanji × every question type across many seeds, and
 * rounds restricted to every group in the learning sequence — including the
 * two-kanji "Start here" group, whose questions can only be answerable if the
 * distractors come from the rest of the level.
 */

import fs from 'node:fs';
import path from 'node:path';
import { N5_KANJI } from '../lib/constants/n5-kanji';
import { ALSO_VALID } from '../lib/jlpt/also-valid';
import type { JlptItem, PublishedFile, ReviewFile } from '../lib/jlpt/types';
import { N5_SEQUENCE } from '../lib/levels/n5-sequence';
import {
  OPTION_COUNT,
  QUESTION_TYPES,
  SAME_GROUP_DISTRACTORS,
  buildQuestion,
  buildRound,
  conciseMeaning,
  createQuizBank,
  eligibleDistractors,
  parseQuizPreset,
  questionCount,
  resolvePool,
  type BankEntry,
  type QuestionType,
  type QuestionTypeChoice,
  type QuizQuestion,
} from '../components/levels/quiz/quiz-logic';

/** Seeds per kanji × type. 82 × 3 × 200 is ~49k questions, about a second. */
const SEEDS = 200;
/** Seeds per restricted or whole-level round. */
const ROUND_SEEDS = 40;

let checks = 0;
let failures = 0;

function section(title: string): void {
  console.log(`\n${title}`);
  console.log('-'.repeat(title.length));
}

function check(label: string, problems: string[], okMessage: string): void {
  checks += 1;
  if (problems.length === 0) {
    console.log(`  ok    ${okMessage}`);
    return;
  }
  failures += 1;
  console.error(`  FAIL  ${label} — ${problems.length} problem(s):`);
  for (const p of problems.slice(0, 25)) console.error(`          ${p}`);
  if (problems.length > 25) console.error(`          ... and ${problems.length - 25} more`);
}

/** mulberry32: small, seedable, good enough to replay a failing draw. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const bank = createQuizBank(N5_KANJI, N5_SEQUENCE);
const N5_SET = new Set(N5_KANJI.map(k => k.kanji));
const groupOf = (kanji: string): string | null => bank.byKanji.get(kanji)?.group ?? null;
const entryOf = (kanji: string): BankEntry => bank.byKanji.get(kanji) as BankEntry;

function intersects(a: ReadonlySet<string>, b: ReadonlySet<string>): string[] {
  return Array.from(a).filter(value => b.has(value));
}

/**
 * Everything a single question must satisfy. Returns problems, prefixed with
 * enough context (kanji, type, seed) to replay the draw.
 */
function questionProblems(q: QuizQuestion, context: string): string[] {
  const out: string[] = [];
  const where = `${context} ${q.kanji}/${q.type}`;

  if (q.options.length !== OPTION_COUNT) {
    out.push(`${where}: ${q.options.length} options, expected ${OPTION_COUNT}`);
  }
  if (q.answer < 0 || q.answer >= q.options.length || q.options[q.answer]?.kanji !== q.kanji) {
    out.push(`${where}: answer index ${q.answer} does not point at ${q.kanji}`);
  }
  if (q.options.filter(o => o.kanji === q.kanji).length !== 1) {
    out.push(`${where}: the answer appears ${q.options.filter(o => o.kanji === q.kanji).length} times`);
  }

  const texts = q.options.map(o => o.text);
  if (new Set(texts).size !== texts.length) {
    out.push(`${where}: two options show the same text — ${JSON.stringify(texts)}`);
  }
  if (texts.some(t => t.trim() === '')) {
    out.push(`${where}: an option has no text — ${JSON.stringify(texts)}`);
  }
  if (q.type === 'reading') {
    const romaji = q.options.map(o => o.romaji ?? '');
    if (new Set(romaji).size !== romaji.length || romaji.some(r => r === '')) {
      out.push(`${where}: romaji missing or repeated — ${JSON.stringify(romaji)}`);
    }
  }

  const answerText = q.options[q.answer]?.text;
  for (const option of q.options) {
    if (option.kanji !== q.kanji && option.text === answerText) {
      out.push(`${where}: distractor ${option.kanji} shows the answer's own text "${answerText}"`);
    }
    if (!N5_SET.has(option.kanji)) {
      out.push(`${where}: option ${option.kanji} is not an N5 kanji`);
    }
  }

  // No two options may both be defensible: shared sense for the meaning-based
  // types, shared reading for the reading type. Checked pairwise, not only
  // against the answer — see the quiz-logic header.
  for (let i = 0; i < q.options.length; i++) {
    for (let j = i + 1; j < q.options.length; j++) {
      const a = entryOf(q.options[i].kanji);
      const b = entryOf(q.options[j].kanji);
      const shared = q.type === 'reading' ? intersects(a.readings, b.readings) : intersects(a.senses, b.senses);
      if (shared.length > 0) {
        out.push(`${where}: ${q.options[i].kanji} and ${q.options[j].kanji} share ${JSON.stringify(shared)}`);
      }
    }
  }

  const expectedPrompt = q.type === 'kanji' ? conciseMeaning(entryOf(q.kanji).entry.meaning) : q.kanji;
  if (q.prompt !== expectedPrompt) {
    out.push(`${where}: prompt ${JSON.stringify(q.prompt)}, expected ${JSON.stringify(expectedPrompt)}`);
  }

  const group = groupOf(q.kanji);
  const sameGroup = q.options.filter(o => o.kanji !== q.kanji && group !== null && groupOf(o.kanji) === group);
  if (sameGroup.length > SAME_GROUP_DISTRACTORS) {
    out.push(`${where}: ${sameGroup.length} distractors from its own group, cap is ${SAME_GROUP_DISTRACTORS}`);
  }
  return out;
}

// ---------------------------------------------------------------------------

section('1. The bank covers the level, and every entry can be shown');
{
  const problems: string[] = [];
  if (bank.byKanji.size !== N5_KANJI.length) {
    problems.push(`bank holds ${bank.byKanji.size} kanji, the N5 list ${N5_KANJI.length}`);
  }
  const inGroups = new Set(N5_SEQUENCE.flatMap(group => group.kanji));
  for (const kanji of Array.from(inGroups)) {
    if (!bank.byKanji.has(kanji)) problems.push(`group kanji ${kanji} is not in the N5 list`);
  }
  for (const k of N5_KANJI) {
    if (!inGroups.has(k.kanji)) problems.push(`${k.kanji} is in no group, so no group round can reach it`);
  }
  check('bank vs. N5 list and sequence', problems, `${bank.byKanji.size} kanji, all in the bank and all in a group`);

  const display: string[] = [];
  bank.byKanji.forEach(entry => {
    const k = entry.entry.kanji;
    if (!entry.meaning) display.push(`${k}: no meaning to show`);
    if (!entry.reading) {
      display.push(`${k}: no reading to show`);
      return;
    }
    // Annotation syntax (、 . ,) or a stray hyphen must never reach an option.
    if (!/^[぀-ゟ（）/ -]+$/.test(entry.reading.kana) || /[、.,]/.test(entry.reading.kana)) {
      display.push(`${k}: kana label ${JSON.stringify(entry.reading.kana)} carries something other than kana`);
    }
    if (!/^[a-zāēīōū'()/ -]+$/.test(entry.reading.romaji)) {
      display.push(`${k}: romaji label ${JSON.stringify(entry.reading.romaji)} carries something other than romaji`);
    }
  });
  check('meaning and reading labels', display, 'every kanji has a meaning and a clean kana + romaji reading label');
}

section('2. Every kanji has at least three safe distractors, for every type');
{
  const problems: string[] = [];
  const min: Record<string, { n: number; kanji: string }> = {};
  for (const type of QUESTION_TYPES) {
    min[type] = { n: Infinity, kanji: '' };
    for (const k of N5_KANJI) {
      const n = eligibleDistractors(bank, k.kanji, type).length;
      if (n < OPTION_COUNT - 1) problems.push(`${k.kanji}/${type}: only ${n} eligible distractor(s)`);
      if (n < min[type].n) min[type] = { n, kanji: k.kanji };
    }
  }
  check(
    'distractor supply',
    problems,
    `fewest eligible distractors: ${QUESTION_TYPES.map(t => `${t} ${min[t].n} (${min[t].kanji})`).join(', ')}`
  );

  // The exclusions the rules exist for, pinned so a rule change that drops one
  // is loud. Each pair shares a sense or a reading in the data.
  const pinned: [string, string, QuestionType][] = [
    ['前', '先', 'meaning'],
    ['中', '半', 'meaning'],
    ['本', '今', 'kanji'],
    ['後', '行', 'reading'],
    ['後', '午', 'reading'],
    ['日', '火', 'reading'],
  ];
  const leaks = pinned
    .filter(([a, b, type]) => eligibleDistractors(bank, a, type).includes(b))
    .map(([a, b, type]) => `${b} is offered as a wrong answer to ${a}/${type}, but both are right`);
  check('known ambiguous pairs stay apart', leaks, `${pinned.length} known ambiguous pairs are never offered together`);
}

section(`3. Every kanji × every type, ${SEEDS} draws each`);
{
  const problems: string[] = [];
  const nulls: string[] = [];
  const positions = [0, 0, 0, 0];
  let generated = 0;
  for (const type of QUESTION_TYPES) {
    for (const k of N5_KANJI) {
      for (let seed = 1; seed <= SEEDS; seed++) {
        const q = buildQuestion(bank, k.kanji, type, seeded(seed * 7919 + k.kanji.codePointAt(0)!));
        if (!q) {
          nulls.push(`${k.kanji}/${type} seed ${seed}: no question could be built`);
          continue;
        }
        generated += 1;
        positions[q.answer] += 1;
        problems.push(...questionProblems(q, `seed ${seed}`));
      }
    }
  }
  check('question built', nulls, `${generated} questions built, none refused`);
  check(
    'question invariants',
    problems,
    `4 options, the answer among them, no repeated text, no shared sense or reading, ≤${SAME_GROUP_DISTRACTORS} same-group distractors`
  );

  // A shuffle that leaves the answer in slot 1 is a quiz you can pass blind.
  // Uniform is 25% a slot; anything outside 22–28% over ~49k draws is a bug.
  const share = positions.map(n => n / generated);
  const skewed = share.some(s => s < 0.22 || s > 0.28)
    ? [`answer slot shares ${share.map(s => `${(s * 100).toFixed(1)}%`).join(' / ')}`]
    : [];
  check('answer position', skewed, `answer lands in slots 1–4 at ${share.map(s => `${(s * 100).toFixed(1)}%`).join(' / ')}`);
}

section('4. Rounds restricted to each group — distractors still come from all of N5');
{
  const problems: string[] = [];
  const outside: string[] = [];
  const summary: string[] = [];
  const choices: QuestionTypeChoice[] = ['mixed', ...QUESTION_TYPES];

  for (const group of N5_SEQUENCE) {
    const pool = resolvePool(bank, [group.id]);
    if (pool.join('') !== group.kanji.join('')) {
      problems.push(`${group.id}: pool ${pool.join('')} is not the group's kanji ${group.kanji.join('')}`);
    }
    let fromElsewhere = 0;
    let distractors = 0;
    for (const type of choices) {
      for (let seed = 1; seed <= ROUND_SEEDS; seed++) {
        const round = buildRound(bank, { pool, type, count: questionCount('all', pool.length) }, seeded(seed));
        const where = `${group.id}/${type} seed ${seed}`;
        if (round.length !== group.kanji.length) {
          problems.push(`${where}: ${round.length} questions for ${group.kanji.length} kanji`);
        }
        const asked = round.map(q => q.kanji);
        if (new Set(asked).size !== asked.length) problems.push(`${where}: a kanji is asked twice`);
        for (const q of round) {
          if (!group.kanji.includes(q.kanji)) problems.push(`${where}: asked ${q.kanji}, which is not in the group`);
          if (type !== 'mixed' && q.type !== type) problems.push(`${where}: a ${q.type} question in a ${type} round`);
          problems.push(...questionProblems(q, where));
          const others = q.options.filter(o => o.kanji !== q.kanji);
          const away = others.filter(o => !group.kanji.includes(o.kanji)).length;
          fromElsewhere += away;
          distractors += others.length;
          // The group can supply at most (size - 1) wrong answers, and the cap
          // allows at most two; the rest has to come from the whole level.
          const needed = OPTION_COUNT - 1 - Math.min(SAME_GROUP_DISTRACTORS, group.kanji.length - 1);
          if (away < needed) {
            outside.push(`${where} ${q.kanji}: ${away} distractor(s) from outside the group, needs ${needed}`);
          }
        }
      }
    }
    summary.push(`${group.id} ${group.kanji.length}k: ${Math.round((fromElsewhere / distractors) * 100)}% from elsewhere`);
  }
  check('group rounds', problems, `${N5_SEQUENCE.length} groups × ${choices.length} type choices × ${ROUND_SEEDS} seeds, every round one question per kanji`);
  check('distractors reach beyond the group', outside, 'every question takes at least one distractor from the rest of N5 (two for "Start here")');
  console.log(`        ${summary.join('\n        ')}`);
}

section('5. Rounds over all of N5');
{
  const problems: string[] = [];
  const all = resolvePool(bank, []);
  if (all.length !== N5_KANJI.length) problems.push(`the all-N5 pool holds ${all.length}, expected ${N5_KANJI.length}`);
  for (const length of [10, 20, 'all'] as const) {
    const expected = questionCount(length, all.length);
    for (const type of ['mixed', ...QUESTION_TYPES] as QuestionTypeChoice[]) {
      for (let seed = 1; seed <= ROUND_SEEDS; seed++) {
        const round = buildRound(bank, { pool: all, type, count: expected }, seeded(seed * 31 + expected));
        const where = `all/${length}/${type} seed ${seed}`;
        if (round.length !== expected) problems.push(`${where}: ${round.length} questions, expected ${expected}`);
        if (new Set(round.map(q => q.kanji)).size !== round.length) problems.push(`${where}: a kanji is asked twice`);
        for (const q of round) problems.push(...questionProblems(q, where));
        if (type === 'mixed') {
          const counts = QUESTION_TYPES.map(t => round.filter(q => q.type === t).length);
          if (Math.max(...counts) - Math.min(...counts) > 1) {
            problems.push(`${where}: mixed round dealt ${counts.join('/')} meaning/reading/kanji`);
          }
        }
      }
    }
  }
  check('whole-level rounds', problems, `10, 20 and all ${all.length}, every type choice: right length, no repeats, mixed rounds dealt evenly`);
}

section('6. Pools, lengths and links into the quiz');
{
  const problems: string[] = [];
  const expect = (label: string, actual: unknown, expected: unknown) => {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      problems.push(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
  };
  expect('resolvePool([])', resolvePool(bank, []), N5_KANJI.map(k => k.kanji));
  expect('resolvePool(unknown)', resolvePool(bank, ['no-such-group']), N5_KANJI.map(k => k.kanji));
  expect(
    'resolvePool(numbers, start-here)',
    resolvePool(bank, ['numbers', 'start-here']),
    // Teaching order, not selection order.
    ['日', '本', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十']
  );
  expect('questionCount(10, 82)', questionCount(10, 82), 10);
  expect('questionCount(20, 14)', questionCount(20, 14), 14);
  expect('questionCount(all, 82)', questionCount('all', 82), 82);
  expect(
    'preset: repeated and comma-joined groups',
    parseQuizPreset('?group=numbers&group=time,verbs&type=reading&length=all', bank),
    { groups: ['numbers', 'time', 'verbs'], type: 'reading', length: 'all' }
  );
  expect(
    'preset: junk is dropped, not fatal',
    parseQuizPreset('?group=nope&group=numbers,numbers&type=hard&length=7', bank),
    { groups: ['numbers'], type: null, length: null }
  );
  expect('preset: empty', parseQuizPreset('', bank), { groups: [], type: null, length: null });
  check('pools and presets', problems, 'pool resolution, round lengths and query-string presets behave');
}

section('7. JLPT-format items (Mondai 1 and 2)');
{
  const ROOT = path.resolve(__dirname, '..');
  const readJson = <T>(rel: string): T => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')) as T;
  const review = readJson<ReviewFile>('data/jlpt/review/N5.json');
  const published = readJson<PublishedFile>('data/jlpt/published/N5.json');
  const sentences = readJson<{ id: string; japanese: string; tokens: { surface: string; reading?: string }[]; source: { japanese: { sentenceId: number } } }[]>(
    'data/sentences/published/N5.json'
  );
  const bySentence = new Map(sentences.map(s => [s.id, s]));
  const bySentenceId = new Map(sentences.map(s => [s.source.japanese.sentenceId, s]));
  const n5Kanji = new Set(N5_KANJI.map(k => k.kanji));
  const KANJI = /[一-鿿]/;
  const KANA_ONLY = /^[ぁ-ゟ]+$/;

  // Every reading a reviewer has seen for a surface, and every surface seen for a reading:
  // a distractor that is one of these is a second right answer.
  const readingsOf = new Map<string, Set<string>>();
  const surfacesOf = new Map<string, Set<string>>();
  for (const s of sentences) {
    for (const t of s.tokens) {
      if (!t.reading) continue;
      readingsOf.set(t.surface, (readingsOf.get(t.surface) ?? new Set()).add(t.reading));
      surfacesOf.set(t.reading, (surfacesOf.get(t.reading) ?? new Set()).add(t.surface));
    }
  }

  // --- the review file: the full 5 x (7 + 5) design, every item built right -------------
  {
    const problems: string[] = [];
    const ids = new Set<string>();
    for (let set = 1; set <= 5; set += 1) {
      for (const [mondai, want] of [[1, 7], [2, 5]] as const) {
        const n = review.items.filter(i => i.set === set && i.mondai === mondai).length;
        if (n !== want) problems.push(`set ${set} Mondai ${mondai}: ${n} items, expected ${want}`);
      }
    }
    const usedSentences = new Set<string>();
    for (const i of review.items) {
      const where = i.id;
      if (ids.has(i.id)) problems.push(`${where}: duplicate id`);
      ids.add(i.id);
      if (usedSentences.has(i.candidateId)) problems.push(`${where}: sentence ${i.candidateId} used by two items`);
      usedSentences.add(i.candidateId);

      const options = [i.answerText, ...i.distractors.map(d => d.replacedBy ?? d.text)];
      if (i.distractors.length !== 3) problems.push(`${where}: ${i.distractors.length} distractors, expected 3`);
      if (new Set(options).size !== options.length) problems.push(`${where}: options are not all different (${options.join(' / ')})`);

      const sentence = bySentence.get(i.candidateId);
      if (!sentence) { problems.push(`${where}: sentence ${i.candidateId} is not in the published N5 sentences`); continue; }
      if (i.mondai === 1) {
        // The stem must be the source sentence, verbatim, with only the target underlined.
        if (i.before + i.target + i.after !== sentence.japanese) problems.push(`${where}: stem is not the verbatim sentence`);
        if (i.target !== i.surface) problems.push(`${where}: Mondai 1 target ${i.target} is not the surface ${i.surface}`);
        if (!readingsOf.get(i.surface)?.has(i.reading)) problems.push(`${where}: ${i.surface} has no reviewed reading ${i.reading}`);
        const valid = new Set([i.reading, ...(readingsOf.get(i.surface) ?? []), ...(ALSO_VALID[i.surface] ?? [])]);
        for (const o of options) {
          if (!KANA_ONLY.test(o)) problems.push(`${where}: option ${o} is not all hiragana`);
        }
        for (const d of options.slice(1)) {
          if (valid.has(d)) problems.push(`${where}: distractor ${d} is a valid reading of ${i.surface} (a second right answer)`);
        }
      } else {
        // Mondai 2 alters the sentence in exactly one way: the target token as hiragana.
        if (i.before + i.surface + i.after !== sentence.japanese) problems.push(`${where}: sentence with the kanji restored is not verbatim`);
        if (i.target !== i.reading) problems.push(`${where}: Mondai 2 target ${i.target} is not the reading ${i.reading}`);
        if (!readingsOf.get(i.surface)?.has(i.reading)) problems.push(`${where}: ${i.surface} has no reviewed reading ${i.reading}`);
        for (const o of options) {
          if (!KANJI.test(o)) problems.push(`${where}: option ${o} has no kanji`);
          for (const c of o) if (KANJI.test(c) && !n5Kanji.has(c)) problems.push(`${where}: option ${o} uses ${c}, which is not an N5 kanji`);
        }
        for (const d of options.slice(1)) {
          if (surfacesOf.get(i.reading)?.has(d)) problems.push(`${where}: distractor ${d} is a reviewed spelling of ${i.reading} (a second right answer)`);
        }
      }
      if (!i.source.url || !i.source.license) problems.push(`${where}: missing attribution`);
      if (!['pending', 'approved', 'rejected'].includes(i.status)) problems.push(`${where}: bad status ${i.status}`);
    }
    check('JLPT review items', problems, `${review.items.length} items: 5 sets x (7 + 5), one sentence each, 4 different options, no distractor a valid answer, stems verbatim`);
  }

  // --- the published file: only reviewed items, shaped so the UI cannot show a broken one ---
  {
    const problems: string[] = [];
    const reviewById = new Map(review.items.map(i => [i.id, i]));
    const seen = new Set<string>();
    for (const i of published.items as JlptItem[]) {
      const where = `published ${i.id}`;
      const r = reviewById.get(i.id);
      if (seen.has(i.id)) problems.push(`${where}: duplicate`);
      seen.add(i.id);
      if (!r) { problems.push(`${where}: no such review item`); continue; }
      if (r.status !== 'approved') problems.push(`${where}: review status is ${r.status}, only approved items may ship`);
      if (i.options.length !== 4 || new Set(i.options).size !== 4) problems.push(`${where}: needs 4 different options`);
      if (![0, 1, 2, 3].includes(i.answer)) problems.push(`${where}: answer index ${i.answer} out of range`);
      if (i.options[i.answer] !== r.answerText) problems.push(`${where}: the option marked right is ${i.options[i.answer]}, not ${r.answerText}`);
      const wrong = i.options.filter((_, k) => k !== i.answer).sort().join('|');
      const expected = r.distractors.map(d => d.replacedBy ?? d.text).sort().join('|');
      if (wrong !== expected) problems.push(`${where}: options differ from the reviewed distractors`);
      const s = bySentenceId.get(i.source.sentenceId);
      if (!s) problems.push(`${where}: source sentence ${i.source.sentenceId} unknown`);
      if (i.before !== r.before || i.target !== r.target || i.after !== r.after) problems.push(`${where}: stem differs from the review item`);
    }
    // The sitemap's lastmod for the quiz reads this stamp: it must exist once anything
    // ships, and a future date would claim a change that has not happened yet.
    const today = new Date().toISOString().slice(0, 10);
    if (published.updated !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(published.updated)) {
      problems.push(`published file: updated "${published.updated}" is not YYYY-MM-DD`);
    } else if (published.updated !== undefined && published.updated > today) {
      problems.push(`published file: updated ${published.updated} is in the future`);
    }
    if (published.items.length > 0 && published.updated === undefined) {
      problems.push('published file: has items but no updated date; run scripts/jlpt/publish-items.ts');
    }
    check('JLPT published items', problems, `${published.items.length} published item(s), each approved, exactly one right option, matches its review item, dated ${published.updated ?? 'never'}`);
  }
}

section('Sample questions (seed 1)');
for (const type of QUESTION_TYPES) {
  for (const kanji of ['日', '東', '後']) {
    const q = buildQuestion(bank, kanji, type, seeded(1));
    if (!q) continue;
    const options = q.options
      .map((o, i) => `${i === q.answer ? '*' : ' '}${o.text}${o.romaji ? ` (${o.romaji})` : ''}`)
      .join('  ');
    console.log(`  ${type.padEnd(7)} ${q.prompt.padEnd(10)} ${options}`);
  }
}

console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${checks - failures}/${checks} checks passed`);
process.exit(failures === 0 ? 0 : 1);
