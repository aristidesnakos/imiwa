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
 *
 * A surface may have no click goal at all (`jlptFormat`: its page spends its
 * one goal on finishing a quiz set). Then the anchor carries neither
 * `data-fast-goal` nor its property, and the click still reaches DataFast's
 * exit-click report as an outbound link.
 */

/**
 * The card's design, for the sequential test on the N5 sheets page (Oct 2026).
 *
 * Baseline, 7 Sep – 6 Oct 2026: 422 landed, 160 saw the card (38%), 6 clicked
 * (3.8% of those who saw it, 1.4% of all who landed). That is ~6 clicks a month,
 * far too few to split traffic: telling 3.8% from 7.5% needs ~600 viewers per
 * arm, seven months at this volume. So the designs run one at a time, four weeks
 * each, and are compared on clicks per LANDED visitor — the one rate that stays
 * comparable when a design also moves where the offer sits.
 *
 *   `current`  — what shipped: text only, outline button.
 *   `cover`    — the same words beside the real cover. Tests: does seeing the
 *                object help.
 *   `nextStep` — cover, a heading that answers the free pack directly above it
 *                (what the book has that 82 printed pages do not), one sentence
 *                and a filled button. Trimmed 7 Oct 2026, the day it shipped:
 *                the paragraph and the 82 / 132 / 14 number row are gone.
 *
 * Every fact in the copy is printed on the cover or the listing: 82 characters,
 * 132 squares each, a 14-week plan, 198 pages. Change the book, re-check these.
 */
export type BookCardDesign = 'current' | 'cover' | 'nextStep';

interface BookCTAProps {
  /** Which placement this is. Picks the goal name, if it has one, and the Attribution tag. */
  surface: BookSurface;
  /**
   * `card`   — the full offer block, for a page whose job is finished.
   * `band`   — a tinted module for a page whose job is the kanji the reader came
   *            for: copy leads, Tan closes. See the note above.
   * `inline` — one line with a thumbnail, for slotting under another offer's
   *            button (the free pack's). See BookInline.
   */
  variant: 'card' | 'band' | 'inline';
  /** `card` only. */
  design?: BookCardDesign;
  /**
   * `card` with a cover design only. 2 where the card is a section of the page
   * in its own right (a kanji page, a story) rather than part of a larger block,
   * so it does not land in the outline as a subsection of whatever precedes it.
   */
  headingLevel?: 2 | 3;
  className?: string;
}

/** The cover, served from this origin: an Amazon image URL is not ours to keep stable. */
const COVER = {
  src: '/assets/book-cover-n5.jpg',
  width: 600,
  height: 776,
  alt: 'Cover of N5 Kanji: Stroke Order & Writing Practice, with Tan the tanuki holding a brush',
} as const;

/**
 * The `nextStep` card's opening, by surface.
 *
 * The default answers the free pack's download button directly above it ("Rather
 * not print 82 pages?"), which is true on the N5 sheets page, the N5 list and a
 * kanji page's print strip. A story or a quiz result has no pack above it, so
 * that question would answer nothing; those surfaces open on what the reader
 * just did instead. Both claims hold: a story uses only N5 kanji
 * (`validate:stories` asserts it) and the book covers all 82.
 *
 * Each lede is finished by NEXT_STEP_DETAIL, the card's one sentence. It carries
 * the cover's numbers (132 squares, 14 weeks) in words: the big-number row that
 * used to repeat them, and a paragraph describing the spread, were cut on
 * 2026-10-07 as text the cover beside them already shows.
 */
const NEXT_STEP_OPENINGS: Partial<Record<BookSurface, { heading: string; lede: string }>> = {
  storyEpisode: {
    heading: 'Learn to write the kanji in this story',
    lede: 'Every one of them is in the workbook',
  },
  n5Quiz: { heading: 'Now learn to write them', lede: 'All 82 N5 kanji in one workbook' },
  jlptFormat: { heading: 'Now learn to write them', lede: 'All 82 N5 kanji in one workbook' },
};
const NEXT_STEP_DEFAULT = {
  heading: 'Rather not print 82 pages?',
  lede: 'Get them in one bound workbook',
} as const;
const NEXT_STEP_DETAIL = 'with stroke order, 132 practice squares each and a 14-week plan';

export function BookCTA({
  surface,
  variant,
  design = 'current',
  headingLevel = 3,
  className,
}: BookCTAProps) {
  if (!hasAmazonListing()) return null;

  const href = bookUrlFor(surface);
  const goal = BOOK_CLICK_GOALS[surface];
  // A property with no goal to ride on is noise; React omits an undefined attribute.
  const destination = goal ? BOOK_DESTINATION : undefined;

  if (variant === 'inline') {
    return (
      <BookInline
        href={href}
        goal={goal}
        destination={destination}
        scrollGoal={BOOK_SCROLL_GOALS[surface]}
        className={className}
      />
    );
  }

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
          data-fast-goal-destination={destination}
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

  if (design !== 'current') {
    return (
      <BookCoverCard
        surface={surface}
        design={design}
        headingLevel={headingLevel}
        href={href}
        goal={goal}
        destination={destination}
        scrollGoal={scrollGoal}
        className={className}
      />
    );
  }

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
          data-fast-goal-destination={destination}
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

interface BookLinkProps {
  href: string;
  goal: string | undefined;
  destination: string | undefined;
  scrollGoal: string | undefined;
  className?: string;
}

/**
 * The `cover` and `nextStep` cards: the `current` card with the book beside it.
 *
 * THE COVER IS A LINK TOO, AND OUT OF THE TAB ORDER. People click a product's
 * picture, so it carries the same goal as the button. A second focusable link to
 * the same place would be a duplicate stop for keyboard and screen-reader users,
 * so it is `tabIndex={-1}` and `aria-hidden`; the button is the accessible one.
 *
 * BYTES. 600px JPEG source, shown at 88px on a phone and 160px from `sm:` up, so
 * `next/image` serves a ~2x AVIF of a few kB. It sits below the grid and the
 * free pack, so the default lazy loading means a visit that never scrolls this
 * far never fetches it, and it carries no script.
 *
 * LAYOUT. Two columns at every width. On a phone the cover shares a row with the
 * heading only, and the copy and button take the full width beneath, so the
 * thumbnail never squeezes the paragraph. From `sm:` up the cover spans both
 * rows and sets the card's height: the second row is `1fr`, so it takes what
 * the cover leaves below the heading, and the button's `mt-auto` puts it level
 * with the cover's bottom edge. Copy too long for the cover just grows the card.
 */
function BookCoverCard({
  surface,
  design,
  headingLevel,
  href,
  goal,
  destination,
  scrollGoal,
  className,
}: BookLinkProps & {
  surface: BookSurface;
  design: Exclude<BookCardDesign, 'current'>;
  headingLevel: 2 | 3;
}) {
  const nextStep = design === 'nextStep';
  const opening = NEXT_STEP_OPENINGS[surface] ?? NEXT_STEP_DEFAULT;
  const Heading = headingLevel === 2 ? 'h2' : 'h3';

  return (
    <section className={cn('my-8', className)} aria-labelledby={`book-cta-${surface}`}>
      <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-x-4 gap-y-4 rounded-lg border border-border bg-card p-6 sm:grid-cols-[10rem_minmax(0,1fr)] sm:grid-rows-[auto_1fr] sm:gap-x-8 sm:gap-y-2 md:p-8">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          tabIndex={-1}
          aria-hidden="true"
          data-fast-goal={goal}
          data-fast-goal-destination={destination}
          className="col-start-1 row-start-1 self-start sm:row-end-3"
        >
          <Image
            src={COVER.src}
            alt=""
            width={COVER.width}
            height={COVER.height}
            sizes="(min-width: 640px) 160px, 88px"
            className="h-auto w-full rounded-sm shadow-md ring-1 ring-border transition-transform duration-200 hover:-translate-y-0.5"
          />
        </a>

        {/* The scroll marker stays on the heading block, as on the `current`
            card, so "saw the book offer" means the same thing across designs. */}
        <div
          className="col-start-2 row-start-1 self-center sm:self-start"
          data-fast-scroll={scrollGoal}
          data-fast-scroll-delay={scrollGoal ? String(BOOK_SCROLL_DELAY_MS) : undefined}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-japan-mountain-mist">
            {nextStep ? 'Paperback · 198 pages' : 'Paperback · Amazon'}
          </p>
          <Heading
            id={`book-cta-${surface}`}
            className="mt-2 text-xl font-bold text-japan-deep-ocean md:text-2xl"
          >
            {nextStep ? opening.heading : 'Prefer a book you can write in?'}
          </Heading>
        </div>

        <div className="col-span-2 row-start-2 flex flex-col sm:col-span-1 sm:col-start-2">
          {nextStep ? (
            <p className="max-w-xl text-sm leading-relaxed text-japan-mountain-mist md:text-base">
              {opening.lede}, {NEXT_STEP_DETAIL}.
            </p>
          ) : (
            <p className="max-w-2xl text-sm leading-relaxed text-japan-mountain-mist md:text-base">
              <em>N5 Kanji: Stroke Order &amp; Writing Practice</em> gives all 82 N5 characters a
              facing spread each — stroke order and the words that use it on the left, 132
              practice squares on the right. Printed and bound, so it lies open next to you
              instead of living in a Downloads folder.
            </p>
          )}

          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            data-fast-goal={goal}
            data-fast-goal-destination={destination}
            className={cn(
              nextStep
                ? /* The filled terracotta of the `band` variant, and its explicit hover
                     background for the same reason — see the note there. */
                  cn(
                    buttonVariants({ size: 'lg' }),
                    'bg-japan-coral-sunset-ink text-japan-temple-stone shadow-sm hover:bg-japan-coral-sunset-ink hover:brightness-90',
                  )
                : buttonVariants({ variant: 'outline', size: 'lg' }),
              'mt-5 w-full sm:mt-auto sm:w-auto sm:self-start',
            )}
          >
            <BookOpen aria-hidden />
            {nextStep ? 'See the book on Amazon' : 'See it on Amazon'}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </div>
      </div>
    </section>
  );
}

/**
 * The `inline` variant: one line under the free pack's button, so the book is
 * seen by everyone who sees the pack, which sits a full card higher than the
 * book card it replaces (only 38% of visitors reach that card). Deliberately a text link, not a
 * button: it must not compete with the pack's download, the page's best
 * conversion.
 */
function BookInline({ href, goal, destination, scrollGoal, className }: BookLinkProps) {
  return (
    <div
      className={cn('flex items-center gap-3 border-t border-border pt-4', className)}
      data-fast-scroll={scrollGoal}
      data-fast-scroll-delay={scrollGoal ? String(BOOK_SCROLL_DELAY_MS) : undefined}
    >
      <Image
        src={COVER.src}
        alt=""
        aria-hidden="true"
        width={COVER.width}
        height={COVER.height}
        sizes="48px"
        className="h-auto w-12 shrink-0 rounded-sm shadow-sm ring-1 ring-border"
      />
      <p className="text-sm leading-relaxed text-japan-mountain-mist">
        Rather not print 82 pages?{' '}
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          data-fast-goal={goal}
          data-fast-goal-destination={destination}
          className="rounded-sm font-semibold text-japan-deep-ocean underline underline-offset-4 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Get them bound in one workbook
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
        : 198 pages, with a 14-week plan.
      </p>
    </div>
  );
}
