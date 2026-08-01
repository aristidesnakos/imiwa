'use client';

/**
 * components/AnnouncementBanner.tsx
 *
 * A slim, dismissible bar telling *returning* users about a feature they
 * already have but do not know about.
 *
 * Three decisions worth knowing before editing this:
 *
 * 1. **A bar, not an interstitial.** Our traffic is search-driven and lands
 *    directly on kanji detail pages with an immediate task in mind. Google
 *    penalises content-blocking interstitials on mobile for search landings,
 *    which would fight the work in docs/3rdVersion/performance-and-seo-roadmap.md.
 *    We take the lower ceiling for the much lower floor.
 *
 * 2. **Normal document flow, not `fixed`.** `<Header />` is imported per-page
 *    across ~15 call sites, not mounted in the layout, and it is
 *    `sticky top-0 z-50`. A `fixed top-0 z-50` bar would tie it on stacking
 *    order and get permanently covered on scroll. In flow, the sticky header
 *    simply sticks below the bar and nothing has to reserve top space.
 *
 * 3. **Hydration Pattern A** — `mounted` flag plus `if (!mounted) return null`,
 *    copied from `components/CookieConsent.tsx`. Server HTML contains no bar at
 *    all, so an already-acknowledged user never gets a flash-then-remove. The
 *    hooks in `hooks/` use a different pattern (SSR-safe default, hydrate in
 *    effect); do not mix them.
 *
 * Everything about *which* announcement, *whether*, and *when* lives in
 * lib/announcements — this file owns presentation and the acknowledgement
 * gestures, nothing else.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { trackGoal } from '@/lib/analytics';
import { ANNOUNCEMENT_QUEUE } from '@/lib/announcements/config';
import { selectAnnouncement } from '@/lib/announcements/select';
import { readSignals } from '@/lib/announcements/signals';
import {
  emptyState,
  loadState,
  saveState,
  withAck,
  withImpression,
} from '@/lib/announcements/state';
import type { Announcement, AckVia, AnnouncementState } from '@/lib/announcements/types';

/** Matches the fade-out duration below. Long enough to read as intentional,
 *  short enough that a second click never lands on a ghost. */
const LEAVE_MS = 180;

export function AnnouncementBanner() {
  const [mounted, setMounted] = useState(false);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [leaving, setLeaving] = useState(false);

  // The banner writes to storage far more often than it re-renders, and an
  // acknowledgement must never race a stale render's copy of the state.
  const stateRef = useRef<AnnouncementState>(emptyState());

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const now = Date.now();
    const state = loadState();
    stateRef.current = state;

    const selection = selectAnnouncement({
      queue: ANNOUNCEMENT_QUEUE,
      now,
      signals: readSignals(),
      state,
    });

    if (selection.kind === 'none') return;

    // Silently retire it. No render, no analytics event — nothing happened
    // from the user's point of view, and counting a non-impression as an
    // impression would quietly inflate every rate we measure.
    if (selection.kind === 'auto-ack') {
      const next = withAck(state, selection.announcement.id, selection.via, now);
      stateRef.current = next;
      saveState(next);
      return;
    }

    const next = withImpression(state, selection.announcement.id);
    stateRef.current = next;
    saveState(next);
    setAnnouncement(selection.announcement);

    void trackGoal('announcement_impression', {
      announcement_id: selection.announcement.id,
      impression: next.seen[selection.announcement.id]?.impressions ?? 1,
    });
  }, [mounted]);

  const acknowledge = useCallback(
    (via: AckVia, goal: string) => {
      const id = announcement?.id;
      if (!id) return;

      const next = withAck(stateRef.current, id, via, Date.now());
      stateRef.current = next;
      saveState(next);

      void trackGoal(goal, {
        announcement_id: id,
        impression: next.seen[id]?.impressions ?? 1,
      });

      // Unmount after the fade rather than with it, so the layout shift
      // happens once, at the end, instead of animating the page upward.
      setLeaving(true);
      window.setTimeout(() => setAnnouncement(null), LEAVE_MS);
    },
    [announcement],
  );

  // Keyboard parity with the X. Scoped defensively: this is a document-level
  // listener on every page, and swallowing Escape inside a form field or a
  // dialog would be a far worse bug than a bar that needs a click.
  useEffect(() => {
    if (!announcement || leaving) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;

      // `instanceof Element` before `.closest`: a keydown can be delivered
      // with `document` as its target, which has no `closest` and would throw
      // out of a listener that is attached on every page of the site.
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest('input, textarea, select, [contenteditable="true"], [role="dialog"]')
      ) {
        return;
      }

      acknowledge('dismiss', 'announcement_dismiss');
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [announcement, leaving, acknowledge]);

  if (!mounted || !announcement) return null;

  return (
    <div
      role="region"
      aria-label="Site announcement"
      className={`border-b border-japan-sakura-waters/20 bg-japan-soft-mist transition-opacity duration-200 ${
        leaving ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="container mx-auto flex items-center gap-3 px-4 py-2">
        <p className="flex-1 text-sm text-japan-deep-ocean">
          {announcement.message}{' '}
          <Link
            href={announcement.cta.href}
            onClick={() => acknowledge('cta', 'announcement_cta_click')}
            className="whitespace-nowrap font-semibold text-japan-sakura-waters underline underline-offset-2 hover:text-japan-coral-sunset-ink"
          >
            {announcement.cta.label} →
          </Link>
        </p>

        {/* Dismissal is the point, so it gets a full 44px touch target and a
            visible label — never a 12px grey glyph in a corner. */}
        <button
          type="button"
          onClick={() => acknowledge('dismiss', 'announcement_dismiss')}
          aria-label="Dismiss announcement"
          className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-japan-mountain-mist transition-colors hover:bg-white/70 hover:text-japan-deep-ocean focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
