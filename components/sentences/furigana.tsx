import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';
import { rubySegments } from '@/lib/sentences/ruby';
import type { Token } from '@/lib/sentences/types';

interface FuriganaProps {
  tokens: Token[];
  /** Highlights every occurrence of this kanji in the surface text. */
  highlightKanji?: string;
  /** Reviewer's in-progress reading corrections, keyed by token index. */
  corrections?: Record<number, string>;
  className?: string;
}

/**
 * Renders a tokenized sentence as ruby-annotated Japanese.
 *
 * Three rules this component exists to enforce:
 *
 * 1. Ruby comes from `tokens`, never from a whole-sentence kana string — the
 *    alignment simply is not recoverable after the fact.
 * 2. A token with `readingUnknown` is the known IPADIC null-reading failure. It
 *    is rendered as SUSPECT (marked, no ruby), never as furigana. Showing a
 *    guessed reading here is exactly the silent, plausible-looking error the
 *    review step exists to catch.
 * 3. Ruby annotates only the span the reading is actually FOR. A reading
 *    covers the kanji in a token, not the kana already visible in it — so in
 *    「フランス語」 only 語 takes ruby (ご), and 「書き」 renders 書《か》き.
 *    `lib/sentences/ruby.ts` works out the split; this component only places
 *    it, re-emitting every trimmed character as plain text so the surface
 *    still reads verbatim.
 *
 * The surface text is emitted verbatim in token order, which reconstructs
 * `japanese` exactly. Nothing here may alter it.
 */
export function Furigana({ tokens, highlightKanji, corrections, className }: FuriganaProps) {
  /** Highlighting applies to every segment of a token, ruby base included. */
  const paint = (text: string): ReactNode =>
    highlightKanji ? <HighlightedSurface surface={text} kanji={highlightKanji} /> : text;

  return (
    <p
      lang="ja"
      className={cn(
        'text-3xl leading-[2.6] tracking-wide text-foreground',
        className
      )}
    >
      {tokens.map((token, index) => {
        const corrected = corrections?.[index];
        const reading = corrected ?? token.reading;

        if (token.readingUnknown && !corrected) {
          return (
            <span
              key={index}
              title="Tokenizer returned no reading for this token — suspect, not rendered as furigana"
              className="relative mx-[1px] rounded-sm bg-amber-100 px-0.5 underline decoration-amber-600 decoration-dotted decoration-2 underline-offset-4 dark:bg-amber-950/60"
            >
              {paint(token.surface)}
              <span
                aria-hidden
                className="absolute -top-1 left-0 text-[10px] font-bold leading-none text-amber-700 dark:text-amber-400"
              >
                ?
              </span>
              <span className="sr-only"> (reading unknown)</span>
            </span>
          );
        }

        const segments = rubySegments(token.surface, reading);

        if (segments) {
          // The corrected-reading highlight covers the whole token, not just
          // the ruby — a reviewer needs to see which token they touched, and
          // lead/tail are part of that token.
          return (
            <span
              key={index}
              className={cn(corrected && 'rounded-sm bg-sky-100 dark:bg-sky-950/60')}
            >
              {segments.lead ? paint(segments.lead) : null}
              <ruby>
                {paint(segments.base)}
                <rt className="text-[0.42em] font-normal text-muted-foreground">
                  {segments.reading}
                </rt>
              </ruby>
              {segments.tail ? paint(segments.tail) : null}
            </span>
          );
        }

        return <span key={index}>{paint(token.surface)}</span>;
      })}
    </p>
  );
}

function HighlightedSurface({ surface, kanji }: { surface: string; kanji: string }) {
  if (!kanji || !surface.includes(kanji)) return <>{surface}</>;
  return (
    <>
      {[...surface].map((char, i) =>
        char === kanji ? (
          // The one colour in this file a LEARNER ever sees. The amber
          // reading-unknown flag and the sky corrected-reading tint above are
          // reviewer affordances: `validate:published` refuses a readingUnknown
          // token outright, and the public page passes no `corrections`, so
          // neither can reach a kanji page. This can, on every sentence.
          //
          // `coral-sunset-ink` is the palette's text/indicator companion to the
          // brand's signature accent — 4.70:1 on the soft-mist card, and this
          // renders at text-3xl where 3:1 is the bar. Stock emerald was an
          // off-brand green on a page built from deep-ocean, coral and sakura.
          // A token also survives a future `.dark` block, which `dark:` pairs
          // do not: `darkMode: ["class"]` is configured but globals.css defines
          // no `.dark`, so every dark: variant in this tree is currently dead.
          <span key={i} className="text-japan-coral-sunset-ink">
            {char}
          </span>
        ) : (
          <span key={i}>{char}</span>
        )
      )}
    </>
  );
}

/** True when the candidate contains at least one unknown-reading token. */
export function hasUnknownReadings(tokens: Token[]): boolean {
  return tokens.some((t) => t.readingUnknown);
}

// Re-exported for components/admin/sentences/sentence-reviewer.tsx, which has
// imported HAS_KANJI from here since before it moved to lib/sentences/ruby.ts.
export { HAS_KANJI, rendersAsRuby } from '@/lib/sentences/ruby';
