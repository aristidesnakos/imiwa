/**
 * When the next weekly story goes out.
 *
 * Nothing here sends or schedules anything. Resend owns broadcast scheduling
 * and the send stays a reviewed, manual act — see docs/runbooks/newsletter.md
 * and docs/prd/story-delivery-resend.md §5 Phase 4. This module exists so that
 * "which Saturday" has exactly one definition instead of being counted off a
 * calendar every week, which is how the send date stayed blank in
 * docs/prd/episode-spec.md Part B for three episodes.
 *
 * Dates are plain `YYYY-MM-DD` calendar days computed in UTC, matching
 * `Episode.publishedAt`. That is deliberate: a send day is a day on a calendar,
 * not an instant, and the operator picks the actual time of day in the Resend
 * dashboard. The one consequence worth knowing is that late on a Saturday
 * evening in +03:00 it is still Saturday in UTC, so `nextSendDate` returns
 * today rather than rolling forward — which is the right answer for an
 * operator asking "what am I scheduling for", and the wrong one for nothing.
 */
import config from '../../config';

const DAY_MS = 24 * 60 * 60 * 1000;

function toIsoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * The next send day on or after `from` (default: today), as `YYYY-MM-DD`.
 *
 * "On or after", not "strictly after": on the send day itself the answer to
 * "which send is this" is today's.
 */
export function nextSendDate(from: Date = new Date()): string {
  const start = new Date(`${toIsoDay(from)}T00:00:00Z`);
  const delta = (config.newsletter.sendDay - start.getUTCDay() + 7) % 7;
  return toIsoDay(new Date(start.getTime() + delta * DAY_MS));
}

/**
 * The write-by day for a given send day — send minus `writeLeadDays`, the room
 * the A7 pre-send checklist and one round of fixes need.
 */
export function writeByDate(sendDate: string): string {
  const send = new Date(`${sendDate}T00:00:00Z`);
  return toIsoDay(new Date(send.getTime() - config.newsletter.writeLeadDays * DAY_MS));
}

/** `Saturday`, for output a human reads. */
export function sendDayName(): string {
  // 2026-01-04 is a Sunday, so adding the day index lands on that weekday.
  const reference = new Date(Date.UTC(2026, 0, 4 + config.newsletter.sendDay));
  return reference.toLocaleDateString('en-GB', { weekday: 'long', timeZone: 'UTC' });
}
