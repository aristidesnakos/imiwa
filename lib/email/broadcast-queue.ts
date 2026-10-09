/**
 * Which episode the weekly job schedules next, decided from what Resend holds.
 *
 * Pure: no I/O, no clock. The job (scripts/stories/schedule-weekly-broadcast.ts)
 * reads Resend and GitHub, hands the results in, and does what the plan says;
 * `pnpm validate:broadcast` hands in fake broadcast lists and checks the answer.
 *
 * ---------------------------------------------------------------------------
 * The rules, in the order they are applied
 * ---------------------------------------------------------------------------
 *
 * Only broadcasts addressed to the weekly-stories segment count; a test send
 * to another segment is not a send to subscribers. One whose segment Resend
 * does not report is counted, because miscounting it the other way could send
 * an episode twice.
 *
 *  1. An episode broadcast is already scheduled, for any date: do nothing. The
 *     queue waits for it, so nothing jumps ahead of it and nothing is booked
 *     twice. This is the normal state between Wednesday's run and Saturday.
 *  2. Another broadcast is scheduled for the send day, or has already gone out
 *     on it: do nothing. One broadcast per send slot.
 *  3. This job already scheduled something for the send day, and nothing is
 *     scheduled now: a person cancelled or deleted it in Resend, so the day is
 *     held. Resend cannot say this by itself — a cancelled broadcast is a
 *     draft again, indistinguishable from one `create-broadcast` made — so the
 *     job's own review issue is the record (`ReviewRecord`). Without this rule
 *     Friday's run would reschedule what a person cancelled on Thursday.
 *  4. The queue. The next episode is the lowest-numbered registered episode,
 *     from `firstBroadcastEpisode` up, with no broadcast that is scheduled,
 *     queued, sending, sent or cancelled. Ordered by `number`, never by
 *     `publishedAt`. Then, for that episode:
 *       - a broadcast with a status this code does not know: stop and ask;
 *       - a near-miss name (`Episode 6 - …`) that has gone out: stop and ask,
 *         because it may already have reached subscribers;
 *       - two or more drafts: stop and ask; do not guess which is meant;
 *       - exactly one draft: schedule it (the job checks, before scheduling,
 *         that it is still exactly what the builder makes);
 *       - none: build one and schedule it.
 *  5. Nothing left in the queue: say so, so a person can import an episode.
 *
 * `canceled` counts as gone out: Resend uses it only for a broadcast stopped
 * while it was being delivered, which may have reached part of the list. Such
 * an episode is never sent again automatically.
 *
 * Statuses verified against the live Resend docs on 2026-09-27: draft,
 * scheduled, queued, sent and canceled
 * (https://resend.com/docs/dashboard/broadcasts/manage-broadcasts). `sending`
 * is not documented and is treated as gone out in case the API reports it.
 */
import { mentionedEpisodeNumber, parseBroadcastName } from './broadcast';
import type { StoredBroadcast } from './broadcast';
import { dayBeforeSendName, formatUtcInstant, sendDayName } from './send-schedule';

/** Statuses meaning an episode's broadcast is booked, going out, or has gone out. */
export const COMMITTED_STATUSES: readonly string[] = ['scheduled', 'queued', 'sending', 'sent', 'canceled'];
const KNOWN_STATUSES: readonly string[] = ['draft', ...COMMITTED_STATUSES];

/** One broadcast as `GET /broadcasts` lists it, reduced to what the plan reads. */
export interface BroadcastSummary {
  id: string;
  name: string | null;
  status: string;
  /** The segment it is addressed to, or null when Resend did not say. */
  segmentId: string | null;
  /** As Resend writes it, e.g. `2026-10-03 13:00:00+00`; null when unscheduled. */
  scheduledAt: string | null;
  createdAt?: string | null;
  sentAt?: string | null;
}

/** One broadcast as Resend's API returns it, before `summariseBroadcast`. */
export interface ResendBroadcast extends StoredBroadcast {
  id: string;
  status: string;
  created_at?: string | null;
  scheduled_at?: string | null;
  sent_at?: string | null;
}

/**
 * A Resend broadcast reduced to what the plans read. One definition for both
 * readers of the ledger, the weekly job and the confirm route's welcome email
 * (lib/email/welcome-episode.ts), so they can never disagree about which
 * segment a broadcast went to.
 */
export function summariseBroadcast(broadcast: ResendBroadcast): BroadcastSummary {
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

/**
 * Whether a broadcast counts as a send to the weekly-stories segment. One whose
 * segment Resend does not report is counted, and so is everything when the
 * segment itself is unknown, because miscounting the other way could send an
 * episode twice.
 */
export function isToSegment(broadcast: BroadcastSummary, segmentId: string | null): boolean {
  return segmentId === null || broadcast.segmentId === null || broadcast.segmentId === segmentId;
}

export interface QueueEpisode {
  number: number;
  slug: string;
  titleEn: string;
}

/** A review issue the job opened: it scheduled `episode` for the send day `day` (`YYYY-MM-DD`). */
export interface ReviewRecord {
  day: string;
  episode: number;
}

export interface PlanInput {
  /** The registered episodes, in any order. */
  episodes: readonly QueueEpisode[];
  /** Every broadcast on the account, or null when Resend could not be asked (no key). */
  broadcasts: readonly BroadcastSummary[] | null;
  /** The weekly-stories segment, or null when unknown (then nothing is filtered out). */
  segmentId: string | null;
  firstBroadcastEpisode: number;
  /** The upcoming send slot as ISO 8601: `nextSendAt()`. */
  slot: string;
  /** The review issues the job has opened, or null when GitHub could not be asked. */
  reviews: readonly ReviewRecord[] | null;
}

/** A broadcast that is some episode's, by its exact name. */
export interface EpisodeBroadcast {
  number: number;
  title: string;
  broadcast: BroadcastSummary;
}

export type Decision =
  /** Nothing exists for the next episode: build its broadcast and schedule it. */
  | { kind: 'create'; episode: QueueEpisode }
  /** The next episode has exactly one draft: check it, then schedule it. */
  | { kind: 'schedule-draft'; episode: QueueEpisode; draft: BroadcastSummary }
  /** Rule 1. Earliest first. */
  | { kind: 'already-scheduled'; scheduled: EpisodeBroadcast[] }
  /** Rule 2. */
  | { kind: 'slot-taken'; by: BroadcastSummary }
  /** Rule 3. */
  | { kind: 'held'; episode: number }
  /** Rule 5. `newest` is the highest registered episode in the queue's range, if any. */
  | { kind: 'nothing-queued'; newest: number | null }
  /** Something a person must settle. `reason` says what, and how. */
  | { kind: 'stop'; reason: string };

export interface Plan {
  decision: Decision;
  /** Whether nothing has ever gone out to the segment; null when Resend could not be asked. */
  firstSend: boolean | null;
  /** Things worth printing that change nothing. */
  notes: string[];
}

/**
 * Resend writes `2026-11-01 15:13:31.723+00`; the docs show ISO 8601 for
 * input. Either becomes an instant; anything unreadable becomes null. A
 * timestamp with no zone is read as UTC.
 */
export function parseResendTimestamp(value: string | null | undefined): Date | null {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(:\d{2})?(?:\.(\d+))?\s*(Z|[+-]\d{2}(?::?\d{2})?)?$/i.exec(value.trim());
  if (!match) return null;
  const [, day, hoursMinutes, seconds = ':00', fraction = '', zone = 'Z'] = match;
  let offset = zone.toUpperCase();
  if (/^[+-]\d{2}$/.test(offset)) offset += ':00';
  else if (/^[+-]\d{4}$/.test(offset)) offset = `${offset.slice(0, 3)}:${offset.slice(3)}`;
  const date = new Date(`${day}T${hoursMinutes}${seconds}.${`${fraction}000`.slice(0, 3)}${offset}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** The UTC calendar day of a Resend timestamp, or null. */
function utcDay(value: string | null | undefined): string | null {
  const date = parseResendTimestamp(value);
  return date ? date.toISOString().slice(0, 10) : null;
}

function describe(broadcast: BroadcastSummary): string {
  return `"${broadcast.name ?? '(unnamed)'}" (${broadcast.status}, ${broadcast.id})`;
}

export function planWeeklyBroadcast(input: PlanInput): Plan {
  const notes: string[] = [];
  const slotDay = input.slot.slice(0, 10);
  const queue = [...input.episodes]
    .filter(episode => episode.number >= input.firstBroadcastEpisode)
    .sort((a, b) => a.number - b.number);
  const newest = queue.length > 0 ? queue[queue.length - 1].number : null;

  if (input.broadcasts === null) {
    // Resend could not be asked, so the queue is read as if nothing had gone
    // out. Only a dry run gets here.
    return {
      decision: queue.length > 0 ? { kind: 'create', episode: queue[0] } : { kind: 'nothing-queued', newest },
      firstSend: null,
      notes,
    };
  }

  const ours = input.broadcasts.filter(b => isToSegment(b, input.segmentId));
  const elsewhere = input.broadcasts.length - ours.length;
  if (elsewhere > 0) notes.push(`${elsewhere} broadcast(s) to other segments ignored.`);

  const episodeBroadcasts: EpisodeBroadcast[] = ours.flatMap(broadcast => {
    const parsed = parseBroadcastName(broadcast.name);
    return parsed ? [{ number: parsed.number, title: parsed.title, broadcast }] : [];
  });
  const isEpisodeBroadcast = (broadcast: BroadcastSummary) => parseBroadcastName(broadcast.name) !== null;
  const firstSend = !ours.some(b => b.status !== 'draft' && b.status !== 'scheduled');

  for (const entry of episodeBroadcasts) {
    const episode = input.episodes.find(e => e.number === entry.number);
    if (!episode) notes.push(`${describe(entry.broadcast)} names an episode that is not registered.`);
    else if (episode.titleEn !== entry.title) {
      notes.push(`${describe(entry.broadcast)} carries an older title; it still counts as Episode ${entry.number}.`);
    }
    if (entry.broadcast.status === 'canceled') {
      notes.push(
        `${describe(entry.broadcast)} was cancelled while it was being delivered, so part of the list may have it. ` +
          'It is never sent again automatically.'
      );
    }
  }

  // 1. An episode broadcast is booked, for whatever date.
  const scheduled = episodeBroadcasts
    .filter(entry => entry.broadcast.status === 'scheduled')
    .sort(
      (a, b) =>
        (parseResendTimestamp(a.broadcast.scheduledAt)?.getTime() ?? Infinity) -
        (parseResendTimestamp(b.broadcast.scheduledAt)?.getTime() ?? Infinity)
    );
  if (scheduled.length > 0) return { decision: { kind: 'already-scheduled', scheduled }, firstSend, notes };

  // 2. Something else is booked for, or has already gone out on, the send day.
  // Every scheduled episode broadcast returned above, so a scheduled one here
  // is not an episode; one whose date cannot be read is assumed to be on the
  // send day, because assuming otherwise could put two sends on it.
  const taken = ours.find(broadcast => {
    if (broadcast.status === 'draft') return false;
    const day = utcDay(broadcast.sentAt ?? broadcast.scheduledAt);
    return broadcast.status === 'scheduled' ? day === null || day === slotDay : day === slotDay;
  });
  if (taken) return { decision: { kind: 'slot-taken', by: taken }, firstSend, notes };

  // 3. The job booked the send day once already, and nothing is booked now.
  if (input.reviews !== null) {
    const review = input.reviews.find(record => record.day === slotDay);
    if (review) return { decision: { kind: 'held', episode: review.episode }, firstSend, notes };
  }

  // 4. The queue.
  for (const episode of queue) {
    const own = episodeBroadcasts.filter(entry => entry.number === episode.number);
    if (own.some(entry => COMMITTED_STATUSES.includes(entry.broadcast.status))) {
      for (const leftover of own.filter(entry => entry.broadcast.status === 'draft')) {
        notes.push(`${describe(leftover.broadcast)} is a leftover draft of an episode already sent; ignored.`);
      }
      continue;
    }

    const unknown = own.find(entry => !KNOWN_STATUSES.includes(entry.broadcast.status));
    if (unknown) {
      return {
        decision: {
          kind: 'stop',
          reason:
            `Resend reports ${describe(unknown.broadcast)}, a status this job does not know, so it cannot tell ` +
            `whether Episode ${episode.number} has reached subscribers. Find out what the status means, then add ` +
            'it to COMMITTED_STATUSES in lib/email/broadcast-queue.ts if it means the episode went out.',
        },
        firstSend,
        notes,
      };
    }

    const nearMisses = ours.filter(
      broadcast =>
        !isEpisodeBroadcast(broadcast) &&
        broadcast.status !== 'draft' &&
        mentionedEpisodeNumber(broadcast.name) === episode.number
    );
    if (nearMisses.length > 0) {
      return {
        decision: {
          kind: 'stop',
          reason:
            `${nearMisses.map(describe).join(' and ')} looks like Episode ${episode.number} but is not named ` +
            `exactly "Episode ${episode.number}: ${episode.titleEn}", so the job cannot tell whether Episode ` +
            `${episode.number} has already reached subscribers. In Resend, rename it to that exact name if it ` +
            'was this episode, or to something that does not mention the episode if it was not, then run the job again.',
        },
        firstSend,
        notes,
      };
    }

    const drafts = own.filter(entry => entry.broadcast.status === 'draft');
    if (drafts.length > 1) {
      return {
        decision: {
          kind: 'stop',
          reason:
            `Episode ${episode.number} has ${drafts.length} drafts in Resend: ` +
            `${drafts.map(entry => entry.broadcast.id).join(', ')}. The job will not guess which one is meant. ` +
            'Delete all but one of them in Resend (or all of them, and the job builds a fresh one), then run it again.',
        },
        firstSend,
        notes,
      };
    }

    for (const ignored of ours.filter(
      b => !isEpisodeBroadcast(b) && b.status === 'draft' && mentionedEpisodeNumber(b.name) === episode.number
    )) {
      notes.push(`${describe(ignored)} is not named "Episode ${episode.number}: …", so it is not this episode's draft.`);
    }

    const decision: Decision =
      drafts.length === 1
        ? { kind: 'schedule-draft', episode, draft: drafts[0].broadcast }
        : { kind: 'create', episode };
    return { decision, firstSend, notes };
  }

  // 5. Nothing left.
  return { decision: { kind: 'nothing-queued', newest }, firstSend, notes };
}

// --- Issue titles ------------------------------------------------------------
//
// The job's GitHub issues are found again by title, so the titles are written
// and read here, next to each other, and `pnpm validate:broadcast` checks that
// they round-trip.

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** `Weekly story scheduled: Episode 6 for Sat 2026-10-03 13:00 UTC`. */
export function reviewIssueTitle(episodeNumber: number, scheduledAt: string | Date): string {
  return `Weekly story scheduled: Episode ${episodeNumber} for ${formatUtcInstant(scheduledAt)}`;
}

const REVIEW_TITLE =
  /^Weekly story scheduled: Episode ([1-9]\d*) for (Sun|Mon|Tue|Wed|Thu|Fri|Sat) (\d{4}-\d{2}-\d{2}) ([01]\d|2[0-3]):[0-5]\d UTC$/;

/** The review record a title stands for, or null unless the job could have written it. */
export function parseReviewIssueTitle(title: string): ReviewRecord | null {
  const match = REVIEW_TITLE.exec(title);
  if (!match) return null;
  const date = new Date(`${match[3]}T00:00:00Z`);
  // A weekday that disagrees with its date is not a title this job wrote.
  if (Number.isNaN(date.getTime()) || WEEKDAY[date.getUTCDay()] !== match[2]) return null;
  if (date.toISOString().slice(0, 10) !== match[3]) return null;
  return { episode: Number(match[1]), day: match[3] };
}

/** `No episode queued for Saturday 2026-10-10 — import one by Friday`. */
export function nothingQueuedIssueTitle(slot: string): string {
  return `No episode queued for ${sendDayName()} ${slot.slice(0, 10)} — import one by ${dayBeforeSendName()}`;
}
