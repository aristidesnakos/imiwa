/**
 * scripts/sentences/select.ts
 *
 * PHASE 1, step 1 of docs/prd/example-sentences-system.md: turn the Tatoeba
 * corpus into a ranked, tokenized review queue for one JLPT level.
 *
 *   npx tsx --tsconfig tsconfig.json scripts/sentences/select.ts --level N5
 *   npx tsx --tsconfig tsconfig.json scripts/sentences/select.ts --level N5 --kanji 日
 *
 * Writes `data/sentences/queue/<level>.json`, conforming to `ReviewQueue` in
 * lib/sentences/types.ts. `--kanji` prints one kanji's ranking to stdout and
 * writes NOTHING — see "single-kanji mode" below.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT THIS STEP IS ACTUALLY FOR
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Phase 0 (docs/prd/example-sentences-phase0-findings.md §1) settled the
 * question this script was originally scoped against: supply is not the
 * constraint. N5 kanji have a MEDIAN of 429 usable candidates each. Nothing
 * here needs to scrape sentences together.
 *
 * The constraint is review capacity — ~760 sentences a human must read for
 * Phases 1–2. So this script's job is narrow and specific:
 *
 *   1. EXCLUDE on objective criteria only, and on nothing else.
 *   2. RANK the survivors well enough that the reviewer's first three picks are
 *      usually the right three.
 *   3. EXPLAIN every ranking decision in `scoreBreakdown`, because the ranker
 *      is a first guess and the only way to improve it is to see, per
 *      candidate, what it thought and whether the human agreed.
 *
 * Point 3 is why `scoreBreakdown` is prose and not a number vector. When the
 * reject-reason distribution comes back from Phase 1 review, the question will
 * be "which signal was wrong", and that is only answerable if each candidate
 * carries its own itemised reasoning.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * FILTERS: THREE, AND DELIBERATELY NO MORE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Has an English translation · 8–60 characters · contains no kanji more than
 * one level above target. That is the whole exclusion set, and it is applied by
 * importing `passes(…, 'levelRelaxed')` from coverage.ts rather than
 * reimplementing it, so the shipping filter and the measured coverage funnel
 * cannot drift apart.
 *
 * The PRD originally also pre-filtered on native-speaker ownership. Phase 0
 * measured what that costs: 16 percentage points of coverage, in exchange for a
 * self-reported, unverified, per-user flag that only 660 users set at all. And
 * it would discard the 40.2% of Japanese sentences that are orphaned — of which
 * 99.65% are unadopted `Tanaka Corpus` imports, i.e. curated textbook material,
 * not junk.
 *
 * So ownership and audio RANK here. They never exclude. An orphaned sentence
 * takes no penalty at all; being a Tanaka import is a positive.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY 8 CANDIDATES AND NOT 3
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * `targetPerKanji` is 3 — that is what ships. We emit 8, because a reviewer
 * handed exactly the number they must accept is not reviewing, they are
 * rubber-stamping. With 8 in front of them, rejecting the top pick costs
 * nothing, which is the only way the reject-reason data comes back honest.
 *
 * `totalCandidates` records the PRE-truncation survivor count, so the queue
 * itself shows how much was thrown away to produce those 8.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SENSE CATEGORISATION — WHAT IT DOES, AND WHERE IT HONESTLY FAILS
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Diversity across WORDS is not diversity across MEANINGS. 今日, 毎日 and 先日
 * are three different words that all use 日 to mean "day"; a reviewer handed
 * those ships a 日 page that never shows the 日 of 日本. So candidates also
 * carry `senseHint`, inferred by matching the kanji's own `meaning` list
 * against the English translation, and the greedy selection charges a repeat
 * penalty for reusing a sense (see WEIGHTS.duplicateSenseEach).
 *
 * MEASURED ON N5, AND THE RESULT IS MIXED — read this before trusting it:
 *
 *   - It assigns a sense to ~22% of emitted candidates and abstains on the
 *     rest. Where it fires it is accurate (24/24 correct in a spread sample).
 *   - **It helps least where it is needed most.** It fires reliably on
 *     monosemous concrete nouns — 母/mother, 木/tree, 校/school, 車/car — which
 *     have one sense and need no diversification at all. On the polysemous
 *     kanji that motivated the feature it mostly abstains.
 *   - Only 7 of the 41 multi-sense N5 kanji get ≥2 senses into the shipping 3.
 *
 * The residual failure is NOT mainly a matcher bug. Two deeper causes:
 *
 *   1. **Our `meaning` field is a gloss list, not a sense inventory.** 本 is
 *      recorded as "book, present, true, counter for long cylindrical things".
 *      The 本 of 日本 is the origin/root sense, which is simply not in the
 *      list — so abstaining is CORRECT, and the fix belongs in the dictionary,
 *      not here. This is the same dictionary-quality problem as Phase 0 §5.
 *   2. **Translations paraphrase rather than name the sense.** 気 is "spirit,
 *      mind, air, atmosphere, mood"; 気分 renders as "I feel like going out",
 *      which names none of them. No amount of string matching recovers that.
 *
 * The principled fix is a Japanese word→sense map, i.e. JMdict — already
 * licence-cleared for the dictionary-entries layer in
 * docs/prd/content-source-licence-investigation.md §1. Until that lands, the
 * REVIEWER is the authority: `ReviewDecision.senseTag` overrides the hint, and
 * the publish step should enforce sense spread from tags, not from hints.
 *
 * Deliberately conservative: a wrong hint is worse than no hint, because the
 * reviewer trusts it. When in doubt this abstains.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { builder as kuromojiBuilder } from '@sglkc/kuromoji';
import type { IpadicFeatures, Tokenizer } from '@sglkc/kuromoji';

import {
  KANJI_INVENTORY,
  KANJI_LEVEL,
  LEVELS,
  assertInventory,
  type Level,
} from './kanji-inventory';
import {
  CACHE_DIR,
  DEFAULT_JPN_LICENSE,
  corpusVintage,
  loadEnglishCC0Ids,
  loadEnglishSentences,
  loadJapaneseAudioIds,
  loadJapaneseCC0Ids,
  loadJapaneseSentences,
  loadJapaneseTags,
  loadJpnEngLinks,
  loadUserSkills,
  type Sentence,
} from './corpus';
import {
  CJK,
  LEVEL_BY_RANK,
  LEVEL_RANK,
  MAX_CHARS,
  MIN_CHARS,
  passes,
  type Candidate as CoverageCandidate,
} from './coverage';
import type {
  KanjiQueueEntry,
  KanjiTarget,
  ReviewQueue,
  SentenceCandidate,
  SentenceLevel,
  SentenceLicense,
  SentenceSource,
  Token,
} from '../../lib/sentences/types';
import { candidateId } from '../../lib/sentences/types';
import type { AppliedCorrection } from '../../lib/sentences/reading-corrections';
import { correctReadings } from '../../lib/sentences/reading-corrections';

/* ══════════════════════════ Tunable constants ════════════════════════════ */

/** What ships per kanji after review. Phase 0 §1 recommends 3 for Phases 1–2. */
const TARGET_PER_KANJI = 3;
/** What the reviewer is shown per kanji. See header. */
const EMIT_PER_KANJI = 8;

/**
 * Hard cap on candidates tokenized per kanji.
 *
 * Purely a resource bound. N5's filtered pool is ~31k distinct sentences and
 * would tokenize fine unbounded, but N1 targets 1,004 kanji with no level
 * ceiling above them, and its pool is most of the corpus — tokenizing and
 * retaining that is hundreds of megabytes of Token objects for an output of
 * eight per kanji.
 *
 * The honest caveat: the cap is applied on the corpus-signal half of the score
 * only, since the other half needs the tokens we are deciding whether to
 * compute. A candidate that would have won on word-commonality alone can in
 * principle be cut here. 250 is ~31× the emit count, so that is a theoretical
 * loss rather than a practical one, but it is a real approximation and is
 * stated rather than buried.
 */
const PRE_TOKENIZE_CAP = 250;

/**
 * Sentences tokenized to build the word-frequency table.
 *
 * Deterministic stride sample over the whole Japanese corpus, NOT over the
 * candidate pool — a frequency table built from the candidates would be
 * circular (common words look common because we already preferred the
 * sentences containing them) and would differ per level, making scores
 * incomparable across levels. 60k is ~24% of the corpus and takes a few
 * seconds; the result is cached, keyed by corpus size so a new dump invalidates
 * it automatically.
 */
const FREQ_SAMPLE_SIZE = 60_000;

/**
 * Preferred sentence length, in characters.
 *
 * NOTE this is deliberately NOT the midpoint of the 8–60 filter band. The
 * midpoint is 34 characters, which is a long sentence — fine to allow, wrong to
 * prefer. A kanji example wants enough context to show the word doing its job
 * and no more; 12–24 characters is roughly "one clause plus a particle tail".
 * The band's upper reach exists to avoid throwing away otherwise-excellent
 * sentences, not to be aimed at.
 */
const IDEAL_MIN_CHARS = 12;
const IDEAL_MAX_CHARS = 24;

/**
 * Score weights, all in one place so the ranker can be tuned against Phase 1
 * reject data without archaeology. Base score is 50 so that penalties have room
 * to work without everything collapsing to zero.
 *
 * Rationale for the relative magnitudes:
 *
 *  - The single largest term is `targetReadingUnknown`. A sentence we cannot
 *    put furigana on for the kanji it was chosen FOR has failed at its one job,
 *    and no amount of native-speaker provenance redeems it.
 *  - `properNounOnly` is next. "Kanji present but not meaningfully
 *    demonstrated" is a first-class reject reason in the contract
 *    (`target-kanji-unused`); a target that only occurs inside a place or
 *    person name is the commonest instance of it.
 *  - Provenance signals (native, audio, Tanaka) are worth 6–10 each: real, but
 *    self-reported and weak per Phase 0 §1, so collectively they can shift a
 *    ranking without ever overturning a correctness signal.
 *  - `wordFrequency` is worth up to 14 — the same order as the provenance
 *    signals combined, because "does this sentence teach the reading a learner
 *    will actually meet" is closer to the product's purpose than who typed it.
 *  - `duplicateWord` is intentionally brutal. Three sentences showing 暑い is
 *    worse for the reviewer than two good ones and one mediocre one showing a
 *    different word, because the reviewer cannot conjure variety that is not on
 *    the page.
 */
const WEIGHTS = {
  base: 50,

  jpNative: 10,
  enNative: 4,
  tanaka: 6,
  audio: 8,

  lengthMax: 12,

  atTargetLevel: 10,
  aboveTargetLevel: -6,
  aboveTargetExtraEach: -3,
  aboveTargetFloor: -15,

  unknownKanjiEach: -7,
  unknownKanjiFloor: -21,

  targetReadingUnknown: -25,
  otherReadingUnknownEach: -6,
  otherReadingUnknownFloor: -18,

  properNounOnly: -15,

  wordFrequencyMax: 14,
  /** Sample count at which a word earns the full frequency bonus. */
  wordFrequencySaturation: 300,

  knownMisreadingEach: -4,

  duplicateWordEach: -18,
  duplicateWordFloor: -45,

  /**
   * Repeating a SENSE is a milder fault than repeating a WORD — 今日 and 毎日
   * at least teach two vocabulary items — so this is deliberately weaker than
   * `duplicateWordEach`. It is enough to break a tie between two otherwise
   * comparable candidates, not enough to promote a bad sentence over a good
   * one purely for being a different sense. Candidates whose sense could not be
   * inferred (`null`) are never penalised; we do not punish a sentence for our
   * own heuristic abstaining.
   */
  duplicateSenseEach: -9,
  duplicateSenseFloor: -22,

  /**
   * Charge for a sentence that is near-textually identical to one already
   * selected. Distinct from `duplicateWordEach`: these pairs use DIFFERENT
   * words and so slip past that check entirely, while still spending two of a
   * kanji's eight slots on one idea —
   *
   *   この本はね、小学校の時に読んだよ。 / この本は、小学生の時に読んだよ。
   *   一休みしませんか。               / ひと休みしませんか。
   *
   * Heavy enough to lose to almost anything else, but finite: a kanji whose
   * pool genuinely holds nothing else should still fill its slots.
   */
  nearDuplicateEach: -30,
} as const;

/**
 * Trigram-overlap threshold above which two sentences are "the same one".
 *
 * 0.45, not the 0.6 this started at. Japanese sentences here are short, so they
 * yield few trigrams and a one-character substitution costs far more overlap
 * than intuition suggests: 小学校/小学生 — the pair this penalty was written for
 * — scores 0.450, and the two シンガポール sentences score 0.563. At 0.6 the
 * penalty fired exactly zero times across all 650 candidates.
 */
const NEAR_DUPLICATE_JACCARD = 0.45;

/**
 * IPADIC's known silent misreadings, from Phase 0 §4.
 *
 * These are the worst class of tokenizer error for this product: not a crash,
 * not a null, but a plausible-looking reading that is simply wrong. The
 * reading-accuracy ceiling is ~95–97% and this is where most of the missing 3–5%
 * lives. Human review exists precisely to catch them, so the primary job here is
 * to SURFACE them in `scoreBreakdown` — the small penalty is secondary, and
 * deliberately small: it nudges us toward sentences without a known trap without
 * suppressing a sentence the reviewer might well accept after checking.
 *
 * This list should grow from Phase 1's `wrong-reading` reject reasons. It is a
 * record of what we have been burned by, not an attempt at completeness.
 */
const KNOWN_MISREADINGS: {
  surface: string;
  reading: string;
  /** Extra context test, for readings that are only wrong in some environments. */
  when?: (raw: IpadicFeatures[], i: number) => boolean;
  note: string;
}[] = [
  // ── From Phase 0 §4, which named these explicitly.
  { surface: '一人', reading: 'イチニン', note: 'almost always ひとり' },
  { surface: '行っ', reading: 'オコナッ', note: 'almost always いっ (行く), not おこなう' },
  { surface: '人気', reading: 'ニンキ', note: 'can be ひとけ' },
  {
    surface: '一日',
    reading: 'イチニチ',
    when: (raw, i) => raw[i + 1]?.surface_form === '中',
    note: '一日中 is いちにちじゅう; IPADIC splits it and mis-reads the tail',
  },
  // ── Observed while building this script, on the very first N5 run.
  { surface: '日本人', reading: 'ニッポンジン', note: 'usually にほんじん' },
  {
    surface: '月',
    reading: 'ツキ',
    when: (raw, i) => /^[0-9０-９一二三四五六七八九十]+$/u.test(raw[i - 1]?.surface_form ?? ''),
    note: 'after a numeral this is がつ (the month), not つき (the moon)',
  },

  // ── From the N5 queue audit. Every one of these has TWO live readings and
  //    only context chooses between them, which is why they are flagged here
  //    rather than corrected in lib/sentences/reading-corrections.ts. Putting a
  //    context-dependent pair in that table would reintroduce exactly the
  //    confident-but-wrong reading this list exists to catch.
  {
    surface: '木の下',
    reading: 'コノシタ',
    note: 'このした is the surname 木下; the phrase "under the tree" is きのした',
  },
  {
    surface: '時の間',
    reading: 'トキノマ',
    when: (raw, i) => /^[0-9０-９一二三四五六七八九十]+$/u.test(raw[i - 1]?.surface_form ?? ''),
    note: 'after a numeral this is a mis-parse — 「３時 の 間」 is さんじ…あいだ, not the noun ときのま',
  },
  {
    surface: '何分',
    reading: 'ナニブン',
    note: 'なにぶん means "at any rate"; asking a quantity of minutes is なんぷん',
  },
  {
    surface: '何時',
    reading: 'イツ',
    note: 'いつ ("when") and なんじ ("what time") are both live here; check the English',
  },
  {
    surface: '行',
    reading: 'クダリ',
    note: 'a line of text is ぎょう; くだり is a passage in classical prose',
  },
  // ── From an adversarial sweep of all 592 distinct surface|reading pairs in
  //    the N5 queue. Each is a real misreading IPADIC produced, and each has a
  //    second live reading, so each is a flag rather than a table entry.
  {
    surface: '大',
    reading: 'ダイ',
    when: (raw, i) => raw[i + 1]?.surface_form === '火事',
    note: '大火事 is おおかじ; 大 is おお here, not だい',
  },
  {
    surface: '下',
    reading: 'シタ',
    // Narrow on purpose. 「机の下に」 and 「木の下に」 are した and are common, so
    // flagging every 「の下」 would spend review attention on correct readings.
    // もと turns up after an abstract two-kanji noun — 白日の下, 監視の下.
    when: (raw, i) =>
      raw[i - 1]?.surface_form === 'の' &&
      /^[一-鿿]{2,}$/u.test(raw[i - 2]?.surface_form ?? ''),
    note: 'after an abstract jukugo, 「〜の下」 is もと (白日の下 = はくじつのもと), not した',
  },
  {
    surface: '中',
    reading: 'チュウ',
    // 午前 and 午後 are deliberately NOT here: 午前中 is ごぜんちゅう, and listing
    // them charged two live 午 candidates −4 apiece while telling the reviewer
    // to "correct" a reading that was right. A flag that is confidently wrong
    // costs more than no flag.
    when: (raw, i) => /^(今日|明日|昨日|今週|今月|今年)$/u.test(raw[i - 1]?.surface_form ?? ''),
    note: 'after a day word this is じゅう (今日中 = きょうじゅう), not ちゅう',
  },
  {
    surface: '一行',
    reading: 'イッコウ',
    note: 'いっこう is a party of travellers; a line of text is いちぎょう',
  },
  {
    surface: '橋',
    reading: 'キョウ',
    note: 'standalone 橋 is はし; きょう only survives inside compounds like 鉄橋',
  },
  {
    surface: '人',
    reading: 'ジン',
    // じん is right when 人 suffixes a group name — カナダ人 in katakana, or a
    // kanji jukugo like 西洋人 (せいようじん). Only a HIRAGANA neighbour marks the
    // bare noun: 「いい人」 is いいひと. Flagging kanji-preceded 人 as well spent
    // review attention on 西洋人, which was right all along.
    when: (raw, i) => /[ぁ-ん]/u.test((raw[i - 1]?.surface_form ?? '').slice(-1)),
    note: 'じん is the nationality suffix (カナダ人); a bare 人 meaning "person" is ひと',
  },
  {
    surface: '十分',
    reading: 'ジュウブン',
    note: 'confirm the sense: じゅうぶん is "enough", じゅっぷん is ten minutes. IPADIC lexicalises this as one token, so the correction pass can never reach it — this flag is the only guard',
  },
  // ── From a second adversarial sweep (2026-08-25, this file's third pass),
  //    which looked specifically at SINGLE-KANJI tokens standing between kana
  //    — the environment where IPADIC's on-reading default is least defensible
  //    and where the first two sweeps, both organised around jukugo and
  //    numerals, had no reason to look.
  {
    surface: '金',
    reading: 'キン',
    // Unconditional. Both readings are live for a bare 金 — きん is the metal
    // (「金の指輪」), かね is money — and IPADIC picks きん every time. All three
    // occurrences in the N5 queue mean money, one of them at a rank that
    // publishes.
    note: 'a bare 金 meaning money is かね; きん is the metal',
  },
  {
    surface: '今',
    reading: 'コン',
    // IPADIC tags this 接頭詞 — it has decided 今 is the prefix of a compound
    // (今月, 今シーズン) and then found no compound. Standalone 今 is いま.
    // Left as a flag rather than a correction because こん IS right when a
    // noun really does follow (「今シーズンは…」), which is a judgement about
    // the next word, not a lookup.
    note: 'こん is the compound prefix (今月, 今シーズン); a standalone 今 is いま',
  },
  {
    surface: '土',
    reading: 'ド',
    note: 'ど survives only in compounds (土曜日, 土地, 土台), all of which IPADIC keeps whole; a bare 土 meaning soil is つち',
  },
  // ── The pairs AMBIGUOUS in lib/sentences/reading-corrections.ts names as
  //    deliberately excluded from the correction table. That comment promises
  //    the reviewer is told instead, and for a while only 十分 actually was.
  //    Each guard also tests the token BEFORE the numeral: in 二十一日 the
  //    token preceding 日 is still 一, and にじゅういちにち is perfectly regular.
  {
    surface: '日',
    reading: 'ニチ',
    when: (raw, i) =>
      /^(一|1|１)$/u.test(raw[i - 1]?.surface_form ?? '') &&
      !/^[0-9０-９〇零一二三四五六七八九十百千]+$/u.test(raw[i - 2]?.surface_form ?? ''),
    note: '一日 is ついたち (the 1st) or いちにち (a whole day) — both frequent, only the English decides',
  },
  {
    surface: '時間',
    reading: 'ジカン',
    when: (raw, i) =>
      /^(七|7|７)$/u.test(raw[i - 1]?.surface_form ?? '') &&
      !/^[0-9０-９〇零一二三四五六七八九十百千]+$/u.test(raw[i - 2]?.surface_form ?? ''),
    note: '七時間 is しちじかん or ななじかん; both are standard for a span',
  },
  {
    surface: 'ヶ月',
    reading: 'カゲツ',
    when: (raw, i) =>
      /^(八|8|８)$/u.test(raw[i - 1]?.surface_form ?? '') &&
      !/^[0-9０-９〇零一二三四五六七八九十百千]+$/u.test(raw[i - 2]?.surface_form ?? ''),
    note: '八ヶ月 is はっかげつ or はちかげつ; both are ordinary',
  },
  {
    surface: '階',
    reading: 'カイ',
    when: (raw, i) =>
      /^(三|八|3|8|３|８)$/u.test(raw[i - 1]?.surface_form ?? '') &&
      !/^[0-9０-９〇零一二三四五六七八九十百千]+$/u.test(raw[i - 2]?.surface_form ?? ''),
    note: '三階 is さんがい or さんかい and 八階 is はっかい or はちかい; the other floors are in the correction table',
  },
  // ── From a fourth sweep, which re-read all 650 candidates with their English
  //    rather than working from the distinct surface|reading table. Reading a
  //    pair in isolation cannot see 「長い間」; only the sentence can.
  {
    surface: '千',
    reading: 'セン',
    // 何千 is なんぜん — rendaku the numeral table cannot express, because 何 is
    // not a value it can parse. Shipped at rank 1 of 千 and rank 2 of 人.
    when: (raw, i) => raw[i - 1]?.surface_form === '何',
    note: '何千 is なんぜん, not なんせん',
  },
  {
    surface: '間',
    reading: 'カン',
    // Sibling of the 間/マ rule below, and it took a second sweep to find:
    // 「長い間」 tokenizes with かん in one sentence and ま in another, so
    // flagging only ま left ながいかん shipping at rank 2.
    when: (raw, i) => raw[i - 1]?.pos === '形容詞',
    note: 'after an adjective, 間 is あいだ (長い間 = ながいあいだ); かん only survives inside compounds like 年間',
  },
  {
    surface: '書き',
    reading: 'ガキ',
    // がき is the bound rendaku form, and every word that licenses it — 落書き,
    // 下書き — is a single IPADIC token, so a BARE 書き read がき is always the
    // verb and always かき.
    note: 'がき only occurs bound (落書き, 下書き), all of which IPADIC keeps whole; a bare 書き is かき',
  },
  {
    surface: '入り',
    reading: 'イリ',
    // お入りになる is おはいり. お気に入り and 仲間入り are single tokens, so the
    // honorific お is the discriminator without catching the noun uses.
    when: (raw, i) => raw[i - 1]?.surface_form === 'お',
    note: '「お入りになる」 is おはいり; いり is the noun-forming reading (仲間入り), which IPADIC keeps whole',
  },
  {
    surface: '生っ',
    reading: 'ナッ',
    // Not a misreading but a MIS-SEGMENTATION, which reaches the page the same
    // way: 女子高生って split as 女子高 + 生っ + て, so 生 carries なっ.
    note: 'segmentation failure — 女子高生って was split as 女子高 + 生っ; the word is じょしこうせい',
  },
  {
    surface: '間',
    reading: 'マ',
    // Deliberately unconditional. The first version of this rule fired only
    // after の and missed 「長い間」 at rank 2 — ながいあいだ, rendered ながいま.
    // Standalone 間 is あいだ in almost every environment a learner meets; ま
    // survives in 「間が持たない」 and 「間を置く」, which is exactly enough
    // ambiguity to keep this a flag rather than a correction.
    note: 'standalone 間 is usually あいだ (a span); ま is the rarer "pause/timing" sense',
  },
];

/* ══════════════════════════════ Kana handling ════════════════════════════ */

/** Katakana IPADIC readings are only useful as furigana once folded to hiragana. */
function katakanaToHiragana(s: string): string {
  let out = '';
  for (const ch of s) {
    const code = ch.codePointAt(0)!;
    // U+30A1..U+30F6 is the katakana block that has a hiragana counterpart.
    // ー (U+30FC), ・ (U+30FB) and everything else pass through unchanged; the
    // long-vowel mark is used in hiragana too and must not be shifted.
    out += code >= 0x30a1 && code <= 0x30f6 ? String.fromCodePoint(code - 0x60) : ch;
  }
  return out;
}

/**
 * A reading we are willing to render. IPADIC returns the surface form itself
 * for punctuation and sometimes `*`; neither is a reading, and rendering either
 * as furigana would be a visible lie.
 */
const KATAKANA_READING = /^[ァ-ヶーヽヾ・]+$/u;

function hasKanji(s: string): boolean {
  for (const ch of s) if (CJK.test(ch)) return true;
  return false;
}

/* ═══════════════════════════════ Tokenizer ═══════════════════════════════ */

/**
 * kuromoji is build-time only and must never reach the runtime bundle — the
 * IPADIC dictionary alone is ~15MB. Nothing under app/ or lib/ imports it; this
 * script and the publish step are its only consumers, and both run offline.
 */
function buildTokenizer(): Promise<Tokenizer<IpadicFeatures>> {
  // require.resolve rather than a hand-built relative path: under pnpm,
  // node_modules/@sglkc is a symlink farm and `../../node_modules/...` only
  // works by accident of the current hoisting layout.
  const dicPath = join(dirname(require.resolve('@sglkc/kuromoji/package.json')), 'dict');
  return new Promise((res, rej) => {
    kuromojiBuilder({ dicPath }).build((err, tokenizer) => {
      if (err) rej(err);
      else res(tokenizer);
    });
  });
}

interface Tokenized {
  tokens: Token[];
  raw: IpadicFeatures[];
  /** Tokens containing kanji for which IPADIC gave us no usable reading. */
  unknownReadings: number;
  /** Hits from KNOWN_MISREADINGS, already formatted for `scoreBreakdown`. */
  misreadingFlags: string[];
  /** Numeral/counter and 日本 readings rewritten by `correctReadings`. */
  corrections: AppliedCorrection[];
  /**
   * Maps an index into `raw` to its index in `tokens`. Not the identity —
   * `correctReadings` merges a numeral into its counter, so `tokens` is shorter
   * than `raw` whenever a correction fired. Anything walking the two in
   * parallel MUST go through this.
   */
  rawToToken: number[];
}

/**
 * Turn a sentence into `Token[]`.
 *
 * THE HARD INVARIANT: concatenating every `surface` reconstructs `japanese`
 * exactly. This is not a stylistic preference — furigana is rendered by walking
 * the token list, so a dropped character is a corrupted sentence on the page,
 * and the source text is licensed on a no-modification basis. Verified here per
 * sentence and again over the whole queue before writing.
 *
 * Readings are attached ONLY to tokens containing kanji. Kana tokens and
 * punctuation carry no reading (per the `Token` contract), and a kanji-bearing
 * token whose reading IPADIC could not supply is marked `readingUnknown` rather
 * than guessed. Guessing is the one thing that would make this feature worse
 * than having no furigana at all.
 */
function tokenize(tokenizer: Tokenizer<IpadicFeatures>, japanese: string): Tokenized | null {
  const raw = tokenizer.tokenize(japanese);
  const tokens: Token[] = [];
  let unknownReadings = 0;
  /** Flag hits, kept with their raw index so corrections can retire them below. */
  const flagged: { rawIndex: number; text: string }[] = [];

  for (let i = 0; i < raw.length; i++) {
    const t = raw[i];
    const token: Token = { surface: t.surface_form };

    if (hasKanji(t.surface_form)) {
      const reading = t.reading;
      if (reading && KATAKANA_READING.test(reading)) {
        token.reading = katakanaToHiragana(reading);
      } else {
        token.readingUnknown = true;
        unknownReadings++;
      }
    }

    for (const m of KNOWN_MISREADINGS) {
      if (t.surface_form !== m.surface || t.reading !== m.reading) continue;
      if (m.when && !m.when(raw, i)) continue;
      flagged.push({
        rawIndex: i,
        text: `⚠ known IPADIC failure: 「${m.surface}」 read as ${m.reading} — ${m.note}; verify before accepting`,
      });
    }

    tokens.push(token);
  }

  // Correct the numeral/counter irregularities IPADIC cannot see, and 日本's
  // にっぽん default. This MERGES tokens (八《はち》日《にち》 → 八日《ようか》),
  // which is why it must run before the invariant check below rather than
  // after — merging preserves the concatenated surface, and that is precisely
  // the property worth re-asserting on the rewritten array rather than the
  // original one.
  const corrected = correctReadings(tokens);

  // Reject rather than throw. A single pathological sentence out of 250k must
  // not take the run down, but it must also never reach the queue — so it is
  // dropped here and counted, and the run reports the count loudly at the end.
  if (corrected.tokens.map((t) => t.surface).join('') !== japanese) return null;

  // Recount rather than carry the pre-merge tally forward: a correction can
  // absorb a token, and this number drives a score penalty.
  unknownReadings = corrected.tokens.filter((t) => t.readingUnknown).length;

  // Retire any flag the correction pass has already resolved. The two overlap
  // by construction — 日本人/ニッポンジン is both a KNOWN_MISREADING and a thing
  // correctNipponReading fixes — and leaving both in place charged the
  // candidate −4 for a defect it no longer had, then told the reviewer to
  // verify furigana that was already right.
  // Retire by INDEX. Keying this by the corrected surface — as it did at first —
  // could never retire a counter flag at all, because a merge's surface (`9月`)
  // is by construction not the flag's surface (`月`). The reviewer was still
  // charged −4 and told to verify 「月」 on a sentence where 9月 had already been
  // corrected to くがつ, which is precisely what this retirement was written to
  // stop. `sourceIndex` maps the flag's raw index to the token that absorbed it.
  const misreadingFlags = flagged
    .filter((f) => !corrected.correctedIndices.has(corrected.sourceIndex[f.rawIndex]))
    .map((f) => f.text);

  return {
    tokens: corrected.tokens,
    raw,
    unknownReadings,
    misreadingFlags,
    corrections: corrected.corrections,
    rawToToken: corrected.sourceIndex,
  };
}

/* ═══════════════════════ Corpus word-frequency table ═════════════════════ */

/** Grammatical scaffolding — frequency here says nothing about vocabulary. */
const FUNCTION_POS = new Set(['助詞', '助動詞', '記号', 'フィラー', 'その他']);

/** The lemma we count frequency against; `*` means IPADIC had no lemma. */
function lemma(t: IpadicFeatures): string {
  return t.basic_form && t.basic_form !== '*' ? t.basic_form : t.surface_form;
}

/**
 * Word → occurrences in a deterministic stride sample of the corpus.
 *
 * "Is the target kanji here in a common word or a rare one" needs a frequency
 * opinion, and Phase 0 §2 closed off every licensable external frequency list
 * we might have used — the JLPT lists are unlicensable and JMdict's frequency
 * bands come with an on-every-screen acknowledgement condition that is a
 * site-wide decision, not a detail. Tatoeba itself is already licensed to us
 * and is right here, so we count it.
 *
 * Its bias is worth stating: Tatoeba over-represents textbook and conversational
 * register. For distinguishing 学校 from 校倉 that is entirely sufficient, and
 * it is the same register we are selecting sentences from anyway.
 */
function buildWordFrequencies(
  tokenizer: Tokenizer<IpadicFeatures>,
  jpn: Map<number, Sentence>
): Map<string, number> {
  const cache = join(CACHE_DIR, `word-freq-${FREQ_SAMPLE_SIZE}-${jpn.size}.json`);
  if (existsSync(cache)) {
    return new Map(Object.entries(JSON.parse(readFileSync(cache, 'utf8')) as Record<string, number>));
  }

  // Sorted ids + fixed stride = the same sample every run for a given dump,
  // so scores are reproducible and a re-run does not reshuffle the queue.
  const ids = [...jpn.keys()].sort((a, b) => a - b);
  const eligible = ids.filter((id) => {
    const n = [...jpn.get(id)!.text].length;
    return n >= MIN_CHARS && n <= MAX_CHARS;
  });
  const stride = Math.max(1, Math.floor(eligible.length / FREQ_SAMPLE_SIZE));

  const freq = new Map<string, number>();
  let sampled = 0;
  for (let i = 0; i < eligible.length; i += stride) {
    const text = jpn.get(eligible[i])!.text;
    for (const t of tokenizer.tokenize(text)) {
      if (FUNCTION_POS.has(t.pos)) continue;
      const w = lemma(t);
      freq.set(w, (freq.get(w) ?? 0) + 1);
    }
    sampled++;
  }
  console.log(
    `  word frequencies from ${sampled.toLocaleString()} sampled sentences ` +
      `(${freq.size.toLocaleString()} distinct lemmas)`
  );

  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(cache, JSON.stringify(Object.fromEntries(freq)), 'utf8');
  return freq;
}

/* ═════════════════════════════ Candidate model ═══════════════════════════ */

/**
 * Extends coverage.ts's `Candidate` — the shape its `passes()` filter reads —
 * with everything the ranker and the attribution block need. Structural typing
 * means this can be handed straight to `passes()`, which is the point: one
 * filter implementation, shared.
 */
interface Cand extends CoverageCandidate {
  /** The English sentence we actually chose, for attribution. */
  englishId: number;
  englishOwner: string | null;
  /** Distinct dictionary kanji present, at any level. */
  dictKanji: string[];
  /** Dictionary kanji harder than the target level. */
  aboveTarget: string[];
  jpnLicense: SentenceLicense;
  engLicense: SentenceLicense;
}

function tatoebaUrl(id: number): string {
  return `https://tatoeba.org/en/sentences/show/${id}`;
}

/* ══════════════════════════════ Scoring ══════════════════════════════════ */

interface Scored {
  points: number;
  lines: string[];
}

/**
 * Record one contribution.
 *
 * Zero-valued contributions are recorded too, as `±0.0`. That is deliberate: a
 * reviewer looking at a breakdown needs to distinguish "we considered this and
 * it earned nothing" (a word we have never seen in the corpus, a sentence right
 * at the length band's edge) from "we never looked". Suppressing zeros made
 * 暑がり — a legitimately rare word — indistinguishable from a scoring bug.
 *
 * Every line carries its signed number, so the breakdown sums to `score` and
 * the arithmetic is checkable by eye. The self-check at the end verifies it.
 */
function add(s: Scored, points: number, reason: string): void {
  s.points += points;
  const sign = points > 0 ? '+' : points < 0 ? '' : '±';
  s.lines.push(`${sign}${points.toFixed(1)} ${reason}`);
}

/**
 * The half of the score derivable without tokenizing.
 *
 * Split out for a practical reason: this is what PRE_TOKENIZE_CAP ranks on, so
 * it must be computable before we decide which sentences are worth the
 * tokenizer's time. Keeping it a separate function rather than a duplicated
 * "cheap score" means the two can never disagree.
 */
function scoreCorpusSignals(c: Cand, targetRank: number): Scored {
  const s: Scored = { points: 0, lines: [] };
  add(s, WEIGHTS.base, 'base score');

  // ── Provenance. Ranking only; see the header on why none of this excludes.
  if (c.jpnNative) add(s, WEIGHTS.jpNative, 'JP author declares native speaker');
  if (c.engNative) add(s, WEIGHTS.enNative, 'EN translator declares native speaker');
  if (c.isTanaka) add(s, WEIGHTS.tanaka, 'Tanaka Corpus — curated textbook source');
  if (c.hasAudio) {
    add(s, WEIGHTS.audio, 'has a recorded reading (quality signal only — audio is never shipped)');
  }
  if (c.owner === null) {
    // Recorded, not scored. Without this line a reviewer looking at an
    // orphaned sentence has no way to tell whether we penalised it.
    add(s, 0, 'orphaned (no owner) — not penalised, per Phase 0 §1');
  }

  // ── Shape. Trapezoid: flat across the preferred band, tapering to zero at
  // the filter's edges, so a 9-character and a 58-character sentence are both
  // allowed but neither is preferred.
  const len = c.length;
  let lengthFrac: number;
  if (len < IDEAL_MIN_CHARS) lengthFrac = (len - MIN_CHARS) / (IDEAL_MIN_CHARS - MIN_CHARS);
  else if (len > IDEAL_MAX_CHARS) lengthFrac = (MAX_CHARS - len) / (MAX_CHARS - IDEAL_MAX_CHARS);
  else lengthFrac = 1;
  add(
    s,
    WEIGHTS.lengthMax * Math.max(0, Math.min(1, lengthFrac)),
    `${len} chars (prefer ${IDEAL_MIN_CHARS}–${IDEAL_MAX_CHARS})`
  );

  // ── Complexity relative to target.
  //
  // Note the asymmetry: a sentence containing the target kanji can never be
  // EASIER than the target level, because the target kanji itself sets the
  // floor. So there is no "simpler than target" case to reward — the only two
  // states are "nothing above target" and "n kanji one level above".
  if (c.aboveTarget.length === 0) {
    add(s, WEIGHTS.atTargetLevel, 'no kanji above the target level');
  } else {
    const penalty = Math.max(
      WEIGHTS.aboveTargetFloor,
      WEIGHTS.aboveTargetLevel + WEIGHTS.aboveTargetExtraEach * (c.aboveTarget.length - 1)
    );
    add(s, penalty, `${c.aboveTarget.length} kanji one level above target (${c.aboveTarget.join('')})`);
  }

  if (c.unknown.length > 0) {
    add(
      s,
      Math.max(WEIGHTS.unknownKanjiFloor, WEIGHTS.unknownKanjiEach * c.unknown.length),
      `${c.unknown.length} kanji not in our dictionary (${c.unknown.join('')})`
    );
  }

  return s;
}

/** Frequency bonus, log-scaled — the gap between 1 and 30 uses matters far more than 300 vs 900. */
function frequencyBonus(count: number): number {
  if (count <= 0) return 0;
  const frac = Math.log1p(count) / Math.log1p(WEIGHTS.wordFrequencySaturation);
  return WEIGHTS.wordFrequencyMax * Math.min(1, frac);
}

/* ══════════════════════════ Sense categorisation ═════════════════════════ */

/**
 * WHY: the word-diversity penalty above spreads candidates across WORDS, which
 * is not the same as spreading them across MEANINGS. 今日, 毎日 and 先日 are
 * three distinct words that all use 日 in its "day" sense; a reviewer handed
 * those three gets a section that teaches one third of what 日 does, and never
 * shows the 日 of 日本. For a dictionary the sense spread IS the pedagogy.
 *
 * We already own a sense list: `KanjiData.meaning` ("day, sun, Japan, counter
 * for days"). What we lack is a word→sense mapping, so the sense is inferred
 * from the English translation instead. That is a genuinely weak signal and is
 * labelled as a hint everywhere it surfaces. See `SentenceCandidate.senseHint`.
 */

/**
 * Split a `meaning` field into senses.
 *
 * Two traps in the real data, both hit on the first N5 run:
 *   - "10,000" and "2, 3" — a comma followed by a digit is a THOUSANDS
 *     SEPARATOR or a numeral gloss, not a sense boundary.
 *   - "two, 2" / "four, 4" — the numeral is a restatement of the word, not a
 *     second sense. Numeric-only senses are dropped.
 */
function parseSenses(meaning: string): string[] {
  return meaning
    .split(/,(?!\s*\d)/)
    .map(s => s.trim().toLowerCase())
    .filter(s => s.length > 0 && !/^[\d,.\s]+$/.test(s));
}

/**
 * Words too generic to identify a sense. Matching on these produces confident
 * nonsense — "counter for days" would otherwise match any sentence containing
 * "for".
 */
const SENSE_STOPWORDS = new Set([
  'a', 'an', 'the', 'of', 'for', 'to', 'and', 'or', 'in', 'on', 'at', 'by',
  'with', 'from', 'as', 'is', 'be', 'it', 'its', 'this', 'that', 'thing',
  'things', 'counter', 'used', 'etc', 'one', 'something', 'someone',
]);

/**
 * Content words of a sense, longest first so the most specific phrase wins when
 * several senses match. Words shorter than three characters are dropped — "up",
 * "go" and the like match everywhere.
 */
function senseKeywords(sense: string): string[] {
  return sense
    .split(/[\s/()-]+/)
    .map(w => w.replace(/[^a-z]/g, ''))
    .filter(w => w.length >= 3 && !SENSE_STOPWORDS.has(w))
    .sort((a, b) => b.length - a.length);
}

/**
 * Does `english` use `word`, allowing the derivations English actually forms?
 *
 * Three layers, each added because the previous one demonstrably missed real
 * cases in the N5 output:
 *
 * 1. **Inflection.** day/days, print/printing/printed, carry/carries/carried.
 *
 * 2. **Nationality and adjectival suffixes** — `-ese -ish -ian -an -ic`.
 *    Without these, 日本語 → "Mary spoke Japanese slowly" failed to match the
 *    sense "japan", which is exactly the polysemy case the feature exists for.
 *
 * 3. **Compound heads.** English compounds are head-final — a *holiday* is a
 *    kind of day, *today* is a day — so a keyword is allowed to match at the
 *    END of a longer word. This catches 今日 → "today" → sense "day".
 *
 *    Deliberately asymmetric: suffix position only, never prefix. Prefix
 *    matching would read "Sunday" as the *sun* sense of 日, which is wrong;
 *    suffix matching reads it as the *day* sense, which is right. The
 *    head-final rule is what makes that asymmetry principled rather than a
 *    patch.
 *
 *    Restricted to keywords of 4+ characters. Three-letter heads are unsafe in
 *    suffix position: "air" (a sense of 気) would match *chair*, *hair* and
 *    *repair*. The cost of that bound is that 今日 → "today" still misses the
 *    "day" sense, since "day" is three letters. Accepted knowingly — a wrong
 *    sense is worse than an absent one, because the reviewer trusts a hint.
 */
function usesWord(english: string, word: string): boolean {
  const stem = word.replace(/(y|e)$/, '');
  const infl = '(y|e)?(s|es|ed|ing|ies|ied)?';
  const adj = '(ese|ish|ian|an|ic)?';
  // Trailing \b is always required, so a bare prefix fragment never matches.
  // The leading \b is dropped only for long keywords, which is what lets a
  // compound head match ("holi|day", "birth|day").
  // A suffix match additionally needs at least three letters in front of it.
  // Without that, `round` (a sense of 円) matched inside "a|round" and, being
  // longer than `yen`, won the longest-keyword tiebreak — so 「１万円ぐらい」/
  // "It will cost around 10,000 yen" was hinted `round`. Real compound heads
  // all clear the bar ("after|noon", "birth|day", "Japan|ese"); "a|round" does
  // not. Swept over the whole N5 queue this changes exactly one hint.
  const lead = word.length >= 4 ? '(\\b|(?<=[a-z]{3}))' : '\\b';
  return new RegExp(`${lead}${stem}${infl}${adj}\\b`, 'i').test(english);
}

/**
 * Best-guess sense, or null when nothing matches.
 *
 * Null is COMMON and correct — abstract kanji (気 "spirit, mind, air, mood")
 * rarely name their sense in a natural translation, and guessing would be
 * worse than abstaining. Roughly half of candidates return null; that is the
 * heuristic being honest, not failing.
 */
function inferSense(english: string, senses: string[]): string | null {
  // A kanji with a single parsed sense has no sense QUESTION, so a hint here
  // carries no information — and it is not merely inert, because senseKey feeds
  // `sensePenalty` during selection. On a monosemous kanji that penalty inverts:
  // it charges the candidates whose translation names the kanji's only meaning
  // and exempts the ones whose translation does not. On 右 [right (direction)]
  // the two exempt candidates were both idioms where 右 is not the direction at
  // all (「右から左へ」, 「右に出る者はいない」) — precisely the sentences a 右
  // page should not be featuring, promoted over the literal ones.
  //
  // 41 of the 82 N5 kanji parse to one sense, and they accounted for 43 of the
  // 62 penalty firings in the queue before this line existed.
  if (senses.length < 2) return null;

  let best: string | null = null;
  let bestLen = 0;
  for (const sense of senses) {
    for (const kw of senseKeywords(sense)) {
      if (usesWord(english, kw) && kw.length > bestLen) {
        bestLen = kw.length;
        best = sense;
        break;
      }
    }
  }
  return best;
}

/* ═══════════════════════════════ Main ════════════════════════════════════ */

interface Ranked {
  cand: Cand;
  tok: Tokenized;
  score: number;
  lines: string[];
  targets: KanjiTarget[];
  /** Lemma of the word carrying the target kanji — the diversity key. */
  targetWordKey: string;
  /** Inferred sense of the target kanji, or null when we could not tell. */
  senseKey: string | null;
}

/* ══════════════════════ Near-duplicate detection ═════════════════════════ */

/** Character trigrams of a sentence, for cheap textual overlap. */
function trigrams(s: string): Set<string> {
  const out = new Set<string>();
  const chars = [...s];
  for (let i = 0; i + 3 <= chars.length; i++) out.add(chars.slice(i, i + 3).join(''));
  return out;
}

/** English reduced to comparable form — case and punctuation carry no meaning here. */
function englishKey(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * True when two candidates say the same thing.
 *
 * Two independent tests, because the pairs in the corpus fail in two different
 * ways. Near-identical Japanese catches 小学校/小学生 — one character apart,
 * different words, same sentence. Identical English catches the pair whose
 * Japanese diverges more than the trigram test tolerates but which still
 * teaches nothing new (シンガポールからやって来ました / シンガポールから来ました,
 * both "I'm from Singapore").
 */
function isNearDuplicate(
  a: { japanese: string; english: string | null; grams: Set<string> },
  b: { japanese: string; english: string | null; grams: Set<string> }
): boolean {
  if (a.english && b.english && englishKey(a.english) === englishKey(b.english)) return true;

  let shared = 0;
  for (const g of a.grams) if (b.grams.has(g)) shared++;
  const union = a.grams.size + b.grams.size - shared;
  return union > 0 && shared / union >= NEAR_DUPLICATE_JACCARD;
}

function parseArgs(): { level: Level; kanji: string | null } {
  const argv = process.argv.slice(2);
  const at = (flag: string) => {
    const i = argv.indexOf(flag);
    return i === -1 ? null : (argv[i + 1] ?? null);
  };
  const level = at('--level');
  if (!level || !(LEVELS as readonly string[]).includes(level)) {
    throw new Error(
      `--level is required and must be one of ${LEVELS.join(', ')}.\n` +
        `  npx tsx --tsconfig tsconfig.json scripts/sentences/select.ts --level N5`
    );
  }
  return { level: level as Level, kanji: at('--kanji') };
}

async function main() {
  assertInventory();
  const { level, kanji: onlyKanji } = parseArgs();
  const targetRank = LEVEL_RANK[level];

  const inventory = KANJI_INVENTORY.filter(
    (e) => e.level === level && (onlyKanji === null || e.kanji === onlyKanji)
  );
  if (inventory.length === 0) {
    throw new Error(
      onlyKanji
        ? `${onlyKanji} is not a ${level} kanji in lib/constants/${level.toLowerCase()}-kanji.ts.`
        : `No ${level} kanji in the inventory.`
    );
  }

  console.log(`Selecting example-sentence candidates for ${level}`);
  console.log(`  ${inventory.length} target kanji · emitting ${EMIT_PER_KANJI} each\n`);
  console.log('loading corpus …');

  const jpn = await loadJapaneseSentences();
  const links = await loadJpnEngLinks();
  const tags = await loadJapaneseTags();
  const audio = await loadJapaneseAudioIds();
  const skills = loadUserSkills();
  const jpnCC0 = loadJapaneseCC0Ids();
  const engCC0 = loadEnglishCC0Ids();

  const neededEng = new Set<number>();
  for (const ids of links.values()) for (const id of ids) neededEng.add(id);
  const eng = await loadEnglishSentences(neededEng);

  const vintage = corpusVintage();
  console.log(
    `  ${jpn.size.toLocaleString()} jpn · ${eng.size.toLocaleString()} linked eng · ` +
      `dump vintage ${vintage}\n`
  );

  console.log('building tokenizer …');
  const tokenizer = await buildTokenizer();
  const wordFreq = buildWordFrequencies(tokenizer, jpn);

  // ── Pass 1: build and filter candidates ─────────────────────────────────
  const targetSet = new Set(inventory.map((e) => e.kanji));
  const byKanji = new Map<string, Cand[]>();
  for (const e of inventory) byKanji.set(e.kanji, []);

  for (const s of jpn.values()) {
    const chars = [...s.text];
    let hardestKnown = 0;
    const hits = new Set<string>();
    const dictKanji = new Set<string>();
    const aboveTarget = new Set<string>();
    const unknown = new Set<string>();

    for (const ch of chars) {
      if (!CJK.test(ch)) continue;
      const lvl = KANJI_LEVEL.get(ch);
      if (!lvl) {
        unknown.add(ch);
        continue;
      }
      const rank = LEVEL_RANK[lvl];
      if (rank > hardestKnown) hardestKnown = rank;
      if (rank > targetRank) aboveTarget.add(ch);
      dictKanji.add(ch);
      if (targetSet.has(ch)) hits.add(ch);
    }
    if (hits.size === 0) continue;

    // Attribution requires ONE English sentence, taken whole. coverage.ts picks
    // "first defined text" and "first non-null owner" independently, which is
    // fine for counting but would here credit person A for person B's sentence.
    //
    // Choice among several translations is deterministic: prefer a translator
    // who declares native English, then lowest sentence id. Dangling link rows
    // (gotcha #6) simply fail to resolve and are skipped.
    let chosenEng: Sentence | null = null;
    let chosenEngNative = false;
    for (const id of links.get(s.id) ?? []) {
      const record = eng.get(id);
      if (!record) continue;
      const native = record.owner !== null && skills.get(record.owner)?.eng === 5;
      if (
        chosenEng === null ||
        (native && !chosenEngNative) ||
        (native === chosenEngNative && record.id < chosenEng.id)
      ) {
        chosenEng = record;
        chosenEngNative = native;
      }
    }

    const c: Cand = {
      id: s.id,
      text: s.text,
      english: chosenEng?.text ?? null,
      owner: s.owner,
      isTanaka: (tags.get(s.id) ?? []).includes('Tanaka Corpus'),
      hasAudio: audio.has(s.id),
      jpnNative: s.owner !== null && skills.get(s.owner)?.jpn === 5,
      engNative: chosenEngNative,
      hardestKnownRank: hardestKnown,
      unknown: [...unknown],
      length: chars.length,
      englishId: chosenEng?.id ?? -1,
      englishOwner: chosenEng?.owner ?? null,
      dictKanji: [...dictKanji],
      aboveTarget: [...aboveTarget],
      jpnLicense: jpnCC0.has(s.id) ? 'CC0 1.0' : DEFAULT_JPN_LICENSE,
      engLicense: chosenEng && engCC0.has(chosenEng.id) ? 'CC0 1.0' : DEFAULT_JPN_LICENSE,
    };

    // THE filter — imported, not reimplemented. See coverage.ts's TIERS.
    if (!passes(c, targetRank, 'levelRelaxed')) continue;
    for (const k of hits) byKanji.get(k)!.push(c);
  }

  // ── Pass 2: score, tokenize, diversify ──────────────────────────────────
  const entries: KanjiQueueEntry[] = [];
  const stats = {
    reconstructionFailures: 0,
    tokensEmitted: 0,
    readingUnknownTokens: 0,
    candidatesWithUnknownReading: 0,
    candidatesWithMisreadingFlag: 0,
    targetsWithoutReading: 0,
    // Measured over everything tokenized, not just what was emitted. The
    // emitted figure is expected to be near zero — the ranker penalises unknown
    // readings hard — so on its own it would flatter the tokenizer and hide the
    // real IPADIC failure rate from whoever tunes this next.
    tokensConsidered: 0,
    readingUnknownConsidered: 0,
    // Sense categorisation. `senseHintNull` is not a failure — abstaining is
    // correct when the translation does not name the sense — but the ratio is
    // the honest measure of how much the heuristic actually contributes, so it
    // is reported rather than buried.
    senseHintAssigned: 0,
    senseHintNull: 0,
    /** Kanji with ≥2 senses in the dictionary — the only ones this can help. */
    multiSenseKanji: 0,
    /** Of those, how many got ≥2 distinct senses into the shipping top 3. */
    multiSenseSpread: 0,
  };

  for (const entry of inventory) {
    const pool = byKanji.get(entry.kanji)!;
    const totalCandidates = pool.length;

    /** The kanji's own sense list, e.g. 日 → [day, sun, japan, counter for days]. */
    const senses = parseSenses(entry.meaning);

    // Corpus-signal ranking first, so only the plausible slice is tokenized.
    const preRanked = pool
      .map((c) => ({ c, pre: scoreCorpusSignals(c, targetRank) }))
      .sort((a, b) => b.pre.points - a.pre.points || a.c.id - b.c.id)
      .slice(0, PRE_TOKENIZE_CAP);

    const ranked: Ranked[] = [];
    for (const { c, pre } of preRanked) {
      const tok = tokenize(tokenizer, c.text);
      if (!tok) {
        stats.reconstructionFailures++;
        continue;
      }
      stats.tokensConsidered += tok.tokens.length;
      stats.readingUnknownConsidered += tok.unknownReadings;

      const lines = [...pre.lines];
      let points = pre.points;
      const scoreHere = (p: number, why: string) => {
        const s: Scored = { points: 0, lines };
        add(s, p, why);
        points += s.points;
      };

      // Which token carries each dictionary kanji. First non-punctuation token
      // containing it wins; `word`/`reading` are taken from the SAME token so
      // they cannot disagree.
      const targets: KanjiTarget[] = [];
      let targetToken: IpadicFeatures | null = null;
      let targetTokenIndex = -1;
      for (const k of [entry.kanji, ...c.dictKanji.filter((x) => x !== entry.kanji)]) {
        const idx = tok.raw.findIndex((t) => t.pos !== '記号' && t.surface_form.includes(k));
        if (idx === -1) continue;
        // `idx` addresses `raw`; the token list is shorter wherever a reading
        // correction merged a numeral into its counter.
        const ti = tok.rawToToken[idx];
        if (k === entry.kanji) {
          targetToken = tok.raw[idx];
          targetTokenIndex = ti;
        }
        const reading = tok.tokens[ti].reading;
        // A KanjiTarget with no reading would have to carry an empty string,
        // which reads as data rather than as absence. The token's
        // `readingUnknown` flag is the honest record, so the target is simply
        // omitted and the candidate is penalised below.
        // `word` comes from the CORRECTED token, not from `raw`: after a merge
        // the reading covers the whole numeral+counter (八日 → ようか), and
        // pairing it with raw's bare 八 would put the two back into exactly the
        // disagreement this block exists to prevent.
        if (reading) targets.push({ kanji: k, word: tok.tokens[ti].surface, reading });
      }

      // ── Target-usage signals.
      let targetWordKey = entry.kanji;
      if (targetToken === null) {
        // Possible when the kanji occurs only inside a token IPADIC classed as
        // punctuation — vanishingly rare, but it means we cannot say which word
        // demonstrates it, which is the whole deliverable.
        scoreHere(WEIGHTS.targetReadingUnknown, `${entry.kanji} is not inside any word token`);
      } else {
        targetWordKey = lemma(targetToken);
        const targetReading = tok.tokens[targetTokenIndex].reading;
        if (!targetReading) {
          stats.targetsWithoutReading++;
          scoreHere(
            WEIGHTS.targetReadingUnknown,
            `no reading for 「${targetToken.surface_form}」 — cannot render furigana for the target kanji`
          );
        }
        if (targetToken.pos_detail_1 === '固有名詞') {
          scoreHere(
            WEIGHTS.properNounOnly,
            `${entry.kanji} appears only inside the proper noun 「${targetToken.surface_form}」`
          );
        }
        const freq = wordFreq.get(targetWordKey) ?? 0;
        scoreHere(
          frequencyBonus(freq),
          freq > 0
            ? `target word 「${targetWordKey}」 seen ${freq}× in the corpus sample`
            : `target word 「${targetWordKey}」 unseen in the corpus sample — rare usage`
        );
      }

      // ── Readings elsewhere in the sentence.
      const otherUnknown =
        tok.unknownReadings - (targetTokenIndex >= 0 && !tok.tokens[targetTokenIndex].reading ? 1 : 0);
      if (otherUnknown > 0) {
        scoreHere(
          Math.max(WEIGHTS.otherReadingUnknownFloor, WEIGHTS.otherReadingUnknownEach * otherUnknown),
          `${otherUnknown} other token(s) with no reading — furigana will be incomplete`
        );
      }

      for (const flag of tok.misreadingFlags) {
        scoreHere(WEIGHTS.knownMisreadingEach, flag);
      }

      // Corrections carry zero weight — they are not evidence about the
      // sentence, they are a record of what we rewrote before the reviewer saw
      // it. Worth showing precisely because it is otherwise invisible: the
      // queue would look as though IPADIC had got it right all along.
      for (const fix of tok.corrections) {
        scoreHere(0, `✎ reading corrected: 「${fix.surface}」 ${fix.was} → ${fix.now}`);
      }

      const senseKey = inferSense(c.english ?? '', senses);

      ranked.push({ cand: c, tok, score: points, lines, targets, targetWordKey, senseKey });
    }

    // ── Diversity-aware selection (greedy MMR).
    //
    // Straight top-N repeatedly hands the reviewer the same word three times —
    // 日 has hundreds of high-scoring 今日 sentences and they crowd out 日本,
    // 毎日, 日曜日 entirely. So selection is greedy: at each step take the best
    // remaining candidate AFTER charging it for every already-selected sentence
    // that uses the same word. The charge is applied to the emitted `score`, not
    // just to the ordering, so `score` always explains the rank it produced.
    const remaining = [...ranked].sort((a, b) => b.score - a.score || a.cand.id - b.cand.id);
    const usedWord = new Map<string, number>();
    const usedSense = new Map<string, number>();
    const selected: SentenceCandidate[] = [];

    const ordinal = (n: number) =>
      `${n}${n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'}`;

    /** Repeat charge for a word already selected. */
    const wordPenalty = (r: Ranked) => {
      const seen = usedWord.get(r.targetWordKey) ?? 0;
      return seen === 0
        ? 0
        : Math.max(WEIGHTS.duplicateWordFloor, WEIGHTS.duplicateWordEach * seen);
    };

    /**
     * Repeat charge for a SENSE already selected. Candidates whose sense could
     * not be inferred are exempt — abstaining is our uncertainty, not their
     * fault, and charging them would systematically demote the abstract kanji
     * where the heuristic is weakest.
     */
    const sensePenalty = (r: Ranked) => {
      if (r.senseKey === null) return 0;
      const seen = usedSense.get(r.senseKey) ?? 0;
      return seen === 0
        ? 0
        : Math.max(WEIGHTS.duplicateSenseFloor, WEIGHTS.duplicateSenseEach * seen);
    };

    // Trigram sets are built once per candidate, not per comparison — the inner
    // loop below is O(remaining × selected) per pick.
    const textOf = new Map<Ranked, { japanese: string; english: string | null; grams: Set<string> }>();
    const textFor = (r: Ranked) => {
      let t = textOf.get(r);
      if (!t) {
        t = { japanese: r.cand.text, english: r.cand.english ?? null, grams: trigrams(r.cand.text) };
        textOf.set(r, t);
      }
      return t;
    };
    const pickedText: { japanese: string; english: string | null; grams: Set<string> }[] = [];

    /** Repeat charge for a sentence that restates one already selected. */
    const nearDuplicatePenalty = (r: Ranked) => {
      if (pickedText.length === 0) return 0;
      const t = textFor(r);
      let hits = 0;
      for (const p of pickedText) if (isNearDuplicate(t, p)) hits++;
      return WEIGHTS.nearDuplicateEach * hits;
    };

    while (selected.length < EMIT_PER_KANJI && remaining.length > 0) {
      let bestIdx = 0;
      let bestScore = -Infinity;
      let bestWordPenalty = 0;
      let bestSensePenalty = 0;
      let bestDupePenalty = 0;
      for (let i = 0; i < remaining.length; i++) {
        const wp = wordPenalty(remaining[i]);
        const sp = sensePenalty(remaining[i]);
        const dp = nearDuplicatePenalty(remaining[i]);
        const adjusted = remaining[i].score + wp + sp + dp;
        if (adjusted > bestScore) {
          bestScore = adjusted;
          bestIdx = i;
          bestWordPenalty = wp;
          bestSensePenalty = sp;
          bestDupePenalty = dp;
        }
      }

      const pick = remaining.splice(bestIdx, 1)[0];
      pickedText.push(textFor(pick));
      if (bestDupePenalty !== 0) {
        pick.lines.push(
          `${bestDupePenalty.toFixed(1)} diversity: restates a sentence already selected for this kanji`
        );
      }
      const seen = usedWord.get(pick.targetWordKey) ?? 0;
      usedWord.set(pick.targetWordKey, seen + 1);
      if (bestWordPenalty !== 0) {
        pick.lines.push(
          `${bestWordPenalty.toFixed(1)} diversity: ${ordinal(seen + 1)} candidate using 「${pick.targetWordKey}」`
        );
      }
      if (pick.senseKey !== null) {
        const seenSense = usedSense.get(pick.senseKey) ?? 0;
        usedSense.set(pick.senseKey, seenSense + 1);
        if (bestSensePenalty !== 0) {
          pick.lines.push(
            `${bestSensePenalty.toFixed(1)} diversity: ${ordinal(seenSense + 1)} candidate showing the sense “${pick.senseKey}”`
          );
        }
      }

      const jpSource: SentenceSource = {
        sentenceId: pick.cand.id,
        contributor: pick.cand.owner,
        license: pick.cand.jpnLicense,
        url: tatoebaUrl(pick.cand.id),
      };
      const enSource: SentenceSource = {
        sentenceId: pick.cand.englishId,
        contributor: pick.cand.englishOwner,
        license: pick.cand.engLicense,
        url: tatoebaUrl(pick.cand.englishId),
      };

      const sentenceLevel: SentenceLevel =
        pick.cand.unknown.length > 0
          ? 'above-N1'
          : (LEVEL_BY_RANK[pick.cand.hardestKnownRank] as SentenceLevel);

      stats.tokensEmitted += pick.tok.tokens.length;
      stats.readingUnknownTokens += pick.tok.unknownReadings;
      if (pick.tok.unknownReadings > 0) stats.candidatesWithUnknownReading++;
      if (pick.tok.misreadingFlags.length > 0) stats.candidatesWithMisreadingFlag++;

      selected.push({
        id: candidateId(pick.cand.id, pick.cand.englishId),
        targetKanji: entry.kanji,
        targetLevel: level,
        japanese: pick.cand.text, // verbatim
        english: pick.cand.english!, // verbatim; non-null guaranteed by the filter
        tokens: pick.tok.tokens,
        kanji: pick.cand.dictKanji,
        targets: pick.targets,
        level: sentenceLevel,
        source: { japanese: jpSource, english: enSource },
        signals: {
          japaneseByNativeSpeaker: pick.cand.jpnNative,
          englishByNativeSpeaker: pick.cand.engNative,
          hasAudio: pick.cand.hasAudio,
          isTanaka: pick.cand.isTanaka,
        },
        score:
          Math.round((pick.score + bestWordPenalty + bestSensePenalty + bestDupePenalty) * 10) / 10,
        scoreBreakdown: pick.lines,
        rank: selected.length + 1,
        senseHint: pick.senseKey,
      });
    }

    for (const s of selected) {
      if (s.senseHint === null) stats.senseHintNull++;
      else stats.senseHintAssigned++;
    }
    if (senses.length >= 2) {
      stats.multiSenseKanji++;
      const shipping = new Set(
        selected.slice(0, TARGET_PER_KANJI).map((s) => s.senseHint).filter((s): s is string => s !== null)
      );
      if (shipping.size >= 2) stats.multiSenseSpread++;
    }

    entries.push({
      kanji: entry.kanji,
      level,
      meaning: entry.meaning,
      candidates: selected,
      totalCandidates,
    });
  }

  // ── Single-kanji mode: report, write nothing ────────────────────────────
  //
  // Writing a one-kanji file to <level>.json would silently destroy the queue a
  // reviewer is working against, and decisions are keyed to candidates in that
  // file. Iteration must be free of that risk, so this path is read-only —
  // matching coverage.ts --kanji, which also reports and returns.
  if (onlyKanji) {
    const e = entries[0];
    console.log(
      `\n${e.kanji} (${e.level}, ${e.meaning}) — ${e.totalCandidates.toLocaleString()} passed filtering\n`
    );
    for (const c of e.candidates) {
      console.log(`  #${c.rank}  score ${c.score}   ${c.japanese}`);
      console.log(`      ${c.english}`);
      console.log(
        `      ${c.tokens.map((t) => (t.reading ? `${t.surface}(${t.reading})` : t.readingUnknown ? `${t.surface}(?)` : t.surface)).join(' ')}`
      );
      console.log(
        `      JP #${c.source.japanese.sentenceId} by ${c.source.japanese.contributor ?? '(orphan)'} · ` +
          `EN #${c.source.english.sentenceId} by ${c.source.english.contributor ?? '(orphan)'} · ` +
          `${c.source.japanese.license} / ${c.source.english.license}`
      );
      for (const line of c.scoreBreakdown) console.log(`        ${line}`);
      console.log();
    }
    console.log('(single-kanji mode — no file written)');
    return;
  }

  // ── Self-checks before writing ──────────────────────────────────────────
  const queue: ReviewQueue = {
    level,
    corpusVintage: vintage,
    generatedAt: new Date().toISOString(),
    targetPerKanji: TARGET_PER_KANJI,
    entries,
  };

  const problems: string[] = [];
  let checked = 0;
  for (const e of queue.entries) {
    for (const c of e.candidates) {
      checked++;
      // The hard invariant, re-verified over the finished queue rather than
      // trusted from the tokenizer path — this is the thing CI will enforce.
      if (c.tokens.map((t) => t.surface).join('') !== c.japanese) {
        problems.push(`${c.id}: tokens do not reconstruct the sentence`);
      }
      if (c.japanese.length === 0 || c.english.length === 0) {
        problems.push(`${c.id}: empty sentence text`);
      }
      if (!c.japanese.includes(c.targetKanji)) {
        problems.push(`${c.id}: does not contain its target kanji ${c.targetKanji}`);
      }
      if (!Number.isFinite(c.source.english.sentenceId) || c.source.english.sentenceId < 0) {
        problems.push(`${c.id}: English side has no real sentence id — attribution would be a lie`);
      }
      for (const side of [c.source.japanese, c.source.english]) {
        if (side.license !== 'CC BY 2.0 FR' && side.license !== 'CC0 1.0') {
          problems.push(`${c.id}: unknown licence ${side.license}`);
        }
        if (side.url !== tatoebaUrl(side.sentenceId)) {
          problems.push(`${c.id}: attribution URL does not match its sentence id`);
        }
      }
      for (const t of c.tokens) {
        if (t.reading && t.readingUnknown) problems.push(`${c.id}: token both read and unknown`);
      }
      // The breakdown is the ranker's audit trail. If it does not sum to the
      // score it is decoration, and a reviewer disagreeing with a ranking would
      // have no way to say WHICH signal was wrong.
      const summed = c.scoreBreakdown.reduce((acc, line) => acc + Number(line.split(' ')[0].replace('±', '')), 0);
      if (Math.abs(summed - c.score) > 0.15) {
        problems.push(`${c.id}: scoreBreakdown sums to ${summed.toFixed(1)}, score says ${c.score}`);
      }
    }
  }

  if (problems.length > 0) {
    console.error(`\n✗ ${problems.length} problem(s) — refusing to write the queue:`);
    for (const p of problems.slice(0, 20)) console.error(`    ${p}`);
    process.exit(1);
  }

  const outPath = resolve(__dirname, '../../data/sentences/queue', `${level}.json`);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(queue, null, 2)}\n`, 'utf8');

  // ── Report ──────────────────────────────────────────────────────────────
  const counts = entries.map((e) => e.candidates.length).sort((a, b) => a - b);
  const totals = entries.map((e) => e.totalCandidates).sort((a, b) => a - b);
  const median = (xs: number[]) => xs[Math.floor(xs.length / 2)] ?? 0;
  const distinctWordsInTop3 = entries.map(
    (e) => new Set(e.candidates.slice(0, TARGET_PER_KANJI).map((c) => c.targets[0]?.word ?? '')).size
  );

  console.log(`\nwrote ${outPath}\n`);
  console.log(`  kanji in queue              ${entries.length}`);
  console.log(`  with ≥1 candidate           ${counts.filter((n) => n >= 1).length}`);
  console.log(`  with ≥${TARGET_PER_KANJI} candidates          ${counts.filter((n) => n >= TARGET_PER_KANJI).length}`);
  console.log(`  with the full ${EMIT_PER_KANJI}            ${counts.filter((n) => n >= EMIT_PER_KANJI).length}`);
  console.log(`  median emitted / kanji      ${median(counts)}`);
  console.log(`  median survived filtering   ${median(totals).toLocaleString()}`);
  console.log(`  candidates emitted          ${checked.toLocaleString()}`);
  console.log(`  tokens emitted              ${stats.tokensEmitted.toLocaleString()}`);
  console.log(
    `  tokens readingUnknown       ${stats.readingUnknownTokens.toLocaleString()} ` +
      `(${((stats.readingUnknownTokens / Math.max(1, stats.tokensEmitted)) * 100).toFixed(2)}%, ` +
      `across ${stats.candidatesWithUnknownReading} candidates)`
  );
  console.log(
    `    …across all tokenized      ${stats.readingUnknownConsidered.toLocaleString()} / ` +
      `${stats.tokensConsidered.toLocaleString()} ` +
      `(${((stats.readingUnknownConsidered / Math.max(1, stats.tokensConsidered)) * 100).toFixed(2)}%)`
  );
  console.log(`  target kanji w/o a reading  ${stats.targetsWithoutReading}`);
  console.log(`  flagged known misreadings   ${stats.candidatesWithMisreadingFlag} candidates`);
  console.log(
    `  distinct target words in the top ${TARGET_PER_KANJI}: ` +
      `${(distinctWordsInTop3.reduce((a, b) => a + b, 0) / Math.max(1, distinctWordsInTop3.length)).toFixed(2)} avg ` +
      `(${TARGET_PER_KANJI} is perfect)`
  );
  const senseTotal = stats.senseHintAssigned + stats.senseHintNull;
  console.log(
    `  sense inferred              ${stats.senseHintAssigned} / ${senseTotal} emitted ` +
      `(${((stats.senseHintAssigned / Math.max(1, senseTotal)) * 100).toFixed(0)}%; ` +
      `the rest abstain, which is expected)`
  );
  console.log(
    `  multi-sense kanji spanning ≥2 senses in the top ${TARGET_PER_KANJI}: ` +
      `${stats.multiSenseSpread} / ${stats.multiSenseKanji}`
  );
  if (stats.reconstructionFailures > 0) {
    console.log(
      `\n⚠ ${stats.reconstructionFailures} candidate(s) dropped because the tokenizer did not ` +
        `reconstruct the source text. Not fatal — they were excluded — but investigate if this grows.`
    );
  }
  console.log('\n✓ token-reconstruction invariant holds for every emitted candidate');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
