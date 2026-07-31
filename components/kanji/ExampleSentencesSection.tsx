/**
 * components/kanji/ExampleSentencesSection.tsx
 *
 * Layer 4 of the kanji page: reviewed Tatoeba sentence pairs with token-aligned
 * furigana.
 *
 * A Server Component, deliberately. The kanji template already carries LCP debt
 * (~3s, gated in lighthouserc.js) and a client-rendered section would serialise
 * this data into the RSC payload IN ADDITION to the HTML — paying for the same
 * bytes twice on a page whose whole value is that it is static.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * TWO RULES THIS COMPONENT EXISTS TO KEEP
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * 1. **Attribution is per sentence, not per page.** Tatoeba does not own the
 *    sentences and cannot waive its contributors' droit de paternité, so each
 *    pair credits its own author and licence. A footer line alone would not do
 *    it. (See docs/prd/example-sentences-phase0-findings.md §3.)
 * 2. **No sentences means no section.** Not a heading, not an empty state, not
 *    "no examples available". 160 kanji have zero usable candidates in the whole
 *    corpus and every level above N5 is unreviewed, so absence is the common
 *    case — and a kanji page without this section is exactly the page we ship
 *    today, which is already a good page.
 */

import type { ExampleSentence } from '@/lib/sentences/types';
import { Furigana } from '@/components/sentences/furigana';
import { Attribution } from '@/components/sentences/attribution';
import { SECTION_BAND, SECTION_HEADING } from '@/components/kanji/section';

interface Props {
  kanji: string;
  sentences: ExampleSentence[];
}

export function ExampleSentencesSection({ kanji, sentences }: Props) {
  if (sentences.length === 0) return null;

  return (
    <section className={SECTION_BAND} aria-labelledby="example-sentences-heading">
      <h2 id="example-sentences-heading" className={SECTION_HEADING}>
        Example sentences using <span lang="ja">{kanji}</span>
      </h2>
      <p className="mt-1 text-sm text-gray-600">
        Human-reviewed sentence pairs from the Tatoeba corpus, with readings shown above
        the kanji.
      </p>

      <ol className="mt-6 space-y-6">
        {sentences.map((sentence) => {
          const target = sentence.targets.find((t) => t.kanji === kanji);
          return (
            <li key={sentence.id} className="rounded-lg border border-gray-200 bg-white p-5">
              <Furigana
                tokens={sentence.tokens}
                highlightKanji={kanji}
                className="text-2xl sm:text-3xl"
              />
              <p className="mt-3 text-base text-gray-700">{sentence.english}</p>

              {target ? (
                <p className="mt-3 text-sm text-gray-600">
                  <span lang="ja" className="font-medium text-gray-800">
                    {target.word}
                  </span>{' '}
                  <span lang="ja">({target.reading})</span>
                </p>
              ) : null}

              <Attribution
                japanese={sentence.source.japanese}
                english={sentence.source.english}
                className="mt-4 border-t border-gray-100 pt-3"
              />
            </li>
          );
        })}
      </ol>
    </section>
  );
}
