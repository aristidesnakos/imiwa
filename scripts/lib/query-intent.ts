/**
 * scripts/lib/query-intent.ts
 *
 * Classifies one Search Console query by what the searcher came for. Pure: no
 * I/O, no credentials and no imports from the rest of the repo, so the rules can
 * be run over any list of strings. `check-query-performance.ts --classify-history`
 * runs them over every query the history file has ever stored.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY INTENT, AND WHY CLICKS
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * CTR stopped describing this site. Between the first and the ninth weekly
 * readings, query-dimension impressions went from 26,684 to 358,275 while clicks
 * went from 1,028 to 1,509, and the biggest queries are now ones no learner
 * types: `父、 stroke order` alone drew ~770 impressions a day at position 7.4
 * and never took a click. That fits the query fan-out Google says AI Overviews
 * and AI Mode may use, and fan-out that looks human cannot be told apart at
 * all. A site-wide CTR now measures the impression mix rather than the site, so
 * the weekly reading reports clicks per intent class instead
 * (docs/3rdVersion/level-pages-and-zero-click-review.md §1.2 and §5). The N5
 * level page is read in `level-lists`, the printables in
 * `stroke-order-and-practice`.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE RULES ARE THE REVIEW'S, IN THE REVIEW'S ORDER
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * First match wins, so the order is part of the definition, not an
 * implementation detail. What it decides, before anyone reads a figure:
 *
 *   - `父、 stroke order` is machine-shaped, not stroke order. That is what rule 1
 *     going first is for.
 *   - A printable for one level, such as `n5 kanji practice sheet`, counts as
 *     stroke order and practice, not as a level list, because rule 2 comes before
 *     rule 3. Read the N5 page and the printables work together.
 *   - Brand comes fourth, so `michi kanji stroke order` is stroke order.
 *   - `michi kanji` is both the brand and the romaji lookup for 道 that
 *     lib/romaji/ was built to win. A results-page check on 2026-09-12 found the
 *     homepage ranking for it, not /kanji/道 (docs/prd/weekly-reads.md), so brand
 *     is the honest reading for now. If /kanji/道 ever takes the query, those
 *     lookup clicks will still count as brand. `kanji michi` never matches the
 *     brand rule and stays a lookup.
 *
 * `matchingIntents()` lists every rule a query satisfies. Any query with more
 * than one was decided by order, and can be found that way instead of by
 * rereading this comment.
 */

import { createHash } from 'node:crypto';

// ─── Classes ─────────────────────────────────────────────────────────────────

/**
 * Every class, in DISPLAY order: the order of the review's §1.2 table, roughly
 * from the intents that click to the ones that do not. Precedence is a different
 * order and lives in `INTENT_RULES`.
 */
export const INTENT_CLASSES = [
  'brand',
  'stroke-order-and-practice',
  'level-lists',
  'generic',
  'character-lookup',
  'machine-shaped',
] as const;

export type IntentClass = (typeof INTENT_CLASSES)[number];

export const INTENT_LABELS: Record<IntentClass, string> = {
  brand: 'Brand',
  'stroke-order-and-practice': 'Stroke order & practice',
  'level-lists': 'Level lists',
  generic: 'Generic head terms',
  'character-lookup': 'Character lookups',
  'machine-shaped': 'Machine-shaped',
};

/** Where a query lands when no rule matches: rule 6, "everything else". */
export const RESIDUAL_INTENT = 'character-lookup' satisfies IntentClass;

// ─── Rules ───────────────────────────────────────────────────────────────────

export interface IntentRule {
  intent: Exclude<IntentClass, typeof RESIDUAL_INTENT>;
  /**
   * Matches when any pattern tests true against the normalised query. Never give
   * one the `g` or `y` flag: `.test()` on such a regex is stateful and would
   * return alternating verdicts for the same query.
   */
  patterns: readonly RegExp[];
  /** Matches when the whole normalised query is one of these: a bare term, not a substring. */
  bareTerms?: readonly string[];
}

/**
 * Head terms that name the subject and nothing else.
 *
 * DERIVED, NOT GUESSED: these are the bare head terms among the 51 queries that
 * reached any weekly top 25 across the nine readings 2026-08-02..2026-09-21.
 * `kanji dictionary` and `japanese kanji dictionary` are generic through the
 * `dictionary` pattern, so they are not repeated here.
 *
 * `nihongo kanji` is deliberately absent. It has the `<romaji word> kanji` shape
 * of every other romaji lookup (here for 日本語, just as `yume kanji` is for 夢),
 * and the review's table counts it as a character lookup. Extend this list from
 * the stored queries when a new head term shows up, not from intuition, and
 * expect the fingerprint below to change when you do.
 */
export const GENERIC_HEAD_TERMS: readonly string[] = [
  'kanji',
  'japanese kanji',
  'kanji japanese',
  'kanji kanji',
];

/**
 * The review's §1.2 rules 1–5, in its order. Rule 6 is `RESIDUAL_INTENT`.
 *
 * The patterns are transcribed as written, gaps included: `\blist\b` does not
 * match `lists`, and brand is a substring match on either spelling. No query in
 * the history is affected by either gap today.
 */
export const INTENT_RULES: readonly IntentRule[] = [
  {
    // A `、` cannot come from a page of ours: the title template in
    // lib/seo/kanji-optimization.ts follows the character with its romaji or a
    // dash, never a comma, so `父、 stroke order` was composed somewhere else. A lone kanji with no
    // other word is the same traffic in another shape: `父` alone drew 5,128
    // impressions and no click. `\p{Script=Han}` rather than the U+4E00–U+9FFF
    // block the stories code tests, so that a character above U+FFFF (two UTF-16
    // units) still counts as one. "Difference in meaning" is the comparison
    // phrasing fan-out produces for look-alike sets such as 漏, 泄, 洩.
    intent: 'machine-shaped',
    patterns: [/、/, /^\p{Script=Han}$/u, /difference in meaning/i],
  },
  {
    intent: 'stroke-order-and-practice',
    patterns: [/stroke|practice|sheet/i],
  },
  {
    intent: 'level-lists',
    patterns: [/\bn[1-5]\b|jlpt|\blist\b|\bchart\b/i],
  },
  {
    intent: 'brand',
    patterns: [/michi ?kanji/i],
  },
  {
    intent: 'generic',
    patterns: [/dictionary/i],
    bareTerms: GENERIC_HEAD_TERMS,
  },
];

/**
 * Bump when a change OUTSIDE `INTENT_RULES` would move a query between classes,
 * such as a change to `normaliseQuery`. Edits to the rules themselves change the
 * fingerprint on their own.
 */
const INTENT_RULES_REVISION = 1;

/**
 * A short identifier for the rules that produced a set of class totals, recorded
 * with every reading as `intents.rules`.
 *
 * It exists because the rules WILL change. The head-term list above is derived
 * from the queries seen so far, and the next unfamiliar head term means extending
 * it. That moves the query's clicks from one class to another, and a
 * week-over-week delta taken across the edit would present the move as something
 * searchers did. Comparing fingerprints first turns a silent change of definition
 * into a stated one.
 */
export const INTENT_RULES_FINGERPRINT = createHash('sha256')
  .update(
    JSON.stringify({
      revision: INTENT_RULES_REVISION,
      residual: RESIDUAL_INTENT,
      rules: INTENT_RULES.map((rule) => [
        rule.intent,
        rule.patterns.map(String),
        rule.bareTerms ?? [],
      ]),
    })
  )
  .digest('hex')
  .slice(0, 8);

// ─── Classification (pure) ───────────────────────────────────────────────────

/**
 * NFKC, lowercase, single spaces. NFKC because a Japanese IME left in full-width
 * mode types `ｎ５ ｋａｎｊｉ`, which would otherwise miss every rule; it also folds
 * the half-width `､` into the `、` rule 1 looks for. Search Console already
 * lowercases, so that part costs nothing.
 */
export function normaliseQuery(query: string): string {
  return query.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
}

function ruleMatches(rule: IntentRule, normalised: string): boolean {
  return (
    rule.patterns.some((pattern) => pattern.test(normalised)) ||
    (rule.bareTerms?.includes(normalised) ?? false)
  );
}

/**
 * The query's intent: the first rule that matches, else a character lookup.
 *
 * An empty string (a malformed row) falls through to the residual rather than
 * being skipped, so that the classes always partition every row and their sums
 * always equal the reading's totals.
 */
export function classifyIntent(query: string): IntentClass {
  const normalised = normaliseQuery(query);
  return INTENT_RULES.find((rule) => ruleMatches(rule, normalised))?.intent ?? RESIDUAL_INTENT;
}

/**
 * Every rule the query satisfies, in rule order, without the residual. More than
 * one entry means rule order decided the class. For auditing only; classify with
 * `classifyIntent`.
 */
export function matchingIntents(query: string): IntentClass[] {
  const normalised = normaliseQuery(query);
  return INTENT_RULES.filter((rule) => ruleMatches(rule, normalised)).map((rule) => rule.intent);
}
