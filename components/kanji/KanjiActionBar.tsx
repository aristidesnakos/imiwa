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
 * So it is a self-contained card — the same shape as `AdBanner` and the sentence
 * pairs, which is the page's established vocabulary for "a discrete object,
 * not prose". Centring happens INSIDE the card, whose own edges sit on the same
 * left spine as every other section, so the page keeps one spine while the offer
 * still reads as an offer.
 *
 * No rule above it, unlike the other bands: the card's border already draws the
 * boundary, and stacking a hairline directly above a bordered box is two
 * separators doing one job.
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
}

export function KanjiActionBar({ kanji }: Props) {
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

            The focus ring is overridden, not inherited. `buttonVariants` sets
            `outline-none` + `ring-1 ring-ring`, and --ring is #7BB3D3, which is
            2.28:1 against this white card — under the 3:1 WCAG 1.4.11 floor, and
            a net regression because outline-none first removes the UA default.
            Merged with cn() so tailwind-merge drops the inherited ring-1 rather
            than leaving both widths to fight in the stylesheet. */}
        <a
          href={`/api/kanji-sheets?character=${encodeURIComponent(kanji)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            buttonVariants({ size: 'lg' }),
            'mt-6 w-full sm:w-auto',
            'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--deep-ocean)]'
          )}
        >
          <Printer aria-hidden />
          Print a practice sheet
          {/* The icon reads as "print", not "new tab", and the house convention
              elsewhere (AdBanner, Footer) is an ExternalLink glyph we cannot use
              here without muddling that meaning. */}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </div>
    </section>
  );
}
