/**
 * When the next weekly story goes out.
 *
 * Nothing here sends or schedules anything: it computes dates. Since
 * 2026-09-27 the weekly job (scripts/stories/schedule-weekly-broadcast.ts, run
 * by .github/workflows/weekly-broadcast.yml) passes `nextSendAt()` to Resend
 * as a broadcast's `scheduled_at`, and Resend does the queueing, throttling,
 * unsubscribe filtering and the send itself. See docs/runbooks/newsletter.md.
 * This module exists so that "which Saturday" has exactly one definition
 * instead of being counted off a calendar every week, which is how the send
 * date stayed blank in docs/prd/episode-spec.md Part B for three episodes.
 *
 * Days are plain `YYYY-MM-DD` calendar days computed in UTC, matching
 * `Episode.publishedAt`, and the time of day is `config.newsletter.sendTimeUtc`,
 * also UTC, so nothing here moves with anyone's daylight saving. The one
 * consequence worth knowing is that late on a Saturday evening in +03:00 it is
 * still Saturday in UTC, so `nextSendDate` returns today rather than rolling
 * forward — the right answer for "which send is this", while `nextSendAt`, which
 * must never schedule into the past, rolls to the following week once today's
 * slot is less than `MIN_SCHEDULE_LEAD_MINUTES` away.
 *
 * Pure: every function takes the clock as an argument, defaulting to now, so
 * `pnpm validate:broadcast` can check every weekday without waiting for one.
 */
import config from '../../config';

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * A broadcast is never scheduled closer to now than this. Resend would accept
 * `in 1 min`; this refuses anything that leaves no time to notice a mistake
 * and cancel it, so a run half an hour before the slot rolls to next week.
 */
export const MIN_SCHEDULE_LEAD_MINUTES = 30;

const SEND_TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;

function toIsoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** `config.newsletter.sendTimeUtc` as minutes after midnight UTC. Throws on a malformed value. */
function sendTimeMinutes(): number {
  const match = SEND_TIME.exec(config.newsletter.sendTimeUtc);
  if (!match) {
    throw new Error(
      `config.newsletter.sendTimeUtc must be HH:MM in UTC, not ${JSON.stringify(config.newsletter.sendTimeUtc)}.`
    );
  }
  return Number(match[1]) * 60 + Number(match[2]);
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
 * The instant the next weekly broadcast is scheduled for, as the ISO 8601
 * `scheduled_at` Resend takes, e.g. `2026-10-03T13:00:00.000Z`.
 *
 * It is `nextSendDate(from)` at `config.newsletter.sendTimeUtc`, unless that is
 * less than `MIN_SCHEDULE_LEAD_MINUTES` after `from`, in which case it is the
 * same time a week later. So on the send day a run before 12:30 UTC gets
 * today's 13:00 slot, and a run after it gets next week's: never an immediate
 * send, and never one in the past.
 */
export function nextSendAt(from: Date = new Date()): string {
  const day = new Date(`${nextSendDate(from)}T00:00:00Z`).getTime();
  const slot = day + sendTimeMinutes() * MINUTE_MS;
  const earliest = from.getTime() + MIN_SCHEDULE_LEAD_MINUTES * MINUTE_MS;
  return new Date(slot >= earliest ? slot : slot + 7 * DAY_MS).toISOString();
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
  return WEEKDAYS[config.newsletter.sendDay];
}

/** `Friday`: the day before the send day, and the last day the weekly job runs before it. */
export function dayBeforeSendName(): string {
  return WEEKDAYS[(config.newsletter.sendDay + 6) % 7];
}

/** `Sat 2026-10-03 13:00 UTC`, for titles and output a human reads. */
export function formatUtcInstant(instant: string | Date): string {
  const date = typeof instant === 'string' ? new Date(instant) : instant;
  if (Number.isNaN(date.getTime())) return 'an unreadable date';
  const iso = date.toISOString();
  return `${WEEKDAYS[date.getUTCDay()].slice(0, 3)} ${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
}
