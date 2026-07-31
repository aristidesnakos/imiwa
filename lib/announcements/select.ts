/**
 * lib/announcements/select.ts
 *
 * The decision: given the queue, the clock, what we know about the visitor and
 * what they have already seen — show which announcement, if any?
 *
 * Pure. No storage, no React, no `Date.now()` (the caller passes `now`). That
 * is what lets CI replay the whole queue against synthetic visitors and dates
 * in `scripts/announcements/validate.ts` rather than us finding out in
 * production that two runs overlapped.
 */

import { hasHitImpressionCap, isAcknowledged } from './state';
import type { Announcement, AnnouncementState, LearnerSignals } from './types';

export type Selection =
  /** Nothing to show. The overwhelmingly common case. */
  | { kind: 'none' }
  | { kind: 'show'; announcement: Announcement }
  /**
   * In window and unacknowledged, but it should never be shown again.
   * The caller writes the acknowledgement and renders nothing.
   *
   * `precondition` — this visitor already uses the feature. Announcing
   * something to the people who already found it is the fastest way to make
   * the bar read as an ad.
   *
   * `impression-cap` — they have now scrolled past it MAX_IMPRESSIONS times
   * without touching it. Ignoring it three times is an answer; a fourth
   * showing is just wearing them down.
   */
  | { kind: 'auto-ack'; announcement: Announcement; via: 'precondition' | 'impression-cap' };

const DAY_MS = 24 * 60 * 60 * 1000;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Epoch ms for 00:00:00.000 UTC on an ISO day, or NaN if malformed.
 *  UTC rather than local so a run starts at the same instant everywhere and
 *  CI can check window overlap without knowing anyone's timezone. */
export function parseDay(iso: string): number {
  if (!ISO_DAY.test(iso)) return NaN;
  const ms = Date.parse(`${iso}T00:00:00.000Z`);
  // Date.parse accepts 2026-02-31 and rolls it forward; reject that.
  return new Date(ms).toISOString().slice(0, 10) === iso ? ms : NaN;
}

/** Half-open window `[startsAt 00:00Z, expiresAt+1day 00:00Z)`, so a run
 *  written as "Aug 4 → Aug 9" includes all of Aug 9. */
export function windowFor(a: Announcement): { start: number; end: number } {
  const start = parseDay(a.startsAt);
  const end = parseDay(a.expiresAt);
  return { start, end: Number.isNaN(end) ? NaN : end + DAY_MS };
}

export function isLive(a: Announcement, now: number): boolean {
  const { start, end } = windowFor(a);
  // A malformed date fails closed: NaN comparisons are false, so a typo in the
  // config silently shows nothing rather than silently showing forever.
  return now >= start && now < end;
}

/** Do two runs share any instant? Used by CI to keep the queue single-file. */
export function overlaps(a: Announcement, b: Announcement): boolean {
  const wa = windowFor(a);
  const wb = windowFor(b);
  return wa.start < wb.end && wb.start < wa.end;
}

export interface SelectInput {
  queue: readonly Announcement[];
  now: number;
  signals: LearnerSignals;
  state: AnnouncementState;
}

export function selectAnnouncement({ queue, now, signals, state }: SelectInput): Selection {
  // ─── Audience gate — applied before any per-announcement logic ───────────
  // First-time visitors, and anyone arriving from search with no history, see
  // nothing at all. This is what makes the bar a returning-user surface rather
  // than an interstitial on a search landing.
  if (signals.learnedCount < 1) return { kind: 'none' };

  // The consent bar owns the screen until it is answered. Two bars at once is
  // the exact "flummoxed" experience we are trying not to create. Consent
  // persists 365 days, so for our returning audience this is near a no-op.
  if (!signals.hasResolvedConsent) return { kind: 'none' };

  for (const announcement of queue) {
    if (!isLive(announcement, now)) continue;
    if (isAcknowledged(state, announcement.id)) continue;

    // Checked before the impression is recorded, so the bar renders exactly
    // MAX_IMPRESSIONS times and the (MAX+1)th load acknowledges instead. That
    // ordering also keeps `ackVia` honest: a CTA click on the last showing is
    // still stored as `cta`, not overwritten by the cap.
    if (hasHitImpressionCap(state, announcement.id)) {
      return { kind: 'auto-ack', announcement, via: 'impression-cap' };
    }

    if (announcement.shouldShow && !announcement.shouldShow(signals)) {
      return { kind: 'auto-ack', announcement, via: 'precondition' };
    }

    return { kind: 'show', announcement };
  }

  return { kind: 'none' };
}
