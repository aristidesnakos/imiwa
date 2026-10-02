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
 * ── Held back ────────────────────────────────────────────────────────────
 * Sentences for N4–N1 stay unannounced: only N5 is published, and a banner
 * leading to a page with no visible change is the most expensive mistake
 * available here, because it teaches people our announcements are not worth
 * clicking. Say "N5" in the copy for as long as that is true.
 *
 * ── Why these three, in this order (2026-10-02) ──────────────────────────
 * DataFast, Aug 1 – Oct 2: 213 people saw a bar, 3 clicked (1.4%), 10%
 * dismissed (guardrail is 40%). The bar is safe and reaches ~3 people a day,
 * so it is a supplement, not the channel. Spend its few impressions on what a
 * returning learner cannot find on their own: sentences (published 2026-08-29,
 * never announced), then the Tan comic, then the N5 quiz.
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
  {
    id: 'romaji-search-2026-09',
    startsAt: '2026-09-29',
    // Cut from 2026-10-11 to make room for stories-romaji-2026-10: one bar at a
    // time, and this one had already had a week.
    expiresAt: '2026-10-04',
    // Returning visitors are the audience, and search-2026-08 above taught them
    // the opposite: meaning or kana only, because "mizu" found nothing. The
    // /kanji guide said the same. Someone who cannot type kana, and learned
    // not to try, has no other way of finding out that it works now.
    message: 'Search now understands romaji: type mizu to find 水, or paste a word like 日本 to find each kanji.',
    cta: { label: 'Try a search', href: '/kanji' },
    note: 'Corrects search-2026-08 for the people it reached.',
  },
  {
    id: 'sentences-2026-10',
    startsAt: '2026-10-05',
    expiresAt: '2026-10-16',
    // 229 sentences across all 82 N5 kanji (published 2026-08-29), each credited
    // to its Tatoeba author. "N5" stays in the copy: N4–N1 pages have none.
    // The CTA is the list because a dynamic /kanji/<char> is not a route the
    // validator can resolve; every N5 kanji on it opens onto its sentences.
    message: 'Every N5 kanji now has real example sentences, each credited to its author.',
    cta: { label: 'Pick an N5 kanji', href: '/kanji/n5' },
    note: 'First: the biggest shipped-but-unannounced content, and the claim is true on every N5 page.',
  },
  {
    id: 'stories-romaji-2026-10',
    startsAt: '2026-10-19',
    expiresAt: '2026-10-30',
    // Leads with the comic, not the toggle: most of the audience has never heard
    // of /stories, and "romaji for the stories" assumes they have. Only true
    // once the per-panel toggle is live (components/stories/StoryPanel.tsx,
    // deployed 2026-09-30).
    message: "Tan's weekly N5 comic now has romaji under every panel. Use the toggle on any episode.",
    cta: { label: 'Read the latest story', href: '/stories' },
    note: 'Introduces the stories to returning learners, with the romaji toggle as the reason to look now.',
  },
  {
    id: 'n5-quiz-2026-11',
    startsAt: '2026-11-02',
    expiresAt: '2026-11-13',
    // Four choices for every one of the 82 kanji, one right answer each
    // (scripts/validate-quiz.ts). It already drew 97 starts from 27 visitors
    // with no promotion, so this is amplification, not discovery.
    message: 'Test yourself: a free quiz on all 82 N5 kanji, four choices each.',
    cta: { label: 'Take the quiz', href: '/kanji/n5/quiz' },
    note: 'Last: needs the least explaining and already converts without help.',
  },
];
