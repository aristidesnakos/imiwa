import { cn } from '@/lib/utils';
import type { Token } from '@/lib/sentences/types';

const HAS_KANJI = /[㐀-䶿一-鿿豈-﫿]/;

/** True when a token should carry ruby: it has kanji and a reading that adds information. */
function rendersAsRuby(token: Token): boolean {
  if (token.readingUnknown) return false;
  if (!token.reading) return false;
  if (!HAS_KANJI.test(token.surface)) return false;
  return token.reading !== token.surface;
}

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
 * Two rules this component exists to enforce:
 *
 * 1. Ruby comes from `tokens`, never from a whole-sentence kana string — the
 *    alignment simply is not recoverable after the fact.
 * 2. A token with `readingUnknown` is the known IPADIC null-reading failure. It
 *    is rendered as SUSPECT (marked, no ruby), never as furigana. Showing a
 *    guessed reading here is exactly the silent, plausible-looking error the
 *    review step exists to catch.
 *
 * The surface text is emitted verbatim in token order, which reconstructs
 * `japanese` exactly. Nothing here may alter it.
 */
export function Furigana({ tokens, highlightKanji, corrections, className }: FuriganaProps) {
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
        const effective: Token = corrected
          ? { surface: token.surface, reading: corrected }
          : token;

        const surface = highlightKanji ? (
          <HighlightedSurface surface={token.surface} kanji={highlightKanji} />
        ) : (
          token.surface
        );

        if (token.readingUnknown && !corrected) {
          return (
            <span
              key={index}
              title="Tokenizer returned no reading for this token — suspect, not rendered as furigana"
              className="relative mx-[1px] rounded-sm bg-amber-100 px-0.5 underline decoration-amber-600 decoration-dotted decoration-2 underline-offset-4 dark:bg-amber-950/60"
            >
              {surface}
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

        if (rendersAsRuby(effective)) {
          return (
            <ruby
              key={index}
              className={cn(corrected && 'rounded-sm bg-sky-100 dark:bg-sky-950/60')}
            >
              {surface}
              <rt className="text-[0.42em] font-normal text-muted-foreground">
                {effective.reading}
              </rt>
            </ruby>
          );
        }

        return <span key={index}>{surface}</span>;
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
          <span key={i} className="text-emerald-700 dark:text-emerald-400">
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

export { rendersAsRuby, HAS_KANJI };
