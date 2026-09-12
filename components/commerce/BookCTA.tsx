import { BookOpen } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import {
  BOOK_CLICK_GOALS,
  BOOK_DESTINATION,
  BOOK_SCROLL_DELAY_MS,
  BOOK_SCROLL_GOALS,
  bookUrlFor,
  hasAmazonListing,
  type BookSurface,
} from '@/lib/commerce/links';
import { cn } from '@/lib/utils';

/**
 * components/commerce/BookCTA.tsx
 *
 * The one place the paid product is offered, in two shapes.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * IT RENDERS NOTHING UNTIL THE BOOK EXISTS
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * `hasAmazonListing()` is false while `AMAZON_BOOK_URL` is empty, and this
 * returns `null`. That is the whole switch: fill in one string in
 * lib/commerce/links.ts on listing day and every surface turns on at once,
 * with no page edits and no deploy-ordering to think about.
 *
 * Because the check runs on the server, an unlisted book costs the visitor
 * nothing — not an empty wrapper, not a hidden node, not a byte.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * A SERVER COMPONENT, AND STILL TRACKED — THIS IS THE POINT
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * KanjiActionBar's own notes explain why the free-pack link next to this one
 * carries no tracking: measuring it "would mean a client boundary on 1,896
 * pages". That reasoning is sound for an `onClick`, and an `onClick` was the
 * only instrument considered. It is not the only one available.
 *
 * DataFast's script installs ONE listener on `document` and resolves
 * `event.target.closest('[data-fast-goal]')`, so a plain server-rendered
 * anchor with a `data-fast-goal` attribute is fully tracked with zero
 * JavaScript of ours, no client boundary, and no hydration. The repo already
 * relies on this: `app/kanji/page.tsx` is a Server Component and fires
 * `kanji_index_click` from an attribute on a `<ul>`.
 *
 * So the paid CTA is measured on all ~1,896 detail pages at a cost of roughly
 * 200 bytes of HTML and 0 bytes of script. `/kanji/<char>` is byte-gated at
 * 260 kB of script against a 228 kB baseline (lighthouserc.js); this does not
 * move that number at all.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * `target="_blank"` IS A MEASUREMENT REQUIREMENT, NOT A PREFERENCE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Verified against the shipped `https://datafa.st/js/script.js` (12 Sep 2026):
 * goals are posted with an ASYNCHRONOUS `XMLHttpRequest`. There is no
 * `sendBeacon` and no `fetch(..., { keepalive: true })` anywhere in that file.
 *
 * An in-flight async XHR is abandoned when the document unloads. A same-tab
 * navigation to Amazon therefore races the very event that is supposed to
 * record it, and loses an unknown, device- and network-dependent share of
 * clicks — the exact failure mode that would make the book look unsellable
 * when it was only unmeasured. Opening in a new tab keeps this document alive,
 * so the request completes.
 *
 * Consequence for the copy: the screen-reader "(opens in a new tab)" here is
 * TRUE, unlike the pack links in this repo, which are same-origin downloads
 * that never navigate.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THE GOAL NAME IS A PROP
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * One book, several surfaces, and a separate goal name per surface — because a
 * click from the print-intent sheets page and a click from a reference lookup
 * are things we would act on separately (see lib/commerce/links.ts). A funnel
 * step matches a goal NAME and ignores properties, so pooling these behind one
 * name with a `source` property would make every per-surface question
 * unanswerable in a funnel.
 *
 * `surface` is a union, not a string, for the reason `EmailSignupSource` is:
 * a misspelt literal invents a series that converts once and never again, and
 * nothing anywhere raises an error.
 */

interface BookCTAProps {
  /** Which placement this is. Picks the goal name and the Attribution tag. */
  surface: BookSurface;
  /**
   * `card` — the full offer block, for a page whose job is finished.
   * `line`  — one subordinate line of text, for a page whose job is the kanji
   *           the reader came for.
   */
  variant: 'card' | 'line';
  className?: string;
}

export function BookCTA({ surface, variant, className }: BookCTAProps) {
  if (!hasAmazonListing()) return null;

  const href = bookUrlFor(surface);
  const goal = BOOK_CLICK_GOALS[surface];

  if (variant === 'line') {
    return (
      <p className={cn('mt-2 text-center text-xs', className)}>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          data-fast-goal={goal}
          data-fast-goal-destination={BOOK_DESTINATION}
          className="rounded-sm font-medium text-japan-mountain-mist underline underline-offset-4 hover:brightness-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Or write in the paperback — all 82 N5 characters, bound
          <span className="sr-only"> on Amazon (opens in a new tab)</span>
        </a>
      </p>
    );
  }

  /* The marker goes on the heading BLOCK — eyebrow plus <h3>, a few lines tall
     — not on the <section>. The observer fires on the first intersecting pixel,
     so a marker on the whole card would fire while the free-pack block above it
     is still filling the screen and would mean "they left the pack CTA". */
  const scrollGoal = BOOK_SCROLL_GOALS[surface];

  return (
    <section className={cn('my-8', className)} aria-labelledby={`book-cta-${surface}`}>
      <div className="rounded-lg border border-border bg-card p-6 md:p-8">
        {/* Both attributes are `undefined` on a surface with no marker, and
            React omits an attribute whose value is undefined — so the wrapper
            stays a plain <div> rather than an empty marker the script would
            observe. */}
        <div
          data-fast-scroll={scrollGoal}
          data-fast-scroll-delay={scrollGoal ? String(BOOK_SCROLL_DELAY_MS) : undefined}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-japan-mountain-mist">
            Paperback · Amazon
          </p>
          <h3
            id={`book-cta-${surface}`}
            className="mb-3 mt-2 text-xl font-bold text-japan-deep-ocean md:text-2xl"
          >
            Prefer a book you can write in?
          </h3>
        </div>
        <p className="mb-5 max-w-2xl text-sm leading-relaxed text-japan-mountain-mist md:text-base">
          <em>N5 Kanji: Stroke Order &amp; Writing Practice</em> gives all 82 N5 characters a
          facing spread each — stroke order and the words that use it on the left, 132 practice
          squares on the right. Printed and bound, so it lies open next to you instead of living
          in a Downloads folder.
        </p>
        {/* `outline`, not the primary fill. The free pack above this keeps the
            primary button: it converts ~20% of the visitors to this page and is
            the site's best cohort, and the paid ask is deliberately the quieter
            of the two. See docs — this makes every book number a LOWER bound,
            on purpose. */}
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          /* `data-fast-goal-destination` reaches DataFast as the `destination`
             property — kebab after the prefix becomes snake. It records which
             store took the click without putting a vendor in the goal name,
             the same split PACK_DESTINATION makes. */
          data-fast-goal={goal}
          data-fast-goal-destination={BOOK_DESTINATION}
          className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'w-full sm:w-auto')}
        >
          <BookOpen aria-hidden />
          See it on Amazon
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </div>
    </section>
  );
}
