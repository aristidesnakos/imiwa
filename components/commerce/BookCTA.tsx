import Image from 'next/image';
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
 * THE `band` VARIANT: COPY LEADS, TAN CLOSES
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Under the kanji page's print strip this was, in turn, a plain underlined
 * line and then an accent chip. Both were footnotes — the chip in particular
 * read as a tag on the strip above it rather than as an offer of its own — so
 * it is now a tinted module: headline, one line of substance, one button, and
 * Tan at the trailing edge.
 *
 * ORDER. The copy leads and the mascot closes, bottom-right, like a margin
 * illustration. Leading with Tan cost the block its left edge: the headline
 * started after the mascot while the subtext and button started at the
 * container, so three elements sat on two different left margins. One column
 * for the words fixes that, and the flourish reads as a flourish.
 *
 * COLOUR, MEASURED RATHER THAN EYEBALLED. `--coral-sunset-ink` on a coral tint
 * is 3.99:1, and on the 10% chip this replaces it was 4.32:1 — both under AA,
 * both shipped. The ink stops clearing 4.5:1 as TEXT above roughly a 5% tint.
 * Reversed, as the FILL with temple-stone on it, it is 4.75:1 and passes, and
 * `hover:brightness-90` only deepens it (5.61:1). On the 18% band the headline
 * (deep-ocean) is 9.60:1 and the subtext (mountain-mist) 5.48:1.
 *
 * WIDTH. The button is auto-width from `sm:` up and full-width below it. A
 * full-width button at every size made the subordinate PAID ask wider and
 * louder than the page's primary Print action — a hierarchy inversion that the
 * colour alone (terracotta against Print's deep-ocean) already avoids without
 * it. Full-width on a phone is still right: there it is the tap target, not a
 * competitor, and the column is too narrow for anything else to sit beside it.
 *
 * THE POSE. `tan-brush` — Tan holding a writing brush — because the product is
 * a book you write in. It is one of the two mascot files with a genuinely
 * transparent background (see ExampleSentencesSection, which alternates the
 * same two on sentence cards); the others carry a baked-in vignette that would
 * show as a rectangle against the band.
 *
 * BYTES. `width={128}` is not the display size (64px, 80px from `sm:` up) —
 * it is what makes `next/image` request `w=256`, the 2× derivative, which is
 * ALSO the URL the sentence cards ask for at their own size. Same URL, one
 * file, so a page carrying both pays for the mascot once. Measured off the dev
 * server: 8.3 kB as AVIF, 14.2 kB as WebP, 29 kB if a browser takes neither.
 * `/kanji/<char>` is gated at 440 kB of total transfer against a 363 kB
 * baseline (lighthouserc.js), and the image is below the fold, so next/image's
 * default lazy loading means a visit that does not scroll never fetches it.
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
   * `band` — a tinted module for a page whose job is the kanji the reader came
   *          for: copy leads, Tan closes. See the note above.
   */
  variant: 'card' | 'band';
  className?: string;
}

export function BookCTA({ surface, variant, className }: BookCTAProps) {
  if (!hasAmazonListing()) return null;

  const href = bookUrlFor(surface);
  const goal = BOOK_CLICK_GOALS[surface];

  if (variant === 'band') {
    return (
      <div
        className={cn(
          /* The 18% tint is written with `color-mix`, not an opacity suffix on
             the coral token: a `/18` on one of these tokens compiles to NOTHING,
             because the token is a bare hex custom property and Tailwind has no
             channel values to fold the alpha into (CLAUDE.md, "Design tokens").
             Silent — no error, no warning, just an unstyled div. (Writing the
             suffixed class here even as an example is what `pnpm
             validate:palette` greps for; it does not read comments.) */
          'mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 rounded-lg bg-[color-mix(in_srgb,var(--coral-sunset)_18%,var(--temple-stone))] p-5 sm:gap-x-5',
          className,
        )}
      >
        {/* A two-column grid rather than a plain [copy | mascot] row, because the
            two widths want different things and a grid can give them different
            things without a second copy of the markup.

            On a phone the copy spans BOTH columns and only the button shares a
            row with Tan. A mascot column that runs the full height would reserve
            its width against the headline and the subtext too — space that is
            empty beside them, since Tan is bottom-aligned and 64px tall in a
            block twice that. At 375px that cost the copy 80 of its 271 usable
            pixels and pushed the subtext to three lines.

            From `sm:` up the copy takes column one and Tan spans both rows
            instead, adding no height of its own: the button goes back to sitting
            directly under the line it follows rather than dropping 44px to meet
            an 80px mascot.

            `minmax(0,1fr)` and not `1fr`: a grid track's automatic minimum is
            its content, so a long unbreakable string would push the column past
            the viewport instead of wrapping — the grid's version of the
            `min-w-0` a flex child needs. */}
        <div className="col-start-1 col-end-3 row-start-1 sm:col-end-2">
          <p className="text-base font-semibold text-japan-deep-ocean">
            Prefer to write it in a real book?
          </p>
          <p className="mt-1 text-sm leading-relaxed text-japan-mountain-mist">
            All 82 N5 characters, bound — stroke order and practice squares, facing pages.
          </p>
        </div>

        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          data-fast-goal={goal}
          data-fast-goal-destination={BOOK_DESTINATION}
          className={cn(
            buttonVariants({ size: 'default' }),
            /* `hover:bg-japan-coral-sunset-ink` is not redundant with the resting
               fill. `buttonVariants`' default variant carries its own hover
               background (mountain mist), and tailwind-merge only drops a class
               that CONFLICTS with a later one: `hover:brightness-90` is a filter,
               not a background, so without an explicit hover background of our
               own the button would repaint itself blue the moment the pointer
               touched it. Naming the same colour again is what removes the
               inherited hover.

               And it is `brightness-90`, not `/90`: an alpha hover composites
               against the coral band behind the button, which LIGHTENS the
               terracotta and drops its text below the 4.75:1 it passes at. A
               filter darkens regardless of what is behind it (5.61:1).

               `justify-self-start` keeps `sm:w-auto` meaningful: a grid item
               stretches to its track by default, which would silently restore
               the full-width button this layout exists to avoid. */
            'col-start-1 row-start-2 mt-4 w-full justify-self-start self-end bg-japan-coral-sunset-ink text-japan-temple-stone shadow-sm hover:bg-japan-coral-sunset-ink hover:brightness-90 sm:w-auto',
          )}
        >
          <BookOpen aria-hidden />
          See it on Amazon
          <span className="sr-only"> (opens in a new tab)</span>
        </a>

        {/* Decorative, and declared so twice — empty `alt` for the accessibility
            tree, `aria-hidden` for the handful of screen readers that still
            announce a presentational image's filename. It carries no information
            the copy beside it does not already carry.

            `self-end` is the whole idea of this layout: Tan sits on the band's
            bottom edge, level with the button, like an illustration in a margin
            rather than an icon introducing the text. The row placement is what
            keeps that from ADDING height on desktop — see the grid note
            above. */}
        <Image
          src="/assets/tan-brush.png"
          alt=""
          aria-hidden="true"
          width={128}
          height={128}
          className="col-start-2 row-start-2 mt-4 h-16 w-16 self-end sm:row-start-1 sm:row-end-3 sm:h-20 sm:w-20"
        />
      </div>
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
