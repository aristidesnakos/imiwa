/**
 * scripts/check-organic-push.ts
 *
 * Weekly read of the three things the Web-only monitors cannot see, recorded
 * to data/organic-push-history.json:
 *
 *   1. Google IMAGE search traffic, per day. The stroke-order diagrams became
 *      real images on 2026-09-28 (/kanji/<char>/stroke-order.svg); the baseline
 *      was 10 clicks / 27.8K impressions over 3 months. `check-indexation` and
 *      `check-query-performance` both hard-code `type: 'web'`, so this is the
 *      only place image numbers are recorded.
 *   2. Per-URL index status for the pages that were requested by hand: the N5
 *      list, quiz and stories hub, every N5 kanji page, every N4 kanji page.
 *      The question it answers is "did a requested page STAY indexed, or fall
 *      back to 'Crawled - currently not indexed'" — which decides between
 *      feeding the request queue and improving page quality. This is the
 *      URL Inspection API, capped at 2,000/day per site: ~260 URLs is fine,
 *      a full-sitemap sweep is not (see check-indexation.ts).
 *   3. The sitemap's `lastDownloaded`, i.e. whether Google re-read it after a
 *      resubmit.
 *
 * Run manually:  npx tsx --tsconfig tsconfig.json scripts/check-organic-push.ts
 * Run in CI:     .github/workflows/organic-push-monitor.yml (Mondays 09:00 UTC)
 *
 * Kept separate from the two Web monitors on purpose: they answer different
 * questions and must not be merged. This one never alarms — it records, and a
 * human (or the verdict task) reads the trend.
 *
 * Needs the same GSC_SERVICE_ACCOUNT_KEY / GSC_PROPERTY(_TYPE) as they do.
 */

import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { SITE_URL } from '../lib/seo/site';
import { N5_KANJI } from '../lib/constants/n5-kanji';
import { N4_KANJI } from '../lib/constants/n4-kanji';
import { parseServiceAccountKey, getGoogleAccessToken } from './lib/google-service-account-auth';
import { resolveProperties } from './check-indexation';
import { inspectUrl } from './check-index-status';

// ─── Types ───────────────────────────────────────────────────────────────────

/** [clicks, impressions, average position] for one day of Image search. */
export type ImageDay = [number, number, number];

interface UrlState {
  /** Coverage state, e.g. "Submitted and indexed". */
  s: string;
  /** Date of Google's last crawl (YYYY-MM-DD), or null if never crawled. */
  c: string | null;
}

export interface GroupSummary {
  total: number;
  /** Inspections that failed (transport/quota); excluded from every other count. */
  errors: number;
  indexed: number;
  /** Pages Google last crawled on or after `since` — i.e. re-read after the requests. */
  crawledSince: number;
  states: Record<string, number>;
}

export interface Reading {
  takenOn: string;
  property: string;
  /** The `crawledSince` cut-off used for this reading. */
  since: string;
  sitemap: {
    lastDownloaded: string | null;
    lastSubmitted: string | null;
    submitted: number | null;
    errors: number;
    warnings: number;
  } | null;
  groups: Record<string, GroupSummary>;
  /** URLs whose coverage state differs from the previous reading. Empty on the first. */
  changes: { url: string; from: string; to: string }[];
}

export interface History {
  schemaVersion: 1;
  note: string;
  /** Image search by day, merged across runs (newer overwrites older). */
  imageDaily: Record<string, ImageDay>;
  /** Latest known state per watched URL, so the next run can diff against it. */
  urls: Record<string, UrlState>;
  readings: Reading[];
}

// ─── Config ──────────────────────────────────────────────────────────────────

const HISTORY_PATH = resolve(__dirname, '..', 'data/organic-push-history.json');
const NOTE =
  'imageDaily = Google Image search [clicks, impressions, avg position] per day (GSC type=image). ' +
  'urls = last coverage state + last-crawl date per watched URL. readings[].groups summarise them; ' +
  'readings[].changes lists URLs whose state moved. Written by scripts/check-organic-push.ts.';

const SEARCH_CONSOLE_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
const WEBMASTERS_BASE = 'https://www.googleapis.com/webmasters/v3';
const CREDENTIAL_ENV_VAR = 'GSC_SERVICE_ACCOUNT_KEY';

/** Days of Image history requested each run: matches the 3-month baseline. */
const IMAGE_WINDOW_DAYS = 90;
/** Search Console `final` data trails by a few days. */
const LAG_DAYS = 3;
const INSPECT_CONCURRENCY = 4;
/** Indexing requests were made from this date; a crawl on/after it postdates them. */
const DEFAULT_SINCE = '2026-09-29';
/** The day each diagram became a real <img>; the before/after split for Image search. */
const IMAGE_SHIPPED_ON = '2026-09-28';

const isoDate = (d: Date): string => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number): Date => new Date(d.getTime() + n * 86_400_000);

// ─── Watch list ──────────────────────────────────────────────────────────────

export function watchList(): { url: string; group: string }[] {
  const kanjiUrl = (ch: string): string => `${SITE_URL}/kanji/${encodeURIComponent(ch)}`;
  return [
    ...['/kanji/n5', '/kanji/n5/quiz', '/stories'].map((p) => ({ url: `${SITE_URL}${p}`, group: 'level-pages' })),
    ...N5_KANJI.map((k) => ({ url: kanjiUrl(k.kanji), group: 'n5' })),
    ...N4_KANJI.map((k) => ({ url: kanjiUrl(k.kanji), group: 'n4' })),
  ];
}

export function isIndexed(state: string): boolean {
  return /^(Submitted and indexed|Indexed,)/i.test(state);
}

// ─── Search Console API ──────────────────────────────────────────────────────

class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

async function fetchImageDaily(
  token: string,
  property: string,
  today: Date
): Promise<Record<string, ImageDay>> {
  const end = addDays(today, -LAG_DAYS);
  const start = addDays(end, -(IMAGE_WINDOW_DAYS - 1));
  const res = await fetch(`${WEBMASTERS_BASE}/sites/${encodeURIComponent(property)}/searchAnalytics/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      startDate: isoDate(start),
      endDate: isoDate(end),
      dimensions: ['date'],
      type: 'image',
      dataState: 'final',
      rowLimit: 1000,
    }),
  });
  if (!res.ok) {
    throw new HttpError(`image searchAnalytics failed for "${property}" (${res.status}): ${await res.text()}`, res.status);
  }
  const body = (await res.json()) as {
    rows?: { keys?: string[]; clicks?: number; impressions?: number; position?: number }[];
  };
  const out: Record<string, ImageDay> = {};
  for (const r of body.rows ?? []) {
    const date = r.keys?.[0];
    if (!date) continue;
    out[date] = [
      Math.round(r.clicks ?? 0),
      Math.round(r.impressions ?? 0),
      Math.round((r.position ?? 0) * 10) / 10,
    ];
  }
  return out;
}

async function fetchSitemap(token: string, property: string): Promise<Reading['sitemap']> {
  try {
    const res = await fetch(`${WEBMASTERS_BASE}/sites/${encodeURIComponent(property)}/sitemaps`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      sitemap?: {
        path?: string;
        lastSubmitted?: string;
        lastDownloaded?: string;
        errors?: string | number;
        warnings?: string | number;
        contents?: { type?: string; submitted?: string | number }[];
      }[];
    };
    const sm = (body.sitemap ?? []).find((s) => s.path?.endsWith('/sitemap.xml'));
    if (!sm) return null;
    const submitted = (sm.contents ?? [])
      .filter((c) => !c.type || c.type === 'web')
      .reduce((n, c) => n + Number(c.submitted ?? 0), 0);
    return {
      lastDownloaded: sm.lastDownloaded ?? null,
      lastSubmitted: sm.lastSubmitted ?? null,
      submitted: submitted || null,
      errors: Number(sm.errors ?? 0),
      warnings: Number(sm.warnings ?? 0),
    };
  } catch {
    return null;
  }
}

async function inspectAll(
  token: string,
  property: string,
  items: { url: string; group: string }[]
): Promise<Map<string, UrlState | null>> {
  const out = new Map<string, UrlState | null>();
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < items.length) {
      const { url } = items[next++];
      const r = await inspectUrl(token, property, url);
      if (!r.ok || !r.status) {
        out.set(url, null);
        continue;
      }
      out.set(url, {
        s: r.status.coverageState ?? 'No coverage state',
        c: r.status.lastCrawlTime ? r.status.lastCrawlTime.slice(0, 10) : null,
      });
    }
  };
  await Promise.all(Array.from({ length: INSPECT_CONCURRENCY }, worker));
  return out;
}

// ─── Reading assembly (pure) ─────────────────────────────────────────────────

export function summarise(
  items: { url: string; group: string }[],
  states: Map<string, UrlState | null>,
  previous: Record<string, UrlState>,
  since: string
): { groups: Record<string, GroupSummary>; changes: Reading['changes']; urls: Record<string, UrlState> } {
  const groups: Record<string, GroupSummary> = {};
  const changes: Reading['changes'] = [];
  const urls: Record<string, UrlState> = { ...previous };
  for (const { url, group } of items) {
    const g = (groups[group] ??= { total: 0, errors: 0, indexed: 0, crawledSince: 0, states: {} });
    g.total++;
    const st = states.get(url);
    if (!st) {
      g.errors++;
      continue;
    }
    g.states[st.s] = (g.states[st.s] ?? 0) + 1;
    if (isIndexed(st.s)) g.indexed++;
    if (st.c && st.c >= since) g.crawledSince++;
    const prev = previous[url];
    if (prev && prev.s !== st.s) changes.push({ url, from: prev.s, to: st.s });
    urls[url] = st;
  }
  return { groups, changes, urls };
}

// ─── History persistence ─────────────────────────────────────────────────────

export function loadHistory(path: string): History {
  const empty: History = { schemaVersion: 1, note: NOTE, imageDaily: {}, urls: {}, readings: [] };
  if (!existsSync(path)) return empty;
  const parsed = JSON.parse(readFileSync(path, 'utf8')) as History;
  if (!Array.isArray(parsed.readings)) throw new Error(`${path} is malformed: expected a "readings" array.`);
  return { ...empty, ...parsed };
}

export function saveHistory(path: string, history: History): void {
  mkdirSync(dirname(path), { recursive: true });
  // Write-then-rename so an interrupted run never leaves a truncated file that
  // would make every later run's JSON.parse throw.
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, `${JSON.stringify({ ...history, note: NOTE }, null, 2)}\n`, 'utf8');
  renameSync(tmp, path);
}

// ─── Main ────────────────────────────────────────────────────────────────────

export async function main(historyPath: string = HISTORY_PATH): Promise<void> {
  const rawKey = process.env[CREDENTIAL_ENV_VAR];
  if (!rawKey || rawKey.trim() === '') {
    console.error(`${CREDENTIAL_ENV_VAR} is not set — see the setup notes in scripts/check-indexation.ts.`);
    // A scheduled monitor without credentials is a broken monitor; locally it is
    // just an unconfigured machine.
    process.exit(process.env.CI ? 1 : 0);
  }
  const key = parseServiceAccountKey(rawKey, CREDENTIAL_ENV_VAR);
  const token = await getGoogleAccessToken(key, SEARCH_CONSOLE_SCOPE);
  const today = new Date();
  const since = process.env.ORGANIC_PUSH_SINCE?.trim() || DEFAULT_SINCE;

  // The Image query doubles as the property probe: same 403/404 fallback the
  // Web monitors use, because a domain and a URL-prefix property are different
  // resources in the API.
  const { primary, fallback } = resolveProperties();
  let property = primary;
  let image: Record<string, ImageDay>;
  try {
    image = await fetchImageDaily(token, property, today);
  } catch (err) {
    if (!(err instanceof HttpError) || (err.status !== 403 && err.status !== 404)) throw err;
    console.warn(`Property "${primary}" returned ${err.status}; retrying as "${fallback}".`);
    property = fallback;
    image = await fetchImageDaily(token, property, today);
  }

  const items = watchList();
  const states = await inspectAll(token, property, items);
  const ok = [...states.values()].filter(Boolean).length;
  if (ok === 0) {
    throw new Error(
      `Every one of ${items.length} URL inspections failed for ${property}. Refusing to record ` +
        'a reading built from nothing — check the service account and the URL Inspection quota.'
    );
  }

  const history = loadHistory(historyPath);
  const { groups, changes, urls } = summarise(items, states, history.urls, since);
  const reading: Reading = {
    takenOn: isoDate(today),
    property,
    since,
    sitemap: await fetchSitemap(token, property),
    groups,
    // The first reading is a baseline, not a change from nothing.
    changes: Object.keys(history.urls).length === 0 ? [] : changes,
  };
  history.imageDaily = { ...history.imageDaily, ...image };
  history.urls = urls;
  history.readings.push(reading);
  saveHistory(historyPath, history);

  const daily = Object.entries(history.imageDaily).sort(([a], [b]) => (a < b ? -1 : 1));
  const perDay = (rows: [string, ImageDay][], i: 0 | 1): string =>
    rows.length ? (rows.reduce((n, [, v]) => n + v[i], 0) / rows.length).toFixed(1) : 'n/a';
  const before = daily.filter(([d]) => d < IMAGE_SHIPPED_ON);
  const after = daily.filter(([d]) => d >= IMAGE_SHIPPED_ON);
  console.log(`\nImage search per day (clicks / impressions), diagrams became images ${IMAGE_SHIPPED_ON}:`);
  console.log(`  before: ${perDay(before, 0)} / ${perDay(before, 1)} over ${before.length} days`);
  console.log(`  after:  ${perDay(after, 0)} / ${perDay(after, 1)} over ${after.length} days`);
  console.log(`Sitemap: ${JSON.stringify(reading.sitemap)}`);
  for (const [name, g] of Object.entries(groups)) {
    console.log(`${name}: ${g.indexed}/${g.total} indexed, ${g.crawledSince} crawled since ${since}, ${g.errors} errors`);
    for (const [s, n] of Object.entries(g.states)) console.log(`    ${n} × ${s}`);
  }
  console.log(`State changes since last reading: ${reading.changes.length}`);
  reading.changes.slice(0, 40).forEach((c) => console.log(`  ${decodeURIComponent(c.url)}: ${c.from} -> ${c.to}`));
  console.log(`\nHistory (${history.readings.length} readings) -> ${historyPath}`);
}

if (process.argv[1] && /check-organic-push(\.[cm]?[jt]s)?$/.test(process.argv[1])) {
  main().catch((err: unknown) => {
    console.error('check-organic-push failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
