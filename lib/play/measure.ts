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
 *               didn't play, and at >= 15% absolute;         cohort's unique visitors, both
 *               players who arrived from the email are       arrival=other; arrival=email
 *               reported separately                          is reported apart
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
 *                            of the cohort's anchor, never on /confirm.
 *                            `played`: yes (caught a kanji) | started (started
 *                            a run, caught nothing) | no (never started).
 *                            `arrival`: email | other, how the anchor visit's
 *                            tab session arrived (below), not the return's.
 *
 * Email signups from the results screen are `email_signup` with source
 * `play-app-waitlist` (lib/analytics/email-signup-sources.ts), like every
 * surface. That form joins the app waitlist (one email if an app ships,
 * lib/email/lists.ts), not the weekly story email; until 2026-10-11 it joined
 * the weekly email as `play-results`. So from then on the game puts no player
 * on the weekly email, and the arrival=email returns below stay subscribers
 * who chose the story list.
 *
 * Every goal also carries `page_url`, added by lib/analytics/index.ts, which
 * strips the signup `token` from it first: see the comment there.
 *
 * READING IT ON 7 DEC
 *   - Exclude China from every denominator, as every other DataFast read in
 *     this project does: it is scraper traffic (1,251 of 5,681 visitors from
 *     29 Aug to 27 Sep 2026, 98% bounce, 2 returned), so it would swell the
 *     visitor cohort with browsers that never come back and flatter the 2x
 *     ratio.
 *   - Like with like. The deciding comparison is played=yes against
 *     played=no, both arrival=other. played=started is neither cohort: a
 *     starter who caught nothing is not a visitor "who didn't play". A
 *     subscriber is reminded weekly by the email, so arrival=email returns
 *     are reported next to the result, never folded into it. The game's own
 *     form adds nobody to that email (above), so it cannot swell that cohort.
 *   - Give every cohort its whole window: take the denominators (unique
 *     visitors; catchers from play_kanji_catch n=1; starters from
 *     play_run_start) to 30 Nov and the returns to 7 Dec. The few returns in
 *     that last week from anchors after 30 Nov fall on both cohorts alike.
 *   - No goal but site_visit_return carries `arrival`, so the email cohorts'
 *     denominators are the catchers and visitors DataFast attributes to
 *     utm_medium=email. The plain-text email's /play link is deliberately
 *     untagged (lib/email/quiz-email.ts), so a plain-text reader counts as
 *     other.
 *   - From 2026-10-11 (day 1) the homepage has a fourth door to /play
 *     (components/home/StartDoors.tsx). It is untagged, deliberately: an
 *     internal UTM would reset DataFast's attribution for the visit, and a new
 *     `arrival` value is a change to this model that nobody asked for. Its
 *     players are therefore in the arrival=other cohorts, and the only trace
 *     is a `/` -> `/play` page sequence. Its players are curious clickers, not
 *     readers who have just met the kanji, so reach is tilted up and
 *     engagement and returns could move either way. Say so next to the verdict.
 *   - From 2026-10-11 /about also links /play in plain text (app/about/page.tsx),
 *     untagged for the same reason; its players are in arrival=other too.
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
// Starting a run without catching anything does not move a browser: it stays
// a visitor, on the same anchor, flagged `started`, and reports
// played=started. Without that flag a starter who caught nothing would report
// played=no, inside the cohort the pass mark calls "didn't play".
//
// Each cohort reports at most once: the first page view on a LATER calendar
// day within 7 days of the anchor fires `site_visit_return`; once 7 days have
// passed with none, the cohort is closed with no event. So a browser costs at
// most two events in its life, and a non-returner costs none.
//
// The anchor visit also records whether its tab session arrived from the
// newsletter (`email`), so a subscriber, whom the next Saturday email brings
// back whether or not the game did, is reported apart (`arrival`).
//
// /confirm never steps the model (shouldTrack below). Its URL carries the
// signup token, a credential for the subscriber's address (sealed, or a legacy
// JWT that holds the address itself), and every goal carries its page's URL. Nothing is lost: the confirm button posts, and
// its 303 lands on /subscribed as a full page load, which counts the return.
//
// Stored under `mk-visit`. Shape-checked on read and never overwritten when
// unrecognised (CLAUDE.md, "No server-side user state"). A state written
// before `started` and `email` existed reads as false for both.

export const VISIT_STORAGE_KEY = 'mk-visit';
export const RETURN_WINDOW_DAYS = 7;

export interface VisitState {
  v: 1;
  /** Local calendar day, YYYY-MM-DD: the first view, or the first catch for a player. */
  anchor: string;
  /** Caught a kanji: the player cohort. */
  played: boolean;
  /** Started a run, caught or not. Never moves the anchor. */
  started: boolean;
  /** The anchor visit's tab session arrived from the newsletter (utm_medium=email). */
  email: boolean;
  /** True once this cohort has reported, or its window closed without a return. */
  done: boolean;
}

export type VisitRead = { kind: 'none' } | { kind: 'ok'; state: VisitState } | { kind: 'unknown' };

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** A flag added after the first shape: absent reads as false, anything but a boolean is unrecognised. */
function laterFlag(x: unknown): boolean | null {
  if (x === undefined) return false;
  return typeof x === 'boolean' ? x : null;
}

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
      const started = laterFlag(s.started);
      const email = laterFlag(s.email);
      if (started !== null && email !== null) {
        return { kind: 'ok', state: { v: 1, anchor: s.anchor, played: s.played, started, email, done: s.done } };
      }
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

export type ReturnPlayed = 'yes' | 'started' | 'no';
export type ReturnArrival = 'email' | 'other';

export interface VisitStep {
  /** The state to write, or null to write nothing. */
  write: VisitState | null;
  /** The goal's properties, or null to fire nothing. */
  fire: { played: ReturnPlayed; arrival: ReturnArrival } | null;
}

/** Every tracked page view, site-wide. `fromEmail`: this tab session arrived from the newsletter. */
export function onPageView(read: VisitRead, today: string, fromEmail: boolean): VisitStep {
  if (read.kind === 'unknown') return { write: null, fire: null };
  if (read.kind === 'none') {
    return { write: { v: 1, anchor: today, played: false, started: false, email: fromEmail, done: false }, fire: null };
  }
  const { state } = read;
  if (state.done) return { write: null, fire: null };
  const days = daysBetween(state.anchor, today);
  if (days <= 0) return { write: null, fire: null };
  if (days <= RETURN_WINDOW_DAYS) {
    const played: ReturnPlayed = state.played ? 'yes' : state.started ? 'started' : 'no';
    return { write: { ...state, done: true }, fire: { played, arrival: state.email ? 'email' : 'other' } };
  }
  return { write: { ...state, done: true }, fire: null };
}

/**
 * The first run started on a page view. Flags a starter without moving its
 * anchor or its cohort; nothing to write when already flagged, when nothing
 * is stored yet, or when what is stored is unrecognised.
 */
export function onRunStart(read: VisitRead): VisitState | null {
  if (read.kind !== 'ok' || read.state.started) return null;
  return { ...read.state, started: true };
}

/** The first correct catch on a page view. Moves a visitor into the player cohort once. */
export function onCatch(read: VisitRead, today: string, fromEmail: boolean): VisitState | null {
  if (read.kind === 'unknown') return null;
  if (read.kind === 'ok' && read.state.played) return null;
  // A catch is always inside a run, so a player has started.
  return { v: 1, anchor: today, played: true, started: true, email: fromEmail, done: false };
}

/**
 * Whether the return-visit tracker steps the model on this path. /confirm
 * never does (see the model above); nor does anything under it.
 */
const UNTRACKED_PATHS = ['/confirm'];

export function shouldTrack(pathname: string): boolean {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return !UNTRACKED_PATHS.some(p => path === p || path.startsWith(`${p}/`));
}

// ---------------------------------------------------------------------------
// The arrival note
// ---------------------------------------------------------------------------
//
// Whether this tab's session arrived from the newsletter. The episode email's
// tagged links carry utm_medium=email (lib/email/utm.ts); the tracker notes it
// on the landing page, so a click through to /play, or a catch an hour later
// in the same tab, still knows. Session storage, so it ends with the tab, and
// it holds only the word "email".

export const ARRIVAL_SESSION_KEY = 'mk-arrival';

/** True when a landing URL's query string marks a newsletter arrival. */
export function isEmailArrival(search: string): boolean {
  try {
    return new URLSearchParams(search).get('utm_medium')?.toLowerCase() === 'email';
  } catch {
    return false;
  }
}

/** Notes a newsletter arrival for this tab session. Never clears one; never throws. */
export function noteArrival(search: string): void {
  if (!isEmailArrival(search)) return;
  try {
    window.sessionStorage.setItem(ARRIVAL_SESSION_KEY, 'email');
  } catch {
    // Blocked storage: this session reads as "other", like an untagged arrival.
  }
}

/** True when this tab session arrived from the newsletter. Never throws. */
export function sessionArrivedFromEmail(): boolean {
  try {
    return window.sessionStorage.getItem(ARRIVAL_SESSION_KEY) === 'email';
  } catch {
    return false;
  }
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
