/**
 * scripts/check-query-performance.ts
 *
 * Weekly QUERY-dimension progress tracker, backed by the Google Search Console API.
 * Run manually:  npx tsx --tsconfig tsconfig.json scripts/check-query-performance.ts
 * Run in CI:     a scheduled workflow, alongside .github/workflows/indexation-alarm.yml
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS EXISTS, GIVEN THAT check-indexation.ts ALREADY CALLS THIS ENDPOINT
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * `scripts/check-indexation.ts` counts DISTINCT PAGES WITH AN IMPRESSION. That
 * is the right shape for the alarm it is: a catastrophic deindexing cliff shows
 * up there as an unmistakable ~90% drop, and its baseline is on record — 903 of
 * 1,906 submitted URLs over 2026-07-03..2026-07-30.
 *
 * What that number cannot answer is the question the recent work actually
 * raises. On 2026-08-02 we shipped `lib/romaji/`, which derives Hepburn from the
 * kana readings at runtime and puts it into every kanji page's `<title>`, H1,
 * meta description and JSON-LD. The motivating evidence was concrete and
 * embarrassing: a SERP for "michi kanji" returned the MichiKanji homepage twice
 * and `/kanji/道` not at all, while Jisho, Tanoshii and nihongoichiban — every
 * one of which carries `[michi]` in its title — took the AI Overview citation.
 * The string "michi" appeared nowhere in this repository. Learners who have
 * *heard* a word search romaji; they usually cannot type kana yet, which is
 * precisely why they are looking the character up in the first place.
 *
 * Whether that shipped change worked is a QUERY-dimension question. A page count
 * cannot see it: `/kanji/道` earning its first "michi kanji" impression moves the
 * page count by zero if that page already had an impression from anything else.
 *
 * Mechanically this is the cheapest possible counterpart. Same endpoint
 * (`searchanalytics.query`), same credentials, same auth helper, no new secret,
 * no new quota class — `dimensions: ['query']` instead of `['page']`.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THIS IS A PROGRESS TRACKER, NOT AN ALARM — and that is a design decision
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * It never opens a GitHub Issue and it never exits non-zero because a number
 * failed to improve. SEO work has a lag measured in weeks to months, and a red X
 * every Monday that means "the thing you shipped has not paid off yet" is how
 * you train a team to stop reading a signal entirely. The only conditions that
 * fail this script are operational: missing credentials in CI, an inaccessible
 * property, or an API response so empty that recording it would corrupt the
 * append-only history. Everything else is reported and committed.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT IT CAN AND CANNOT TELL YOU
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * It CAN tell you: whether anyone reaches this site through a romaji-shaped
 * query at all, whether that volume is growing, where those queries rank, and —
 * through `topQueries` — which romaji spellings people actually type, including
 * ones nobody thought to watch for.
 *
 * It CANNOT tell you:
 *
 *   1. Attribution. Search Console will not say "this impression exists because
 *      you added romaji to the title". Rankings move for many reasons at once.
 *      The honest reading is directional: the romaji-matched series going from
 *      near-zero to non-zero after 2026-08-02 is evidence; a single week's wobble
 *      is not.
 *   2. Anything about queries with fewer than a handful of impressions. Search
 *      Console applies an anonymisation threshold and simply omits rare queries,
 *      so `romajiMatched.queries` is a floor. Early on — which is exactly where
 *      we are — most of the effect is likely to be under that threshold and
 *      therefore invisible. **A zero here is not proof the change did nothing.**
 *   3. Whether Google folds diacritics. See the `kō` / `kou` note on the
 *      watchlist below; that is an open question this file is instrumented to
 *      settle empirically rather than argue about.
 *
 * Note on statistical sensitivity, as in the sibling script: consecutive weekly
 * readings use 28-day windows offset by 7 days, so 21 of 28 days are shared.
 * The series is smooth by construction. Read the trend, not the delta.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THE ROMAJI WATCHLIST IS THE CORPUS ITSELF — AND WHY THAT ISN'T ENOUGH
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Classification runs against a Set built by calling `romajiSearchKeys()` over
 * all five JLPT level lists — 1,853 distinct spellings across 1,896 characters,
 * including the typed variants (`dou`, `do`) a learner without an IME produces.
 * That set comes from the same code path that renders the pages, so it can never
 * drift from what we publish. A hand-maintained keyword list would be stale the
 * day a reading changed.
 *
 * But "any token in the query is a romaji key" is not a usable rule, and this was
 * measured rather than assumed. 96 of the 1,853 keys are two characters long, and
 * SIXTEEN of them are ordinary English words:
 *
 *     to  no  so  on  in  an  me  he  do  go  a  i  you  man  sun  ten
 *
 * Under the naive rule, "how to write kanji", "kanji for sun", "n5 kanji list"
 * and "kanji meaning in english" all classify as romaji-matched. The headline
 * figure would then be large, flat and meaningless — a vanity number that never
 * moves — which is the precise failure this file exists to avoid.
 *
 * So two figures are recorded, and the PRECISE one is the headline:
 *
 *   - `romajiStrict` — a stoplist-filtered romaji token AND a kanji-context word
 *     ("kanji", "meaning", "stroke", "japanese", "character", "symbol", "write",
 *     "radical"). This is the exact shape of the query class we targeted —
 *     "michi kanji" — so it is the number that answers the hypothesis.
 *   - `romajiLoose` — the same minus the context requirement. Context, and an
 *     early warning: if loose starts growing much faster than strict, people are
 *     reaching us through romaji in query shapes we did not anticipate and the
 *     strict rule needs widening.
 *
 * The stoplist costs us real Japanese queries. 十 is genuinely `to`, 野 is `no`,
 * 御 is `on`, 日 is `hi`-and-also-`sun`-the-meaning. Those searches exist and this
 * script will not count them. That is a deliberate precision-over-recall trade:
 * an undercount that moves when something real happens is worth more than a
 * larger number nobody can act on, and acting on it is the entire point.
 */

import { readFileSync, writeFileSync, appendFileSync, renameSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { romajiSearchKeys, type ReadingSource } from '../lib/romaji/readings';
import { N1_KANJI } from '../lib/constants/n1-kanji';
import { N2_KANJI } from '../lib/constants/n2-kanji';
import { N3_KANJI } from '../lib/constants/n3-kanji';
import { N4_KANJI } from '../lib/constants/n4-kanji';
import { N5_KANJI } from '../lib/constants/n5-kanji';
import {
  parseServiceAccountKey as parseServiceAccountKeyShared,
  getGoogleAccessToken,
  type ServiceAccountKey,
} from './lib/google-service-account-auth';
// Reused verbatim from the sibling monitor rather than re-derived. The property
// identifier and the lagged window are the two things both scripts must agree on
// exactly, or the two history files describe different slices of reality and can
// never be read side by side. (scripts/check-index-status.ts sets this precedent.)
import { resolveProperties, computeWindow } from './check-indexation';

// ─── Types ───────────────────────────────────────────────────────────────────

/** One row as `searchanalytics.query` returns it, for either dimension. */
export interface SearchAnalyticsRow {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  /** Average position. check-indexation.ts ignores this field; we do not. */
  position?: number;
}

/** Aggregate over one classified slice of the query rows. */
export interface RomajiMatchStats {
  /** Distinct query strings in this slice. */
  queries: number;
  impressions: number;
  clicks: number;
  /** Impression-weighted average position across the slice. */
  avgPosition: number;
}

/**
 * How one query row was classified.
 *
 * `strict` implies `loose` — the strict rule is the loose rule plus a
 * kanji-context requirement — so the strict slice is always a subset.
 */
export type QueryClass = 'strict' | 'loose' | 'none';

/** One curated watchlist entry. Recorded with zeros when it returned no data. */
export interface WatchedQuery {
  query: string;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
}

export interface TopQuery {
  query: string;
  impressions: number;
  clicks: number;
  position: number;
}

export interface PageAggregate {
  impressions: number;
  clicks: number;
  /** Impression-weighted, never a plain mean of row positions. */
  avgPosition: number;
}

/** One weekly reading. Append-only; never rewrite past entries. */
export interface QueryReading {
  /** Date the reading was taken (UTC, YYYY-MM-DD). */
  takenOn: string;
  /** Inclusive start of the Search Console window (YYYY-MM-DD, PT). */
  windowStart: string;
  /** Inclusive end of the Search Console window (YYYY-MM-DD, PT). */
  windowEnd: string;
  /** Search Console property the reading came from. */
  property: string;
  /** Distinct query strings Search Console returned at all (a floor — see header). */
  totalQueries: number;
  /** Total impressions across all returned query rows. Denominator for the share. */
  impressions: number;
  /** Total clicks across all returned query rows. */
  clicks: number;
  /**
   * THE headline metric: stoplist-filtered romaji token AND a kanji-context
   * word. See the header for what it can and cannot prove.
   */
  romajiStrict: RomajiMatchStats;
  /**
   * Same, minus the context-word requirement. A superset of `romajiStrict`.
   * Watch the ratio: loose pulling away from strict means our targeting
   * assumption about query shape is too narrow.
   */
  romajiLoose: RomajiMatchStats;
  /** Curated watchlist, always the same length, zeros where there was no data. */
  watchedQueries: WatchedQuery[];
  /** Discovery channel: the biggest queries, watched or not. */
  topQueries: TopQuery[];
  /** Aggregate restricted to URLs containing `/kanji/` (page dimension). */
  kanjiPages: PageAggregate;
}

export interface QueryHistory {
  schemaVersion: 1;
  /** What these numbers mean, restated inside the data file. */
  metricNote: string;
  readings: QueryReading[];
}

// ─── Config ──────────────────────────────────────────────────────────────────

const HISTORY_PATH = resolve(
  __dirname,
  '..',
  process.env.QUERY_HISTORY_FILE?.trim() || 'data/query-history.json'
);

const METRIC_NOTE =
  'romajiStrict (the headline) = Google Search query rows (searchanalytics.query, ' +
  'dimensions: [query]) containing BOTH a token that is a romaji spelling of some kanji ' +
  'reading in lib/constants/n{1..5}-kanji.ts (per romajiSearchKeys() in ' +
  'lib/romaji/readings.ts, minus an English-homograph stoplist) AND a kanji-context word. ' +
  'romajiLoose = the same without the context requirement; it is a superset. Both are a ' +
  'FLOOR twice over: Search Console omits low-volume queries entirely, and the stoplist ' +
  'deliberately discards genuine readings that are also English words (to, no, on, sun...) ' +
  'to keep the figure precise enough to act on. This file is a PROGRESS tracker for the ' +
  'romaji subsystem shipped 2026-08-02, not an alarm — no reading here should ever be read ' +
  'as a pass/fail. See scripts/check-query-performance.ts.';

const SEARCH_CONSOLE_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
const WEBMASTERS_BASE = 'https://www.googleapis.com/webmasters/v3';

/** The one env var that cannot be defaulted. Named here so errors can cite it. */
const CREDENTIAL_ENV_VAR = 'GSC_SERVICE_ACCOUNT_KEY';

/**
 * Queries we want a row for every single week, present or absent.
 *
 * An entry that returns no data is recorded with zeros rather than dropped. That
 * is the whole point: "michi kanji still has no impressions in week 6" is the
 * finding, and a missing row would render as a gap in a chart instead of as the
 * flat line it actually is.
 *
 * `kou kanji` / `ko kanji` are here for a specific unresolved question, not
 * because 校 matters more than any other character. Our titles render onyomi in
 * modified Hepburn with macrons (校 → `kō`), while a learner without an IME types
 * either `kou` or `ko`. Whether Google folds `ō` to `o`, to `ou`, to both or to
 * neither when matching a query against a title is UNVERIFIED — the documentation
 * does not say, and the answer decides whether we should emit the macron form,
 * the doubled form, or both in titles. Watching the two typed spellings side by
 * side is the cheapest way to get a real answer instead of a plausible one.
 */
const DEFAULT_WATCHLIST = [
  'michi kanji',
  'mizu kanji',
  'hi kanji',
  'kokoro kanji',
  'yama kanji',
  'michikanji',
  'kou kanji',
  'ko kanji',
];

/**
 * Tokens that carry no signal about romaji intent.
 *
 * "kanji" is in essentially every query we care about and is not itself a
 * reading, so matching on it would classify 100% of traffic as romaji-matched
 * and make the metric useless. (It is also, as it happens, not in the key set —
 * but relying on that would be relying on an accident of the data.)
 */
const IGNORED_TOKENS = new Set(['kanji', 'kanjis']);

/**
 * Minimum token length considered. `n`, `o`, `e` and similar single letters are
 * legitimate romaji keys for な/お/え-class readings, and they would match inside
 * ordinary English queries constantly. Two characters is where the false-positive
 * rate stops swamping the signal.
 */
const MIN_TOKEN_LENGTH = 2;

/**
 * Romaji keys that are also ordinary English words, and are therefore unusable
 * as evidence of romaji intent.
 *
 * DERIVED, NOT GUESSED. Produced by intersecting the 1,853 keys `romajiSearchKeys()`
 * yields over the five level lists with common English tokens; 96 keys are two
 * characters long and these are the ones that collide. Re-derive it, do not extend
 * it from intuition, if the corpus changes.
 *
 * `a` and `i` are on the list for completeness even though `MIN_TOKEN_LENGTH`
 * already excludes them — so that a future reader lowering that constant does not
 * silently reintroduce them.
 *
 * Every entry costs us real queries: 十 genuinely reads `to`, 野 `no`, 御 `on`,
 * 人 `hito`-but-also-`man`-the-meaning. Removing one to "recover" those queries
 * silently inflates the metric with English-language noise and destroys its
 * ability to support a decision. That is the trade; do not undo it casually.
 *
 * Known residual, recorded so it is not rediscovered as a surprise: the same
 * sweep also found `name`, `ban`, `ken`, `sen`, `hai`, `ton`, `bun` and `sake` in
 * the key set. They are left in because they are far rarer as bare English tokens
 * in a kanji-shaped query — but "kanji name generator" WILL count as strict-matched
 * on `name`. If the strict figure ever looks implausibly healthy, check there first.
 */
const ENGLISH_HOMOGRAPH_STOPLIST = new Set([
  'to', 'no', 'so', 'on', 'in', 'an', 'me', 'he', 'do', 'go',
  'a', 'i', 'you', 'man', 'sun', 'ten',
]);

/**
 * Words that mark a query as being about a Japanese character rather than about
 * anything else that happens to share a spelling.
 *
 * This is what separates "michi kanji" (a person looking for 道) from "michi"
 * (a name, a brand, a song). Requiring one of these is the single change that
 * makes the headline number worth reading.
 */
const KANJI_CONTEXT_WORDS = new Set([
  'kanji',
  'meaning',
  'stroke',
  'japanese',
  'character',
  'symbol',
  'write',
  'radical',
]);

function intFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${name} must be a number, got ${JSON.stringify(raw)}`);
  }
  return parsed;
}

interface Settings {
  /** Length of the Search Console window, in days. */
  windowDays: number;
  /** Days to lag behind today, because `final` data settles late. */
  lagDays: number;
  /** How many rows `topQueries` keeps. */
  topRows: number;
  /** How many readings the console/summary trend table shows. */
  historyRows: number;
}

/**
 * Defaults deliberately identical to check-indexation.ts (28/3). The two scripts
 * are read together; a different window would make their impression totals
 * disagree for no reason a reader could recover.
 */
function readSettings(): Settings {
  return {
    windowDays: intFromEnv('QUERY_WINDOW_DAYS', 28),
    lagDays: intFromEnv('QUERY_LAG_DAYS', 3),
    // 25 is enough to surface a romaji spelling we never thought of without
    // bloating an append-only file committed every week.
    topRows: intFromEnv('QUERY_TOP_ROWS', 25),
    historyRows: intFromEnv('QUERY_HISTORY_ROWS', 12),
  };
}

function parseWatchlist(): string[] {
  const raw = process.env.QUERY_WATCHLIST?.trim();
  if (!raw) return DEFAULT_WATCHLIST;
  const parsed = raw
    .split(',')
    .map((q) => q.trim().toLowerCase())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : DEFAULT_WATCHLIST;
}

// ─── Dates ───────────────────────────────────────────────────────────────────

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ─── Romaji corpus (pure — no I/O, no credentials) ───────────────────────────

/** Every level list, N5 first. Order is irrelevant here — this is a Set. */
const ALL_LEVEL_LISTS: ReadingSource[][] = [
  N5_KANJI,
  N4_KANJI,
  N3_KANJI,
  N2_KANJI,
  N1_KANJI,
];

/**
 * The romaji spellings our corpus can produce, lowercased and deduped.
 *
 * ~1,853 distinct keys across 1,896 characters (measured 2026-08-02). Includes
 * every typed variant `hepburn.ts` renders — `dō`, `dou` and `do` all land here
 * — because the whole premise is a learner who cannot type kana.
 *
 * Built once and cached: `romajiSearchKeys` is memoised per reading pair, but
 * the fold over ~3,800 fields is still work we do not want inside a row loop.
 */
let cachedKeySet: Set<string> | null = null;

export function buildRomajiKeySet(lists: ReadingSource[][] = ALL_LEVEL_LISTS): Set<string> {
  const keys = new Set<string>();
  for (const list of lists) {
    for (const entry of list) {
      for (const key of romajiSearchKeys(entry)) {
        const normalised = key.toLowerCase();
        if (normalised.length >= MIN_TOKEN_LENGTH) keys.add(normalised);
      }
    }
  }
  return keys;
}

export function romajiKeySet(): Set<string> {
  if (!cachedKeySet) cachedKeySet = buildRomajiKeySet();
  return cachedKeySet;
}

/**
 * Split a query into comparable tokens.
 *
 * Whitespace only. Punctuation is left attached deliberately: `michi,` is a
 * different string from `michi` and treating them as identical would quietly
 * widen the matcher in ways that are hard to audit later. Search Console
 * normalises queries to lowercase and strips most punctuation before we ever
 * see them, so in practice this costs nothing.
 */
export function queryTokens(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/**
 * The tokens in this query that are usable evidence of a romaji reading.
 *
 * Excluded: tokens under `MIN_TOKEN_LENGTH`, the word "kanji" itself, and every
 * entry in `ENGLISH_HOMOGRAPH_STOPLIST`. Each exclusion is documented at its
 * constant; none of them are defensive guesses.
 */
export function romajiTokensIn(query: string, keys: Set<string> = romajiKeySet()): string[] {
  return queryTokens(query).filter(
    (token) =>
      token.length >= MIN_TOKEN_LENGTH &&
      !IGNORED_TOKENS.has(token) &&
      !ENGLISH_HOMOGRAPH_STOPLIST.has(token) &&
      keys.has(token)
  );
}

/** Does the query say, in any of several ways, that it is about a character? */
export function hasKanjiContext(query: string): boolean {
  return queryTokens(query).some((token) => KANJI_CONTEXT_WORDS.has(token));
}

/**
 * Classify one query.
 *
 * `strict` — a usable romaji token AND a kanji-context word. The headline class,
 * and the exact shape of "michi kanji".
 * `loose`  — a usable romaji token, no context word. Counted separately as an
 * early warning that the strict rule is too narrow.
 * `none`   — everything else, including "how to write kanji" and "kanji for sun",
 * whose only romaji-key tokens are stoplisted English words.
 */
export function classifyQuery(query: string, keys: Set<string> = romajiKeySet()): QueryClass {
  if (romajiTokensIn(query, keys).length === 0) return 'none';
  return hasKanjiContext(query) ? 'strict' : 'loose';
}

// ─── Aggregation (pure — unit-testable without credentials) ──────────────────

const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;
const round4 = (n: number) => Math.round(n * 10_000) / 10_000;

/**
 * Impression-weighted average position across rows.
 *
 * NOT a plain mean. A page or query with a single impression sitting at position
 * 98 would drag a plain mean down as hard as one carrying 10,000 impressions at
 * position 4, which inverts the thing the number is supposed to say. Rows with
 * no impressions contribute nothing at all; with no impressions anywhere the
 * answer is 0, meaning "undefined", which is what the empty-watchlist rows also
 * record.
 */
export function weightedAveragePosition(rows: SearchAnalyticsRow[]): number {
  let weighted = 0;
  let impressions = 0;
  for (const row of rows) {
    const imp = row.impressions ?? 0;
    if (imp <= 0) continue;
    weighted += (row.position ?? 0) * imp;
    impressions += imp;
  }
  return impressions > 0 ? round2(weighted / impressions) : 0;
}

/** Total impressions/clicks plus an impression-weighted position. */
export function aggregateRows(rows: SearchAnalyticsRow[]): PageAggregate {
  let impressions = 0;
  let clicks = 0;
  for (const row of rows) {
    impressions += row.impressions ?? 0;
    clicks += row.clicks ?? 0;
  }
  return {
    impressions: Math.round(impressions),
    clicks: Math.round(clicks),
    avgPosition: weightedAveragePosition(rows),
  };
}

/** The row's query string, or '' for a malformed row. */
function rowQuery(row: SearchAnalyticsRow): string {
  return (row.keys?.[0] ?? '').toLowerCase();
}

/** Summarise an already-selected slice of rows. */
function summarise(rows: SearchAnalyticsRow[]): RomajiMatchStats {
  const agg = aggregateRows(rows);
  return {
    queries: rows.length,
    impressions: agg.impressions,
    clicks: agg.clicks,
    avgPosition: agg.avgPosition,
  };
}

/**
 * Classify every row once and summarise both slices.
 *
 * Both are produced from a single pass so they cannot disagree about how a given
 * query was classified — `strict` rows are also counted in `loose`, which is what
 * makes the loose/strict ratio meaningful rather than an artefact.
 */
export function summariseRomajiQueries(
  rows: SearchAnalyticsRow[],
  keys: Set<string> = romajiKeySet()
): { strict: RomajiMatchStats; loose: RomajiMatchStats } {
  const strictRows: SearchAnalyticsRow[] = [];
  const looseRows: SearchAnalyticsRow[] = [];
  for (const row of rows) {
    const verdict = classifyQuery(rowQuery(row), keys);
    if (verdict === 'none') continue;
    looseRows.push(row);
    if (verdict === 'strict') strictRows.push(row);
  }
  return { strict: summarise(strictRows), loose: summarise(looseRows) };
}

/**
 * The matched rows themselves, biggest first — for the console report.
 * `only` selects the slice: 'strict' is the headline class, 'loose' the superset.
 */
export function romajiMatchedRows(
  rows: SearchAnalyticsRow[],
  keys: Set<string> = romajiKeySet(),
  only: 'strict' | 'loose' = 'loose'
): TopQuery[] {
  return rows
    .filter((row) => {
      const verdict = classifyQuery(rowQuery(row), keys);
      return only === 'strict' ? verdict === 'strict' : verdict !== 'none';
    })
    .map(toTopQuery)
    .sort((a, b) => b.impressions - a.impressions);
}

function toTopQuery(row: SearchAnalyticsRow): TopQuery {
  return {
    query: rowQuery(row),
    impressions: Math.round(row.impressions ?? 0),
    clicks: Math.round(row.clicks ?? 0),
    position: round2(row.position ?? 0),
  };
}

/**
 * One row per watchlist entry, in watchlist order, zeros where absent.
 *
 * The zero rows are the reason this returns a fixed-length array rather than
 * filtering: an absent query is itself the observation.
 */
export function pickWatchedQueries(
  rows: SearchAnalyticsRow[],
  watchlist: string[]
): WatchedQuery[] {
  const byQuery = new Map<string, SearchAnalyticsRow>();
  for (const row of rows) {
    const q = rowQuery(row);
    if (q) byQuery.set(q, row);
  }
  return watchlist.map((query) => {
    const row = byQuery.get(query.toLowerCase());
    if (!row) {
      return { query, impressions: 0, clicks: 0, ctr: 0, position: 0 };
    }
    return {
      query,
      impressions: Math.round(row.impressions ?? 0),
      clicks: Math.round(row.clicks ?? 0),
      ctr: round4(row.ctr ?? 0),
      position: round2(row.position ?? 0),
    };
  });
}

/** Top N rows by impressions. The discovery channel. */
export function pickTopQueries(rows: SearchAnalyticsRow[], limit: number): TopQuery[] {
  return [...rows]
    .sort((a, b) => (b.impressions ?? 0) - (a.impressions ?? 0))
    .slice(0, Math.max(0, Math.trunc(limit)))
    .map(toTopQuery);
}

/** Share of total impressions that came through a strict romaji query, in %. */
export function romajiImpressionShare(reading: QueryReading): number {
  if (reading.impressions <= 0) return 0;
  return round1((reading.romajiStrict.impressions / reading.impressions) * 100);
}

// ─── History persistence ─────────────────────────────────────────────────────
// Deliberately NOT imported from check-indexation.ts. Its loadHistory/saveHistory
// are typed to its Reading shape and its saveHistory stamps ITS metricNote onto
// every write, which would relabel this file's rows with a definition that does
// not describe them. Same discipline, different contract.

export function emptyHistory(): QueryHistory {
  return { schemaVersion: 1, metricNote: METRIC_NOTE, readings: [] };
}

export function loadHistory(path: string): QueryHistory {
  if (!existsSync(path)) return emptyHistory();
  const parsed = JSON.parse(readFileSync(path, 'utf8')) as QueryHistory;
  if (!Array.isArray(parsed.readings)) {
    throw new Error(`${path} is malformed: expected a "readings" array.`);
  }
  return { ...emptyHistory(), ...parsed };
}

export function saveHistory(path: string, history: QueryHistory): void {
  mkdirSync(dirname(path), { recursive: true });
  // Refresh the note so an old file can never carry a stale metric definition.
  const out: QueryHistory = { ...history, metricNote: METRIC_NOTE };
  // Write-then-rename, for the same reason as the sibling script: an interrupted
  // writeFileSync (job cancellation, timeout, a runner dying) leaves a truncated
  // file, and loadHistory's JSON.parse then throws on every subsequent run until
  // a human repairs it by hand. renameSync is atomic on POSIX and the temp file
  // is a sibling so the rename never crosses a filesystem boundary (EXDEV).
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(out, null, 2)}\n`, 'utf8');
  renameSync(tmp, path);
}

// ─── Auth: service-account JWT ────────────────────────────────────────────────
// Delegates to scripts/lib/google-service-account-auth.ts, exactly as
// check-indexation.ts does. One service account, one Search Console setup.

function parseServiceAccountKey(raw: string): ServiceAccountKey {
  return parseServiceAccountKeyShared(raw, CREDENTIAL_ENV_VAR);
}

async function getAccessToken(key: ServiceAccountKey): Promise<string> {
  return getGoogleAccessToken(key, SEARCH_CONSOLE_SCOPE);
}

// ─── Search Console API ──────────────────────────────────────────────────────

class PropertyAccessError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

interface DimensionFilter {
  dimension: string;
  operator: string;
  expression: string;
}

/**
 * Fetch every row for one dimension, paginating via `startRow`.
 *
 * Returns raw rows so the pure helpers above can do all the classification —
 * which is what makes them testable against a stub without credentials.
 */
async function fetchRows(
  token: string,
  property: string,
  window: { start: string; end: string },
  options: {
    dimensions: string[];
    aggregationType?: string;
    filters?: DimensionFilter[];
  }
): Promise<SearchAnalyticsRow[]> {
  const ROW_LIMIT = 25_000;
  // Same fault-guard as check-indexation.ts, and it exists for the same measured
  // reason: the loop only exits when a page returns fewer rows than requested, so
  // a stub (or an API fault) that keeps returning full pages spins forever — one
  // ran to startRow=1,475,000 before this cap was added. 20 pages = 500k rows,
  // far beyond any plausible query set for this site.
  const MAX_PAGES = 20;
  let iterations = 0;
  let startRow = 0;
  const all: SearchAnalyticsRow[] = [];

  for (;;) {
    if (++iterations > MAX_PAGES) {
      throw new Error(
        `searchAnalytics pagination exceeded ${MAX_PAGES} pages ` +
          `(${MAX_PAGES * ROW_LIMIT} rows) for ${property} on ` +
          `dimensions [${options.dimensions.join(', ')}]. Aborting rather than ` +
          'looping — this indicates an API fault, not a large site.'
      );
    }

    const res = await fetch(
      `${WEBMASTERS_BASE}/sites/${encodeURIComponent(property)}/searchAnalytics/query`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: window.start,
          endDate: window.end,
          dimensions: options.dimensions,
          ...(options.aggregationType ? { aggregationType: options.aggregationType } : {}),
          ...(options.filters?.length
            ? { dimensionFilterGroups: [{ groupType: 'and', filters: options.filters }] }
            : {}),
          // Exclude the still-settling most recent days from the aggregate.
          dataState: 'final',
          type: 'web',
          rowLimit: ROW_LIMIT,
          startRow,
        }),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      throw new PropertyAccessError(
        `searchAnalytics.query failed for property "${property}" (${res.status}): ${text}`,
        res.status
      );
    }

    const body = (await res.json()) as { rows?: SearchAnalyticsRow[] };
    const rows = body.rows ?? [];
    all.push(...rows);
    if (rows.length < ROW_LIMIT) break;
    startRow += ROW_LIMIT;
  }

  return all;
}

/** All query-dimension rows for the window. */
async function fetchQueryRows(
  token: string,
  property: string,
  window: { start: string; end: string }
): Promise<SearchAnalyticsRow[]> {
  return fetchRows(token, property, window, { dimensions: ['query'] });
}

/**
 * Page-dimension rows restricted to kanji detail pages.
 *
 * Filtered server-side rather than fetched-then-filtered so the impression and
 * click totals come back already scoped — and so `/kanji` (the index) is excluded
 * by the trailing slash in `/kanji/` without any client-side string surgery.
 */
async function fetchKanjiPageRows(
  token: string,
  property: string,
  window: { start: string; end: string }
): Promise<SearchAnalyticsRow[]> {
  return fetchRows(token, property, window, {
    dimensions: ['page'],
    aggregationType: 'byPage',
    filters: [{ dimension: 'page', operator: 'contains', expression: '/kanji/' }],
  });
}

// ─── Reporting ───────────────────────────────────────────────────────────────

export function renderHistoryTable(readings: QueryReading[], limit = 12): string {
  const rows = readings.slice(-limit);
  const header =
    '| Taken on | Window | Strict queries | Strict impr. | Strict clicks | Strict pos. | Loose queries | Loose impr. | Share of impr. |\n' +
    '|---|---|---:|---:|---:|---:|---:|---:|---:|';
  const body = rows
    .map((r) => {
      const share =
        r.impressions > 0 ? `${round1((r.romajiStrict.impressions / r.impressions) * 100)}%` : '—';
      return (
        `| ${r.takenOn} | ${r.windowStart}..${r.windowEnd} | ${r.romajiStrict.queries} | ` +
        `${r.romajiStrict.impressions} | ${r.romajiStrict.clicks} | ` +
        `${r.romajiStrict.avgPosition || '—'} | ${r.romajiLoose.queries} | ` +
        `${r.romajiLoose.impressions} | ${share} |`
      );
    })
    .join('\n');
  return `${header}\n${body}`;
}

export function renderWatchlistTable(watched: WatchedQuery[]): string {
  const header =
    '| Query | Impressions | Clicks | CTR | Position |\n' + '|---|---:|---:|---:|---:|';
  const body = watched
    .map(
      (w) =>
        `| \`${w.query}\` | ${w.impressions} | ${w.clicks} | ` +
        `${w.impressions > 0 ? `${round1(w.ctr * 100)}%` : '—'} | ` +
        `${w.position > 0 ? w.position : '—'} |`
    )
    .join('\n');
  return `${header}\n${body}`;
}

export function renderTopQueriesTable(top: TopQuery[], keys: Set<string> = romajiKeySet()): string {
  const header =
    '| # | Query | Impressions | Clicks | Position | Class |\n' + '|---:|---|---:|---:|---:|---|';
  const label: Record<QueryClass, string> = { strict: 'romaji', loose: 'romaji (loose)', none: '' };
  const body = top
    .map(
      (t, i) =>
        `| ${i + 1} | \`${t.query}\` | ${t.impressions} | ${t.clicks} | ${t.position} | ` +
        `${label[classifyQuery(t.query, keys)]} |`
    )
    .join('\n');
  return `${header}\n${body}`;
}

/**
 * The markdown the workflow surfaces in the job summary.
 *
 * A job summary rather than an Issue, on purpose. This is a trend to glance at,
 * and a weekly Issue for "still zero" would be noise that gets muted — after
 * which the one week it stops being zero goes unread too.
 */
export function buildStepSummary(
  reading: QueryReading,
  history: QueryHistory,
  keys: Set<string> = romajiKeySet(),
  historyRows = 12
): string {
  const previous = history.readings.length > 1 ? history.readings[history.readings.length - 2] : null;
  const delta = previous
    ? `${previous.romajiStrict.impressions} → ${reading.romajiStrict.impressions} strict impressions ` +
      `(${signed(reading.romajiStrict.impressions - previous.romajiStrict.impressions)})`
    : 'first reading — nothing to compare against yet';

  return [
    '## Romaji query performance',
    '',
    `**Window:** ${reading.windowStart}..${reading.windowEnd} · **Property:** \`${reading.property}\``,
    '',
    `**Romaji queries (strict):** ${reading.romajiStrict.queries} of ${reading.totalQueries} ` +
      `(${romajiImpressionShare(reading)}% of impressions) · avg position ` +
      `${reading.romajiStrict.avgPosition || '—'}`,
    `**Romaji queries (loose):** ${reading.romajiLoose.queries} · ` +
      `${reading.romajiLoose.impressions} impressions · avg position ` +
      `${reading.romajiLoose.avgPosition || '—'}`,
    '',
    `**Week over week:** ${delta}`,
    '',
    '> This is a progress tracker, not an alarm. Search Console omits low-volume',
    '> queries and an English-homograph stoplist discards genuine readings such as',
    '> `to` (十) and `on` (御), so these figures are a floor twice over — a zero is',
    '> not proof the romaji work did nothing. Read the trend across several weeks,',
    '> not a single delta. If **loose** starts outpacing **strict**, the strict rule',
    '> is too narrow and should be widened.',
    '',
    '### Watchlist',
    '',
    renderWatchlistTable(reading.watchedQueries),
    '',
    '### Top queries',
    '',
    renderTopQueriesTable(reading.topQueries, keys),
    '',
    '### Kanji detail pages (`/kanji/…`)',
    '',
    `${reading.kanjiPages.impressions} impressions · ${reading.kanjiPages.clicks} clicks · ` +
      `avg position ${reading.kanjiPages.avgPosition || '—'} (impression-weighted)`,
    '',
    '### Trend',
    '',
    renderHistoryTable(history.readings, historyRows),
    '',
    '_Generated by `scripts/check-query-performance.ts`._',
  ].join('\n');
}

function signed(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

function writeStepSummary(markdown: string): void {
  const path = process.env.GITHUB_STEP_SUMMARY;
  if (!path) return;
  try {
    appendFileSync(path, `${markdown}\n`, 'utf8');
  } catch (err) {
    // A summary is presentation. Losing it must never fail a run that already
    // has a good reading recorded.
    console.warn(`⚠️  Could not append to GITHUB_STEP_SUMMARY: ${(err as Error).message}`);
  }
}

// ─── Missing-credential guidance ─────────────────────────────────────────────

const SETUP_INSTRUCTIONS = `
${CREDENTIAL_ENV_VAR} is not set, so no Search Console query can be made.

This script uses exactly the same credentials as scripts/check-indexation.ts —
one service account, one Search Console setup, no additional secret and no
additional API. If that script already runs, this one needs nothing new.

One-time setup (the repo owner must do this; it cannot be automated):

  1. Google Cloud Console > APIs & Services > Library:
     enable "Google Search Console API" on a project.
  2. IAM & Admin > Service Accounts > Create service account.
     No Google Cloud IAM roles are needed — Search Console access is granted
     separately, in step 4.
  3. On that service account: Keys > Add key > Create new key > JSON.
     Download the file.
  4. Search Console > (select the michikanji property) > Settings > Users and
     permissions > Add user. Paste the service account's email
     (…@….iam.gserviceaccount.com) and grant permission level "Full".
     "Restricted" is NOT enough for searchAnalytics.query.
  5. GitHub > repo > Settings > Secrets and variables > Actions > New secret:
       Name:  ${CREDENTIAL_ENV_VAR}
       Value: the entire contents of the downloaded JSON key file
  6. If the property is a *domain* property (registered as michikanji.com via
     DNS rather than as an https://www.… URL prefix), also add a repository
     variable GSC_PROPERTY_TYPE = domain. Default is url-prefix.
`.trim();

// ─── Main ────────────────────────────────────────────────────────────────────

/** Exported so a test harness can drive a full run against a stubbed `fetch`. */
export async function main(): Promise<void> {
  const settings = readSettings();
  const window = computeWindow(new Date(), settings.windowDays, settings.lagDays);
  const { primary, fallback } = resolveProperties();
  const watchlist = parseWatchlist();
  const keys = romajiKeySet();

  console.log('\n═══ MichiKanji Query Performance ═══');
  console.log('Metric: romaji-matched search queries (PROGRESS tracker, never an alarm)');
  console.log(`Window: ${window.start} .. ${window.end} (${settings.windowDays}d, ${settings.lagDays}d lag)`);
  console.log(`Property (primary): ${primary}`);
  console.log(
    `Romaji key set: ${keys.size} distinct spellings from lib/constants/n{1..5}-kanji.ts ` +
      `(minus ${ENGLISH_HOMOGRAPH_STOPLIST.size} English homographs at match time)`
  );

  const rawKey = process.env[CREDENTIAL_ENV_VAR];
  if (!rawKey || rawKey.trim() === '') {
    console.error(`\n❌ ${SETUP_INSTRUCTIONS}\n`);
    // In CI a missing secret means the tracker is silently not tracking, which
    // is indistinguishable from "the numbers never moved" — the exact ambiguity
    // this script exists to remove. Fail loudly. Locally it is just an
    // unconfigured dev machine, so exit clean.
    if (process.env.CI) {
      console.error('Exiting non-zero: a scheduled monitor without credentials is a broken monitor.');
      process.exit(1);
    }
    console.log('Not running in CI — exiting 0. Nothing was recorded.');
    return;
  }

  const key = parseServiceAccountKey(rawKey);
  console.log(`Service account: ${key.client_email}`);
  const token = await getAccessToken(key);

  let property = primary;
  let queryRows: SearchAnalyticsRow[];
  try {
    queryRows = await fetchQueryRows(token, property, window);
  } catch (err) {
    const status = err instanceof PropertyAccessError ? err.status : 0;
    if (status !== 403 && status !== 404) throw err;
    console.warn(
      `⚠️  Property "${primary}" returned ${status}. Retrying as "${fallback}" — a ` +
        'domain property and a URL-prefix property are different resources in the API.'
    );
    property = fallback;
    try {
      queryRows = await fetchQueryRows(token, property, window);
    } catch (err2) {
      // Distinguish "API not turned on" from "no access to this property". Both
      // surface as 403, but they send you to completely different consoles, and
      // enabling the API is step 1 of setup — the easiest step to skip. Reporting
      // this as a permissions problem sends the owner hunting in Search Console
      // for a setting that is actually in Google Cloud. That exact confusion cost
      // this project two days; do not collapse these two cases back together.
      const msg2 = err2 instanceof Error ? err2.message : String(err2);
      if (/SERVICE_DISABLED|has not been used in project|is disabled|accessTokenScopeInsufficient/i.test(msg2)) {
        throw new Error(
          'The Google Search Console API is not enabled on this Cloud project (or ' +
            'the key lacks the required scope). This is NOT a Search Console ' +
            'permissions problem — enable the API here:\n' +
            '  https://console.cloud.google.com/apis/library/searchconsole.googleapis.com\n' +
            'then re-run. It can take a minute to propagate after enabling.\n\n' +
            `Underlying error: ${msg2}`
        );
      }
      throw new Error(
        `Neither "${primary}" nor "${fallback}" is accessible to ` +
          `${key.client_email}.\n\n` +
          'Most likely the service account has not been added as a user on the ' +
          'Search Console property, or was added with "Restricted" instead of ' +
          '"Full" permission. See Search Console > Settings > Users and permissions.\n\n' +
          `Last error: ${(err2 as Error).message}`
      );
    }
    console.warn('➡️  Set GSC_PROPERTY_TYPE (or GSC_PROPERTY) so future runs skip this retry.');
  }

  // Refuse to persist a reading with no query rows at all.
  //
  // The judgement call, spelled out because it is easy to get backwards: an
  // EMPTY WATCHLIST IS NOT GARBAGE. Every watched query returning zero is the
  // expected state in the weeks right after shipping, and it is precisely the
  // observation this file exists to record — suppressing it would delete the
  // baseline the whole trend is measured against. Likewise `romajiStrict.queries
  // === 0` is a legitimate, informative reading.
  //
  // Zero rows across the ENTIRE query dimension is different in kind. A property
  // serving 66,727 impressions in the sibling script's window cannot honestly
  // return no queries; a 200 OK with no `rows` key means the window, the property
  // or the API is wrong. Recording it would write a fake zero into an append-only
  // file committed to main, where it becomes indistinguishable from a real one
  // and silently understates every future week-over-week comparison.
  if (queryRows.length === 0) {
    throw new Error(
      `searchAnalytics returned zero query rows for ${property} over ` +
        `${window.start}..${window.end}. Refusing to record a reading that would ` +
        'plant a fake zero in an append-only history.\n' +
        `Check the property identifier (currently "${property}") and that the ` +
        'window is not entirely in the future. If the site genuinely served no ' +
        'searches at all in this window, that is a bigger problem than this script.'
    );
  }

  const kanjiPageRows = await fetchKanjiPageRows(token, property, window);

  const totals = aggregateRows(queryRows);
  const { strict: romajiStrict, loose: romajiLoose } = summariseRomajiQueries(queryRows, keys);
  const watchedQueries = pickWatchedQueries(queryRows, watchlist);
  const topQueries = pickTopQueries(queryRows, settings.topRows);
  const kanjiPages = aggregateRows(kanjiPageRows);

  const current: QueryReading = {
    takenOn: isoDate(new Date()),
    windowStart: window.start,
    windowEnd: window.end,
    property,
    totalQueries: queryRows.length,
    impressions: totals.impressions,
    clicks: totals.clicks,
    romajiStrict,
    romajiLoose,
    watchedQueries,
    topQueries,
    kanjiPages,
  };

  const history = loadHistory(HISTORY_PATH);
  history.readings.push(current);
  saveHistory(HISTORY_PATH, history);

  // ─── Console report ────────────────────────────────────────────────────────

  console.log(`\nQueries returned: ${current.totalQueries}`);
  console.log(`Impressions: ${current.impressions}   Clicks: ${current.clicks}`);
  console.log(
    `\nRomaji STRICT (headline): ${romajiStrict.queries} queries, ${romajiStrict.impressions} impressions ` +
      `(${romajiImpressionShare(current)}% of all), ${romajiStrict.clicks} clicks, ` +
      `avg position ${romajiStrict.avgPosition || 'n/a'}`
  );
  console.log(
    `Romaji LOOSE (no context word required): ${romajiLoose.queries} queries, ` +
      `${romajiLoose.impressions} impressions, avg position ${romajiLoose.avgPosition || 'n/a'}`
  );

  const previous = history.readings.length > 1 ? history.readings[history.readings.length - 2] : null;
  if (previous) {
    console.log(
      `  vs. ${previous.takenOn}: ${previous.romajiStrict.queries} queries / ` +
        `${previous.romajiStrict.impressions} impressions ` +
        `(${signed(romajiStrict.queries - previous.romajiStrict.queries)} queries, ` +
        `${signed(romajiStrict.impressions - previous.romajiStrict.impressions)} impressions)`
    );
  } else {
    console.log('  First reading — this is the baseline the trend will be measured against.');
  }

  const matchedRows = romajiMatchedRows(queryRows, keys, 'loose');
  if (matchedRows.length > 0) {
    console.log('\nTop romaji-matched queries (strict + loose):');
    matchedRows.slice(0, 10).forEach((r) =>
      console.log(
        `  • [${classifyQuery(r.query, keys)}] ${r.query} — ${r.impressions} impr, ` +
          `${r.clicks} clicks, pos ${r.position}`
      )
    );
  } else {
    console.log(
      '\nNo romaji-matched queries in this window. Expected early on: Search Console ' +
        'omits low-volume queries entirely and the English-homograph stoplist discards ' +
        'more, so this is a floor, not a verdict.'
    );
  }

  console.log('\nWatchlist:');
  for (const w of watchedQueries) {
    console.log(
      w.impressions > 0
        ? `  • ${w.query} — ${w.impressions} impr, ${w.clicks} clicks, pos ${w.position}`
        : `  • ${w.query} — no data (recorded as zero, which is itself the finding)`
    );
  }

  console.log(
    `\nKanji detail pages (/kanji/…): ${kanjiPages.impressions} impressions, ` +
      `${kanjiPages.clicks} clicks, avg position ${kanjiPages.avgPosition || 'n/a'} (impression-weighted)`
  );

  console.log(`\nHistory (${history.readings.length} readings) -> ${HISTORY_PATH}`);
  console.log(`\n${renderHistoryTable(history.readings, settings.historyRows)}`);
  console.log('\n════════════════════════════════════\n');

  writeStepSummary(buildStepSummary(current, history, keys, settings.historyRows));

  // No GitHub Issue, no non-zero exit. See the header: this is a progress
  // tracker, and a red X for "the SEO work has not paid off yet" is how you
  // train people to ignore a signal.
}

// Only auto-run when executed directly, so the pure helpers above can be
// imported by a test harness without kicking off an API call.
if (process.argv[1] && /check-query-performance(\.[cm]?[jt]s)?$/.test(process.argv[1])) {
  main().catch((err: unknown) => {
    console.error(
      'check-query-performance script failed:',
      err instanceof Error ? err.message : err
    );
    process.exit(1);
  });
}
