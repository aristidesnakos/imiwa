/**
 * lib/levels/index.ts
 *
 * The JLPT levels as the site's navigation knows them: which ones have a list
 * page of their own, and where a link to "this level" should go.
 *
 * Every surface that links to a level — the homepage cards, the /kanji level
 * filter, the badge and breadcrumb on a character page, the sitemap — asks here
 * instead of building the URL itself. That is what makes giving another level
 * its page a one-line change rather than a hunt through five files.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY ONLY N5 HAS A PAGE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * docs/3rdVersion/level-pages-and-zero-click-review.md §3 found the N4–N1 lists
 * incomplete against the standard sets (N2 is short by ~216 characters, N1 by
 * ~93) and their sourcing an open decision for the owner. A page whose whole
 * point is the list would put those gaps in its headline. N5 is complete.
 *
 * Until the rest are settled, a link to N4–N1 lands on /kanji filtered to that
 * level: a working destination, where it used to be an anchor inside a closed
 * <details> element that left the visitor mid-grid on the wrong level.
 *
 * Client-safe on purpose: nothing here imports kanji data, so the homepage and
 * the /kanji client bundle can use it for a few hundred bytes.
 */

export const JLPT_LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'] as const;

export type JlptLevel = (typeof JLPT_LEVELS)[number];

export function isJlptLevel(value: unknown): value is JlptLevel {
  return typeof value === 'string' && (JLPT_LEVELS as readonly string[]).includes(value);
}

/**
 * Parse an untrusted level string — a query parameter, a hash — into a level.
 * Case-insensitive, because `?level=n5` is what a person types.
 */
export function parseJlptLevel(value: string | null | undefined): JlptLevel | null {
  if (!value) return null;
  const upper = value.trim().toUpperCase();
  return isJlptLevel(upper) ? upper : null;
}

/** One spelling of each level's label, everywhere it appears. */
export const LEVEL_LABELS: Record<JlptLevel, string> = {
  N5: 'Beginner',
  N4: 'Elementary',
  N3: 'Intermediate',
  N2: 'Upper-intermediate',
  N1: 'Advanced',
};

/**
 * Levels with a list page at `/kanji/<level>`.
 *
 * Adding one means adding it here AND creating `app/kanji/<level>/page.tsx`
 * (a static folder: a dynamic `[level]` segment cannot sit beside
 * `[character]`). The sitemap, homepage, /kanji filter and every character
 * page's breadcrumb pick it up from here.
 */
const LEVELS_WITH_PAGES: readonly JlptLevel[] = ['N5'];

/** Case-insensitive: `hasLevelPage('n5')` and `hasLevelPage('N5')` agree. */
export function hasLevelPage(level: string): boolean {
  const parsed = parseJlptLevel(level);
  return parsed !== null && LEVELS_WITH_PAGES.includes(parsed);
}

/** `/kanji/n5` — the level's list page, or `null` if it has none yet. */
export function levelPagePath(level: string): string | null {
  const parsed = parseJlptLevel(level);
  return parsed !== null && LEVELS_WITH_PAGES.includes(parsed) ? `/kanji/${parsed.toLowerCase()}` : null;
}

/** The /kanji hub filtered to one level. Valid for every level. */
export function levelFilterHref(level: JlptLevel): string {
  return `/kanji?level=${level}`;
}

/**
 * Where a link to this level should go: its list page if it has one, otherwise
 * the hub filtered to it. Falls back to the unfiltered hub for anything that is
 * not a level at all.
 */
export function levelHref(level: string): string {
  const parsed = parseJlptLevel(level);
  if (parsed === null) return '/kanji';
  return levelPagePath(parsed) ?? levelFilterHref(parsed);
}

/** Every level page that exists, for the sitemap and anything else enumerating them. */
export function levelPages(): { level: JlptLevel; path: string }[] {
  return LEVELS_WITH_PAGES.map((level) => ({ level, path: `/kanji/${level.toLowerCase()}` }));
}
