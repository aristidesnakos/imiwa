import Link from 'next/link';
import { Search } from 'lucide-react';
import { JLPT_LEVELS, levelHref, type JlptLevel } from '@/lib/levels';

/**
 * The pieces of the homepage search that render on the server: the field's
 * styling, its label and icon, the example queries and the level row.
 * `KanjiLookup` is the island that puts them together.
 *
 * Nothing in this file imports kanji data, so the island can share it.
 */

export const SEARCH_INPUT_ID = 'home-search';
export const SEARCH_PLACEHOLDER = 'mizu, water, みず or 水';

/** Learners type the word they heard, so the examples are romaji first. */
export const EXAMPLE_QUERIES = ['michi', 'mizu', 'yume', 'father', 'kaze'];

export const SEARCH_INPUT =
  'h-14 w-full rounded-2xl border-2 border-japan-sakura-waters bg-card pl-12 pr-4 text-base text-japan-deep-ocean shadow-sm transition-colors placeholder:text-japan-mountain-mist hover:border-japan-mountain-mist focus-visible:border-japan-mountain-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:pr-28 md:h-16 md:text-lg [&::-webkit-search-cancel-button]:hidden';

// Hidden on phones: the keyboard's own search key submits, and the button would
// take a third of a 375px field.
export const SEARCH_BUTTON =
  'absolute right-2 hidden sm:block top-1/2 -translate-y-1/2 rounded-xl bg-japan-deep-ocean px-4 py-2.5 text-sm font-medium text-japan-temple-stone transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:px-5 md:py-3';

export function SearchIcon() {
  return (
    <Search
      aria-hidden="true"
      className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-japan-mountain-mist"
    />
  );
}

export function SearchLabel() {
  return (
    <label htmlFor={SEARCH_INPUT_ID} className="sr-only">
      Search kanji by meaning or reading, in romaji or kana
    </label>
  );
}

export const EXAMPLE_CHIP =
  'rounded-full border border-[color:color-mix(in_srgb,var(--sakura-waters)_45%,var(--temple-stone))] bg-card px-3 py-1 text-sm text-japan-mountain-mist transition-colors hover:border-japan-sakura-waters hover:text-japan-deep-ocean focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

const LEVEL_PILL =
  'inline-flex items-baseline gap-1.5 rounded-full border border-[color:color-mix(in_srgb,var(--sakura-waters)_45%,var(--temple-stone))] bg-card px-3.5 py-1.5 text-sm text-japan-deep-ocean transition-colors hover:border-japan-sakura-waters focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

/**
 * The five levels as one quiet row. `prefetch={false}`: N4-N1 link to /kanji,
 * which would pull the whole dictionary into this page's byte budget.
 */
export function LevelPills({ counts, className = '' }: { counts: Record<JlptLevel, number>; className?: string }) {
  return (
    <nav aria-label="Browse by JLPT level" className={`flex flex-wrap items-center justify-center gap-2 ${className}`}>
      <span className="text-sm text-japan-mountain-mist">Browse by level</span>
      {JLPT_LEVELS.map((level) => (
        <Link key={level} href={levelHref(level)} prefetch={false} className={LEVEL_PILL}>
          <span className="font-semibold">{level}</span>
          <span className="text-xs text-japan-mountain-mist">{counts[level].toLocaleString('en-US')}</span>
        </Link>
      ))}
    </nav>
  );
}
