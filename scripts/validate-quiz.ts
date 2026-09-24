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

import { N5_KANJI } from '../lib/constants/n5-kanji';
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
