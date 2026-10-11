/**
 * lib/jlpt/countdown.ts
 *
 * The date arithmetic and the pace behind the countdown card on /kanji/n5
 * (components/levels/N5Countdown.tsx). Pure functions over plain numbers: no `window`,
 * no React, no kanji data, so `pnpm validate:countdown` can replay every phase in Node
 * and the client island ships none of the dictionary. Keep it that way: this file is
 * imported by a client component, so it must never import lib/jlpt/published.ts (that
 * one carries the quiz items and is server-only).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT IT PROMISES
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * A date and a pace, both computed from facts the visitor can check: the test day, the
 * length of the list, and how many kanji they have marked as learned. Nothing resets,
 * nothing expires early, and no scarcity is invented: the one deadline is the exam's.
 *
 * It does NOT say the list is what the exam asks. The JLPT has published no kanji list
 * since 2010 (app/kanji/n5/page.tsx says so), so every sentence the card shows is about
 * "the kanji on this list".
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY TWO WEEKS OF REVIEW
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * REVIEW_DAYS is the paid book's own rule, not a new one: its last teaching week ends
 * 22 November (14 days before 6 December), then a revision week and a test week that
 * teach nothing (scripts/n5-countdown/schedule.py). The card and the book must not give
 * a reader two answers to "when do I stop adding", and `validate:countdown` reads
 * schedule.py and schedule.json to keep them agreeing.
 *
 * The book's WEEKLY allocation (which kanji in which week) is deliberately not
 * reproduced here. The README is explicit that dated sequencing is what the book sells
 * and the free pack gives away the sheets, not the schedule. The card paces the visitor
 * through the list in /kanji/n5's own order at a rate computed from THEIR progress.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CALENDAR DAYS, NOT INSTANTS
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The test is held on a calendar date wherever it is sat, so a day count is the
 * difference between two calendar dates in the visitor's own timezone. Every date here
 * is a whole number of days since 1970-01-01 built through Date.UTC, which a daylight
 * saving change cannot stretch to 23 or 25 hours the way a millisecond difference can.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ADDING THE NEXT SITTING
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Add it to SITTINGS once jlpt.jp confirms the date (not before: a third-party calendar
 * projects Sunday 4 July 2027, which is a guess). Until then, after 6 December the card
 * renders nothing, which is correct. `validate:countdown` requires every sitting to be a
 * Sunday and the first to match the book's TEST_DATE.
 */

export interface Sitting {
  /** Test day, `YYYY-MM-DD`. A calendar date, the same wherever the test is sat. */
  date: string;
  /** For copy: "December 2026". */
  label: string;
}

/** Confirmed sittings only, soonest first. */
export const SITTINGS: readonly Sitting[] = [{ date: '2026-12-06', label: 'December 2026' }];

/**
 * Days before the test on which new kanji stop. The book's rule; see the header.
 * The last day of learning is `test day - REVIEW_DAYS`.
 */
export const REVIEW_DAYS = 14;

/**
 * Above this many a day the pace stops being a plan and the card says so, rather than
 * hand someone "Learn 14 kanji a day" with a straight face.
 */
export const COMFORTABLE_PER_DAY = 8;

/** A learner who has the week's sheets in front of them. */
export const PRINT_DAYS = 7;

// ── Calendar days ───────────────────────────────────────────────────────────

const MS_PER_DAY = 86_400_000;

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

/** A calendar date as whole days since 1970-01-01. `month` is 1-12. */
export function dayNumber(year: number, month: number, day: number): number {
  return Math.round(Date.UTC(year, month - 1, day) / MS_PER_DAY);
}

/** `YYYY-MM-DD` to a day number. Throws on anything else, so a typo cannot ship a wrong date. */
export function parseDay(iso: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) throw new Error(`Not a YYYY-MM-DD date: ${iso}`);
  const [, y, m, d] = match;
  const n = dayNumber(Number(y), Number(m), Number(d));
  const back = new Date(n * MS_PER_DAY);
  if (back.getUTCFullYear() !== Number(y) || back.getUTCMonth() + 1 !== Number(m) || back.getUTCDate() !== Number(d)) {
    throw new Error(`Not a real calendar date: ${iso}`);
  }
  return n;
}

/** The visitor's own calendar date, as a day number. */
export function localDayNumber(now: Date): number {
  return dayNumber(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/** Local midnight at the start of `now`'s date, in epoch milliseconds. */
export function localDayStart(now: Date): number {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

/** "Sunday 22 November". Fixed words, not Intl, so it reads the same everywhere. */
export function formatDay(n: number): string {
  const d = new Date(n * MS_PER_DAY);
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/** "Sunday 6 December 2026". */
export function formatDayWithYear(n: number): string {
  return `${formatDay(n)} ${new Date(n * MS_PER_DAY).getUTCFullYear()}`;
}

/** "December". */
export function monthName(n: number): string {
  return MONTHS[new Date(n * MS_PER_DAY).getUTCMonth()];
}

/** 0 = Sunday. */
export function weekdayOf(n: number): number {
  return new Date(n * MS_PER_DAY).getUTCDay();
}

// ── The plan ────────────────────────────────────────────────────────────────

/** The next sitting that has not already been sat (today counts as not yet sat). */
export function upcomingSitting(today: number, sittings: readonly Sitting[] = SITTINGS): Sitting | null {
  return sittings.find((s) => parseDay(s.date) >= today) ?? null;
}

export type CountdownPhase =
  /** Before the review fortnight: new kanji, at a pace. */
  | 'learn'
  /** The last REVIEW_DAYS days: go back over what is known. */
  | 'review'
  /** The day itself. */
  | 'test-day';

export interface CountdownPlan {
  sitting: Sitting;
  phase: CountdownPhase;
  /** Day number of the test. */
  testDay: number;
  /** Whole days from today to the test. 0 on the day. */
  daysLeft: number;
  /** Day number of the last day for new kanji. */
  learnBy: number;
  /** Days from today to `learnBy`, both ends counted. Zero or less once review begins. */
  learnDays: number;
  total: number;
  /** Marked as learned, on this list. */
  learned: number;
  /** Total minus learned. */
  remaining: number;
  /** Kanji marked as learned today. They count towards today's target. */
  markedToday: number;
  /**
   * The fewest whole kanji a day that finishes the list by `learnBy`, worked out from
   * how many were left when today began (so the target does not shrink as you tick).
   * 0 outside the learn phase or when nothing remains.
   */
  perDay: number;
  /** The day the list is finished at `perDay` a day from today. 0 when perDay is 0. */
  finishDay: number;
  /** Days between finishing and the test. 0 when perDay is 0. */
  reviewDaysAfter: number;
  /** True when the pace is above COMFORTABLE_PER_DAY. */
  tight: boolean;
}

export interface PlanInput {
  /** The visitor's calendar date as a day number. */
  today: number;
  /** Kanji on the list. */
  total: number;
  /** How many of them are marked as learned. */
  learned: number;
  /** How many of those were marked today. */
  markedToday: number;
  sittings?: readonly Sitting[];
}

/** Null when there is no sitting left to count down to. */
export function planFor({ today, total, learned, markedToday, sittings = SITTINGS }: PlanInput): CountdownPlan | null {
  const sitting = upcomingSitting(today, sittings);
  if (!sitting) return null;

  const testDay = parseDay(sitting.date);
  const daysLeft = testDay - today;
  const learnBy = testDay - REVIEW_DAYS;
  const learnDays = learnBy - today + 1;

  const phase: CountdownPhase = daysLeft === 0 ? 'test-day' : learnDays >= 1 ? 'learn' : 'review';

  const done = Math.min(Math.max(learned, 0), total);
  const remaining = total - done;
  const today_ = Math.min(Math.max(markedToday, 0), done);

  let perDay = 0;
  let finishDay = 0;
  let reviewDaysAfter = 0;
  if (phase === 'learn' && remaining > 0) {
    const atDawn = remaining + today_;
    perDay = Math.ceil(atDawn / learnDays);
    finishDay = today + Math.ceil(atDawn / perDay) - 1;
    reviewDaysAfter = testDay - finishDay;
  }

  return {
    sitting,
    phase,
    testDay,
    daysLeft,
    learnBy,
    learnDays,
    total,
    learned: done,
    remaining,
    markedToday: today_,
    perDay,
    finishDay,
    reviewDaysAfter,
    tight: perDay > COMFORTABLE_PER_DAY,
  };
}

// ── Today's kanji ───────────────────────────────────────────────────────────

export interface BatchInput {
  /** The list in teaching order. */
  order: readonly string[];
  /** Every kanji marked as learned (any level; only those in `order` matter). */
  learned: ReadonlySet<string>;
  /** The subset marked today. */
  markedToday: ReadonlySet<string>;
  /** Today's target. */
  size: number;
}

/**
 * Today's kanji, in list order: the ones already marked today, then the next unmarked
 * ones until there are `size`. Marked ones stay in, shown as ticked, so the card reads
 * the same on a reload and a mis-tick can be undone; tomorrow they are no longer
 * "marked today" and the batch moves on by itself, with nothing stored.
 */
export function todaysBatch({ order, learned, markedToday, size }: BatchInput): string[] {
  const pick = new Set<string>();
  for (const k of order) if (markedToday.has(k)) pick.add(k);
  for (const k of order) {
    if (pick.size >= size) break;
    if (!learned.has(k)) pick.add(k);
  }
  return order.filter((k) => pick.has(k));
}

/**
 * The kanji to print for the next PRINT_DAYS days: today's batch, then the next unmarked
 * ones up to `perDay * PRINT_DAYS` in all. Capped at what the rows layout accepts.
 */
export function printSet(
  batch: readonly string[],
  order: readonly string[],
  learned: ReadonlySet<string>,
  perDay: number,
  cap: number,
): string[] {
  const want = Math.min(perDay * PRINT_DAYS, cap);
  const pick = new Set(batch);
  for (const k of order) {
    if (pick.size >= want) break;
    if (!learned.has(k)) pick.add(k);
  }
  return order.filter((k) => pick.has(k)).slice(0, cap);
}
