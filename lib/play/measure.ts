/**
 * What Tan Dash measures, and the return-visit model the six-week test is
 * decided on.
 *
 * The test was pre-registered in the KanjiFun appraisal (claude.ai doc, 10-11
 * Oct 2026), decision date Mon 7 Dec 2026:
 *
 *   Reach       >= 300 players start in six weeks           play_run_start, unique visitors
 *   Engagement  >= 40% of starters catch at least 3 kanji    play_kanji_catch n=3 / play_run_start
 *   Retention   players who caught a kanji come back within  site_visit_return played=yes
 *   (decides)   7 days at >= 2x the rate of visitors who     vs played=no, each over its
 *               didn't play, and at >= 15% absolute           cohort's unique visitors
 *
 * Every goal here is budgeted (DataFast bills goal events; the account ran out
 * in September): each fires at most once or twice per page view, except the
 * share click, which is a deliberate act. Never fire one per catch or per run.
 *
 * GOALS
 *   play_run_start           The first run started on a page view. `first`: yes
 *                            when this browser has never caught a kanji.
 *   play_kanji_catch         The 1st and the 3rd correct catch of a page view,
 *                            counted across runs. `n`: 1 | 3.
 *   play_score_share         The results screen's share button. `method`:
 *                            share (the OS sheet) | copy (the clipboard).
 *   play_app_waitlist_click  "I'd play it as a phone app": a fake door, once
 *                            per page view. No app exists; the copy says so.
 *   site_visit_return        Once per browser per cohort, site-wide: the first
 *                            page view on a later calendar day, within 7 days
 *                            of the cohort's anchor. `played`: yes | no.
 *
 * Email signups from the results screen are `email_signup` with source
 * `play-results` (lib/analytics/email-signup-sources.ts), like every surface.
 */

export const PLAY_GOALS = {
  runStart: 'play_run_start',
  kanjiCatch: 'play_kanji_catch',
  scoreShare: 'play_score_share',
  appWaitlistClick: 'play_app_waitlist_click',
} as const;

export const SITE_RETURN_GOAL = 'site_visit_return';

/** Catches on one page view that fire `play_kanji_catch`. */
export const CATCH_MILESTONES = [1, 3] as const;

/** The game's own progress: best score, Kanji-dex, streak, options. */
export const PLAY_STORAGE_KEY = 'mk-play';

// ---------------------------------------------------------------------------
// The return-visit model
// ---------------------------------------------------------------------------
//
// A browser belongs to one cohort at a time. It starts as a visitor anchored
// on the first page view this model saw (not necessarily its first visit
// ever: the key did not exist before /play shipped, so everyone already here
// is anchored on their first view after the deploy, which is the same rule
// for both cohorts). Its first kanji catch moves it to the player cohort,
// anchored on the day of that catch, and re-arms the report, because the
// pass mark counts 7 days from the catch, not from the first visit.
//
// Each cohort reports at most once: the first page view on a LATER calendar
// day within 7 days of the anchor fires `site_visit_return`; once 7 days have
// passed with none, the cohort is closed with no event. So a browser costs at
// most two events in its life, and a non-returner costs none.
//
// Stored under `mk-visit`. Shape-checked on read and never overwritten when
// unrecognised (CLAUDE.md, "No server-side user state").

export const VISIT_STORAGE_KEY = 'mk-visit';
export const RETURN_WINDOW_DAYS = 7;

export interface VisitState {
  v: 1;
  /** Local calendar day, YYYY-MM-DD: the first view, or the first catch for a player. */
  anchor: string;
  played: boolean;
  /** True once this cohort has reported, or its window closed without a return. */
  done: boolean;
}

export type VisitRead = { kind: 'none' } | { kind: 'ok'; state: VisitState } | { kind: 'unknown' };

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export function parseVisitState(raw: string | null): VisitRead {
  if (raw === null) return { kind: 'none' };
  try {
    const s = JSON.parse(raw);
    if (
      s &&
      s.v === 1 &&
      typeof s.anchor === 'string' &&
      DAY.test(s.anchor) &&
      typeof s.played === 'boolean' &&
      typeof s.done === 'boolean'
    ) {
      return { kind: 'ok', state: { v: 1, anchor: s.anchor, played: s.played, done: s.done } };
    }
  } catch {
    // fall through
  }
  return { kind: 'unknown' };
}

/** Local calendar day as YYYY-MM-DD. */
export function localDay(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Whole calendar days from `a` to `b` (both YYYY-MM-DD); negative if b is earlier. */
export function daysBetween(a: string, b: string): number {
  const ms = (day: string) => {
    const [y, m, d] = day.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((ms(b) - ms(a)) / 86_400_000);
}

export interface VisitStep {
  /** The state to write, or null to write nothing. */
  write: VisitState | null;
  /** The goal to fire, or null. */
  fire: { played: 'yes' | 'no' } | null;
}

/** Every page view, site-wide. */
export function onPageView(read: VisitRead, today: string): VisitStep {
  if (read.kind === 'unknown') return { write: null, fire: null };
  if (read.kind === 'none') {
    return { write: { v: 1, anchor: today, played: false, done: false }, fire: null };
  }
  const { state } = read;
  if (state.done) return { write: null, fire: null };
  const days = daysBetween(state.anchor, today);
  if (days <= 0) return { write: null, fire: null };
  if (days <= RETURN_WINDOW_DAYS) {
    return { write: { ...state, done: true }, fire: { played: state.played ? 'yes' : 'no' } };
  }
  return { write: { ...state, done: true }, fire: null };
}

/** The first correct catch on a page view. Moves a visitor into the player cohort once. */
export function onCatch(read: VisitRead, today: string): VisitState | null {
  if (read.kind === 'unknown') return null;
  if (read.kind === 'ok' && read.state.played) return null;
  return { v: 1, anchor: today, played: true, done: false };
}

/** Browser glue: reads, steps and writes `mk-visit`. Never throws. */
export function readVisit(): VisitRead {
  try {
    return parseVisitState(window.localStorage.getItem(VISIT_STORAGE_KEY));
  } catch {
    return { kind: 'unknown' };
  }
}

export function writeVisit(state: VisitState): void {
  try {
    window.localStorage.setItem(VISIT_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private mode or storage full: the report is lost, the page is not.
  }
}
