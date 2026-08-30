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
 * THE PACK LINE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Under the strip, on N5 pages only, still sits one text link to the free N5
 * pack — same reasoning as before: it is the same artefact class as the
 * button above it, and it is subordinate to it for the same reason: the
 * reader came for THIS kanji. It is text, not a second button, for the same
 * reason too — two buttons in one row is a choice, and a choice is slower
 * than an action.
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
import { PACK_DOWNLOADS, PACK_FILENAMES } from '@/lib/commerce/links';
import { cn } from '@/lib/utils';

interface Props {
  kanji: string;
  /**
   * JLPT level of this character. Only N5 gets the pack line below the print
   * strip, because N5 is the only level the pack actually covers — see the
   * "THE PACK LINE" note above.
   */
  level: string;
}

export function KanjiActionBar({ kanji, level }: Props) {
  return (
    <section className="mt-12" aria-label={`Practice ${kanji} on paper`}>
      <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 bg-white px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-50 text-gray-700"
          >
            <Printer className="h-4 w-4" />
          </span>
          <p className="truncate text-sm text-gray-700">
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
          costs bytes and nothing else. Click-through for this one used to be
          readable off the Gumroad referrer — it is not any more, now that the
          pack is served from this domain, and adding a click handler here
          would mean a client boundary on 1,896 pages to learn it. If this
          link's pull ever needs measuring, the honest instrument is the
          request log for the PDF, not a `use client` on the whole bar. */}
      {level === 'N5' && (
        <p className="mt-2 pl-1 text-xs sm:pl-14">
          <a
            href={PACK_DOWNLOADS.n5Kanji}
            download={PACK_FILENAMES.n5Kanji}
            className="rounded-sm font-medium text-japan-mountain-mist underline underline-offset-4 hover:brightness-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Or get all 82 N5 sheets as one free PDF
            <span className="sr-only"> (downloads to your device)</span>
          </a>
        </p>
      )}
    </section>
  );
}
