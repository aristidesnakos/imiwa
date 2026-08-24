/**
 * components/kanji/KanjiActionBar.tsx
 *
 * The kanji page's third tier: things you DO with this character, as distinct
 * from things the page TELLS you about it.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS EXISTS AS ITS OWN BAND
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The page previously had exactly two tiers — a centred identity hero and
 * full-width content sections — so the practice-sheet link had nowhere to live
 * and was appended to the stroke-order column on the reasoning "sheet ≈ writing
 * ≈ strokes". A practice sheet is not part of the stroke-order explanation; it
 * is something you take away. The placement showed: on desktop the link floated
 * alone in the empty bottom half of a two-column row, and on mobile it wedged
 * between the animation's caption and the next section's heading.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY A CARD, AND WHY CENTRED
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Moving the link into its own band fixed the structure but not the weight: a
 * small outline button trailing a line of grey text still read as a footnote to
 * the section above, and a printable sheet per character is one of the few
 * things here that hands the reader an artefact. It should not be missable.
 *
 * So it is a self-contained card — the same shape as the sentence pairs, which
 * is the page's established vocabulary for "a discrete object, not prose".
 * Centring happens INSIDE the card, whose own edges sit on the same
 * left spine as every other section, so the page keeps one spine while the offer
 * still reads as an offer.
 *
 * No rule above it, unlike the other bands: the card's border already draws the
 * boundary, and stacking a hairline directly above a bordered box is two
 * separators doing one job.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE PACK LINE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Under the button, on N5 pages only, sits one text link to the free N5 pack.
 * It belongs here and not with the mascot at the end of the page because it is
 * the same artefact class as the button above it — printable sheets for this
 * character, then printable sheets for all of them — and it is subordinate to
 * that button in weight for the same reason: the reader came for THIS kanji.
 *
 * It is text, not a second button. Two buttons in one card is a choice, and a
 * choice is slower than an action.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT DOES *NOT* BELONG HERE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * "Review what you've learned" — it is an action about LEAVING this page, not
 * an action on this character, and it stays with the mascot at the end of the
 * content where a reader has finished and is deciding what to do next. Mixing
 * the two is how the print link ended up homeless in the first place.
 *
 * A Server Component: every action here is a plain link, so there is nothing to
 * hydrate, and the kanji template already carries LCP debt gated in
 * lighthouserc.js.
 */

import { Printer } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { SECTION_HEADING } from '@/components/kanji/section';
import { cn } from '@/lib/utils';

interface Props {
  kanji: string;
  /**
   * JLPT level of this character. Only N5 gets the pack line below the print
   * button, because N5 is the only level the pack actually covers — see the
   * "THE PACK LINE" note above.
   */
  level: string;
}

export function KanjiActionBar({ kanji, level }: Props) {
  return (
    <section className="mt-12" aria-labelledby="practice-heading">
      <div className="rounded-xl border border-gray-200 bg-white px-5 py-10 text-center sm:px-6">
        <span
          aria-hidden
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-50 text-gray-700"
        >
          <Printer className="h-6 w-6" />
        </span>

        <h2 id="practice-heading" className={`${SECTION_HEADING} mt-5`}>
          Practice <span lang="ja">{kanji}</span> on paper
        </h2>

        <p className="mx-auto mt-3 max-w-md text-gray-600">
          A printable grid for tracing <span lang="ja">{kanji}</span> by hand, with its
          readings and a stroke order reference above the squares.
        </p>

        {/* A sheet is generated per character, so one exists for every kanji that
            has a page. A plain <a>, not <Link>: the target is an API route
            returning HTML, which client navigation cannot render.
            `w-full sm:w-auto` because the base button class sets whitespace-nowrap:
            at 320px the label plus lg's px-8 is wider than the card's inner width,
            and a nowrap button overflows rather than wrapping.

            The focus ring is inherited, not overridden. It briefly was not: the
            shared --ring token was #7BB3D3, 2.3:1 against this white card and
            under the WCAG 1.4.11 floor, so this link carried a local fix. The
            token is correct now (app/globals.css) and the local override would
            only mask the next regression. */}
        <a
          href={`/api/kanji-sheets?character=${encodeURIComponent(kanji)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ size: 'lg' }), 'mt-6 w-full sm:w-auto')}
        >
          <Printer aria-hidden />
          Print a practice sheet
          {/* The icon reads as "print", not "new tab", and the house convention
              elsewhere (Footer) is an ExternalLink glyph we cannot use here
              without muddling that meaning. */}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>

        {/* One sheet is the thing this page can hand you. The whole set is the
            thing worth an email address, and this is the moment of highest
            intent for it — a reader who is about to print one character is the
            reader who wants the other eighty.

            N5 only, and not by accident: the pack contains the N5 set, so
            offering it under 個 or 憂 would be a promise the file does not keep.
            The other four levels get nothing here rather than a vaguer link,
            because a CTA that resolves to "some sheets, somewhere" is how the
            last one ended up with a 404 nobody noticed.

            A plain <a> with no tracking and no client boundary. This template
            renders ~1,896 times and carries LCP debt already gated in
            lighthouserc.js; the file is a Server Component precisely so a link
            costs bytes and nothing else. Per-surface click-through for this one
            is readable off the Gumroad referrer, which is enough to decide
            whether it earns its place. */}
        {level === 'N5' && (
          <p className="mt-5 text-sm">
            <a
              href="https://michikanji.gumroad.com/l/kanji-n5-sheets-workbook"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-sm font-medium text-japan-mountain-mist underline underline-offset-4 hover:brightness-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Or get all 81 N5 sheets as one free PDF
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </p>
        )}
      </div>
    </section>
  );
}
