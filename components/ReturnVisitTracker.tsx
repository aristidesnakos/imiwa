'use client';

/**
 * components/ReturnVisitTracker.tsx
 *
 * Steps the return-visit model in lib/play/measure.ts once per full page load, site-wide,
 * and fires `site_visit_return` when the model says this browser has come back. Renders
 * nothing.
 *
 * The /play six-week test is decided on this event (decision Mon 7 Dec 2026): players who
 * caught a kanji against visitors who never started a run, each over its own cohort. The
 * model, its cohorts and its window are specified in the header of lib/play/measure.ts and
 * replayed by `pnpm validate:play`; this file is only the browser glue, so keep the rules
 * there.
 *
 * Once per FULL page load, not per route: the root layout does not remount on client
 * navigation, and a return is a later calendar day, which a client navigation inside one
 * visit almost never is. The model is idempotent within a day (the stored state decides),
 * so React's development double-mount writes once and fires nothing extra.
 *
 * Never on /confirm (shouldTrack): its URL is the signup token, which holds the subscriber's
 * email address, and a goal carries its page's URL, so a return a day after signup would
 * fire from /confirm?token=… and send the token to DataFast and to the Vercel logs of
 * /api/datafast. The confirm button's 303 lands on /subscribed, a full load, so the
 * return is still counted. lib/analytics/index.ts also strips `token` from every goal's
 * page_url, so a second goal on that page cannot reopen the leak.
 *
 * On every other page it first notes a newsletter arrival (utm_medium=email) for this tab
 * session, so the model can record whether the anchor visit came from the email.
 *
 * Cost: at most two goal events per browser, ever (one per cohort), and none for a browser
 * that never returns. That cap lives in the stored state, so the event fires only once the
 * write closing its cohort has landed: with storage full or blocked, the old state would
 * still read "not reported" and every later page view in the window would fire again. Such
 * a browser goes unreported instead, like any other storage failure. It imports only the
 * model and the analytics helper, which the root layout already ships, and renders no DOM,
 * so there is nothing to hydrate (CLAUDE.md, "No server-side user state").
 */

import { useEffect } from 'react';
import {
  localDay,
  noteArrival,
  onPageView,
  readVisit,
  sessionArrivedFromEmail,
  shouldTrack,
  SITE_RETURN_GOAL,
  writeVisit,
  type VisitState,
} from '@/lib/play/measure';
import { trackGoal } from '@/lib/analytics';

/** True when `mk-visit` now holds exactly `state`. */
function landed(state: VisitState): boolean {
  const read = readVisit();
  return (
    read.kind === 'ok' &&
    read.state.anchor === state.anchor &&
    read.state.played === state.played &&
    read.state.started === state.started &&
    read.state.email === state.email &&
    read.state.done === state.done
  );
}

export function ReturnVisitTracker(): null {
  useEffect(() => {
    if (!shouldTrack(window.location.pathname)) return;
    noteArrival(window.location.search);
    const step = onPageView(readVisit(), localDay(), sessionArrivedFromEmail());
    if (step.write) writeVisit(step.write);
    if (step.fire && step.write && landed(step.write)) {
      void trackGoal(SITE_RETURN_GOAL, { played: step.fire.played, arrival: step.fire.arrival });
    }
  }, []);

  return null;
}
