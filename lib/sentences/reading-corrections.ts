/**
 * lib/sentences/reading-corrections.ts
 *
 * A post-tokenizer correction pass for the one thing IPADIC gets wrong
 * systematically: **a number and its counter, read in isolation.**
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS EXISTS AND WHY IT IS NOT "GUESSING"
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * `tokenize()` in scripts/sentences/select.ts is emphatic that a reading it
 * cannot supply must be flagged, never guessed — a plausible-looking wrong
 * reading is worse than no furigana at all. Nothing here weakens that.
 *
 * The difference is that these are not guesses. IPADIC splits 八 from 日 and
 * reads each correctly *on its own* — はち and にち — and the pair is still
 * wrong, because 八日 is ようか. The irregularity is a closed, finite,
 * textbook-documented set: it is not inferred from context, it is looked up.
 *
 * So the rule this module follows is:
 *
 *   CORRECT only what a literal table entry covers. Never generate a reading.
 *
 * There is no arithmetic fallback that renders "twenty-three days" from parts.
 * If (value, counter) is not in `IRREGULAR_COUNTER_READINGS`, the tokens are
 * returned untouched and IPADIC's regular reading stands — which is correct,
 * because outside this table the regular reading *is* the right answer.
 *
 * Ambiguous pairs are deliberately absent, not forgotten. See `AMBIGUOUS`.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT A CORRECTION DOES TO THE TOKEN ARRAY
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * It MERGES the numeral run and the counter into one token:
 *
 *   八《はち》 日《にち》   →   八日《ようか》
 *
 * Merging rather than rewriting two readings is forced by the language: ようか
 * does not divide into a part over 八 and a part over 日. It is also how ruby
 * over a jukugo is set correctly in the first place.
 *
 * The hard invariant is untouched — merging concatenates the surfaces it
 * replaces, so `tokens.map(t => t.surface).join('')` still reconstructs
 * `japanese` exactly. select.ts re-checks this after calling us.
 *
 * Discovered by auditing data/sentences/queue/N5.json: 38 of 42 wrong readings
 * in that queue were this one failure, and 17 of them sat in a slot that would
 * have published.
 */

import type { Token } from './types';

/* ═════════════════════════════ Numeral parsing ═══════════════════════════ */

/** Half-width, full-width and kanji digits all appear in the corpus. */
const KANJI_DIGITS: Record<string, number> = {
  〇: 0, 零: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9,
};
const KANJI_UNITS: Record<string, number> = { 十: 10, 百: 100, 千: 1000 };

const ARABIC_RUN = /^[0-9]+$/;

/** Fold full-width digits to ASCII so `２０` and `20` parse identically. */
function foldDigits(s: string): string {
  let out = '';
  for (const ch of s) {
    const code = ch.codePointAt(0)!;
    out += code >= 0xff10 && code <= 0xff19 ? String.fromCodePoint(code - 0xfee0) : ch;
  }
  return out;
}

/**
 * True when a token is part of a numeral — i.e. safe to absorb into the run
 * preceding a counter. Kanji numerals and Arabic digits only; nothing else.
 */
export function isNumeralSurface(surface: string): boolean {
  if (!surface) return false;
  const folded = foldDigits(surface);
  if (ARABIC_RUN.test(folded)) return true;
  for (const ch of surface) {
    if (!(ch in KANJI_DIGITS) && !(ch in KANJI_UNITS)) return false;
  }
  return true;
}

/**
 * Parse a numeral run to its value, or null if it is not a clean numeral.
 *
 * Handles Arabic (`24`, `２４`) and kanji positional notation (`二十四`, `十四`,
 * `二十`). Returns null rather than a partial value on anything unexpected —
 * a null here simply means "no correction", which is always safe.
 */
export function parseNumeral(run: string): number | null {
  if (!run) return null;

  const folded = foldDigits(run);
  if (ARABIC_RUN.test(folded)) {
    const n = Number.parseInt(folded, 10);
    return Number.isSafeInteger(n) ? n : null;
  }

  // Mixed Arabic and kanji (`10ヶ月` style runs never mix, but be strict).
  if (/[0-9]/.test(folded)) return null;

  let total = 0;
  let section = 0;
  let sawDigit = false;

  for (const ch of run) {
    if (ch in KANJI_DIGITS) {
      section = section * 10 + KANJI_DIGITS[ch];
      sawDigit = true;
      continue;
    }
    const unit = KANJI_UNITS[ch];
    if (unit === undefined) return null;
    // Bare 十 means 10, not 0×10 — 十四 is fourteen.
    total += (section === 0 ? 1 : section) * unit;
    section = 0;
    sawDigit = true;
  }

  if (!sawDigit) return null;
  return total + section;
}

/* ═════════════════════════ The irregularity table ════════════════════════ */

/**
 * Counter readings that are NOT the sum of their parts.
 *
 * Keyed `<counter surface>:<value>`. Every entry is a standard irregular form.
 * Regular values are deliberately absent — for those IPADIC's split reading is
 * already right and merging would be churn.
 *
 * One entry class IS a preference call, and it should be named rather than
 * hidden: 分/本/ヶ月 at ten and its multiples are written じゅっ- here, which is
 * 慣用. The 常用漢字表 sanctions じっ-. じゅっ- is what learners hear and what
 * Genki and みんなの日本語 teach, so it is the right default for this site — but
 * it is a choice being applied silently, and a reviewer who disagrees should
 * change it here rather than sentence by sentence.
 *
 * Coverage is bounded by what a counter is plausibly used for: dates to 31,
 * clock hours to 12. Beyond that the forms are regular anyway.
 */
const IRREGULAR_COUNTER_READINGS: Record<string, string> = {
  // ── 日 as a date or a span of days. 1 is absent: see AMBIGUOUS.
  //    Two irregular families, and BOTH must be covered: the よっか family at
  //    ones-digit 4, and the く family at ones-digit 9 (19th, 29th — く, never
  //    きゅう). Missing the second was a real gap; calendar dates hit it often.
  '日:2': 'ふつか',
  '日:3': 'みっか',
  '日:4': 'よっか',
  '日:5': 'いつか',
  '日:6': 'むいか',
  '日:7': 'なのか',
  '日:8': 'ようか',
  '日:9': 'ここのか',
  '日:10': 'とおか',
  '日:14': 'じゅうよっか',
  '日:19': 'じゅうくにち',
  '日:20': 'はつか',
  '日:24': 'にじゅうよっか',
  '日:29': 'にじゅうくにち',

  // ── 日間, an explicit span. Same stem, plus かん — including above 10, where
  //    二十日間 is はつかかん and NOT にじゅうにちかん.
  '日間:2': 'ふつかかん',
  '日間:3': 'みっかかん',
  '日間:4': 'よっかかん',
  '日間:5': 'いつかかん',
  '日間:6': 'むいかかん',
  '日間:7': 'なのかかん',
  '日間:8': 'ようかかん',
  '日間:9': 'ここのかかん',
  '日間:10': 'とおかかん',
  '日間:14': 'じゅうよっかかん',
  '日間:19': 'じゅうくにちかん',
  '日間:20': 'はつかかん',
  '日間:24': 'にじゅうよっかかん',
  '日間:29': 'にじゅうくにちかん',

  // ── 人. 1, 2 and 4 — 四人 is よにん, never よんにん or しにん. An earlier
  //    version of this table stopped at 2 on the theory that "三人 onward is
  //    regular", which is simply false at 4.
  '人:1': 'ひとり',
  '人:2': 'ふたり',
  '人:4': 'よにん',
  '人:14': 'じゅうよにん',
  '人:24': 'にじゅうよにん',

  // ── 時, the clock hour, and 時半 — which IPADIC emits as its own token, so
  //    「四時半」 became よんじはん until this row existed.
  //    14 and 24 are here because 時間 already carries them: a 24-hour clock
  //    time is 十四時, and よ/く survive there exactly as they do in the span.
  '時:4': 'よじ',
  '時:7': 'しちじ',
  '時:9': 'くじ',
  '時:14': 'じゅうよじ',
  '時:24': 'にじゅうよじ',
  '時半:4': 'よじはん',
  '時半:7': 'しちじはん',
  '時半:9': 'くじはん',

  // ── 時間, a span of hours. 7 is absent: see AMBIGUOUS.
  '時間:4': 'よじかん',
  '時間:9': 'くじかん',
  '時間:14': 'じゅうよじかん',
  '時間:24': 'にじゅうよじかん',

  // ── 分, with the gemination/handakuon alternations. These recur at every
  //    multiple of ten, so the tens are enumerated rather than assumed regular:
  //    三十分 is さんじゅっぷん, not さんじゅうふん.
  '分:1': 'いっぷん',
  '分:3': 'さんぷん',
  '分:4': 'よんぷん',
  '分:6': 'ろっぷん',
  '分:8': 'はっぷん',
  '分:10': 'じゅっぷん',
  '分:11': 'じゅういっぷん',
  '分:13': 'じゅうさんぷん',
  '分:14': 'じゅうよんぷん',
  '分:16': 'じゅうろっぷん',
  '分:18': 'じゅうはっぷん',
  '分:20': 'にじゅっぷん',
  '分:30': 'さんじゅっぷん',
  '分:40': 'よんじゅっぷん',
  '分:50': 'ごじゅっぷん',
  '分:60': 'ろくじゅっぷん',
  // KNOWN GAP, stated rather than quietly closed: the ones digit above 20 is
  // absent, so ２時２４分 renders にじゅうよんふん where にじゅうよんぷん is
  // correct. Closing it means 24 more rows (21,23,24,26,28 · 31,33,… · 51,53,…)
  // and every one of them would be generated by the rule rather than looked up
  // — which is the arithmetic fallback this module exists to refuse. If a
  // reviewer decides the clock-time case is worth it, they should be written
  // out literally, not computed in a loop.

  // ── 分間, an explicit span of minutes; another token IPADIC keeps whole.
  '分間:1': 'いっぷんかん',
  '分間:3': 'さんぷんかん',
  '分間:4': 'よんぷんかん',
  '分間:6': 'ろっぷんかん',
  '分間:8': 'はっぷんかん',
  '分間:10': 'じゅっぷんかん',

  // ── 本, the long-cylindrical-object counter. Same shape as 分 above ten.
  //    The teens and the remaining tens are enumerated for the same reason 分
  //    enumerates them: 十一本 is じゅういっぽん, not じゅういちほん. Leaving 本
  //    and 階 short while 分 was complete was an asymmetry between counters
  //    that share one phonological rule.
  '本:1': 'いっぽん',
  '本:3': 'さんぼん',
  '本:6': 'ろっぽん',
  '本:8': 'はっぽん',
  '本:10': 'じゅっぽん',
  '本:11': 'じゅういっぽん',
  '本:13': 'じゅうさんぼん',
  '本:16': 'じゅうろっぽん',
  '本:18': 'じゅうはっぽん',
  '本:20': 'にじゅっぽん',
  '本:30': 'さんじゅっぽん',
  '本:40': 'よんじゅっぽん',
  '本:50': 'ごじゅっぽん',
  '本:60': 'ろくじゅっぽん',
  '本:100': 'ひゃっぽん',
  '本:1000': 'せんぼん',

  // ── 月 as a month NAME (四月 = April). Month spans are ヶ月, below.
  '月:4': 'しがつ',
  '月:7': 'しちがつ',
  '月:9': 'くがつ',

  // ── ヶ月, a span of months. 8 is absent — はちかげつ is common enough
  //    alongside はっかげつ to fail this table's own bar. See AMBIGUOUS.
  'ヶ月:1': 'いっかげつ',
  'ヶ月:6': 'ろっかげつ',
  'ヶ月:10': 'じゅっかげつ',

  // ── 階, the floor counter. Same gemination shape as 本 and 分. 3 and 8 are
  //    absent: 三階 is さんがい *or* さんかい and 八階 is はっかい *or* はちかい,
  //    which is exactly the two-live-readings bar this table refuses to cross.
  //    See AMBIGUOUS. Nothing in the N5 queue reaches these rows today — 階 is
  //    an N3 kanji — but 三階 and 五階 already appear as N5 *sentences*, so the
  //    counter is in the corpus and the rows are here before the level that
  //    teaches it arrives.
  '階:1': 'いっかい',
  '階:6': 'ろっかい',
  '階:10': 'じゅっかい',
  '階:11': 'じゅういっかい',
  '階:16': 'じゅうろっかい',
  '階:20': 'にじゅっかい',
  '階:30': 'さんじゅっかい',
  '階:40': 'よんじゅっかい',
  '階:100': 'ひゃっかい',

  // ── 百 and 千 as magnitude words. IPADIC reads the digit and the magnitude
  //    separately and so misses the rendaku/gemination at the seam: it emitted
  //    「三百ドル」 as さんひゃく, where 三百 is さんびゃく.
  //
  //    Deliberately shallow. The walk-back below takes the MAXIMAL numeral run,
  //    so these rows fire only when the run is the bare digit — 二千三百 parses
  //    as 2300 and finds no key, leaving IPADIC's ひゃく standing. Covering that
  //    would mean a row per value ending in 3, 6 or 8, which is arithmetic
  //    dressed as a table and is precisely what this module refuses to do.
  '百:3': 'さんびゃく',
  '百:6': 'ろっぴゃく',
  '百:8': 'はっぴゃく',
  '千:1': 'いっせん',
  '千:3': 'さんぜん',
  '千:8': 'はっせん',
};

/**
 * ヶ月's orthographic variants. Japanese writes this span with at least five
 * different characters in the same slot, and 一ヵ月 (small ヵ, U+30F5) is
 * ordinary in print — a table keyed on ヶ alone lets every other spelling fall
 * straight through. Expanded rather than hand-written so they cannot drift.
 */
for (const variant of ['か月', 'カ月', 'ヵ月', 'ケ月', '箇月']) {
  for (const value of [1, 6, 10]) {
    IRREGULAR_COUNTER_READINGS[`${variant}:${value}`] =
      IRREGULAR_COUNTER_READINGS[`ヶ月:${value}`];
  }
}

/**
 * Pairs left OUT of the table on purpose, so a later reader does not "complete"
 * it and introduce the exact class of confident-but-wrong reading this file
 * exists to remove. Each of these has two live readings and only context picks
 * between them — which makes it review work, not table work.
 *
 *   一日    ついたち (the 1st) vs いちにち (a whole day). Both frequent.
 *   七時間   しちじかん vs ななじかん. Both standard for a span.
 *   八ヶ月   はっかげつ vs はちかげつ. Both ordinary.
 *   三階    さんがい vs さんかい. Both current; さんがい is the traditional form.
 *   八階    はっかい vs はちかい. Same shape as 八ヶ月.
 *   十分    じゅうぶん ("enough") vs じゅっぷん (ten minutes). IPADIC lexicalises
 *           the first as a single token, so it can never reach this pass at all
 *           — a sentence that means ten minutes is structurally uncorrectable
 *           here, which is why select.ts also flags it.
 *
 * Each of these has a matching entry in KNOWN_MISREADINGS in select.ts, so the
 * reviewer is told rather than lied to. That pairing is the whole contract of
 * this list and it is easy to half-do: for a while this comment claimed all
 * four were flagged when only 十分 actually was, which left 一日 rendering
 * いちにち at two rank-1 slots with nothing asking anyone to check it.
 */
export const AMBIGUOUS = [
  '日:1',
  '時間:7',
  'ヶ月:8',
  '階:3',
  '階:8',
  '分:10 (十分)',
] as const;

/**
 * Counters we will absorb a numeral into.
 *
 * DERIVED from the table's own keys rather than written out again. The two
 * drifted the first time they were maintained by hand — ヵ月 and ケ月 were added
 * to the table and silently never matched, because this list did not know about
 * them. The sort is cosmetic: matching is `token.surface === c`, so 日間 can
 * never be shadowed by 日 the way a prefix match would allow.
 */
const COUNTER_SURFACES = [
  ...new Set(Object.keys(IRREGULAR_COUNTER_READINGS).map((k) => k.slice(0, k.lastIndexOf(':')))),
].sort((a, b) => b.length - a.length);

/* ═══════════════════════════ 日本 default reading ════════════════════════ */

/**
 * IPADIC reads 日本 as にっぽん. Both readings are official and neither is an
 * error in the abstract, but にほん is the ordinary modern one and the only one
 * an N5 learner should meet first — and this single default produced 18 wrong
 * rubies in the N5 queue, on the two most-visited character pages on the site.
 *
 * Applied to the reading only; the surface is never touched.
 */
function correctNipponReading(token: Token): string | null {
  if (!token.reading || !token.surface.includes('日本')) return null;
  if (!token.reading.includes('にっぽん')) return null;
  return token.reading.replace(/にっぽん/g, 'にほん');
}

/* ═══════════════════════════════ The pass ════════════════════════════════ */

/** One applied correction, for the run log and for `scoreBreakdown`. */
export interface AppliedCorrection {
  /** The merged surface, e.g. `八日`. */
  surface: string;
  /** What IPADIC's parts would have read as, e.g. `はちにち`. */
  was: string;
  /** What we wrote instead, e.g. `ようか`. */
  now: string;
  kind: 'counter' | 'nihon';
}

export interface CorrectionResult {
  tokens: Token[];
  corrections: AppliedCorrection[];
  /**
   * `sourceIndex[i]` is the index in `tokens` of the token that absorbed input
   * token `i`. Merging makes the output array SHORTER than the input, so any
   * caller holding an index into the pre-correction array — select.ts walks
   * IPADIC's `raw` features and the token list in parallel to build
   * `KanjiTarget`s — must remap through this or it will pair a word with
   * another token's reading.
   */
  sourceIndex: number[];
  /**
   * Indices into `tokens` whose reading this pass supplied. select.ts uses it to
   * retire a reviewer flag the correction already repaired — by index, because
   * the merged surface (`9月`) never equals the flag's surface (`月`), so a
   * surface-keyed check could never retire a counter flag at all.
   */
  correctedIndices: Set<number>;
}

/**
 * Apply every correction this module knows about to one tokenized sentence.
 *
 * Pure: the input array is never mutated. Returns a new token array plus a log
 * of what changed, so a run can report its corrections rather than making them
 * silently — a silent rewrite of licensed-adjacent rendering data is exactly
 * the kind of thing that should be visible in review.
 */
export function correctReadings(tokens: Token[]): CorrectionResult {
  const corrections: AppliedCorrection[] = [];
  const out: Token[] = [];
  const sourceIndex: number[] = [];

  /**
   * Output indices produced BY a merge. Two things depend on knowing this:
   *
   *  1. A merged token must never be re-absorbed by a later merge (see the
   *     walk-back below). 一千 merges to いっせん, and because `一千` is still a
   *     numeral surface the 本 walk-back then re-read the whole run as
   *     `本:1000` and overwrote it with せんぼん — losing the いっ the first
   *     correction had just supplied. That is the same trap 万:1000 was left
   *     out to avoid, arriving from the other direction.
   *  2. select.ts retires a reviewer flag whose defect a correction already
   *     repaired, and needs indices to do it rather than surface strings.
   */
  const mergedOutputIndices = new Set<number>();

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    // ── 1. Numeral run + irregular counter → one merged token.
    const counter = COUNTER_SURFACES.find((c) => token.surface === c);
    // 分 followed by の AND THEN A NUMERAL is a fraction, not a duration:
    // 三分の一 is さんぶんのいち, and correcting it to さんぷん would be a new
    // error. The numeral test is load-bearing — an earlier version guarded on
    // の alone and blocked 「一分のうちに」, which is a plain genitive and really
    // is いっぷん. IPADIC emits 「分の」 as one token for every genuine fraction
    // today, so this fires on nothing; it is insurance against that changing.
    const fraction =
      counter === '分' &&
      tokens[i + 1]?.surface.startsWith('の') &&
      isNumeralSurface(tokens[i + 2]?.surface ?? '');
    // 八百万 is やおよろず as often as it is はっぴゃくまん, so 百 before 万 is an
    // AMBIGUOUS pair, not a table row — and IPADIC does not lexicalise it the
    // way it does 八百屋 and 八百長.
    const magnitudeFollows = counter === '百' && tokens[i + 1]?.surface === '万';
    if (counter && !fraction && !magnitudeFollows && out.length > 0) {
      // Walk back over already-emitted tokens collecting a numeral run, but
      // never THROUGH a token an earlier merge produced — see
      // `mergedOutputIndices`.
      let start = out.length;
      while (start > 0 && isNumeralSurface(out[start - 1].surface)) {
        if (mergedOutputIndices.has(start - 1)) break;
        start--;
      }

      // 第 turns a numeral into an ordinal and blocks the irregular form:
      // 第八日 is だいはちにち, not だいようか.
      if (start > 0 && out[start - 1].surface.endsWith('第')) start = out.length;

      // 「二、三日」 is a range meaning "a couple of days" — にさんにち — not the
      // 3rd of the month. The walk-back stops at the 、 and would otherwise read
      // the trailing numeral as a standalone count, turning IPADIC's already
      // CORRECT に・さん・にち into 三日《みっか》. Same shape as the 第 guard.
      if (
        start > 0 &&
        /^[、，]$/u.test(out[start - 1].surface) &&
        start > 1 &&
        isNumeralSurface(out[start - 2].surface)
      ) {
        start = out.length;
      }

      if (start < out.length) {
        const runTokens = out.slice(start);
        const run = runTokens.map((t) => t.surface).join('');
        const value = parseNumeral(run);

        if (value !== null) {
          const reading = IRREGULAR_COUNTER_READINGS[`${counter}:${value}`];
          if (reading) {
            const was =
              runTokens.map((t) => t.reading ?? t.surface).join('') +
              (token.reading ?? token.surface);
            out.length = start;
            for (const idx of [...mergedOutputIndices]) {
              if (idx >= start) mergedOutputIndices.delete(idx);
            }
            mergedOutputIndices.add(start);
            out.push({ surface: run + token.surface, reading });
            // Every input token that fed the merge now points at the merged one.
            for (let j = 0; j < sourceIndex.length; j++) {
              if (sourceIndex[j] >= start) sourceIndex[j] = start;
            }
            sourceIndex.push(start);
            corrections.push({ surface: run + token.surface, was, now: reading, kind: 'counter' });
            continue;
          }
        }
      }
    }

    // ── 2. 日本 → にほん.
    const nihon = correctNipponReading(token);
    if (nihon) {
      mergedOutputIndices.add(out.length);
      sourceIndex.push(out.length);
      out.push({ ...token, reading: nihon });
      corrections.push({
        surface: token.surface,
        was: token.reading!,
        now: nihon,
        kind: 'nihon',
      });
      continue;
    }

    sourceIndex.push(out.length);
    out.push(token);
  }

  return { tokens: out, corrections, sourceIndex, correctedIndices: mergedOutputIndices };
}
