/**
 * components/kanji/KanjiActionBar.tsx
 *
 * The kanji page's third tier: things you DO with this character, as distinct
 * from things the page TELLS you about it.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY A STRIP, NOT A CARD
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * This used to be a full centred card — icon, heading, a paragraph explaining
 * what a practice sheet is, then the button — and it was the single heaviest
 * block on the page, sitting right where a reader who has just learned the
 * meaning and readings would otherwise meet the example sentences: the one
 * section that shows the character actually being used. The sheet is a real
 * offer and stays one tap away, but it does not need a heading or a paragraph
 * to be legible — "print a tracing grid" is a self-explanatory action, not a
 * concept that needs three lines of setup. One row, one icon, one button.
 *
 * `aria-label` on the section (not `aria-labelledby` to an `<h2>`): the row no
 * longer has a heading, and inventing one just to hang an accessible name off
 * it would put a heading in the page's outline for something that reads, and
 * should read, as a single line.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE BOOK BAND
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Under the strip, on N5 pages only, sits the paid book. A free N5-pack link
 * used to sit here too, styled identically to it — same small underlined text,
 * same muted colour — so neither ever stood out from the other, and a reader
 * had to read both to tell "free" from "paid" apart. The free pack lost its
 * slot here (it is still offered at full strength on the N5 sheets hub page).
 *
 * What replaced it was first that same line with an accent chip around it, and
 * a chip under a bordered strip reads as a label ON the strip, not as a second
 * offer — on top of which its text failed AA at 4.32:1. It is now a tinted
 * band: a headline, one line of substance, a terracotta button and Tan at the
 * trailing edge. That is the heaviest thing on this page after the character
 * itself, deliberately, and it is still quieter than Print — the band's button
 * is auto-width on desktop and a different colour, so the primary free action
 * keeps the row above to itself. See components/commerce/BookCTA.tsx, whose
 * notes carry the measured contrast ratios.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT DOES *NOT* BELONG HERE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * "Review what you've learned" — it is an action about LEAVING this page, not
 * an action on this character. It now closes the example sentences (see
 * ExampleSentencesSection), which is where a reader who has just read three
 * sentences using this kanji actually is. Mixing the two is how the print
 * link ended up homeless in the first place.
 *
 * A Server Component: every action here is a plain link, so there is nothing
 * to hydrate, and the kanji template already carries LCP debt gated in
 * lighthouserc.js.
 */

import { Printer } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { BookCTA } from '@/components/commerce/BookCTA';
import { cn } from '@/lib/utils';

interface Props {
  kanji: string;
  /**
   * JLPT level of this character. Only N5 gets the book band below the print
   * strip, because N5 is the only level the book actually covers — see the
   * "THE BOOK BAND" note above.
   */
  level: string;
}

export function KanjiActionBar({ kanji, level }: Props) {
  return (
    <section className="mt-12" aria-label={`Practice ${kanji} on paper`}>
      <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 bg-white px-4 py-3 sm:px-5">
        <div className="flex min-w-0 flex-1 items-center justify-center gap-3">
          <p className="truncate text-center text-sm text-gray-700">
            Practice <span lang="ja">{kanji}</span> on paper — a printable tracing grid with
            stroke order
          </p>
        </div>

        {/* A sheet is generated per character, so one exists for every kanji that
            has a page. A plain <a>, not <Link>: the target is an API route
            returning HTML, which client navigation cannot render.

            The focus ring is inherited, not overridden. It briefly was not: the
            shared --ring token was #7BB3D3, 2.3:1 against this white card and
            under the WCAG 1.4.11 floor, so this link carried a local fix. The
            token is correct now (app/globals.css) and the local override would
            only mask the next regression. */}
        <a
          href={`/api/kanji-sheets?character=${encodeURIComponent(kanji)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ size: 'sm' }), 'shrink-0')}
        >
          <Printer aria-hidden />
          Print
          {/* The icon reads as "print", not "new tab", and the house convention
              elsewhere (Footer) is an ExternalLink glyph we cannot use here
              without muddling that meaning. */}
          <span className="sr-only"> a practice sheet (opens in a new tab)</span>
        </a>
      </div>

      {/* The paid book, N5 only: the book covers the N5 set, so offering it
          under 個 or 憂 would be a promise the product does not keep. That
          costs almost no reach — the three most-read detail pages (日 595,
          本 261, 時 215 pageviews/month) are all N5.

          The only action below the print strip, so it is shaped like one —
          see "THE BOOK BAND" above and components/commerce/BookCTA.tsx.
          Renders nothing until AMAZON_BOOK_URL is filled in, so this costs an
          unlisted book zero bytes. Tracked as `kanji_detail_book_click` with
          no client boundary. */}
      {level === 'N5' && <BookCTA surface="kanjiDetail" variant="band" />}
    </section>
  );
}
