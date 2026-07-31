/**
 * lib/announcements/config.ts
 *
 * The queue. **This is the only file you edit to run an announcement.**
 *
 * Rules the CI check enforces (`pnpm validate:announcements`, run on every PR
 * that touches this directory — see .github/workflows/announcements-check.yml):
 *
 *   - ids are unique, kebab-case, and stable. Changing an id re-shows the
 *     banner to everyone who already dismissed it.
 *   - `startsAt` / `expiresAt` are real `YYYY-MM-DD` days, start before end,
 *     and the run is at most MAX_RUN_DAYS long.
 *   - No two runs overlap. One bar at a time or it stops being a bar.
 *   - `message` and `cta.label` fit the length limits, so the bar cannot wrap
 *     to three lines on a phone and eat the fold on a kanji page.
 *   - `cta.href` resolves to a route that actually exists in `app/`.
 *
 * Ordering is chronological. Selection walks this array and takes the first
 * live, unacknowledged entry.
 *
 * ── Not scheduled ────────────────────────────────────────────────────────
 * **Example sentences.** `data/sentences/published/N5.json` is still empty
 * (82 candidates sit in the queue, 0 decisions recorded), so kanji pages
 * render no sentence section and there is nothing to announce. Do not add an
 * entry for it until published sentences exist — a banner leading to a page
 * with no visible change is the most expensive mistake available here, because
 * it teaches people our announcements are not worth clicking. The gate is
 * review throughput, not engineering.
 */

import type { Announcement } from './types';

export const ANNOUNCEMENT_QUEUE: readonly Announcement[] = [
  {
    id: 'reviews-2026-08',
    startsAt: '2026-08-04',
    expiresAt: '2026-08-09',
    message: "The kanji you've marked as learned are ready for spaced-repetition review.",
    cta: { label: 'Start a review', href: '/kanji/review' },
    // Someone who already has SRS cards found the feature without our help.
    // Telling them about it is the single fastest way to look like an ad.
    shouldShow: (signals) => signals.srsCardCount === 0,
    note: 'First, because it is the only feature here that creates a reason to come back tomorrow.',
  },
  {
    id: 'search-2026-08',
    startsAt: '2026-08-11',
    expiresAt: '2026-08-16',
    // "kana reading", never just "reading": readings are stored as kana only
    // (onyomi: "にち、じつ"), so mizu/sui/nichi all return zero results while
    // 水 / water / みず work. A romaji-typing user who bounces off "No kanji
    // found" is worse off than one who was never told.
    message: 'Search kanji by English meaning or kana reading — not just the character.',
    cta: { label: 'Try a search', href: '/kanji' },
    note: 'The only queue item that needed no engineering work to be true.',
  },
  {
    id: 'worksheet-2026-08',
    startsAt: '2026-08-18',
    expiresAt: '2026-08-23',
    message: 'Print a practice sheet for any kanji — stroke diagram plus an 80-square writing grid.',
    cta: { label: 'Get a sheet', href: '/free-resources/kanji-sheets' },
    note: 'Best-hidden thing we own. Depends on the kanji-sheets API covering all five levels.',
  },
  {
    id: 'progress-2026-08',
    startsAt: '2026-08-25',
    expiresAt: '2026-08-30',
    message: "See how many kanji you've learned, and when.",
    cta: { label: 'View your progress', href: '/kanji/progress' },
    // A dashboard is a poor advertisement with three data points on it. Wait
    // until there is a curve worth looking at.
    shouldShow: (signals) => signals.learnedCount >= 5,
    note: 'Last, to buy three weeks for the cumulative-series and 24H bucket fixes.',
  },
];
