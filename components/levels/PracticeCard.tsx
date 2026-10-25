/**
 * components/levels/PracticeCard.tsx
 *
 * The bold card for a free way to practise the kanji a reader has just met: the quiz
 * (N5QuizCard) and the game (PlayCard), and, with `external`, the partner's yen converter
 * (YenConverterSection). It is the shell of BookCTA's `nextStep` card, on
 * purpose: tile, a small-caps eyebrow, a bold heading, one sentence and a filled button.
 * Those two links used to be one 14px line each at the foot of a kanji page, and a line
 * that quiet is not seen, so it is not clicked.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT IS THE SAME AS THE BOOK CARD, AND WHAT IS NOT
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Same: the grid (a tile column, then the words; on a phone the tile shares a row with
 * the heading only and the sentence and button take the full width beneath), the padding,
 * the type scale, and the full-width button on a phone.
 *
 * Different: the button is the primary deep-ocean fill, not the book's terracotta. The
 * terracotta is the paid ask, and a page that carries both should say which is which at a
 * glance. The tile is 8rem, not the cover's 10rem: the game's tile is a 128px asset, so
 * this is its native size. And the whole card is the click target: the button's `::after`
 * is stretched over the card, so a tap anywhere on it follows the link, while the button
 * stays the one accessible link (a second link to the same place would be a duplicate stop
 * for keyboard and screen-reader users).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT IT COSTS
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * A Server Component with no client boundary, so nothing to hydrate on /kanji/% pages,
 * which are gated on total transfer. The only bytes beyond the HTML are the caller's
 * tile: the quiz's is CSS and text, the game's is a 4 kB PNG that sits below the fold
 * and lazy-loads. No goal is attached here: see the note in PlayCard.
 */

import type { ReactNode } from 'react';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PracticeCardProps {
  /** The heading's id, unique on the page; the section is named by it. */
  id: string;
  /**
   * `href` leaves the site: a plain anchor that opens a new tab, with `noopener` and
   * deliberately not `noreferrer`, because the owner of the page it points at asked to see
   * michikanji.com as the source of the visit (YenConverterSection). The default is an
   * internal `<Link>` with prefetch off.
   */
  external?: boolean;
  /** Small capitals above the heading, e.g. "Free quiz". Keep it under ~16 characters: it wraps beside the tile on a phone. */
  eyebrow: string;
  heading: string;
  href: string;
  /** The button's words. */
  cta: string;
  /** Leading icon in the button. */
  icon: ReactNode;
  /** The picture in the first column. It must fill a square and be decorative. */
  tile: ReactNode;
  className?: string;
  /** The one sentence. */
  children: ReactNode;
}

export function PracticeCard({
  id,
  external = false,
  eyebrow,
  heading,
  href,
  cta,
  icon,
  tile,
  className,
  children,
}: PracticeCardProps) {
  const buttonClass = cn(
    buttonVariants({ size: 'lg' }),
    'mt-5 w-full after:absolute after:inset-0 after:content-[""] group-hover:bg-japan-mountain-mist sm:mt-auto sm:w-auto sm:self-start',
  );

  return (
    <section className={className} aria-labelledby={id}>
      <div className="group relative grid grid-cols-[5.5rem_minmax(0,1fr)] gap-x-4 gap-y-4 rounded-lg border border-border bg-card p-6 transition-colors hover:border-japan-sakura-waters sm:grid-cols-[8rem_minmax(0,1fr)] sm:grid-rows-[auto_1fr] sm:gap-x-8 sm:gap-y-2 md:p-8">
        <div aria-hidden="true" className="col-start-1 row-start-1 self-start sm:row-end-3">
          {tile}
        </div>

        <div className="col-start-2 row-start-1 self-center sm:self-start">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-japan-mountain-mist">{eyebrow}</p>
          <h2 id={id} className="mt-2 text-xl font-bold text-japan-deep-ocean md:text-2xl">
            {heading}
          </h2>
        </div>

        <div className="col-span-2 row-start-2 flex flex-col sm:col-span-1 sm:col-start-2">
          <p className="max-w-xl text-sm leading-relaxed text-japan-mountain-mist md:text-base">{children}</p>

          {/* `prefetch={false}`: this renders on 82 kanji pages and points at a client-heavy
              route whose payload a prefetch would add to each page's own byte budget
              (CLAUDE.md, "Performance budgets"). `group-hover` repeats the button's own hover
              so it reacts when the pointer is anywhere on the card, since all of it is the link. */}
          {external ? (
            <a href={href} target="_blank" rel="noopener" className={buttonClass}>
              {icon}
              {cta}
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          ) : (
            <Link href={href} prefetch={false} className={buttonClass}>
              {icon}
              {cta}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
