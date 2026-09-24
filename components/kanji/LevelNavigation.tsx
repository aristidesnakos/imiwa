/**
 * components/kanji/LevelNavigation.tsx
 *
 * The characters either side of this one in its JLPT level, with the way back
 * to the whole level between them:
 *
 *     ‹ 火 fire            All 82 N5 kanji            木 tree ›
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY IT EXISTS
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * A learner working through N5 used to finish 水 and have nowhere to go but
 * back: the related-kanji grid is chosen by meaning, not by level, and the
 * level itself was a label. This strip is the next step for that learner, and
 * because every page links its neighbours, it is also a chain through each
 * level for a crawler that would otherwise reach most of these pages only
 * from the /kanji index.
 *
 * ORDER is the level's list order: the order of lib/constants/n{level}-kanji.ts,
 * which for N5 is the teaching sequence in lib/levels/n5-sequence.ts. The page
 * resolves the level (lowest list wins) and builds the lookup; this file only
 * says what a neighbour is and how one renders.
 *
 * THE ENDS DO NOT WRAP. The first character has no previous link and the last
 * has no next. Wrapping 刀 back round to 日 would tell someone who has just
 * finished the level that there is more of it, and the middle link already
 * goes back to the start. Every character still gets an inbound link from
 * this strip, from whichever neighbour it has.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT IT COSTS
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * A Server Component with no client boundary: three links, nothing to hydrate,
 * on a template gated at 260 kB of script. `prefetch={false}` on every link,
 * because Next prefetches each <Link> that scrolls into view and the byte
 * budget counts those requests. A learner reading to the bottom of the page
 * would otherwise pay for three RSC payloads they mostly never use.
 *
 * No heading, like KanjiActionBar: a pager reads as one line, and an <h2> just
 * to hang a name on it would put a pager in the page's outline. The <nav> is
 * named with aria-label instead, distinct from the breadcrumb's.
 *
 * The middle column is centred because it is a pager's middle, not because it
 * is a moment. Centring on this page is otherwise reserved for those.
 */

import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { levelHref, type JlptLevel } from '@/lib/levels';
import { getPrimaryMeaning } from '@/lib/seo/kanji-optimization';
import { SECTION_BAND } from '@/components/kanji/section';
import type { KanjiData } from '@/lib/constants/kanji-types';
import { cn } from '@/lib/utils';

export interface LevelNeighbours {
  previous: KanjiData | null;
  next: KanjiData | null;
  /** The level's size, for "All 82 N5 kanji". */
  total: number;
}

/**
 * Every character's neighbours within one level list, keyed by character.
 *
 * Call it once per list at module scope, never per render: the page module
 * prerenders ~1,900 characters, and a `findIndex` over N1's 1,007 entries for
 * each of them is quadratic work that hides inside a build.
 */
export function neighboursWithin(list: readonly KanjiData[]): ReadonlyMap<string, LevelNeighbours> {
  return new Map(
    list.map((entry, i) => [
      entry.kanji,
      {
        previous: i > 0 ? list[i - 1] : null,
        next: i < list.length - 1 ? list[i + 1] : null,
        total: list.length,
      },
    ]),
  );
}

// Shared by all three links. The ring is spelled out because none of them goes
// through buttonVariants, which is where the site's rings otherwise come from.
const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

function NeighbourLink({
  entry,
  direction,
  level,
}: {
  entry: KanjiData;
  direction: 'previous' | 'next';
  level: JlptLevel;
}) {
  const meaning = getPrimaryMeaning(entry.meaning);
  const isNext = direction === 'next';
  const Chevron = isNext ? ChevronRight : ChevronLeft;

  return (
    <Link
      href={`/kanji/${encodeURIComponent(entry.kanji)}`}
      prefetch={false}
      className={cn(
        // A tint rather than an alpha: an opacity modifier on a japan-* token
        // compiles to nothing (CLAUDE.md, "Design tokens").
        'group inline-flex min-w-0 max-w-full items-center gap-2 rounded-lg p-2 transition-colors hover:bg-[color-mix(in_srgb,var(--sakura-waters)_15%,var(--temple-stone))]',
        FOCUS_RING,
        isNext && 'text-right',
      )}
    >
      {!isNext && <Chevron aria-hidden className="h-5 w-5 shrink-0 text-japan-mountain-mist" />}
      <span className="min-w-0">
        <span lang="ja" className="block text-3xl leading-tight text-japan-ink-black group-hover:text-japan-deep-ocean">
          {entry.kanji}
        </span>{' '}
        {/* Truncated, not wrapped: N1 carries primary meanings of up to 100
            characters, and a phone gives each side about a third of 311px.
            A few N1 entries have no meaning at all and show the character
            alone. */}
        {meaning && <span className="block truncate text-sm text-japan-mountain-mist">{meaning}</span>}
        {/* The chevron gives the direction to the eye; this gives it to
            everyone else. After the visible text, so the accessible name
            starts with what is on screen and a voice user can say it:
            "火 fire, previous N5 kanji". */}
        <span className="sr-only">
          , {direction} {level} kanji
        </span>
      </span>
      {isNext && <Chevron aria-hidden className="h-5 w-5 shrink-0 text-japan-mountain-mist" />}
    </Link>
  );
}

interface Props {
  level: JlptLevel;
  neighbours: LevelNeighbours;
}

export function LevelNavigation({ level, neighbours }: Props) {
  const { previous, next, total } = neighbours;

  return (
    <nav aria-label={`JLPT ${level} kanji, in list order`} className={SECTION_BAND}>
      {/* Explicit columns, so a missing end leaves its cell empty instead of
          sliding the level link into it. minmax(0,1fr) lets the sides shrink
          below their content, which is what makes the truncation work. */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 sm:gap-6">
        {previous && (
          <div className="col-start-1 row-start-1 min-w-0">
            <NeighbourLink entry={previous} direction="previous" level={level} />
          </div>
        )}

        <Link
          href={levelHref(level)}
          prefetch={false}
          className={cn(
            'col-start-2 row-start-1 rounded-sm px-1 py-2 text-center text-sm font-medium text-japan-deep-ocean underline underline-offset-4 transition-colors hover:text-japan-mountain-mist',
            FOCUS_RING,
          )}
        >
          All {total.toLocaleString('en-US')} {level} kanji
        </Link>

        {next && (
          <div className="col-start-3 row-start-1 flex min-w-0 justify-end">
            <NeighbourLink entry={next} direction="next" level={level} />
          </div>
        )}
      </div>
    </nav>
  );
}
