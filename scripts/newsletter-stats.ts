/**
 * How the weekly story is doing, as far as Resend can say.
 *
 * Run: pnpm newsletter:stats
 *
 * Read-only: it sends, schedules, creates and deletes nothing. It never prints
 * a secret, an environment value or a subscriber's address. Contacts are
 * counted and never listed, and every error is scrubbed of anything address-
 * or key-shaped, and of the segment id, before it is printed.
 *
 * ---------------------------------------------------------------------------
 * What the Resend API exposes (checked against the live docs on 2026-09-27)
 * ---------------------------------------------------------------------------
 *
 *  - GET /segments/{id}/contacts lists a segment's contacts, cursor-paginated
 *    (`limit` up to 100, `after` = the last id seen, `has_more`). Each carries
 *    `unsubscribed`, the contact's global flag, which every unsubscribe route
 *    sets, the welcome card's own /api/unsubscribe included.
 *    https://resend.com/docs/api-reference/segments/list-segment-contacts
 *  - GET /broadcasts and GET /broadcasts/{id} give name, status, created_at,
 *    scheduled_at, sent_at and, on the single GET, `from`. No numbers at all.
 *    https://resend.com/docs/api-reference/broadcasts/get-broadcast
 *  - GET /emails/metrics is where the numbers are: sent, delivered, bounced,
 *    complained, unsubscribed, opened / unique_opened, clicked / unique_clicked,
 *    filtered by `broadcast_id` and grouped by the `broadcast` dimension. In
 *    Resend's words, "Open and click metrics require open and click tracking on
 *    the sending domain." Cached for up to 15 minutes, and clamped to the plan's
 *    retention window. https://resend.com/docs/api-reference/emails/get-metrics
 *  - GET /domains carries each domain's current `open_tracking` and
 *    `click_tracking`, which is how this knows when a zero means "not recorded".
 *    https://resend.com/docs/api-reference/domains/list-domains
 *
 * Not used: GET /emails, which has `last_event` but no broadcast id and so
 * cannot be aggregated per broadcast (and /emails/metrics already is), and
 * GET /segments/metrics, which counts subscribers but is a private beta.
 *
 * ---------------------------------------------------------------------------
 * Why it says "not recorded" rather than 0%
 * ---------------------------------------------------------------------------
 *
 * With tracking off, Resend records no open or click events, so the metrics
 * endpoint answers 0, and a naive report prints a 0% open rate for mail people
 * plainly read: every subscriber on the list opened a confirmation email and
 * clicked its link to become one. So opens and clicks are printed only for a
 * domain whose tracking is on; otherwise the output names the switch that is
 * off. The setting read is today's, and tracking is not retroactive: a send
 * made while it was off has no events, whatever the switch says now.
 *
 * Needs a Full access key, as stories:create-broadcast does; a Sending-access
 * key gets 401 restricted_api_key. The procedure and how to read the output
 * are in docs/runbooks/newsletter.md, "Measuring the newsletter".
 */
import { config as loadEnv } from 'dotenv';

import config from '../config';
import { EPISODES } from '../lib/stories';

const RESEND_API = 'https://api.resend.com';

// The application loads .env.local through Next. This standalone operator
// command runs under tsx, so load it explicitly without ever printing values.
loadEnv({ path: '.env.local' });
loadEnv();

// --- Resend's shapes, only the fields read here ----------------------------

interface Page<T> {
  has_more?: boolean;
  data: T[];
}

/** A contact also carries its address. Nothing here reads it, so it is not typed. */
interface Contact {
  id: string;
  unsubscribed?: boolean;
}

interface Segment {
  id: string;
  name?: string | null;
}

interface Domain {
  id: string;
  name: string;
  open_tracking?: boolean;
  click_tracking?: boolean;
}

interface Broadcast {
  id: string;
  name?: string | null;
  segment_id?: string | null;
  status: string;
  created_at: string;
  scheduled_at?: string | null;
  sent_at?: string | null;
  from?: string | null;
}

const METRICS = [
  'sent',
  'delivered',
  'delivery_delayed',
  'failed',
  'suppressed',
  'bounced',
  'complained',
  'unsubscribed',
  'opened',
  'unique_opened',
  'clicked',
  'unique_clicked',
] as const;
type MetricName = (typeof METRICS)[number];
type MetricsRow = Partial<Record<MetricName, number>> & { broadcast_id?: string };

interface Metrics {
  data?: MetricsRow[];
}

// --- Talking to Resend -----------------------------------------------------

class ResendError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/**
 * Every error is printed only after this: no address, no key, no environment
 * value (the segment id rides in request paths), and no essay.
 */
function scrub(text: string): string {
  const segmentId = process.env.RESEND_WEEKLY_STORIES_SEGMENT_ID?.trim();
  return (segmentId ? text.split(segmentId).join('<segment id>') : text)
    .replace(/[^\s@<>"',;:]+@[^\s@<>"',;:]+/g, '<address>')
    .replace(/re_[A-Za-z0-9_]+/g, '<key>')
    .slice(0, 300);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

let lastRequestAt = 0;

async function resendGet<T>(
  apiKey: string,
  path: string,
  query: Record<string, string | readonly string[] | undefined> = {}
): Promise<T> {
  const url = new URL(path, RESEND_API);
  for (const [key, value] of Object.entries(query)) {
    // A list is sent as the key repeated, which the metrics endpoint documents
    // alongside comma-separated values, and which needs no escaped commas.
    if (typeof value === 'string') url.searchParams.set(key, value);
    else for (const item of value ?? []) url.searchParams.append(key, item);
  }

  for (let attempt = 0; ; attempt += 1) {
    // Resend allows 10 requests a second per team, shared by every key.
    const wait = lastRequestAt + 150 - Date.now();
    if (wait > 0) await sleep(wait);
    lastRequestAt = Date.now();

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(20_000),
    });
    if (res.status === 429 && attempt < 2) {
      await sleep(1000 * Math.max(1, Number(res.headers.get('retry-after')) || 1));
      continue;
    }
    if (!res.ok) {
      const body = await res.text();
      let code = '';
      let message = body;
      try {
        const parsed = JSON.parse(body) as { name?: string; message?: string };
        code = parsed.name ?? '';
        message = parsed.message ?? body;
      } catch {
        // Not JSON; print the scrubbed text as it came.
      }
      throw new ResendError(
        res.status,
        code,
        scrub(`GET ${url.pathname} -> ${res.status}${code ? ` ${code}` : ''}: ${message}`)
      );
    }
    return (await res.json()) as T;
  }
}

/** A cursor-paginated list, one page at a time; nothing is kept between pages. */
async function* pages<T extends { id: string }>(apiKey: string, path: string): AsyncGenerator<T[]> {
  let after: string | undefined;
  for (;;) {
    const page = await resendGet<Page<T>>(apiKey, path, { limit: '100', after });
    yield page.data;
    if (!page.has_more || page.data.length === 0) return;
    after = page.data[page.data.length - 1].id;
  }
}

async function listAll<T extends { id: string }>(apiKey: string, path: string): Promise<T[]> {
  const items: T[] = [];
  for await (const page of pages<T>(apiKey, path)) items.push(...page);
  return items;
}

// --- Formatting ------------------------------------------------------------

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Resend writes `2026-11-01 15:13:31.723+00`; normalise it to ISO before parsing. */
function parseResendDate(value: string): Date {
  return new Date(value.replace(' ', 'T').replace(/([+-]\d\d)$/, '$1:00'));
}

function formatDate(date: Date): string {
  if (Number.isNaN(date.getTime())) return 'an unreadable date';
  const iso = date.toISOString();
  return `${WEEKDAYS[date.getUTCDay()]} ${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
}

/** `sent Sat 2026-10-03 09:00 UTC`, `scheduled for …`, `draft, created …`. */
function statusLine(broadcast: Broadcast): string {
  const at = (value: string) => formatDate(parseResendDate(value));
  const moment = broadcast.sent_at
    ? `sent ${at(broadcast.sent_at)}`
    : broadcast.scheduled_at
      ? `scheduled for ${at(broadcast.scheduled_at)}`
      : `created ${at(broadcast.created_at)}`;
  // Say the status only where the moment does not already say it.
  return moment.startsWith(broadcast.status) ? moment : `${broadcast.status}, ${moment}`;
}

/** The date a broadcast's events can start from, for the metrics query. */
function firstEventDay(broadcast: Broadcast): string {
  const date = parseResendDate(broadcast.sent_at ?? broadcast.scheduled_at ?? broadcast.created_at);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

/** `Name <someone@example.com>` -> `example.com`. Only the domain is ever printed. */
function domainOf(from: string | null | undefined): string | null {
  const match = /@([^\s>]+)>?\s*$/.exec(from ?? '');
  return match ? match[1].toLowerCase() : null;
}

function percent(part: number, whole: number): string {
  return whole > 0 ? `${Math.round((part / whole) * 100)}%` : 'n/a';
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

/**
 * The slug a broadcast's links carry as utm_campaign, or null. The broadcast
 * script names a draft `Episode <n>: <title>`; a broadcast named any other way
 * may not have come from lib/email/quiz-email.ts at all, so it gets no claim.
 */
function campaignFor(broadcast: Broadcast): string | null {
  const match = /^Episode (\d+)\b/.exec(broadcast.name ?? '');
  const episode = match ? EPISODES.find(e => e.number === Number(match[1])) : undefined;
  return episode ? episode.slug : null;
}

/**
 * One engagement line: counts when Resend can have recorded them, and the
 * reason when it cannot, never a bare 0% that reads as "nobody read it".
 */
function engagement(
  what: 'open' | 'click',
  unique: number,
  events: number,
  delivered: number,
  trackingOn: boolean | undefined,
  where: string
): string {
  // Events exist only if tracking was on when they happened, whatever it is now.
  if (unique > 0 || trackingOn === true) {
    const counts = `${unique} of ${delivered} delivered (${percent(unique, delivered)}), ${plural(events, `${what} event`)}`;
    return unique === 0 && delivered > 0
      ? `${counts}; if ${what} tracking was switched on after this went out, 0 means not recorded`
      : counts;
  }
  if (trackingOn === false) {
    return what === 'open'
      ? `not recorded: open tracking is off on ${where}`
      : `not recorded in Resend: click tracking is off on ${where}`;
  }
  return `none recorded, and the tracking setting for ${where} is unknown, so that may mean not recorded`;
}

// --- The report ------------------------------------------------------------

async function main(): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.error(
      'newsletter:stats needs RESEND_API_KEY (a Full access key) in .env.local; see docs/runbooks/newsletter.md.'
    );
    process.exit(1);
  }
  const segmentId = process.env.RESEND_WEEKLY_STORIES_SEGMENT_ID?.trim();
  const repoDomain = domainOf(config.resend.fromAdmin);
  // How many people any rate is taken over: the list, or when the segment is
  // unknown, the newest send's delivered count.
  let listSize: number | null = null;

  console.log(`The weekly story in Resend, read-only, ${formatDate(new Date())}`);

  // Subscribers ---------------------------------------------------------------
  console.log('\nSubscribers');
  if (!segmentId) {
    console.log('  skipped: RESEND_WEEKLY_STORIES_SEGMENT_ID is not set.');
  } else {
    const segmentPath = `/segments/${encodeURIComponent(segmentId)}`;
    const segment = await resendGet<Segment>(apiKey, segmentPath);
    let subscribed = 0;
    let unsubscribed = 0;
    // Counted page by page and never stored: the address is in every contact.
    for await (const contacts of pages<Contact>(apiKey, `${segmentPath}/contacts`)) {
      for (const contact of contacts) {
        if (contact.unsubscribed) unsubscribed += 1;
        else subscribed += 1;
      }
    }
    console.log(
      `  ${segment.name ? `"${segment.name}"` : 'The configured segment'}: ${plural(subscribed + unsubscribed, 'contact')}, ` +
        `${subscribed} subscribed, ${unsubscribed} unsubscribed`
    );
    listSize = subscribed;
  }

  // Tracking ------------------------------------------------------------------
  const domains = (await resendGet<Page<Domain>>(apiKey, '/domains')).data;
  const tracking = new Map(domains.map(domain => [domain.name.toLowerCase(), domain]));
  console.log("\nOpen and click tracking, per sending domain (today's setting; it is not retroactive)");
  if (domains.length === 0) console.log('  no domains on this account');
  for (const domain of domains) {
    const note = domain.name.toLowerCase() === repoDomain ? '   <- config.resend.fromAdmin: all mail this repo sends' : '';
    console.log(
      `  ${domain.name}: opens ${domain.open_tracking ? 'ON' : 'off'}, clicks ${domain.click_tracking ? 'ON' : 'off'}${note}`
    );
  }

  // Broadcasts ----------------------------------------------------------------
  const broadcasts = (await listAll<Broadcast>(apiKey, '/broadcasts')).sort(
    (a, b) => parseResendDate(b.created_at).getTime() - parseResendDate(a.created_at).getTime()
  );
  console.log(`\nBroadcasts (${broadcasts.length})`);

  // Only sends have a `from` worth fetching and numbers worth asking for.
  const sends = broadcasts.filter(b => b.status !== 'draft' && b.status !== 'scheduled');
  for (const send of sends) {
    send.from = (await resendGet<Broadcast>(apiKey, `/broadcasts/${encodeURIComponent(send.id)}`)).from;
  }

  const numbers = new Map<string, MetricsRow>();
  let numbersUnavailable: string | null = null;
  const days = sends.map(firstEventDay).filter(Boolean).sort();
  if (sends.length > 0) {
    try {
      for (let i = 0; i < sends.length; i += 100) {
        const metrics = await resendGet<Metrics>(apiKey, '/emails/metrics', {
          dimensions: 'broadcast',
          broadcast_id: sends.slice(i, i + 100).map(b => b.id),
          metrics: METRICS,
          start_date: days[0],
        });
        for (const row of metrics.data ?? []) if (row.broadcast_id) numbers.set(row.broadcast_id, row);
      }
    } catch (error) {
      // A plan or availability limit on the metrics endpoint should not hide the
      // rest of the report. Credentials problems still stop everything below.
      if (!(error instanceof ResendError) || error.status === 401) throw error;
      numbersUnavailable = error.message;
    }
  }

  let printedOpens = false;
  let newestDelivered: number | null = null;
  if (broadcasts.length === 0) {
    console.log(
      '  none yet. The first appears here once the weekly job (`pnpm stories:schedule-broadcast`) or ' +
        '`pnpm stories:create-broadcast <slug>` has made one.'
    );
  }
  for (const broadcast of broadcasts) {
    const elsewhere = segmentId && broadcast.segment_id && broadcast.segment_id !== segmentId ? ', to another segment' : '';
    console.log(`\n  ${broadcast.name ?? broadcast.id} [${statusLine(broadcast)}${elsewhere}]`);

    if (!sends.includes(broadcast)) {
      console.log('    no numbers until it is sent');
      continue;
    }
    if (numbersUnavailable) {
      console.log(`    numbers unavailable from the API (${numbersUnavailable})`);
      console.log('    read them in the dashboard instead: Resend -> Broadcasts -> this broadcast');
      continue;
    }
    const row = numbers.get(broadcast.id);
    if (!row) {
      console.log("    no delivery events in Resend's metrics yet; they can lag by up to 15 minutes");
      continue;
    }

    const n = (metric: MetricName) => row[metric] ?? 0;
    const delivered = n('delivered');
    newestDelivered ??= delivered;
    const problems = (['delivery_delayed', 'failed', 'suppressed'] as const)
      .filter(metric => n(metric) > 0)
      .map(metric => `${n(metric)} ${metric.replace('_', ' ')}`);
    console.log(
      `    delivered    ${delivered} of ${n('sent')} sent; ${n('bounced')} bounced, ${n('complained')} complained, ` +
        `${n('unsubscribed')} unsubscribed${problems.length ? `; ${problems.join(', ')}` : ''}`
    );

    const domainName = domainOf(broadcast.from);
    const domain = domainName ? tracking.get(domainName) : undefined;
    const where = domainName ?? 'its sending domain';
    // Mirrors engagement(): an open rate is printed whenever there can be one.
    printedOpens ||= n('unique_opened') > 0 || domain?.open_tracking === true;
    console.log(`    opened       ${engagement('open', n('unique_opened'), n('opened'), delivered, domain?.open_tracking, where)}`);
    console.log(`    clicked      ${engagement('click', n('unique_clicked'), n('clicked'), delivered, domain?.click_tracking, where)}`);

    const campaign = campaignFor(broadcast);
    if (campaign) console.log(`    arrivals     DataFast, UTM tab: utm_campaign=${campaign}, utm_content=weekly`);
  }

  // What Resend cannot say ------------------------------------------------------
  console.log('\nRead alongside');
  const readers = listSize ?? newestDelivered;
  if (readers !== null && readers > 0 && readers < 100) {
    console.log(
      `  - Over ${plural(readers, 'reader')}, one person moves any rate by ${Math.round(100 / readers)} points. ` +
        'Every rate here, or in DataFast, is anecdote, not data.'
    );
  }
  if (printedOpens) {
    console.log(
      '  - Opens are inflated: Apple Mail Privacy Protection fetches images when mail arrives, not when it is read.\n' +
        '    Clicks, arrivals and replies are the honest signals.'
    );
  }
  console.log(
    '  - Arrivals from the email are in DataFast, UTM tab, utm_source=newsletter. The welcome card is not a\n' +
      '    broadcast; its arrivals carry utm_content=welcome.'
  );
  console.log('  - Replies go to the reply-to inbox (config.resend.supportEmail). Count them there.');
  if (broadcasts.length > 0) {
    console.log(
      "  - A broadcast's unsubscribes are what Resend attributes to that send. The segment count above is the\n" +
        "    list as it stands, whichever link was used; the welcome card carries its own."
    );
  }
}

main().catch(error => {
  if (error instanceof ResendError && error.code === 'restricted_api_key') {
    console.error(
      'Resend refused the key: it is a Sending-access key, and reading contacts and broadcasts needs a Full access key.'
    );
  } else {
    console.error(error instanceof Error ? scrub(error.message) : 'newsletter:stats failed.');
  }
  process.exit(1);
});
