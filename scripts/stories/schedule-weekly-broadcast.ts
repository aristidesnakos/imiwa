/**
 * Schedule the next episode's broadcast in Resend, for the next send slot.
 *
 * Run: pnpm stories:schedule-broadcast             the weekly job; what
 *                                                  .github/workflows/weekly-broadcast.yml runs
 *      pnpm stories:schedule-broadcast --dry-run   anywhere, with or without credentials
 *
 * ---------------------------------------------------------------------------
 * What it does
 * ---------------------------------------------------------------------------
 *
 * Six episodes went up and not one was broadcast: the weekly send was a manual
 * ritual that nobody ran. So since 2026-09-27 (an owner decision, reversing
 * docs/prd/story-delivery-resend.md §5 Phase 4's "no cron") a workflow runs
 * this every Wednesday and Friday at 12:07 UTC. It reads every broadcast in
 * Resend, decides which episode is next (lib/email/broadcast-queue.ts, where
 * the rules are), checks that the episode's page answers 200 in production and
 * that the postal address is publishable, builds the email
 * (lib/email/broadcast.ts) and schedules it for the next Saturday at 13:00 UTC
 * (lib/email/send-schedule.ts). Then it opens a GitHub issue naming the
 * broadcast, with one line saying how to cancel it: the review window runs
 * from that moment to the send.
 *
 * Resend is the ledger. There is no repo state file: an episode has gone out
 * when Resend holds a broadcast named `Episode N: <title>` that is scheduled,
 * queued, sending, sent or cancelled. The only other record the job keeps is
 * its own review issue, which is how it knows a person cancelled a broadcast it
 * scheduled (rule 3 in lib/email/broadcast-queue.ts).
 *
 * ---------------------------------------------------------------------------
 * What it never does
 * ---------------------------------------------------------------------------
 *
 *  - Send. There is no send route in the app and no contact loop. It makes at
 *    most two calls that change anything in Resend, create a draft and
 *    schedule it, and Resend does the queueing, throttling, unsubscribe
 *    filtering and the send itself at `scheduled_at`.
 *  - Read a contact. So it has no subscriber address to print, and everything
 *    it prints or posts is scrubbed of anything address-, key- or token-shaped
 *    as well, and of the segment id.
 *  - Schedule less than 30 minutes ahead, schedule a second broadcast for one
 *    send day, or schedule an episode that has already gone out.
 *  - Retry a call that changes anything, unless Resend refused it with a 429
 *    before acting on it. The Broadcast API has no idempotency key, so a
 *    lost response is reported and left for the next run, which reads Resend
 *    again and reconciles: a single draft it finds is scheduled, a scheduled
 *    broadcast is left alone.
 *  - Guess. Two drafts for one episode, a near-miss name that has gone out, a
 *    status it does not know, or a draft that is no longer what the builder
 *    makes: it stops, says what to do, and the workflow opens an issue.
 *
 * ---------------------------------------------------------------------------
 * The Resend API, as verified against the live docs on 2026-09-27
 * ---------------------------------------------------------------------------
 *
 *  - GET /broadcasts lists them, newest first. `limit` is 1 to 100 and
 *    optional (without it everything comes back at once); `after` is the id of
 *    the last item seen, `has_more` says whether to ask again. Each item has
 *    id, name, audience_id, segment_id, status, created_at, scheduled_at and
 *    sent_at, with timestamps written like `2026-11-01 15:13:31.723+00`.
 *    https://resend.com/docs/api-reference/broadcasts/list-broadcasts
 *    https://resend.com/docs/api-reference/pagination
 *  - Statuses: draft, scheduled, queued, sent, canceled.
 *    https://resend.com/docs/dashboard/broadcasts/manage-broadcasts
 *  - POST /broadcasts creates one: segment_id (required), from, subject,
 *    reply_to, html, text, name, topic_id. It also takes `send` (default
 *    false) and `scheduled_at` (which needs `send: true`), but this job never
 *    passes either: a lost response to a create-and-schedule would leave a
 *    booked broadcast the job cannot know it made, and with no idempotency key
 *    a retry would book the episode twice. Two calls leave a draft instead.
 *    https://resend.com/docs/api-reference/broadcasts/create-broadcast
 *  - POST /broadcasts/{id}/send takes an optional `scheduled_at`, "in natural
 *    language (e.g.: `in 1 min`) or ISO 8601 format (e.g:
 *    `2026-08-05T11:52:01.858Z`)". This job sends ISO 8601 only. "You can send
 *    broadcasts only if they were created via the API": a draft made in the
 *    dashboard editor cannot be scheduled from here.
 *    https://resend.com/docs/api-reference/broadcasts/send-broadcast
 *  - GET /broadcasts/{id} adds from, subject, reply_to, preview_text, html and
 *    text, which is what an existing draft is compared against.
 *    https://resend.com/docs/api-reference/broadcasts/get-broadcast
 *  - Cancelling a scheduled broadcast returns it to `draft`, and nothing is
 *    sent; cancelling a queued one makes it `canceled`, and whatever already
 *    went out stays out. Deleting a scheduled one also cancels it.
 *    https://resend.com/docs/api-reference/broadcasts/cancel-broadcast
 *    https://resend.com/docs/api-reference/broadcasts/delete-broadcast
 *  - Idempotency keys exist only on POST /emails and POST /emails/batch.
 *    https://resend.com/docs/dashboard/emails/idempotency-keys
 *  - 10 requests a second per team, shared by every key; over it, a 429 with
 *    `retry-after`. Every request must carry a User-Agent or it gets a 403.
 *    https://resend.com/docs/api-reference/rate-limit
 *    https://resend.com/docs/api-reference/introduction
 *
 * The key must be a Full access key: a Sending-access key cannot create or
 * list broadcasts (`401 restricted_api_key`). docs/runbooks/newsletter.md has
 * the procedure, including how to cancel or reschedule what this books.
 */
import { config as loadEnv } from 'dotenv';

import config from '../../config';
import { postalAddressProblems } from '../../lib/business/postal-address';
import {
  draftDifferences,
  episodeBroadcast,
  mentionedEpisodeNumber,
  parseBroadcastName,
} from '../../lib/email/broadcast';
import type { BroadcastPayload, StoredBroadcast } from '../../lib/email/broadcast';
import {
  nothingQueuedIssueTitle,
  parseResendTimestamp,
  parseReviewIssueTitle,
  planWeeklyBroadcast,
  reviewIssueTitle,
} from '../../lib/email/broadcast-queue';
import type { BroadcastSummary, Decision, ReviewRecord } from '../../lib/email/broadcast-queue';
import { MIN_SCHEDULE_LEAD_MINUTES, formatUtcInstant, nextSendAt } from '../../lib/email/send-schedule';
import { SITE_URL } from '../../lib/seo/site';
import { EPISODES, episodeBySlug } from '../../lib/stories';
import type { Episode } from '../../lib/stories/types';

// The application loads .env.local through Next. This standalone command runs
// under tsx, so load it explicitly, without ever printing a value.
loadEnv({ path: '.env.local' });
loadEnv();

const RESEND_API = 'https://api.resend.com';
const USER_AGENT = 'michikanji-weekly-broadcast';
const DAY_MS = 24 * 60 * 60 * 1000;
const WORKFLOW = '.github/workflows/weekly-broadcast.yml';
const RUNBOOK = 'docs/runbooks/newsletter.md';

/** The review and write-by issues. Failures go under `newsletter-alarm`, from the workflow. */
const LABEL = {
  name: 'newsletter',
  color: '1D76DB',
  description: 'The weekly story: what is scheduled for Saturday, and what is missing',
};
/** Every issue this job looks for was opened within the last week; three is margin. */
const ISSUE_LOOKBACK_DAYS = 21;

// --- Output ------------------------------------------------------------------

/**
 * The one choke point for everything printed or posted. Nothing here reads a
 * contact, so no subscriber address should ever reach it; this makes sure of
 * it, and of keys, tokens and the segment id, whatever an error message says.
 */
function scrub(text: string): string {
  const segmentId = process.env.RESEND_WEEKLY_STORIES_SEGMENT_ID?.trim();
  return (segmentId ? text.split(segmentId).join('<segment id>') : text)
    .replace(/[^\s@<>"'`,;:()[\]]+@[^\s@<>"'`,;:()[\]]+/g, '<address>')
    .replace(/\bre_[A-Za-z0-9_]+/g, '<key>')
    .replace(/\b(?:gh[opsur]_[A-Za-z0-9]+|github_pat_[A-Za-z0-9_]+)/g, '<token>');
}

function say(text = ''): void {
  console.log(scrub(text));
}

function row(label: string, text: string): void {
  say(`  ${label.padEnd(12)} ${text}`);
}

/** A failure written for the person who has to act on it. */
class JobError extends Error {}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function when(value: string | null | undefined): string {
  return formatUtcInstant(parseResendTimestamp(value) ?? new Date(Number.NaN));
}

// --- Resend --------------------------------------------------------------------

class ResendError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }

  /** No answer, or a server error: Resend may or may not have acted. */
  get ambiguous(): boolean {
    return this.status === 0 || this.status >= 500;
  }
}

let lastResendRequestAt = 0;

async function resend<T>(apiKey: string, method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  const url = new URL(path, RESEND_API);
  for (let attempt = 0; ; attempt += 1) {
    // 10 requests a second per team, shared by every key: keep well under it.
    const wait = lastResendRequestAt + 150 - Date.now();
    if (wait > 0) await sleep(wait);
    lastResendRequestAt = Date.now();

    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'User-Agent': USER_AGENT,
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(20_000),
      });
    } catch (error) {
      throw new ResendError(
        0,
        'no_response',
        `${method} ${url.pathname}: no response (${error instanceof Error ? error.message : String(error)})`
      );
    }
    // A 429 is Resend refusing before acting, so even a POST is safe to repeat.
    if (res.status === 429 && attempt < 2) {
      await sleep(1000 * Math.max(1, Number(res.headers.get('retry-after')) || 1));
      continue;
    }
    if (!res.ok) {
      const raw = await res.text();
      let code = '';
      let message = raw;
      try {
        const parsed = JSON.parse(raw) as { name?: string; message?: string };
        code = parsed.name ?? '';
        message = parsed.message ?? raw;
      } catch {
        // Not JSON; keep the text as it came.
      }
      throw new ResendError(
        res.status,
        code,
        `${method} ${url.pathname} -> ${res.status}${code ? ` ${code}` : ''}: ${message.slice(0, 300)}`
      );
    }
    return (await res.json()) as T;
  }
}

interface ResendBroadcast extends StoredBroadcast {
  id: string;
  status: string;
  created_at?: string | null;
  scheduled_at?: string | null;
  sent_at?: string | null;
}

function summarise(broadcast: ResendBroadcast): BroadcastSummary {
  return {
    id: broadcast.id,
    name: broadcast.name ?? null,
    status: broadcast.status,
    segmentId: broadcast.segment_id ?? broadcast.audience_id ?? null,
    scheduledAt: broadcast.scheduled_at ?? null,
    createdAt: broadcast.created_at ?? null,
    sentAt: broadcast.sent_at ?? null,
  };
}

async function listBroadcasts(apiKey: string): Promise<BroadcastSummary[]> {
  const all: BroadcastSummary[] = [];
  let after: string | undefined;
  for (let page = 0; page < 50; page += 1) {
    const query = new URLSearchParams({ limit: '100' });
    if (after) query.set('after', after);
    const result = await resend<{ data?: ResendBroadcast[]; has_more?: boolean }>(apiKey, 'GET', `/broadcasts?${query}`);
    const data = result.data ?? [];
    all.push(...data.map(summarise));
    if (!result.has_more || data.length === 0) return all;
    after = data[data.length - 1].id;
  }
  throw new JobError('Resend listed more than 5,000 broadcasts; refusing to plan from a partial list.');
}

function getBroadcast(apiKey: string, id: string): Promise<ResendBroadcast> {
  return resend<ResendBroadcast>(apiKey, 'GET', `/broadcasts/${encodeURIComponent(id)}`);
}

/** Why a refused or unanswered call that changes something stopped the run, and what to do. */
function refused(what: string, error: unknown): Error {
  if (!(error instanceof ResendError)) return error instanceof Error ? error : new Error(String(error));
  if (error.code === 'restricted_api_key') return error;
  if (error.ambiguous) {
    return new JobError(
      `${what}: ${error.message}\n` +
        'Resend did not confirm it, so it may or may not have happened. Look in Resend (Broadcasts) before ' +
        'running this by hand. The next scheduled run reconciles on its own: it schedules a single draft it ' +
        'finds, and leaves a scheduled broadcast alone.'
    );
  }
  return new JobError(`${what}: ${error.message}`);
}

// --- GitHub ----------------------------------------------------------------------

interface GitHub {
  token: string;
  repo: string;
  api: string;
  runUrl: string | null;
}

interface Issue {
  number: number;
  title: string;
  state: 'open' | 'closed';
  html_url: string;
  pull_request?: unknown;
}

function githubFromEnv(): GitHub | null {
  const token = process.env.GITHUB_TOKEN?.trim();
  const repo = process.env.GITHUB_REPOSITORY?.trim();
  if (!token || !repo) return null;
  const runId = process.env.GITHUB_RUN_ID;
  const server = process.env.GITHUB_SERVER_URL ?? 'https://github.com';
  return {
    token,
    repo,
    api: process.env.GITHUB_API_URL ?? 'https://api.github.com',
    runUrl: runId ? `${server}/${repo}/actions/runs/${runId}` : null,
  };
}

async function github<T>(
  gh: GitHub,
  method: 'GET' | 'POST' | 'PATCH',
  path: string,
  body?: unknown,
  tolerate: number[] = []
): Promise<T | null> {
  const res = await fetch(`${gh.api}/repos/${gh.repo}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${gh.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': USER_AGENT,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });
  const text = await res.text();
  if (res.ok) return text ? (JSON.parse(text) as T) : null;
  if (tolerate.includes(res.status)) return null;
  throw new JobError(`GitHub ${method} ${path.split('?')[0]} -> ${res.status}: ${text.slice(0, 200)}`);
}

/** Issues and nothing else (the endpoint lists pull requests too), updated in the lookback window. */
async function recentIssues(gh: GitHub, now: Date): Promise<Issue[]> {
  const since = new Date(now.getTime() - ISSUE_LOOKBACK_DAYS * DAY_MS).toISOString().replace(/\.\d{3}Z$/, 'Z');
  const issues: Issue[] = [];
  for (let page = 1; page <= 5; page += 1) {
    const batch =
      (await github<Issue[]>(gh, 'GET', `/issues?state=all&since=${encodeURIComponent(since)}&per_page=100&page=${page}`)) ??
      [];
    issues.push(...batch.filter(issue => !issue.pull_request));
    if (batch.length < 100) break;
  }
  return issues;
}

async function openIssue(gh: GitHub, title: string, body: string): Promise<Issue> {
  // Creating an issue with a label that does not exist can fail; make it
  // first, and ignore "already exists" (422).
  await github(gh, 'POST', '/labels', LABEL, [422]);
  const issue = await github<Issue>(gh, 'POST', '/issues', {
    title: scrub(title),
    body: scrub(body),
    labels: [LABEL.name],
  });
  if (!issue) throw new JobError('GitHub created the issue but returned nothing.');
  return issue;
}

async function commentOn(gh: GitHub, issue: Issue, body: string): Promise<void> {
  await github(gh, 'POST', `/issues/${issue.number}/comments`, { body: scrub(body) });
}

async function closeIssue(gh: GitHub, issue: Issue): Promise<void> {
  await github(gh, 'PATCH', `/issues/${issue.number}`, { state: 'closed', state_reason: 'completed' });
}

function reviewIssueFor(issues: readonly Issue[], day: string): Issue | undefined {
  return issues.find(issue => parseReviewIssueTitle(issue.title)?.day === day);
}

function footer(gh: GitHub): string {
  const run = gh.runUrl ? ` ([this run](${gh.runUrl}))` : '';
  return `_Opened by \`${WORKFLOW}\`${run}. Procedure: \`${RUNBOOK}\`._`;
}

// --- Guards ------------------------------------------------------------------------

interface PageCheck {
  url: string;
  ok: boolean;
  detail: string;
}

/**
 * The episode page, asked in production. A broadcast links to it and quotes
 * it, and episode 6 shipped as a 404 on a green validator, which is exactly
 * what this catches. Exactly 200: a redirect is not the page.
 */
async function checkEpisodePage(slug: string): Promise<PageCheck> {
  const url = `${SITE_URL}/stories/${slug}`;
  let result: PageCheck = { url, ok: false, detail: 'was not asked' };
  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (attempt > 0) await sleep(3000);
    try {
      const res = await fetch(url, {
        redirect: 'manual',
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(20_000),
      });
      await res.arrayBuffer();
      result = { url, ok: res.status === 200, detail: `answered ${res.status}` };
      // A definite answer, right or wrong, is not worth a second ask.
      if (res.status < 500) return result;
    } catch (error) {
      result = { url, ok: false, detail: `did not answer (${error instanceof Error ? error.message : String(error)})` };
    }
  }
  return result;
}

// --- Issue bodies ---------------------------------------------------------------------

type Origin = 'built' | 'draft' | 'found';

function reviewIssueBody(args: {
  episode: Episode | undefined;
  number: number;
  broadcastId: string;
  scheduledAt: string | Date;
  page: PageCheck | null;
  origin: Origin;
  firstSend: boolean | null;
  gh: GitHub;
}): string {
  const { episode, number, broadcastId, scheduledAt, page, origin, firstSend, gh } = args;
  const name = episode ? `Episode ${number}: ${episode.titleEn}` : `Episode ${number}`;
  const content = {
    built: 'built by this run from the episode data',
    draft: 'the draft that was already in Resend, identical to what the builder makes today',
    found: 'not built or checked by this run; it found the broadcast already scheduled',
  }[origin];
  const lines = [
    `${episode ? `Episode ${number}, *${episode.titleEn}*,` : `Episode ${number}`} is scheduled in Resend for ` +
      `**${formatUtcInstant(scheduledAt)}**. Resend sends it to every subscribed contact in the weekly-stories segment.`,
    '',
    `**If anything is wrong, cancel it in Resend before then:** Broadcasts → "${name}" → Cancel.`,
    '',
    `- Broadcast id: \`${broadcastId}\``,
    ...(episode ? [`- Subject: The Travels of Tan — ${episode.titleEn}`] : []),
    ...(page ? [`- Episode page: ${page.url}, which ${page.detail} when this was checked`] : []),
    `- Content: ${content}`,
    '',
    'Before the send:',
    '',
    '- [ ] Read it in Resend and run `docs/prd/episode-spec.md` §A7 items 4–9 on a test send.',
    ...(firstSend
      ? [
          '- [ ] This is the list\'s first broadcast. Once it has gone out, open your own copy\'s raw headers: ' +
            '`List-Unsubscribe` and `List-Unsubscribe-Post` should be there, and the plain-text unsubscribe link ' +
            'should be a real URL, not the placeholder.',
        ]
      : []),
    '',
    'Cancelled or deleted, it is held: the job schedules nothing else for that Saturday. The following ' +
      `week's runs schedule Episode ${number} for the Saturday after, the same broadcast if you cancelled it or ` +
      'a fresh build from the episode data if you deleted it.',
    '',
    footer(gh),
  ];
  return lines.join('\n');
}

function nothingQueuedBody(slot: string, newest: number | null, gh: GitHub): string {
  const lastCall = formatUtcInstant(new Date(Date.parse(slot) - MIN_SCHEDULE_LEAD_MINUTES * 60 * 1000));
  const first = config.newsletter.firstBroadcastEpisode;
  return [
    `Nothing is scheduled for **${formatUtcInstant(slot)}**, because nothing is queued: ` +
      (newest === null
        ? `no episode from ${first} up (\`config.newsletter.firstBroadcastEpisode\`) is registered.`
        : `every registered episode from ${first} up (\`config.newsletter.firstBroadcastEpisode\`) already has a ` +
          `broadcast in Resend. The newest is Episode ${newest}.`),
    '',
    'The email promises "A new episode goes up every week." To keep that promise this week:',
    '',
    '1. Import the next episode (`scripts/stories/import-episode.py`), run `pnpm validate:stories`, and deploy, ' +
      'so its page answers 200.',
    '2. The job\'s next scheduled run (Wednesdays and Fridays, 12:07 UTC) schedules it. Or run it by hand ' +
      `once the page is live (Actions → Weekly Broadcast → Run workflow), any time before ${lastCall}.`,
    '',
    'Skipping the week is a decision too: close this issue.',
    '',
    footer(gh),
  ].join('\n');
}

// --- The run ---------------------------------------------------------------------------

interface Context {
  dryRun: boolean;
  now: Date;
  slot: string;
  apiKey: string | null;
  segmentId: string | null;
  gh: GitHub | null;
  issues: Issue[] | null;
  firstSend: boolean | null;
  resendKnown: boolean;
}

function describe(broadcast: BroadcastSummary): string {
  const moment = broadcast.sentAt
    ? `sent ${when(broadcast.sentAt)}`
    : broadcast.scheduledAt
      ? `scheduled for ${when(broadcast.scheduledAt)}`
      : broadcast.createdAt
        ? `created ${when(broadcast.createdAt)}`
        : '';
  const kind = parseBroadcastName(broadcast.name)
    ? ''
    : mentionedEpisodeNumber(broadcast.name) !== null
      ? '; not an exact episode name'
      : '; not an episode';
  // Say the status only where the moment does not already say it.
  const status = moment.startsWith(broadcast.status) ? moment : [broadcast.status, moment].filter(Boolean).join(', ');
  return `"${broadcast.name ?? '(unnamed)'}" [${status}${kind}] ${broadcast.id}`;
}

function printBroadcasts(all: readonly BroadcastSummary[], segmentId: string | null): void {
  const ours = all.filter(b => segmentId === null || b.segmentId === null || b.segmentId === segmentId);
  const relevant = ours.filter(
    b => parseBroadcastName(b.name) !== null || mentionedEpisodeNumber(b.name) !== null || b.status === 'scheduled'
  );
  row(
    'Resend',
    `${all.length} broadcast(s) on the account, ${ours.length} to the weekly-stories segment` +
      (segmentId === null ? ' (RESEND_WEEKLY_STORIES_SEGMENT_ID is not set, so every one is counted)' : '') +
      (relevant.length > 0 ? '. The ones that bear on this run:' : '. None names an episode or is scheduled.')
  );
  for (const broadcast of relevant) say(`               ${describe(broadcast)}`);
}

/** Schedule `id` for the slot, then read it back. Returns what Resend now reports. */
async function scheduleAndVerify(ctx: Context, id: string): Promise<{ ok: boolean; status: string; at: Date | null }> {
  const apiKey = ctx.apiKey as string;
  try {
    await resend(apiKey, 'POST', `/broadcasts/${encodeURIComponent(id)}/send`, { scheduled_at: ctx.slot });
  } catch (error) {
    if (error instanceof ResendError && !error.ambiguous && error.code !== 'restricted_api_key') {
      throw new JobError(
        `Resend refused to schedule ${id}: ${error.message}\n` +
          'If that draft was made in the dashboard editor, the API cannot send it ("You can send broadcasts ' +
          'only if they were created via the API"). Delete it in Resend and the next run builds one, or schedule ' +
          'it in the dashboard yourself.'
      );
    }
    throw refused(`Scheduling ${id}`, error);
  }

  // Read it back. The schedule call succeeded, so a failure from here on still
  // opens the review issue before the run reports it.
  let read = { ok: false, status: 'unknown', at: null as Date | null };
  for (let attempt = 0; attempt < 2 && !read.ok; attempt += 1) {
    if (attempt > 0) await sleep(2000);
    try {
      const stored = await getBroadcast(apiKey, id);
      const at = parseResendTimestamp(stored.scheduled_at);
      read = { ok: stored.status === 'scheduled' && at?.getTime() === Date.parse(ctx.slot), status: stored.status, at };
    } catch (error) {
      read = { ok: false, status: `unreadable (${error instanceof Error ? error.message : String(error)})`, at: null };
    }
  }
  return read;
}

async function scheduleEpisode(ctx: Context, decision: Extract<Decision, { kind: 'create' | 'schedule-draft' }>): Promise<void> {
  const episode = episodeBySlug(decision.episode.slug) as Episode;
  row('candidate', `Episode ${episode.number}: ${episode.titleEn} (${episode.slug})`);

  const addressProblems = postalAddressProblems(config.business.postalAddress);
  const page = await checkEpisodePage(episode.slug);
  row('guards', `postal address ${addressProblems.length === 0 ? 'ok' : 'REFUSED'}; ${page.url} ${page.detail}`);
  const refusals = [
    ...addressProblems,
    ...(page.ok ? [] : [`the episode page ${page.url} ${page.detail}, not 200; deploy it before it is broadcast`]),
  ];

  const plan =
    decision.kind === 'create'
      ? `create a broadcast for Episode ${episode.number} and schedule it for ${formatUtcInstant(ctx.slot)}`
      : `check the existing draft ${decision.draft.id} against the current build, then schedule it for ${formatUtcInstant(ctx.slot)}`;

  if (ctx.dryRun) {
    if (refusals.length > 0) row('would stop', refusals.join('; '));
    else row('would', `${plan}${ctx.resendKnown ? '' : ', if Resend holds no broadcast for it'}.`);
    row('then', `open the review issue "${reviewIssueTitle(episode.number, ctx.slot)}".`);
    return;
  }

  if (refusals.length > 0) {
    throw new JobError(`Refusing to schedule Episode ${episode.number}:\n  - ${refusals.join('\n  - ')}\nSee ${RUNBOOK}.`);
  }

  const apiKey = ctx.apiKey as string;
  const gh = ctx.gh as GitHub;
  const payload: BroadcastPayload = episodeBroadcast(episode, ctx.segmentId as string);
  // The name is the ledger key. A title the strict parser would not read back
  // as this episode would make every later run blind to this broadcast.
  if (parseBroadcastName(payload.name)?.number !== episode.number) {
    throw new JobError(`"${payload.name}" would not be recognised as Episode ${episode.number}; fix the title first.`);
  }

  let id: string;
  if (decision.kind === 'create') {
    try {
      id = (await resend<{ id: string }>(apiKey, 'POST', '/broadcasts', payload)).id;
    } catch (error) {
      throw refused(`Creating the broadcast for Episode ${episode.number}`, error);
    }
    row('created', `draft ${id}`);
  } else {
    id = decision.draft.id;
    const differences = draftDifferences(await getBroadcast(apiKey, id), payload);
    if (differences.length > 0) {
      throw new JobError(
        `Episode ${episode.number}'s draft ${id} is not what the builder makes today: its ${differences.join(', ')} ` +
          'differ. It was edited by hand, or built from older episode data or by an older builder (one with ' +
          'no postal address, or tagging its links as the welcome card). Delete it in Resend and the next run ' +
          'builds a fresh one from the episode data, or schedule it yourself if the difference is deliberate.'
      );
    }
    row('draft', `${id} is identical to the current build`);
  }

  const read = await scheduleAndVerify(ctx, id);
  const scheduledAt = read.at ?? ctx.slot;
  row('scheduled', `${id} for ${formatUtcInstant(scheduledAt)}`);

  const title = reviewIssueTitle(episode.number, scheduledAt);
  const issue = await openIssue(
    gh,
    title,
    reviewIssueBody({
      episode,
      number: episode.number,
      broadcastId: id,
      scheduledAt,
      page,
      origin: decision.kind === 'create' ? 'built' : 'draft',
      firstSend: ctx.firstSend,
      gh,
    })
  );
  row('issue', `opened #${issue.number} "${title}"`);
  await closeNothingQueued(ctx, ctx.slot.slice(0, 10), `Episode ${episode.number} is now scheduled: see #${issue.number}.`);

  if (!read.ok) {
    throw new JobError(
      `Resend accepted the schedule call for ${id}, but reports it as ${read.status}` +
        `${read.at ? `, for ${formatUtcInstant(read.at)}` : ''}, not scheduled for ${formatUtcInstant(ctx.slot)}. ` +
        'Check it in Resend (Broadcasts) and cancel it if the time is wrong.'
    );
  }
}

/**
 * Close the review issue of any past send day whose episode Resend now
 * reports as sent, saying when. That comment is the record of an actual send,
 * which is what the Sent column in docs/prd/episode-spec.md Part B is filled
 * from. Housekeeping: a failure here is printed, never fatal.
 */
async function closeSentReviews(ctx: Context, broadcasts: readonly BroadcastSummary[]): Promise<void> {
  if (ctx.dryRun || !ctx.gh || !ctx.issues) return;
  const today = ctx.now.toISOString().slice(0, 10);
  for (const issue of ctx.issues) {
    const record = parseReviewIssueTitle(issue.title);
    if (!record || issue.state !== 'open' || record.day >= today) continue;
    const sent = broadcasts.find(
      b =>
        b.status === 'sent' &&
        parseBroadcastName(b.name)?.number === record.episode &&
        (ctx.segmentId === null || b.segmentId === null || b.segmentId === ctx.segmentId)
    );
    if (!sent) continue;
    try {
      await commentOn(ctx.gh, issue, `Resend reports Episode ${record.episode} sent ${when(sent.sentAt)} (broadcast \`${sent.id}\`). Closing.`);
      await closeIssue(ctx.gh, issue);
      row('issue', `closed #${issue.number}: Episode ${record.episode} sent ${when(sent.sentAt)}`);
    } catch (error) {
      row('note', `could not close #${issue.number}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

async function closeNothingQueued(ctx: Context, day: string, why: string): Promise<void> {
  if (!ctx.gh || !ctx.issues) return;
  const title = nothingQueuedIssueTitle(`${day}T00:00:00.000Z`);
  const open = ctx.issues.find(issue => issue.title === title && issue.state === 'open');
  if (!open) return;
  await commentOn(ctx.gh, open, why);
  await closeIssue(ctx.gh, open);
  row('issue', `closed #${open.number} "${title}"`);
}

async function act(ctx: Context, decision: Decision): Promise<void> {
  const slotDay = ctx.slot.slice(0, 10);

  switch (decision.kind) {
    case 'create':
    case 'schedule-draft':
      return scheduleEpisode(ctx, decision);

    case 'already-scheduled': {
      const problems: string[] = [];
      for (const entry of decision.scheduled) {
        const episode = EPISODES.find(e => e.number === entry.number);
        const page = episode ? await checkEpisodePage(episode.slug) : null;
        const day = parseResendTimestamp(entry.broadcast.scheduledAt)?.toISOString().slice(0, 10) ?? slotDay;
        row('scheduled', `${describe(entry.broadcast)}${page ? `; ${page.url} ${page.detail}` : ''}`);
        if (page && !page.ok) {
          problems.push(
            `Episode ${entry.number} is scheduled for ${when(entry.broadcast.scheduledAt)}, but ${page.url} ` +
              `${page.detail}. Fix the page before then, or cancel the broadcast in Resend.`
          );
        }

        const existing = ctx.issues ? reviewIssueFor(ctx.issues, day) : undefined;
        if (ctx.dryRun || !ctx.gh) {
          row('would', `leave it alone${existing ? `; its review issue is #${existing.number} (${existing.state})` : '; and open its review issue'}.`);
          continue;
        }
        const checked =
          `Checked ${formatUtcInstant(ctx.now)}: Episode ${entry.number} is scheduled for ` +
          `${when(entry.broadcast.scheduledAt)} (broadcast \`${entry.broadcast.id}\`)` +
          (page ? `, and ${page.url} ${page.detail}.` : '.') +
          (page && !page.ok ? ' **Fix the page before the send, or cancel the broadcast in Resend.**' : ' If anything is wrong, cancel it in Resend before then.');
        if (!existing) {
          const scheduledAt = parseResendTimestamp(entry.broadcast.scheduledAt) ?? ctx.slot;
          const issue = await openIssue(
            ctx.gh,
            reviewIssueTitle(entry.number, scheduledAt),
            reviewIssueBody({
              episode,
              number: entry.number,
              broadcastId: entry.broadcast.id,
              scheduledAt,
              page,
              origin: 'found',
              firstSend: ctx.firstSend,
              gh: ctx.gh,
            })
          );
          row('issue', `opened #${issue.number} "${issue.title}"`);
        } else if (existing.state === 'open') {
          await commentOn(ctx.gh, existing, checked);
          row('issue', `commented on #${existing.number}`);
        } else {
          row('issue', `#${existing.number} is closed: reviewed, so left alone`);
        }
        await closeNothingQueued(ctx, day, `Episode ${entry.number} is scheduled for that day.`);
      }
      if (problems.length > 0) throw new JobError(problems.join('\n'));
      return;
    }

    case 'slot-taken':
      row(
        'slot taken',
        `${describe(decision.by)} is on ${slotDay}. One broadcast per send day, so nothing else is scheduled ` +
          'for it; the next episode waits a week.'
      );
      return;

    case 'held': {
      const issue = ctx.issues ? reviewIssueFor(ctx.issues, slotDay) : undefined;
      const message =
        `Checked ${formatUtcInstant(ctx.now)}: nothing is scheduled for ${formatUtcInstant(ctx.slot)} any more, so ` +
        `Episode ${decision.episode} was cancelled or deleted in Resend after this job scheduled it. **Held:** the job ` +
        'schedules nothing else for that Saturday. The following week\'s runs schedule it for the Saturday after: the ' +
        'same broadcast if it was cancelled, a fresh build from the episode data if it was deleted. To send it this ' +
        'Saturday after all, schedule it yourself in Resend.';
      row('held', `Episode ${decision.episode} was scheduled for ${slotDay} by this job, and nothing is scheduled now; nothing will be.`);
      if (ctx.dryRun || !ctx.gh || !issue) return;
      await commentOn(ctx.gh, issue, message);
      row('issue', `commented on #${issue.number}`);
      return;
    }

    case 'nothing-queued': {
      const title = nothingQueuedIssueTitle(ctx.slot);
      row(
        'nothing',
        decision.newest === null
          ? `no episode from ${config.newsletter.firstBroadcastEpisode} up is registered.`
          : `every registered episode from ${config.newsletter.firstBroadcastEpisode} up has a broadcast; the newest is Episode ${decision.newest}.`
      );
      const existing = ctx.issues?.find(issue => issue.title === title);
      if (ctx.dryRun || !ctx.gh) {
        row('would', `${existing ? `update #${existing.number}` : 'open'} "${title}".`);
        return;
      }
      if (!existing) {
        const issue = await openIssue(ctx.gh, title, nothingQueuedBody(ctx.slot, decision.newest, ctx.gh));
        row('issue', `opened #${issue.number} "${title}"`);
      } else if (existing.state === 'open') {
        const lastCall = formatUtcInstant(new Date(Date.parse(ctx.slot) - MIN_SCHEDULE_LEAD_MINUTES * 60 * 1000));
        await commentOn(
          ctx.gh,
          existing,
          `Checked ${formatUtcInstant(ctx.now)}: still nothing queued. After importing an episode, run the workflow ` +
            `by hand before ${lastCall}, or close this issue to skip the week.`
        );
        row('issue', `commented on #${existing.number}`);
      } else {
        row('issue', `#${existing.number} is closed: the week was skipped, so left alone`);
      }
      return;
    }

    case 'stop':
      throw new JobError(decision.reason);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const unknown = args.filter(arg => arg !== '--dry-run');
  if (unknown.length > 0) {
    throw new JobError(`Unknown argument "${unknown[0]}". Usage: pnpm stories:schedule-broadcast [--dry-run]`);
  }
  const dryRun = args.includes('--dry-run');

  const now = new Date();
  const slot = nextSendAt(now);
  const apiKey = process.env.RESEND_API_KEY?.trim() || null;
  const segmentId = process.env.RESEND_WEEKLY_STORIES_SEGMENT_ID?.trim() || null;
  const gh = githubFromEnv();

  if (!dryRun) {
    const missing = [apiKey ? null : 'RESEND_API_KEY', segmentId ? null : 'RESEND_WEEKLY_STORIES_SEGMENT_ID'].filter(
      (name): name is string => name !== null
    );
    if (missing.length > 0) {
      throw new JobError(
        `Not configured: ${missing.join(' and ')} ${missing.length === 1 ? 'is' : 'are'} not set, so no episode ` +
          'can be scheduled. RESEND_API_KEY must be a Full access key. In CI they are repository secrets; ' +
          `locally, put them in .env.local by hand, or pass --dry-run. See ${RUNBOOK}.`
      );
    }
    if (!gh) {
      throw new JobError(
        'A real run needs GITHUB_TOKEN and GITHUB_REPOSITORY. The issue it opens is the review window, and the ' +
          'only record that a person cancelled a broadcast it scheduled, so it does not schedule without one. ' +
          `The workflow provides both; locally, pass --dry-run. See ${RUNBOOK}.`
      );
    }
  }

  const first = config.newsletter.firstBroadcastEpisode;
  say(dryRun ? 'Weekly broadcast, dry run: nothing is created, scheduled or posted.' : 'Weekly broadcast');
  row('now', formatUtcInstant(now));
  row('send slot', `${formatUtcInstant(slot)} (scheduled_at ${slot}, never less than ${MIN_SCHEDULE_LEAD_MINUTES} minutes ahead)`);
  row(
    'queue',
    `Episode ${first} and up, in episode order (config.newsletter.firstBroadcastEpisode); registered: ` +
      EPISODES.map(e => e.number).join(', ')
  );

  const broadcasts = apiKey ? await listBroadcasts(apiKey) : null;
  if (broadcasts) printBroadcasts(broadcasts, segmentId);
  else say(`  Resend state unknown (no key): the plan below assumes no episode from ${first} up has a broadcast yet.`);

  const issues = gh ? await recentIssues(gh, now) : null;
  const reviews: ReviewRecord[] | null = issues
    ? issues.flatMap(issue => {
        const record = parseReviewIssueTitle(issue.title);
        return record ? [record] : [];
      })
    : null;
  if (!gh) row('GitHub', 'not asked (no GITHUB_TOKEN), so a Saturday held by a cancellation cannot be seen.');

  const plan = planWeeklyBroadcast({
    episodes: EPISODES.map(({ number, slug, titleEn }) => ({ number, slug, titleEn })),
    broadcasts,
    segmentId,
    firstBroadcastEpisode: first,
    slot,
    reviews,
  });
  for (const note of plan.notes) row('note', note);

  const ctx: Context = {
    dryRun,
    now,
    slot,
    apiKey,
    segmentId,
    gh,
    issues,
    firstSend: plan.firstSend,
    resendKnown: broadcasts !== null,
  };
  if (broadcasts) await closeSentReviews(ctx, broadcasts);
  await act(ctx, plan.decision);
}

main().catch(error => {
  if (error instanceof ResendError && error.code === 'restricted_api_key') {
    console.error(
      scrub(
        'FAIL: Resend refused the key because it is a Sending-access key. Listing, creating and scheduling ' +
          `broadcasts needs a Full access key. See ${RUNBOOK}.`
      )
    );
  } else {
    console.error(scrub(`FAIL: ${error instanceof Error ? error.message : String(error)}`));
  }
  process.exit(1);
});
