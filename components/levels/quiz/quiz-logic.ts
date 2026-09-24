/**
 * components/levels/quiz/quiz-logic.ts
 *
 * The question engine behind a level quiz: pure functions, no React, and no
 * kanji data of its own. The caller hands it one level's list and that level's
 * learning sequence (today, only /kanji/n5/quiz does, with N5), so nothing here
 * can pull another level's array into a client bundle.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE ONE PROMISE: EXACTLY ONE RIGHT ANSWER
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * A multiple-choice question is broken the moment a second option is also
 * true, and nothing on screen tells the learner which one we meant. With this
 * data that is not hypothetical: 前 and 先 both mean "before", 中 and 半 both
 * mean "middle", 本 and 今 both mean "present", and among the readings 後 is
 * こう as well as ご, which makes 行, 高 and 校 all plausible answers for it.
 *
 * So a distractor is never merely "another kanji". Two kanji may not sit in the
 * same question if they share a sense (for the two meaning-based question
 * types) or a reading (for the reading type), and the rule is applied between
 * every pair of options, not just against the answer: two wrong options that
 * share "before" let a test-savvy learner eliminate both without knowing
 * either. `scripts/validate-quiz.ts` asserts all of this for every character
 * and every question type.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHERE DISTRACTORS COME FROM
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Always from the whole level, whatever the round is drawn from: a round on
 * "Start here" has two kanji, and a question needs three wrong answers.
 *
 * Up to two of the three come from the answer's own group in the learning
 * sequence, because that is the confusion a learner actually has — 東 against
 * 西 and 北, 三 against 五, not 東 against 雨. The third always comes from the
 * rest of the level, so a round never turns into "which direction is this"
 * with nothing easier to rule out.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT A READING OPTION SHOWS
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The first kunyomi and the first onyomi, in that order — the same pairing
 * `romajiLabel` makes for a character page's heading — with okurigana in
 * brackets the way the data and the page's reading list write it: 三 is
 * み（つ） / さん, mi(tsu) / san. Joining the okurigana on would assert a word,
 * and み（つ） joined is みつ, which is not how 三つ is said. Everything comes
 * out of `kanjiReadings()`; a raw reading field is never displayed or
 * romanised here.
 */

import type { KanjiData } from '@/lib/constants/kanji-types';
import type { LevelTheme } from '@/lib/levels/n5-sequence';
import { kanjiReadings, type Reading } from '@/lib/romaji/readings';

// ─── Question shapes ─────────────────────────────────────────────────────────

/**
 * `meaning`: see the kanji, pick its meaning.
 * `reading`: see the kanji, pick its readings.
 * `kanji`:   see a meaning, pick the kanji.
 */
export const QUESTION_TYPES = ['meaning', 'reading', 'kanji'] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];
export type QuestionTypeChoice = QuestionType | 'mixed';

export function isQuestionTypeChoice(value: unknown): value is QuestionTypeChoice {
  return value === 'mixed' || (QUESTION_TYPES as readonly unknown[]).includes(value);
}

export const OPTION_COUNT = 4;

/** Wrong answers taken from the answer's own group, at most. See the header. */
export const SAME_GROUP_DISTRACTORS = 2;

/** Round lengths offered. `all` is one question per kanji in the pool. */
export const SESSION_LENGTHS = [10, 20, 'all'] as const;
export type SessionLength = (typeof SESSION_LENGTHS)[number];
export const DEFAULT_SESSION_LENGTH: SessionLength = 10;

export interface QuizOption {
  /** The kanji this option stands for. On a `kanji` question it is also the text. */
  kanji: string;
  /** What the option says: a meaning, a kana reading label, or the character. */
  text: string;
  /** Romaji under a kana label. Reading questions only. */
  romaji?: string;
}

export interface QuizQuestion {
  /** `水:meaning`. Unique within a round, which asks each kanji at most once. */
  id: string;
  type: QuestionType;
  /** The kanji being tested. */
  kanji: string;
  /** What the question shows: the character, or its meaning on a `kanji` question. */
  prompt: string;
  options: QuizOption[];
  /** Index into `options` of the right answer. */
  answer: number;
}

// ─── Meanings ────────────────────────────────────────────────────────────────

/**
 * A meaning field split into its glosses. Commas and semicolons both separate
 * them (男 is "male; man"), except a comma between digits: 万's "10,000" is
 * one gloss, not "10" and "000".
 */
export function meaningGlosses(meaning: string): string[] {
  return meaning
    .split(/[;,](?!\d)/)
    .map(gloss => gloss.trim())
    .filter(Boolean);
}

/** A gloss that restates the number in digits — 二's "2" — adds nothing to "two". */
const DIGITS_ONLY = /^[\d,]+$/;

/**
 * The first two glosses: what an option or a prompt shows.
 *
 * The full field runs to "see, hopes, chances, idea, opinion, visible", and
 * four of those in a grid is a reading-comprehension test, not a kanji test.
 * The data lists the common sense first, so two is enough to pin it.
 */
export function conciseMeaning(meaning: string): string {
  const glosses = meaningGlosses(meaning);
  const words = glosses.filter(gloss => !DIGITS_ONLY.test(gloss));
  return (words.length > 0 ? words : glosses).slice(0, 2).join(', ');
}

/**
 * A gloss as it is compared rather than shown: "to read" and "read", "the
 * present" and "present", "hot (weather)" and "hot" are the same sense.
 */
function normaliseGloss(gloss: string): string {
  return gloss
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(?:to|the|a|an) /, '');
}

// ─── Readings ────────────────────────────────────────────────────────────────

export interface ReadingPart {
  /** Kana with okurigana bracketed: `み（つ）`. */
  kana: string;
  /** Romaji in the same shape: `mi(tsu)`. */
  romaji: string;
}

export interface ReadingLabel {
  /** `み（つ） / さん` */
  kana: string;
  /** `mi(tsu) / san` */
  romaji: string;
  /** Kunyomi first, then onyomi, for callers that phrase them in a sentence. */
  parts: ReadingPart[];
}

/** The first reading that stands alone, falling back to a bound (hyphenated) form. */
function leadReading(readings: Reading[]): Reading | undefined {
  return readings.find(r => r.affix === 'none') ?? readings[0];
}

function attachAffix(text: string, affix: Reading['affix']): string {
  if (affix === 'suffix') return `-${text}`;
  if (affix === 'prefix') return `${text}-`;
  return text;
}

function readingPart(reading: Reading): ReadingPart {
  const kana = reading.okurigana ? `${reading.kana}（${reading.okurigana}）` : reading.kana;
  return {
    kana: attachAffix(kana, reading.affix),
    romaji: attachAffix(reading.display, reading.affix),
  };
}

/** See "WHAT A READING OPTION SHOWS" above. `null` for an entry with no readings. */
export function readingLabel(entry: KanjiData): ReadingLabel | null {
  const { kunyomi, onyomi } = kanjiReadings(entry);
  const parts = [leadReading(kunyomi), leadReading(onyomi)]
    .filter((r): r is Reading => r !== undefined)
    .map(readingPart);
  if (parts.length === 0) return null;
  return {
    kana: parts.map(p => p.kana).join(' / '),
    romaji: parts.map(p => p.romaji).join(' / '),
    parts,
  };
}

// ─── The bank: one level, precomputed ────────────────────────────────────────

export interface BankEntry {
  entry: KanjiData;
  /** `conciseMeaning` of the entry: the text a meaning option or prompt shows. */
  meaning: string;
  /** Every gloss, normalised. Two entries that share one share a sense. */
  senses: ReadonlySet<string>;
  reading: ReadingLabel | null;
  /** Every reading as a whole word in hiragana, bound forms included. */
  readings: ReadonlySet<string>;
  /** Id of the learning-sequence group the kanji is taught in, if any. */
  group: string | null;
}

export interface QuizBank {
  /** Every kanji at the level, in data order. The distractor pool. */
  entries: readonly KanjiData[];
  groups: readonly LevelTheme[];
  byKanji: ReadonlyMap<string, BankEntry>;
}

export function createQuizBank(entries: readonly KanjiData[], groups: readonly LevelTheme[]): QuizBank {
  const groupOf = new Map<string, string>();
  for (const group of groups) {
    for (const kanji of group.kanji) if (!groupOf.has(kanji)) groupOf.set(kanji, group.id);
  }

  const byKanji = new Map<string, BankEntry>();
  for (const entry of entries) {
    if (byKanji.has(entry.kanji)) continue;
    byKanji.set(entry.kanji, {
      entry,
      meaning: conciseMeaning(entry.meaning),
      senses: new Set(meaningGlosses(entry.meaning).map(normaliseGloss).filter(Boolean)),
      reading: readingLabel(entry),
      readings: new Set(kanjiReadings(entry).all.map(r => r.kanaFull)),
      group: groupOf.get(entry.kanji) ?? null,
    });
  }
  return { entries, groups, byKanji };
}

// ─── Questions ───────────────────────────────────────────────────────────────

/** Whether an entry has what a question of this type needs, as answer or as distractor. */
function canShow(entry: BankEntry, type: QuestionType): boolean {
  return type === 'reading' ? entry.reading !== null : entry.meaning !== '';
}

function overlaps(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  let found = false;
  a.forEach(value => {
    if (b.has(value)) found = true;
  });
  return found;
}

/** Could a learner call both of these right? See the header. */
function confusable(a: BankEntry, b: BankEntry, type: QuestionType): boolean {
  return type === 'reading' ? overlaps(a.readings, b.readings) : overlaps(a.senses, b.senses);
}

function optionFor(entry: BankEntry, type: QuestionType): QuizOption {
  const { kanji } = entry.entry;
  if (type === 'meaning') return { kanji, text: entry.meaning };
  if (type === 'kanji') return { kanji, text: kanji };
  return { kanji, text: entry.reading?.kana ?? '', romaji: entry.reading?.romaji ?? '' };
}

/** Would these two options look the same, in kana or in romaji? */
function sameFace(a: QuizOption, b: QuizOption): boolean {
  return a.text === b.text || (a.romaji !== undefined && a.romaji === b.romaji);
}

export function canAsk(bank: QuizBank, kanji: string, type: QuestionType): boolean {
  const entry = bank.byKanji.get(kanji);
  return entry !== undefined && canShow(entry, type);
}

/**
 * Every kanji that may stand beside `kanji` as a wrong answer. Exported for the
 * validator, which asserts every kanji has at least three for every type.
 */
export function eligibleDistractors(bank: QuizBank, kanji: string, type: QuestionType): string[] {
  const answer = bank.byKanji.get(kanji);
  if (!answer) return [];
  const face = optionFor(answer, type);
  const out: string[] = [];
  bank.byKanji.forEach(candidate => {
    if (candidate === answer || !canShow(candidate, type)) return;
    if (confusable(answer, candidate, type)) return;
    if (sameFace(face, optionFor(candidate, type))) return;
    out.push(candidate.entry.kanji);
  });
  return out;
}

/** Fisher–Yates. `rng` is injectable so the validator can replay a seed. */
export function shuffle<T>(items: readonly T[], rng: () => number = Math.random): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * One question, or `null` if this kanji cannot carry this type (no reading to
 * show, or fewer than three safe distractors — neither happens at N5, and the
 * validator would say so if it ever did).
 */
export function buildQuestion(
  bank: QuizBank,
  kanji: string,
  type: QuestionType,
  rng: () => number = Math.random,
): QuizQuestion | null {
  const answer = bank.byKanji.get(kanji);
  if (!answer || !canShow(answer, type)) return null;

  const candidates = shuffle(eligibleDistractors(bank, kanji, type), rng).map(
    k => bank.byKanji.get(k) as BankEntry,
  );
  const sameGroup = answer.group === null ? [] : candidates.filter(c => c.group === answer.group);
  const elsewhere = candidates.filter(c => answer.group === null || c.group !== answer.group);
  // Same-group first up to the cap, then the rest of the level. The surplus
  // same-group ones go last, so they are only reached if the level runs dry.
  const ordered = [
    ...sameGroup.slice(0, SAME_GROUP_DISTRACTORS),
    ...elsewhere,
    ...sameGroup.slice(SAME_GROUP_DISTRACTORS),
  ];

  const chosen: BankEntry[] = [answer];
  for (const candidate of ordered) {
    if (chosen.length === OPTION_COUNT) break;
    const face = optionFor(candidate, type);
    const clashes = chosen.some(
      picked => confusable(picked, candidate, type) || sameFace(optionFor(picked, type), face),
    );
    if (!clashes) chosen.push(candidate);
  }
  if (chosen.length < OPTION_COUNT) return null;

  const options = shuffle(chosen, rng).map(entry => optionFor(entry, type));
  return {
    id: `${kanji}:${type}`,
    type,
    kanji,
    prompt: type === 'kanji' ? answer.meaning : kanji,
    options,
    answer: options.findIndex(option => option.kanji === kanji),
  };
}

// ─── Rounds ──────────────────────────────────────────────────────────────────

export interface RoundSpec {
  /** Kanji to ask about. Distractors still come from the whole bank. */
  pool: readonly string[];
  type: QuestionTypeChoice;
  /** Questions to ask; more than the pool holds is clamped to the pool. */
  count: number;
}

/**
 * Types for a mixed round, dealt evenly rather than drawn independently: ten
 * independent draws hand someone six reading questions in a round far more
 * often than "mixed" suggests.
 */
function dealTypes(count: number, choice: QuestionTypeChoice, rng: () => number): QuestionType[] {
  if (choice !== 'mixed') {
    const single: QuestionType = choice;
    return Array.from({ length: count }, () => single);
  }
  const offset = Math.floor(rng() * QUESTION_TYPES.length);
  return shuffle(
    Array.from({ length: count }, (_, i) => QUESTION_TYPES[(i + offset) % QUESTION_TYPES.length]),
    rng,
  );
}

/**
 * A round: `count` different kanji from the pool, in random order, one
 * question each. Only ever called from an event handler — the server renders
 * the setup screen, never a question, so no random draw can differ between the
 * server's HTML and the first client render.
 */
export function buildRound(bank: QuizBank, spec: RoundSpec, rng: () => number = Math.random): QuizQuestion[] {
  const pool = Array.from(new Set(spec.pool)).filter(kanji => bank.byKanji.has(kanji));
  const picked = shuffle(pool, rng).slice(0, Math.max(0, Math.min(spec.count, pool.length)));
  const types = dealTypes(picked.length, spec.type, rng);

  const questions: QuizQuestion[] = [];
  picked.forEach((kanji, i) => {
    // In a mixed round a kanji that cannot carry its dealt type takes another
    // one rather than dropping out; a single-type round has no fallback.
    const order: QuestionType[] =
      spec.type === 'mixed' ? [types[i], ...QUESTION_TYPES.filter(t => t !== types[i])] : [types[i]];
    for (const type of order) {
      const question = buildQuestion(bank, kanji, type, rng);
      if (question) {
        questions.push(question);
        break;
      }
    }
  });
  return questions;
}

/** Questions a round of this length asks from a pool of this size. */
export function questionCount(length: SessionLength, poolSize: number): number {
  return length === 'all' ? poolSize : Math.min(length, poolSize);
}

/**
 * The kanji a round draws from: every kanji at the level when no group is
 * chosen, otherwise the chosen groups' kanji in teaching order.
 */
export function resolvePool(bank: QuizBank, groupIds: readonly string[]): string[] {
  const chosen = new Set(groupIds);
  const pool: string[] = [];
  for (const group of bank.groups) {
    if (!chosen.has(group.id)) continue;
    for (const kanji of group.kanji) {
      if (bank.byKanji.has(kanji) && !pool.includes(kanji)) pool.push(kanji);
    }
  }
  // An unknown id — a stale link — must not produce an empty, unstartable quiz.
  return pool.length > 0 ? pool : bank.entries.map(entry => entry.kanji);
}

// ─── Links into the quiz ─────────────────────────────────────────────────────

export interface QuizPreset {
  groups: string[];
  type: QuestionTypeChoice | null;
  length: SessionLength | null;
}

/**
 * Settings from a query string, so a link can open the quiz already set up:
 * `?group=numbers&group=time&type=reading&length=all`. The setup form submits
 * the same names, which is what a click on Start does before hydration.
 * Anything unrecognised is dropped rather than failing the page.
 */
export function parseQuizPreset(search: string, bank: QuizBank): QuizPreset {
  const params = new URLSearchParams(search);
  const known = new Set(bank.groups.map(group => group.id));
  const groups: string[] = [];
  for (const value of params.getAll('group')) {
    for (const id of value.split(',')) {
      const trimmed = id.trim();
      if (known.has(trimmed) && !groups.includes(trimmed)) groups.push(trimmed);
    }
  }
  const type = params.get('type');
  const length = params.get('length');
  return {
    groups,
    type: isQuestionTypeChoice(type) ? type : null,
    length: length === 'all' ? 'all' : length === '10' ? 10 : length === '20' ? 20 : null,
  };
}
