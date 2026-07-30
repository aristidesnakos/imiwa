/**
 * scripts/check-index-status.ts
 *
 * On-demand Google Search Console URL Inspection — reports the ACTUAL
 * per-URL index status Google currently has on file.
 *
 * Run manually:
 *   npx tsx --tsconfig tsconfig.json scripts/check-index-status.ts
 *   npx tsx --tsconfig tsconfig.json scripts/check-index-status.ts https://www.michikanji.com/kanji/水 https://www.michikanji.com/kanji/火
 *
 * NOT wired to a scheduled GitHub Actions workflow, deliberately. Its value is
 * answering "did Google actually notice the page I just changed?" — an
 * event-driven question you ask right after a deploy or a content edit, not a
 * trend worth sampling on a cron. (scripts/check-indexation.ts is the weekly
 * trend monitor; see its header for why a full-sitemap sweep with this API
 * is not viable as a recurring job — 2,000 queries/day, 600/min, ~1,900 URLs.
 * This script is the deliberately-scoped-down counterpart: a short, curated
 * URL list, checked whenever you want, never a sweep.) If a scheduled version
 * is ever wanted, it can reuse the exact cron/commit-back pattern in
 * .github/workflows/indexation-alarm.yml.
 *
 * Credentials: same GSC_SERVICE_ACCOUNT_KEY / GSC_PROPERTY / GSC_PROPERTY_TYPE
 * as scripts/check-indexation.ts — one service account, one Search Console
 * setup, shared by both scripts. See that file's SETUP_INSTRUCTIONS if you
 * haven't configured it yet.
 */

import { SITE_URL } from '../lib/seo/site';
import {
  parseServiceAccountKey,
  getGoogleAccessToken,
  type ServiceAccountKey,
} from './lib/google-service-account-auth';
import { resolveProperties } from './check-indexation';

// ─── Config ──────────────────────────────────────────────────────────────────

const SEARCH_CONSOLE_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
const INSPECT_ENDPOINT = 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect';
const CREDENTIAL_ENV_VAR = 'GSC_SERVICE_ACCOUNT_KEY';

/**
 * Edit this list to your own priority pages — the ones you want to confirm
 * Google has noticed after a deploy. Kept short on purpose: this API is
 * capped at 2,000 queries/day and 600/minute per site, so it's for a handful
 * of URLs checked on demand, never a full-sitemap sweep (see file header).
 */
const DEFAULT_PRIORITY_URLS = [
  SITE_URL,
  `${SITE_URL}/kanji`,
  `${SITE_URL}/kanji/${encodeURIComponent('水')}`,
  `${SITE_URL}/kanji/${encodeURIComponent('火')}`,
  `${SITE_URL}/kanji/${encodeURIComponent('木')}`,
  `${SITE_URL}/kanji/${encodeURIComponent('日')}`,
  `${SITE_URL}/kanji/${encodeURIComponent('人')}`,
];

// ─── Types ───────────────────────────────────────────────────────────────────

interface IndexStatusResult {
  verdict?: 'VERDICT_UNSPECIFIED' | 'PASS' | 'PARTIAL' | 'FAIL' | 'NEUTRAL';
  coverageState?: string;
  robotsTxtState?: string;
  indexingState?: string;
  lastCrawlTime?: string;
  pageFetchState?: string;
  googleCanonical?: string;
  userCanonical?: string;
}

interface InspectionResponse {
  inspectionResult?: {
    indexStatusResult?: IndexStatusResult;
  };
}

export interface InspectResult {
  url: string;
  ok: boolean;
  error?: string;
  status?: IndexStatusResult;
}

// ─── Missing-credential guidance ─────────────────────────────────────────────

const SETUP_INSTRUCTIONS = `
${CREDENTIAL_ENV_VAR} is not set, so no Search Console query can be made.

This script shares its GSC setup with scripts/check-indexation.ts — see that
file's SETUP_INSTRUCTIONS for the full one-time walkthrough (enable the API,
create a service account, add it as a Search Console user with "Full"
permission, and set ${CREDENTIAL_ENV_VAR} in your local shell / secrets).
`.trim();

// ─── Search Console API ──────────────────────────────────────────────────────

/**
 * Inspect a single URL. Never throws on a normal API response (including
 * "not indexed" verdicts) — only throws on a transport/auth failure, which
 * the caller surfaces as `ok: false` instead of crashing the whole report.
 */
export async function inspectUrl(
  token: string,
  property: string,
  url: string
): Promise<InspectResult> {
  try {
    const res = await fetch(INSPECT_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inspectionUrl: url, siteUrl: property }),
    });

    const text = await res.text();
    if (!res.ok) {
      return { url, ok: false, error: `HTTP ${res.status}: ${text}` };
    }

    const body = JSON.parse(text) as InspectionResponse;
    const status = body.inspectionResult?.indexStatusResult;
    if (!status) {
      return { url, ok: false, error: 'Response had no indexStatusResult.' };
    }
    return { url, ok: true, status };
  } catch (err) {
    return { url, ok: false, error: (err as Error).message };
  }
}

/**
 * Turn one inspection into a human verdict line plus supporting detail lines.
 * Pure/testable — no I/O.
 */
export function formatVerdict(result: InspectResult): { headline: string; details: string[] } {
  if (!result.ok || !result.status) {
    return { headline: `❌ Could not inspect: ${result.error}`, details: [] };
  }

  const s = result.status;
  const details: string[] = [
    `Coverage: ${s.coverageState ?? 'unknown'}`,
    `Indexing state: ${s.indexingState ?? 'unknown'}`,
    `Page fetch: ${s.pageFetchState ?? 'unknown'}`,
    `Robots.txt: ${s.robotsTxtState ?? 'unknown'}`,
    `Last crawl: ${s.lastCrawlTime ?? 'never'}`,
  ];

  const canonicalMismatch =
    !!s.googleCanonical && !!s.userCanonical && s.googleCanonical !== s.userCanonical;
  if (canonicalMismatch) {
    details.push(
      `Canonical mismatch: page declares "${s.userCanonical}" but Google picked "${s.googleCanonical}"`
    );
  } else if (s.googleCanonical) {
    details.push(`Canonical: ${s.googleCanonical}`);
  }

  if (canonicalMismatch) {
    return {
      headline: `⚠️  Canonical mismatch: Google prefers ${s.googleCanonical} but page declares ${s.userCanonical}`,
      details,
    };
  }

  const coverage = (s.coverageState ?? '').toLowerCase();
  if (s.verdict === 'PASS' && coverage.includes('indexed')) {
    return { headline: `✅ Indexed (${s.coverageState})`, details };
  }
  if (coverage.includes('crawled') && coverage.includes('not indexed')) {
    return { headline: `⚠️  Crawled but not indexed: ${s.coverageState}`, details };
  }
  if (coverage.includes('discovered')) {
    return { headline: `⚠️  Discovered but not yet crawled: ${s.coverageState}`, details };
  }
  if (s.verdict === 'FAIL' || coverage.includes('not indexed') || coverage === '') {
    return { headline: `❌ Not indexed: ${s.coverageState ?? 'no coverage state returned'}`, details };
  }
  return { headline: `ℹ️  ${s.coverageState ?? s.verdict ?? 'Unknown status'}`, details };
}

// ─── Main ────────────────────────────────────────────────────────────────────

export async function main(): Promise<void> {
  const urls = process.argv.slice(2).length > 0 ? process.argv.slice(2) : DEFAULT_PRIORITY_URLS;
  const { primary, fallback } = resolveProperties();

  console.log('\n═══ MichiKanji Index Status Check ═══');
  console.log(`URLs to inspect: ${urls.length}`);
  console.log(`Property (primary): ${primary}`);

  const rawKey = process.env[CREDENTIAL_ENV_VAR];
  if (!rawKey || rawKey.trim() === '') {
    console.error(`\n❌ ${SETUP_INSTRUCTIONS}\n`);
    process.exit(process.env.CI ? 1 : 0);
    return;
  }

  const key: ServiceAccountKey = parseServiceAccountKey(rawKey, CREDENTIAL_ENV_VAR);
  console.log(`Service account: ${key.client_email}`);
  const token = await getGoogleAccessToken(key, SEARCH_CONSOLE_SCOPE);

  // Probe the primary property with the first URL; fall back once if the
  // property identifier itself is wrong (same 403/404-on-wrong-form issue
  // documented in check-indexation.ts's resolveProperties()).
  let property = primary;
  const probe = await inspectUrl(token, property, urls[0]);
  if (!probe.ok && probe.error?.match(/HTTP (403|404)/)) {
    console.warn(
      `⚠️  Property "${primary}" returned an error. Retrying as "${fallback}".`
    );
    property = fallback;
  }

  const results: InspectResult[] = [];
  for (const url of urls) {
    const result = property === primary && results.length === 0 ? probe : await inspectUrl(token, property, url);
    results.push(result);
    const { headline, details } = formatVerdict(result);
    console.log(`\n${url}`);
    console.log(`  ${headline}`);
    details.forEach((d) => console.log(`  • ${d}`));
  }

  console.log('\n═══════════════════════════════════\n');

  const allFailed = results.every((r) => !r.ok);
  if (allFailed) {
    console.error('Every URL failed to inspect (API/auth errors, not "not indexed" verdicts). Exiting non-zero.');
    process.exit(1);
  }
}

// Only auto-run when executed directly, so `inspectUrl`/`formatVerdict` can be
// imported by a test harness without kicking off an API call.
if (process.argv[1] && /check-index-status(\.[cm]?[jt]s)?$/.test(process.argv[1])) {
  main().catch((err: unknown) => {
    console.error('check-index-status script failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
