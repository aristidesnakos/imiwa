/**
 * scripts/check-indexation.ts
 *
 * Weekly indexation-trend alarm, backed by the Google Search Console API.
 * Run manually:  npx tsx --tsconfig tsconfig.json scripts/check-indexation.ts
 * Run in CI:     .github/workflows/indexation-alarm.yml (Mondays at 07:00 UTC)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT METRIC THIS ACTUALLY TRACKS — read this before trusting the number
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * It tracks: **the number of distinct pages of this property that received at
 * least one Google Search impression in a rolling 28-day window**, obtained
 * from `searchanalytics.query` with `dimensions: ['page']` and counting rows.
 *
 * It does NOT track the "indexed pages" figure in the Search Console Page
 * Indexing (coverage) report. That figure is not exposed by any Search Console
 * API. Specifically, as of this writing:
 *
 *   - `searchanalytics.query` returns *performance* data. A page only appears
 *     if it was shown to a user. Indexed-but-never-served pages are invisible
 *     to it, so this count is structurally LOWER than the true indexed count.
 *   - `urlInspection.index.inspect` returns true per-URL index status, but is
 *     capped at 2,000 queries/day and 600/minute per site and works one URL at
 *     a time. michikanji.com has ~1,906 sitemap URLs, so a full sweep would
 *     consume essentially the entire daily quota for one reading and leave no
 *     headroom for debugging. Not viable as a recurring monitor.
 *   - `sitemaps.get`/`sitemaps.list` expose `contents[].submitted` (useful, and
 *     read here as a denominator) but their `contents[].indexed` field is
 *     explicitly documented as "Deprecated; do not use." It is not a substitute.
 *
 * So this is a **proxy**, deliberately chosen, with these known limitations:
 *
 *   1. It is a floor, not the truth. Real indexed count >= this number, usually
 *      by a wide margin for a long-tail site.
 *   2. It is sensitive to demand, not just to crawlability. A seasonal collapse
 *      in Japanese-study search interest would look like a partial deindexing.
 *      Impressions and clicks are recorded alongside the page count so a human
 *      can tell the two apart: a crawlability failure drops the page count
 *      while impressions-per-page holds up; a demand slump drops both together.
 *   3. It lags. Search Console `final` data is a few days behind, hence the
 *      configurable lag offset below.
 *
 * Why it is still the right monitor: the failure mode this exists to catch is
 * catastrophic, not subtle. The motivating case (nomadlist.com going 3,540 ->
 * 262 indexed pages after a domain migration) would have shown up here as an
 * unmistakable ~90% cliff. A proxy that reliably catches a 90% cliff a week
 * after it starts is worth far more than a true metric that no API will give us.
 *
 * Note on statistical sensitivity: consecutive weekly readings use 28-day
 * windows offset by 7 days, so 21 of 28 days are shared between them. That
 * heavy overlap makes the series smooth — which is exactly why a >20%
 * week-over-week move is meaningful rather than noise.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { SITE_URL } from '../lib/seo/site';
import {
  parseServiceAccountKey as parseServiceAccountKeyShared,
  getGoogleAccessToken,
  type ServiceAccountKey,
} from './lib/google-service-account-auth';

// ─── Types ───────────────────────────────────────────────────────────────────

/** One weekly reading. Append-only; never rewrite past entries. */
export interface Reading {
  /** Date the reading was taken (UTC, YYYY-MM-DD). */
  takenOn: string;
  /** Inclusive start of the Search Console window (YYYY-MM-DD, PT). */
  windowStart: string;
  /** Inclusive end of the Search Console window (YYYY-MM-DD, PT). */
  windowEnd: string;
  /** Search Console property the reading came from. */
  property: string;
  /**
   * Distinct pages with >=1 impression in the window.
   * THIS IS A PROXY FOR INDEXED PAGES, NOT THE COVERAGE-REPORT FIGURE.
   */
  pagesWithImpressions: number;
  /** Total impressions in the window (context for demand vs. crawlability). */
  impressions: number;
  /** Total clicks in the window (context). */
  clicks: number;
  /** Sum of `contents[].submitted` across submitted sitemaps, or null on failure. */
  sitemapUrlsSubmitted: number | null;
}

export interface History {
  schemaVersion: 1;
  /**
   * What `pagesWithImpressions` means, restated inside the data file so the
   * number is never read out of context by a future reader or a dashboard.
   */
  metricNote: string;
  readings: Reading[];
}

export interface Thresholds {
  /** Week-over-week drop (%) that trips the alarm. */
  wowDropPct: number;
  /** Drop (%) from the trailing peak that trips the alarm (catches slow bleeds). */
  sustainedDropPct: number;
  /** How many prior readings define the trailing peak. */
  trendReadings: number;
  /** Below this baseline page count, percentages are noise; suppress alarms. */
  minBaseline: number;
}

export type AlarmSeverity = 'none' | 'warn' | 'alarm';

export interface Verdict {
  severity: AlarmSeverity;
  /** Short headline, e.g. "Indexation proxy dropped 41.2% week-over-week". */
  headline: string;
  /** Human-readable lines explaining every check that ran and its outcome. */
  details: string[];
  wowDropPct: number | null;
  sustainedDropPct: number | null;
  trailingPeak: number | null;
}

// ─── Config ──────────────────────────────────────────────────────────────────

const HISTORY_PATH = resolve(
  __dirname,
  '..',
  process.env.INDEXATION_HISTORY_FILE?.trim() || 'data/indexation-history.json'
);

const METRIC_NOTE =
  'pagesWithImpressions = distinct pages with >=1 Google Search impression in the ' +
  'window, from searchanalytics.query (dimensions: [page]). This is a PROXY for ' +
  'indexed pages and is structurally lower than the Search Console coverage ' +
  'report figure, which no Search Console API exposes. See scripts/check-indexation.ts.';

const SEARCH_CONSOLE_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
const WEBMASTERS_BASE = 'https://www.googleapis.com/webmasters/v3';

/** The one env var that cannot be defaulted. Named here so errors can cite it. */
const CREDENTIAL_ENV_VAR = 'GSC_SERVICE_ACCOUNT_KEY';

function intFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${name} must be a number, got ${JSON.stringify(raw)}`);
  }
  return parsed;
}

function readThresholds(): Thresholds {
  return {
    // 20%: comfortably above the few-percent week-over-week wobble expected from
    // a 28-day window with 75% overlap, and far below the ~90% signature of an
    // actual deindexing event. Tuned to fire on real breakage, not on weather.
    wowDropPct: intFromEnv('INDEXATION_DROP_THRESHOLD_PCT', 20),
    // A 15%/week bleed never trips the WoW check but compounds to -56% in a
    // month. This second check compares against the trailing peak to catch it.
    sustainedDropPct: intFromEnv('INDEXATION_SUSTAINED_DROP_PCT', 30),
    trendReadings: intFromEnv('INDEXATION_TREND_READINGS', 4),
    // With a handful of impression-bearing pages, "−50%" is one page going
    // quiet. Suppressing below this is what keeps the alarm from being muted.
    minBaseline: intFromEnv('INDEXATION_MIN_BASELINE', 25),
  };
}

/**
 * Resolve the Search Console property identifier.
 *
 * A property can be registered two incompatible ways and the API path differs:
 *   - URL-prefix:  "https://www.michikanji.com/"  (trailing slash matters)
 *   - Domain:      "sc-domain:michikanji.com"     (no scheme, no www)
 *
 * We cannot detect which one exists without an authenticated call, so both are
 * supported: `GSC_PROPERTY` wins outright, otherwise `GSC_PROPERTY_TYPE`
 * selects a form derived from `lib/seo/site.ts` (single source of truth for the
 * canonical host — no second hardcoded copy of the domain).
 */
export function resolveProperties(): { primary: string; fallback: string } {
  const urlPrefix = SITE_URL.endsWith('/') ? SITE_URL : `${SITE_URL}/`;
  const bareDomain = new URL(SITE_URL).hostname.replace(/^www\./, '');
  const domainProperty = `sc-domain:${bareDomain}`;

  const explicit = process.env.GSC_PROPERTY?.trim();
  if (explicit) {
    // Still offer the other form as a fallback so a misconfigured secret
    // produces a working run plus a clear "fix your config" message.
    const other = explicit.startsWith('sc-domain:') ? urlPrefix : domainProperty;
    return { primary: explicit, fallback: other };
  }

  // `|| `, not `?? `: an unset GitHub Actions `vars.*` is injected as an EMPTY
  // STRING, not as undefined, so nullish-coalescing would let '' through and
  // throw below on a perfectly normal default configuration.
  const type = process.env.GSC_PROPERTY_TYPE?.trim() || 'url-prefix';
  if (type === 'domain') return { primary: domainProperty, fallback: urlPrefix };
  if (type === 'url-prefix') return { primary: urlPrefix, fallback: domainProperty };
  throw new Error(
    `GSC_PROPERTY_TYPE must be "url-prefix" or "domain", got ${JSON.stringify(type)}`
  );
}

// ─── Dates ───────────────────────────────────────────────────────────────────

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 86_400_000);
}

/**
 * Fixed-length window ending `lagDays` before today. The lag exists because
 * Search Console `final` data is not complete for the most recent days; querying
 * up to today would make every reading artificially low and manufacture a fake
 * "drop" every single week.
 */
export function computeWindow(
  today: Date,
  windowDays: number,
  lagDays: number
): { start: string; end: string } {
  const end = addDays(today, -lagDays);
  const start = addDays(end, -(windowDays - 1));
  return { start: isoDate(start), end: isoDate(end) };
}

// ─── Auth: service-account JWT ────────────────────────────────────────────────
// Delegates to scripts/lib/google-service-account-auth.ts (shared, portable
// across projects and across Google APIs — see that file's header).

function parseServiceAccountKey(raw: string): ServiceAccountKey {
  return parseServiceAccountKeyShared(raw, CREDENTIAL_ENV_VAR);
}

async function getAccessToken(key: ServiceAccountKey): Promise<string> {
  return getGoogleAccessToken(key, SEARCH_CONSOLE_SCOPE);
}

// ─── Search Console API ──────────────────────────────────────────────────────

interface SearchAnalyticsRow {
  keys?: string[];
  clicks?: number;
  impressions?: number;
}

class PropertyAccessError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

/**
 * Count distinct pages with >=1 impression, plus total clicks/impressions.
 *
 * Paginates via `startRow`. rowLimit maxes out at 25,000 per the API docs;
 * michikanji has ~1,900 URLs so one page suffices today, but paginating keeps
 * the count correct if the site grows past the cap.
 */
async function fetchPageMetrics(
  token: string,
  property: string,
  window: { start: string; end: string }
): Promise<{ pages: number; impressions: number; clicks: number }> {
  const ROW_LIMIT = 25_000;
  let startRow = 0;
  let pages = 0;
  let impressions = 0;
  let clicks = 0;

  for (;;) {
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
          dimensions: ['page'],
          // One row per page regardless of query/device breakdown.
          aggregationType: 'byPage',
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
    pages += rows.length;
    for (const row of rows) {
      impressions += row.impressions ?? 0;
      clicks += row.clicks ?? 0;
    }
    if (rows.length < ROW_LIMIT) break;
    startRow += ROW_LIMIT;
  }

  return { pages, impressions, clicks };
}

/**
 * Sum `contents[].submitted` across submitted sitemaps — a legitimate,
 * non-deprecated denominator for the proxy count. (`contents[].indexed` is
 * documented as deprecated and is deliberately ignored.)
 *
 * Best-effort: returns null rather than failing the run, because the page count
 * is the load-bearing number and this is only context.
 */
async function fetchSitemapSubmitted(
  token: string,
  property: string
): Promise<number | null> {
  try {
    const res = await fetch(
      `${WEBMASTERS_BASE}/sites/${encodeURIComponent(property)}/sitemaps`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return null;
    const body = (await res.json()) as {
      sitemap?: { isSitemapsIndex?: boolean; contents?: { type?: string; submitted?: string | number }[] }[];
    };
    let total = 0;
    let saw = false;
    for (const sm of body.sitemap ?? []) {
      // Skip index files: their child sitemaps are listed separately and
      // counting both would double-count every URL.
      if (sm.isSitemapsIndex) continue;
      for (const c of sm.contents ?? []) {
        if (c.type && c.type !== 'web') continue;
        total += Number(c.submitted ?? 0);
        saw = true;
      }
    }
    return saw ? total : null;
  } catch {
    return null;
  }
}

// ─── History persistence ─────────────────────────────────────────────────────

export function emptyHistory(): History {
  return { schemaVersion: 1, metricNote: METRIC_NOTE, readings: [] };
}

export function loadHistory(path: string): History {
  if (!existsSync(path)) return emptyHistory();
  const parsed = JSON.parse(readFileSync(path, 'utf8')) as History;
  if (!Array.isArray(parsed.readings)) {
    throw new Error(`${path} is malformed: expected a "readings" array.`);
  }
  return { ...emptyHistory(), ...parsed };
}

export function saveHistory(path: string, history: History): void {
  mkdirSync(dirname(path), { recursive: true });
  // Refresh the note so an old file can never carry a stale metric definition.
  const out: History = { ...history, metricNote: METRIC_NOTE };
  writeFileSync(path, `${JSON.stringify(out, null, 2)}\n`, 'utf8');
}

// ─── Alarm logic (pure — unit-testable without credentials) ──────────────────

function pctDrop(from: number, to: number): number {
  if (from <= 0) return 0;
  return ((from - to) / from) * 100;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Decide whether the newest reading warrants an alarm.
 *
 * `prior` must be the readings BEFORE `current`, oldest-first.
 * Pure function: no I/O, no env reads. Both checks are evaluated so the report
 * shows what was tested even when nothing fires.
 */
export function evaluateAlarm(
  prior: Reading[],
  current: Reading,
  t: Thresholds
): Verdict {
  const details: string[] = [];
  const count = current.pagesWithImpressions;

  if (prior.length === 0) {
    return {
      severity: 'none',
      headline: `Baseline recorded: ${count} pages with impressions`,
      details: [
        `First reading — nothing to compare against yet. Recorded ${count} pages ` +
          `for ${current.windowStart}..${current.windowEnd}.`,
        'The next weekly run will be the first that can detect a drop.',
      ],
      wowDropPct: null,
      sustainedDropPct: null,
      trailingPeak: null,
    };
  }

  const previous = prior[prior.length - 1];
  const wow = round1(pctDrop(previous.pagesWithImpressions, count));

  // Trailing peak is windowed on purpose. Once a collapse is `trendReadings`
  // old, the peak scrolls out and the alarm goes quiet at the new level. That is
  // deliberate: the open GitHub Issue is the durable record, and an alarm that
  // re-fires forever on a level change (including an intentional one) gets muted.
  const trailing = prior.slice(-t.trendReadings);
  const trailingPeak = Math.max(...trailing.map((r) => r.pagesWithImpressions));
  const sustained = round1(pctDrop(trailingPeak, count));

  // Guard rail against crying wolf: on a tiny baseline, one page going quiet is
  // a double-digit percentage. Report the movement, but do not alarm.
  if (previous.pagesWithImpressions < t.minBaseline) {
    details.push(
      `Baseline is only ${previous.pagesWithImpressions} pages (< minBaseline ` +
        `${t.minBaseline}). Percentage moves are noise at this scale, so alarms ` +
        `are suppressed. Week-over-week move: ${wow > 0 ? `-${wow}` : `+${round1(-wow)}`}%.`
    );
    return {
      severity: 'none',
      headline: `Below alarm baseline (${count} pages)`,
      details,
      wowDropPct: wow,
      sustainedDropPct: sustained,
      trailingPeak,
    };
  }

  const wowTripped = wow > t.wowDropPct;
  const sustainedTripped = sustained > t.sustainedDropPct;

  details.push(
    `Week-over-week: ${previous.pagesWithImpressions} -> ${count} ` +
      `(${wow > 0 ? `-${wow}` : `+${round1(-wow)}`}%), threshold -${t.wowDropPct}% ` +
      `— ${wowTripped ? 'TRIPPED' : 'ok'}.`
  );
  details.push(
    `Vs. trailing peak of last ${trailing.length} reading(s): ${trailingPeak} -> ` +
      `${count} (${sustained > 0 ? `-${sustained}` : `+${round1(-sustained)}`}%), ` +
      `threshold -${t.sustainedDropPct}% — ${sustainedTripped ? 'TRIPPED' : 'ok'}.`
  );

  // Crawlability vs. demand: impressions-per-page separates the two.
  const ipp = count > 0 ? current.impressions / count : 0;
  const prevIpp =
    previous.pagesWithImpressions > 0
      ? previous.impressions / previous.pagesWithImpressions
      : 0;
  if (wowTripped || sustainedTripped) {
    details.push(
      `Impressions/page: ${round1(prevIpp)} -> ${round1(ipp)}. If this held roughly ` +
        'steady while the page count fell, suspect crawlability/indexing (check ' +
        'robots.txt, canonicals, sitemap, redirects). If both fell together, ' +
        'suspect a demand or ranking change instead.'
    );
  }

  if (current.sitemapUrlsSubmitted) {
    details.push(
      `Coverage ratio: ${count} / ${current.sitemapUrlsSubmitted} sitemap URLs = ` +
        `${round1((count / current.sitemapUrlsSubmitted) * 100)}%. (Expected to be ` +
        'well under 100% — many indexed pages never earn an impression.)'
    );
  }

  if (!wowTripped && !sustainedTripped) {
    return {
      severity: 'none',
      headline: `Stable: ${count} pages with impressions`,
      details,
      wowDropPct: wow,
      sustainedDropPct: sustained,
      trailingPeak,
    };
  }

  const worst = Math.max(wow, sustained);
  const headline = wowTripped
    ? `Indexation proxy dropped ${wow}% week-over-week (${previous.pagesWithImpressions} -> ${count} pages)`
    : `Indexation proxy is ${sustained}% below its ${trailing.length}-reading peak (${trailingPeak} -> ${count} pages)`;

  return {
    // A >60% move is the nomadlist-class signature; escalate the wording so the
    // issue title itself conveys urgency without needing to be opened.
    severity: worst >= 60 ? 'alarm' : 'warn',
    headline,
    details,
    wowDropPct: wow,
    sustainedDropPct: sustained,
    trailingPeak,
  };
}

// ─── Reporting ───────────────────────────────────────────────────────────────

export function renderHistoryTable(readings: Reading[], limit = 12): string {
  const rows = readings.slice(-limit);
  const header =
    '| Taken on | Window | Pages w/ impressions | Impressions | Clicks | Sitemap URLs |\n' +
    '|---|---|---:|---:|---:|---:|';
  const body = rows
    .map(
      (r) =>
        `| ${r.takenOn} | ${r.windowStart}..${r.windowEnd} | ${r.pagesWithImpressions} | ` +
        `${Math.round(r.impressions)} | ${Math.round(r.clicks)} | ` +
        `${r.sitemapUrlsSubmitted ?? '—'} |`
    )
    .join('\n');
  return `${header}\n${body}`;
}

function buildIssueBody(verdict: Verdict, history: History, property: string): string {
  return [
    `**${verdict.headline}**`,
    '',
    `**Property:** \`${property}\``,
    '',
    '### What tripped',
    '',
    verdict.details.map((d) => `- ${d}`).join('\n'),
    '',
    '### Trend',
    '',
    renderHistoryTable(history.readings),
    '',
    '### What this metric is',
    '',
    'This is **not** the Search Console coverage-report "indexed pages" figure —',
    'no Search Console API exposes that. It is the count of distinct pages that',
    'received at least one Google Search impression in a rolling 28-day window',
    '(`searchanalytics.query`, `dimensions: ["page"]`). It is a deliberate proxy:',
    'structurally lower than the true indexed count, and sensitive to search',
    'demand as well as to crawlability. See `scripts/check-indexation.ts` for the',
    'full rationale and limitations.',
    '',
    '### Suggested triage',
    '',
    '1. Open Search Console > Indexing > Pages and compare the real indexed count.',
    '2. `curl -I https://www.michikanji.com/robots.txt` and confirm nothing new is disallowed.',
    '3. Fetch `/sitemap.xml` and confirm the URL count is still ~1,906.',
    '4. Spot-check a few kanji pages for unexpected `noindex`, non-self canonicals, or redirects.',
    '5. Check Search Console > Settings > Crawl stats for a spike in non-200 responses.',
    '',
    '_Opened automatically by `.github/workflows/indexation-alarm.yml`._',
  ].join('\n');
}

// ─── GitHub notification (matches scripts/check-ads.ts house style) ──────────

const ISSUE_LABEL = 'indexation-alarm';

async function notifyGitHub(verdict: Verdict, history: History, property: string): Promise<void> {
  const githubToken = process.env.GITHUB_TOKEN;
  const githubRepo = process.env.GITHUB_REPOSITORY;

  if (!githubToken || !githubRepo) {
    console.log(
      'GITHUB_TOKEN / GITHUB_REPOSITORY not set — skipping GitHub Issue ' +
        '(expected when running locally).'
    );
    return;
  }

  const headers = {
    Authorization: `Bearer ${githubToken}`,
    'Content-Type': 'application/json',
    Accept: 'application/vnd.github+json',
    'User-Agent': 'indexation-alarm-script',
  };

  const body = buildIssueBody(verdict, history, property);
  const prefix = verdict.severity === 'alarm' ? '🚨' : '⚠️';
  const title = `${prefix} [Indexation] ${verdict.headline}`;

  // Comment on the open alarm rather than stacking a new issue every week. A
  // duplicate-per-week pile is the fastest way to get an alarm muted.
  const existingRes = await fetch(
    `https://api.github.com/repos/${githubRepo}/issues?state=open&labels=${ISSUE_LABEL}&per_page=1`,
    { headers }
  );
  if (existingRes.ok) {
    const open = (await existingRes.json()) as { number: number; html_url: string }[];
    if (open.length > 0) {
      const issue = open[0];
      const res = await fetch(
        `https://api.github.com/repos/${githubRepo}/issues/${issue.number}/comments`,
        { method: 'POST', headers, body: JSON.stringify({ body: `### ${title}\n\n${body}` }) }
      );
      if (res.ok) {
        console.log(`✅ Commented on existing alarm issue: ${issue.html_url}`);
      } else {
        console.error(
          `❌ Failed to comment on issue #${issue.number} (${res.status}): ${await res.text()}`
        );
      }
      return;
    }
  }

  const res = await fetch(`https://api.github.com/repos/${githubRepo}/issues`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ title, body, labels: [ISSUE_LABEL, 'seo'] }),
  });

  if (res.ok) {
    const issue = (await res.json()) as { html_url: string };
    console.log(`✅ GitHub Issue created: ${issue.html_url}`);
  } else {
    console.error(`❌ Failed to create GitHub Issue (${res.status}): ${await res.text()}`);
  }
}

// ─── Missing-credential guidance ─────────────────────────────────────────────

const SETUP_INSTRUCTIONS = `
${CREDENTIAL_ENV_VAR} is not set, so no Search Console query can be made.

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
  const thresholds = readThresholds();
  const windowDays = intFromEnv('INDEXATION_WINDOW_DAYS', 28);
  const lagDays = intFromEnv('INDEXATION_LAG_DAYS', 3);
  const window = computeWindow(new Date(), windowDays, lagDays);
  const { primary, fallback } = resolveProperties();

  console.log('\n═══ MichiKanji Indexation Check ═══');
  console.log(`Metric: distinct pages with >=1 impression (PROXY for indexed pages)`);
  console.log(`Window: ${window.start} .. ${window.end} (${windowDays}d, ${lagDays}d lag)`);
  console.log(`Property (primary): ${primary}`);

  const rawKey = process.env[CREDENTIAL_ENV_VAR];
  if (!rawKey || rawKey.trim() === '') {
    console.error(`\n❌ ${SETUP_INSTRUCTIONS}\n`);
    // In CI a missing secret means the monitor is silently not monitoring —
    // exactly the failure this item exists to prevent — so fail loudly.
    // Locally it is just an unconfigured dev machine, so exit clean.
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
  let metrics: { pages: number; impressions: number; clicks: number };
  try {
    metrics = await fetchPageMetrics(token, property, window);
  } catch (err) {
    const status = err instanceof PropertyAccessError ? err.status : 0;
    if (status !== 403 && status !== 404) throw err;
    console.warn(
      `⚠️  Property "${primary}" returned ${status}. Retrying as "${fallback}" — a ` +
        'domain property and a URL-prefix property are different resources in the API.'
    );
    property = fallback;
    try {
      metrics = await fetchPageMetrics(token, property, window);
    } catch (err2) {
      throw new Error(
        `Neither "${primary}" nor "${fallback}" is accessible to ` +
          `${key.client_email}.\n\n` +
          'Most likely the service account has not been added as a user on the ' +
          'Search Console property, or was added with "Restricted" instead of ' +
          '"Full" permission. See Search Console > Settings > Users and permissions.\n\n' +
          `Last error: ${(err2 as Error).message}`
      );
    }
    console.warn(
      `➡️  Set GSC_PROPERTY_TYPE (or GSC_PROPERTY) so future runs skip this retry.`
    );
  }

  const sitemapUrlsSubmitted = await fetchSitemapSubmitted(token, property);

  const current: Reading = {
    takenOn: isoDate(new Date()),
    windowStart: window.start,
    windowEnd: window.end,
    property,
    pagesWithImpressions: metrics.pages,
    impressions: Math.round(metrics.impressions),
    clicks: Math.round(metrics.clicks),
    sitemapUrlsSubmitted,
  };

  const history = loadHistory(HISTORY_PATH);
  const verdict = evaluateAlarm(history.readings, current, thresholds);

  history.readings.push(current);
  saveHistory(HISTORY_PATH, history);

  console.log(`\nPages with impressions: ${current.pagesWithImpressions}`);
  console.log(`Impressions: ${current.impressions}   Clicks: ${current.clicks}`);
  console.log(`Sitemap URLs submitted: ${sitemapUrlsSubmitted ?? 'unavailable'}`);
  console.log(`\nVerdict [${verdict.severity}]: ${verdict.headline}`);
  verdict.details.forEach((d) => console.log(`  • ${d}`));
  console.log(`\nHistory (${history.readings.length} readings) -> ${HISTORY_PATH}`);
  console.log(`\n${renderHistoryTable(history.readings)}`);
  console.log('\n═══════════════════════════════════\n');

  if (verdict.severity === 'none') {
    console.log('No alarm — skipping notification.');
    return;
  }

  await notifyGitHub(verdict, history, property);
}

// Only auto-run when executed directly, so the pure helpers above can be
// imported by a test harness without kicking off an API call.
if (process.argv[1] && /check-indexation(\.[cm]?[jt]s)?$/.test(process.argv[1])) {
  main().catch((err: unknown) => {
    console.error('check-indexation script failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
