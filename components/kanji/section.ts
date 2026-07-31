/**
 * components/kanji/section.ts
 *
 * One rhythm for the kanji page's major sections, in one place.
 *
 * The page is assembled from four files — the route itself plus the action bar,
 * example sentences and related kanji — and before this each invented its own
 * spacing. Only `RelatedKanjiSection` had a top rule, so a new section landing
 * between the columns and it (which is exactly where example sentences go) butted
 * straight against whatever preceded it with nothing marking the boundary.
 *
 * Sections are peers and look it. What separates them is the rule and the space,
 * never the heading size — so a new band can be dropped in anywhere in the order
 * without renegotiating type scale with its neighbours.
 */

/**
 * Wrapper for a top-level section: hairline rule, then breathing room.
 *
 * Sections whose body is a bordered card (`KanjiActionBar`, `AdBanner`) skip
 * this and take the margin alone — the card's own border already draws the
 * boundary, and a hairline directly above a bordered box is two separators
 * doing one job.
 */
export const SECTION_BAND = 'mt-12 border-t border-gray-200 pt-8';

/**
 * Every section's <h2>. Uniform by design: the five headings on this page —
 * how to write it, meaning and readings, practice it on paper, example
 * sentences, related kanji — are genuinely peers, and each is phrased as
 * something a person would search rather than as a label for the widget
 * underneath it.
 *
 * Size stays constant even where the treatment differs. The practice section is
 * a centred card and the rest are left-aligned prose, but that expresses "action
 * vs content", not rank, so the type scale must not also move.
 */
export const SECTION_HEADING = 'text-2xl font-semibold';
