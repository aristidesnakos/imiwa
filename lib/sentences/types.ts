/**
 * lib/sentences/types.ts
 *
 * The shared contract for the example-sentences pipeline. Three things build
 * against this file and nothing else:
 *
 *   scripts/sentences/select.ts   emits  SentenceCandidate[]  (the review queue)
 *   app/admin/review/*            emits  ReviewDecision[]     (the decision log)
 *   scripts/sentences/publish.ts  emits  ExampleSentence[]    (what the site renders)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THE QUEUE AND THE DECISIONS ARE SEPARATE FILES
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * guardscan-api writes the review verdict back onto the source row (`status`
 * and `reviewed_by` on `user_submissions`). That works when the source row is
 * the only copy of the item. Here it would be actively harmful: the queue is
 * REGENERABLE — re-running select.ts with a better ranker rebuilds it from the
 * Tatoeba dump — and a reviewer's ~250 human judgements must survive that.
 *
 * So decisions are keyed by the stable Tatoeba sentence-pair id and stored in
 * their own file. Re-running selection never destroys review work; it just
 * changes which candidates are in front of the reviewer. A decision whose
 * candidate has vanished from the queue is retained, not deleted (see
 * `orphanedDecisions` handling in the publish step).
 *
 * This also means the decision log is an append-mostly audit trail, which
 * guardscan lacks entirely — it has no decision timestamp and, because of a bug
 * in its reject route, no rejection reason either.
 */

/* ─────────────────────────── Rendering primitives ────────────────────────── */

/**
 * One token of the sentence. This is what makes furigana renderable: a
 * whole-sentence kana string CANNOT be aligned back to the kanji spans it
 * corresponds to, so ruby markup cannot be derived from it. Segmentation
 * happens once, in the pipeline, not at render time.
 */
export interface Token {
  /** Surface form as it appears in the sentence. Concatenating every `surface` * in order MUST reconstruct `japanese` exactly — CI enforces this. */
  surface: string;
  /** Kana reading. Omitted for kana-only tokens and punctuation. */
  reading?: string;
  /**
   * True when the tokenizer returned no reading for a token containing kanji.
   * These are the known IPADIC failure mode (rare kanji → null reading) and
   * must never render as furigana. CI fails on any of these reaching publish.
   */
  readingUnknown?: boolean;
}

export type Level = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
/** Sentence complexity. `above-N1` means it contains kanji we do not teach. */
export type SentenceLevel = Level | 'above-N1';

/**
 * Licence is read per-sentence from the corpus, never assumed corpus-wide.
 * Of 248,821 Japanese sentences exactly two are CC0, but the English side
 * varies more, and a CC0 JP / CC BY EN pair is a live case.
 */
export type SentenceLicense = 'CC BY 2.0 FR' | 'CC0 1.0';

export interface SentenceSource {
  /** Tatoeba sentence ID for this side. */
  sentenceId: number;
  /**
   * Contributor username, or null if orphaned. Null is COMMON and expected —
   * 40.2% of Japanese sentences are unadopted Tanaka Corpus imports. Null is
   * not a quality signal and must not be rendered as a missing-data error;
   * render project-level credit alone.
   */
  contributor: string | null;
  license: SentenceLicense;
  /** https://tatoeba.org/en/sentences/show/<id> */
  url: string;
}

/** Which word carries which kanji in this sentence. */
export interface KanjiTarget {
  kanji: string;   // "暑"
  word: string;    // "暑い"
  reading: string; // "あつい"
}

/** Corpus signals carried through for auditability and ranking. Never filters. */
export interface QualitySignals {
  japaneseByNativeSpeaker: boolean;
  englishByNativeSpeaker: boolean;
  hasAudio: boolean;
  /** Unadopted Tanaka Corpus import. Curated textbook source, NOT junk. */
  isTanaka: boolean;
}

/* ──────────────────────────── The review queue ───────────────────────────── */

/**
 * Stable identity for a JP/EN pair. Format: `tatoeba-<jpId>-<enId>`.
 * Decisions are keyed by this, so it must not change when the ranker changes.
 */
export type CandidateId = string;

export function candidateId(jpId: number, enId: number): CandidateId {
  return `tatoeba-${jpId}-${enId}`;
}

/**
 * A scored, tokenized candidate awaiting human review.
 * Emitted by select.ts to `data/sentences/queue/<level>.json`.
 */
export interface SentenceCandidate {
  id: CandidateId;
  /** The kanji this candidate was selected FOR. Review is per-kanji. */
  targetKanji: string;
  targetLevel: Level;

  japanese: string; // VERBATIM from source — never edited, by anyone
  english: string;  // VERBATIM from source — never edited, by anyone
  tokens: Token[];

  /** Every dictionary kanji this sentence usefully demonstrates. */
  kanji: string[];
  targets: KanjiTarget[];

  level: SentenceLevel;
  source: { japanese: SentenceSource; english: SentenceSource };
  signals: QualitySignals;

  /** Ranker output, for reviewer context and for tuning the ranker later. */
  score: number;
  /** Human-readable reasons this ranked where it did. Shown in the UI. */
  scoreBreakdown: string[];
  /** Rank within this kanji's candidate list, 1-based. */
  rank: number;

  /**
   * WHICH SENSE OF THE KANJI this sentence demonstrates — e.g. 日 as "day"
   * (今日) vs "Japan" (日本語) vs "counter for days" (三日間).
   *
   * Why this exists: a ranker optimising for naturalness, level and word
   * diversity will still hand you three sentences that all show 日 meaning
   * "day". 今日 and 毎日 are different WORDS but the same SENSE, so the
   * word-diversity penalty does not catch it. For a dictionary site the sense
   * spread is the pedagogical point — a learner who sees only 今日/毎日/先日
   * never learns that 日 is the 日 in 日本.
   *
   * This is a HINT, not a fact. It is inferred by matching the kanji's own
   * `meaning` field against the English translation, which is cheap, needs no
   * third-party data, and is wrong a meaningful fraction of the time. `null`
   * means "could not tell" and is common and fine — abstract kanji rarely name
   * their sense in the translation.
   *
   * The reviewer is the authority: `ReviewDecision.senseTag` overrides this,
   * and there is no dictionary upgrade path that retires them.
   *
   * JMdict specifically cannot do this job, and it is worth stating so that
   * nobody spends a week on 63 MB of it discovering that. JMdict maps a WORD to
   * that word's senses; what this field needs is the sense a CHARACTER carries
   * INSIDE a compound, which JMdict does not carry at any granularity. 名前 has
   * one JMdict sense, "name", and reading 前 out of it yields the sense "before"
   * — wrong, and unfixable from the entry. In the other direction 今日 / 毎日 /
   * 先日 are three JMdict entries with three senses between them, but one sense
   * of 日; feeding those in collapses straight into the `targetWordKey`
   * word-diversity penalty the ranker already applies and adds nothing this
   * field is for. Closing the gap needs per-character-in-compound sense data,
   * which would have to be authored, not imported.
   */
  senseHint: string | null;
}

/** One kanji's slice of the queue. */
export interface KanjiQueueEntry {
  kanji: string;
  level: Level;
  meaning: string;
  candidates: SentenceCandidate[];
  /** Total that survived filtering, before truncation to `candidates`. */
  totalCandidates: number;
}

export interface ReviewQueue {
  /** JLPT level this queue covers. */
  level: Level;
  /** Tatoeba dump vintage the candidates were drawn from, ISO date. */
  corpusVintage: string;
  /** ISO timestamp the queue was generated. */
  generatedAt: string;
  /** How many candidates each kanji should end up with after review. */
  targetPerKanji: number;
  entries: KanjiQueueEntry[];
}

/* ──────────────────────────── The sense vocabulary ───────────────────────── */

/**
 * Split a kanji's `meaning` field into the senses a reviewer may tag with.
 *
 * The comma in a `meaning` string is not always a separator. Our data writes a
 * gloss and its numeral as one sense — 二 is `"two, 2"` — and writes thousands
 * separators inside a single gloss — 万 is `"ten thousand, 10,000"`. Splitting
 * on a bare comma turns one sense into three, two of which are the same sense
 * and one of which is a bare numeral, so the reviewer's picker offered "two, 2"
 * / "two" / "2" as if they were distinct pedagogical senses of 二.
 *
 * The guard is that a comma followed by digits is INSIDE a sense, not between
 * two. Numeric-only fragments are then dropped: "2" alone is a spelling of a
 * sense, never a sense.
 *
 * Case is preserved for display; callers that match on it lowercase their own
 * copy. Kept in this module rather than beside either caller because the ranker
 * (scripts/sentences/select.ts) and the reviewer UI must agree — a sense the
 * reviewer can tag but the ranker never scores, or the reverse, makes the
 * spread guarantee in publish.ts quietly untrue.
 */
export function splitSenses(meaning: string): string[] {
  return meaning
    .split(/,(?!\s*\d)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !/^[\d,.\s]+$/.test(s));
}

/* ────────────────────────────── The decisions ────────────────────────────── */

export type DecisionVerdict = 'accepted' | 'rejected';

/**
 * Why a candidate was rejected. Structured, because the reject-reason
 * distribution is what tells us whether the RANKER is wrong or the CORPUS is —
 * and that determines whether Phase 3+ can lower the review rate.
 *
 * (guardscan validates a free-text reason then discards it. Don't repeat that.)
 */
export type RejectReason =
  | 'unnatural-japanese'
  | 'bad-translation'
  | 'wrong-reading'        // tokenizer gave a wrong furigana reading
  | 'target-kanji-unused'  // kanji present but not meaningfully demonstrated
  | 'too-hard'
  | 'too-simple'
  | 'inappropriate-content'
  | 'other';

export interface ReviewDecision {
  candidateId: CandidateId;
  /** Denormalized so the log is readable and auditable on its own. */
  targetKanji: string;
  verdict: DecisionVerdict;
  /** Required when verdict is 'rejected'. CI enforces. */
  rejectReason?: RejectReason;
  /** Free-text elaboration. Optional even on reject. */
  note?: string;
  /**
   * Corrected token readings, keyed `<surface>#<occurrence>` — `日#2` is the
   * second 日 token in the sentence, 1-based. NOT the token index.
   *
   * The index is the obvious key and it silently breaks the promise the essay
   * at the top of this file makes. Decisions outlive queue regeneration, and
   * `lib/sentences/reading-corrections.ts` MERGES tokens (八《はち》 + 日《にち》
   * → 八日《ようか》), so adding one row to its irregular-counter table
   * renumbers the tokens of every sentence that row touches. The decision still
   * loads under its stable pair id, and a positional correction then lands on
   * an unrelated token as confident, plausible, wrong furigana. A surface key
   * either resolves to the same token or to nothing at all — see
   * `lib/sentences/correction-keys.ts`, which owns the format and the
   * deliberately loud failure path.
   *
   * This is the ONLY thing a reviewer may edit. `japanese` and `english` are
   * verbatim source text and editing them would (a) break the licence's
   * no-modification posture and (b) make the attribution a lie. The UI must not
   * offer to edit them.
   */
  readingCorrections?: Record<string, string>;
  /**
   * Which sense of the kanji this sentence actually demonstrates. Confirms or
   * overrides `SentenceCandidate.senseHint`, which is a heuristic guess.
   *
   * The reviewer is the authority here. Recording it is what lets the publish
   * step guarantee the shipped set spans senses rather than showing 日 as
   * "day" three times — see `senseHint` for why the ranker cannot settle this
   * on its own.
   */
  senseTag?: string;
  reviewer: string;
  /** ISO 8601. */
  decidedAt: string;
}

export interface DecisionLog {
  level: Level;
  decisions: ReviewDecision[];
}

/* ───────────────────────── What the site renders ─────────────────────────── */

export type ReviewStatus =
  | { kind: 'human-reviewed'; reviewer: string; date: string }
  | { kind: 'auto-accepted'; policy: string }; // e.g. "phase-3-sample-20pct"

export interface ExampleSentence {
  id: CandidateId;
  kanji: string[];
  targets: KanjiTarget[];
  /**
   * The kanji whose review accepted this sentence — which pages it may appear
   * on. Usually one entry.
   *
   * This is NOT the same as `kanji` or `targets`, and the difference matters.
   * A `CandidateId` is a JP/EN pair id and carries no kanji, so one sentence
   * appears in several kanji's candidate lists and one `ReviewDecision` covers
   * all of them. But acceptance is partly kanji-specific — `target-kanji-unused`
   * exists as a reject reason precisely because a sentence can be natural, well
   * translated, and still a poor demonstration of one of the characters in it.
   *
   * So a sentence surfaces only where a human actually looked at it in that
   * character's context. The cheaper rule — show it on every page whose kanji
   * it contains — would multiply coverage for free by inferring a judgement
   * nobody made, and this site's claim is accuracy.
   */
  reviewedFor: string[];
  japanese: string;
  tokens: Token[];
  english: string;
  level: SentenceLevel;
  source: { japanese: SentenceSource; english: SentenceSource };
  signals: QualitySignals;
  review: ReviewStatus;
}

/* ──────────────────────────── Contrast pairs ─────────────────────────────── */

/**
 * Keyed by the word pair, not the sentence — the 暑い/熱い distinction is a
 * property of the pair, not of any sentence that uses one of them.
 *
 * `note` is ORIGINAL EDITORIAL CONTENT and is the proprietary asset. It must
 * render structurally separate from any licensed sentence text; interleaving
 * the two would make the result Adapted Material and forfeit that position.
 * See docs/prd/content-source-licence-investigation.md §1.
 */
export interface ContrastPair {
  id: string;             // "atsui-hot"
  sharedReading?: string; // "あつい" — present when the confusion is homophony
  members: {
    word: string;         // "暑い"
    kanji: string;        // "暑"
    gloss: string;        // "hot (ambient / weather only)"
    exampleSentenceId: CandidateId;
  }[];
  note: string;
}
