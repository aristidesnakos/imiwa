/**
 * lib/jlpt/types.ts
 *
 * The contract for the "JLPT format" quiz mode on /kanji/n5/quiz. Two things build
 * against it:
 *
 *   scripts/jlpt/build-items.ts    -> data/jlpt/review/N5.json   (ReviewItem[], pending)
 *   scripts/jlpt/publish-items.ts  -> data/jlpt/published/N5.json (JlptItem[], approved only)
 *
 * The shape of the exam is the shape of the real one. N5 Language Knowledge opens with
 * Mondai 1 (read the underlined kanji) and Mondai 2 (pick the kanji for the underlined
 * kana), 7 and 5 items. These are our own items built on reviewed Tatoeba sentences; they
 * are not, and are never to be described as, a mock test.
 */

/** 1 = kanji reading (choose the kana), 2 = orthography (choose the kanji). */
export type MondaiNumber = 1 | 2;

/** Why a distractor was generated — what a reviewer should check it against. */
export type DistractorRule =
  | 'long-vowel' // おう/お, えい/え … a long vowel added or dropped
  | 'dakuten' // か/が, た/だ, ひ/び/ぴ … voicing flipped
  | 'small-tsu' // っ added or dropped
  | 'small-kana' // ゃゅょ swapped, or written full-size
  | 'on-kun' // one kanji read with its other reading
  | 'look-alike' // a kanji that is shaped like the right one
  | 'same-reading'; // a kanji that sounds like the right one

/** Tatoeba attribution for the stem. Required on screen beside every item. */
export interface ItemSource {
  sentenceId: number;
  contributor: string | null;
  license: 'CC BY 2.0 FR' | 'CC0 1.0';
  url: string;
}

/**
 * One published item, as the quiz renders it. Compact on purpose: the quiz route has
 * ~36 kB of script headroom and these are shipped to the browser.
 *
 * The sentence is `before + target + after`. Mondai 1 shows `target` in kanji, exactly
 * as in the source sentence. Mondai 2 shows it in hiragana, which is the one place we
 * alter the sentence text — the UI says so beside the credit.
 */
export interface JlptItem {
  id: string;
  mondai: MondaiNumber;
  /** 1-based set number, 1..5. */
  set: number;
  before: string;
  target: string;
  after: string;
  /** The English translation of the original sentence. */
  english: string;
  /** Four options, already in display order. */
  options: [string, string, string, string];
  /** Index into `options` of the single correct answer. */
  answer: 0 | 1 | 2 | 3;
  source: ItemSource;
}

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface ReviewDistractor {
  text: string;
  rule: DistractorRule;
  /**
   * Set by the reviewer when a distractor is replaced. A replacement is hand-written, so
   * it carries no rule.
   */
  replacedBy?: string;
}

/** What Ari reviews. Everything in JlptItem, plus how it was made and its verdict. */
export interface ReviewItem {
  id: string;
  mondai: MondaiNumber;
  set: number;
  /** Position within its mondai in its set, 1-based. */
  no: number;
  candidateId: string;
  /** The word as written in kanji, and its reviewed reading. */
  surface: string;
  reading: string;
  before: string;
  target: string;
  after: string;
  english: string;
  /** The right option text (kana for Mondai 1, kanji for Mondai 2). */
  answerText: string;
  distractors: ReviewDistractor[];
  source: ItemSource;
  /** Things Ari should look at that are not distractor quality, e.g. "word may be above N5". */
  flags: string[];
  status: ReviewStatus;
  note?: string;
}

export interface ReviewFile {
  level: 'N5';
  /** Words left out on purpose, with the reason, so the call is Ari's. */
  excluded: { surface: string; reading: string; reason: string }[];
  items: ReviewItem[];
}

export interface PublishedFile {
  level: 'N5';
  items: JlptItem[];
}
