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
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * TAN, ON THE CARDS AND AT THE END
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Two poses ride the top-right corner of each card, alternating by index —
 * `tan-point` and `tan-brush`, the only two mascot assets that are genuinely
 * transparent (`tan-confused`, `tan-thumbsup` and `tan-wave` all ship with a
 * baked-in vignette that would show as a visible rectangle against the card).
 * A third clean pose would remove the alternation; there isn't one yet.
 *
 * They are stickers, not layout: `absolute`, `pointer-events-none`, sized off
 * the card rather than in its flow, so a wrong pose costs nothing to swap and
 * never intercepts a click on the card underneath it. `pr-20`/`pr-24` on the
 * card reserves room so a long first line of furigana wraps before it reaches
 * the corner instead of running under it.
 *
 * "Nice — one more kanji learned!" used to be its own centred block at the
 * bottom of the page, unconnected to anything above or below it — a reader
 * who has just read three sentences using this kanji is not, at that moment,
 * thinking about the page as a whole; they are thinking about the kanji they
 * just saw in use. So it closes THIS section instead, with `tan-celebrate`
 * (also clean) rather than reusing one of the two poses already spent above.
 * The kanji pages with no sentences yet — most of them, today — still get the
 * original standalone version; see page.tsx.
 */

import Image from 'next/image';
import Link from 'next/link';
import type { ExampleSentence } from '@/lib/sentences/types';
import { Furigana } from '@/components/sentences/furigana';
import { Attribution } from '@/components/sentences/attribution';
import { SECTION_BAND, SECTION_HEADING } from '@/components/kanji/section';

interface Props {
  kanji: string;
  sentences: ExampleSentence[];
}

// Alternates by card index. Both are full-body, transparent-background poses —
// see the "TAN, ON THE CARDS AND AT THE END" note above for why these two and
// not one of Tan's other five.
const STICKER_POSES = [
  { src: '/assets/tan-point.png', rotate: 'rotate-6' },
  { src: '/assets/tan-brush.png', rotate: '-rotate-6' },
];

export function ExampleSentencesSection({ kanji, sentences }: Props) {
  if (sentences.length === 0) return null;

  return (
    <section className={SECTION_BAND} aria-labelledby="example-sentences-heading">
      <h2 id="example-sentences-heading" className={SECTION_HEADING}>
        Example sentences using <span lang="ja">{kanji}</span>
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Human-reviewed sentence pairs from the Tatoeba corpus, with readings shown above
        the kanji.
      </p>

      <ol className="mt-8 space-y-8">
        {sentences.map((sentence, index) => {
          const target = sentence.targets.find((t) => t.kanji === kanji);
          const pose = STICKER_POSES[index % STICKER_POSES.length];
          return (
            // Soft-mist rather than a plain white fill: the page background is
            // temple-stone (a warm off-white), so a white card barely reads as a
            // card at all. Soft-mist is the cool light already used by the one
            // brand-correct card on this page, KanjiN5WorkbookCTA.
            //
            // `relative` + `pr-20 sm:pr-24`: the sticker is absolutely
            // positioned off the card's top-right corner, so the card needs a
            // `relative` anchor and the text needs the extra right padding to
            // stay clear of it.
            <li
              key={sentence.id}
              className="relative rounded-lg border border-border bg-japan-soft-mist p-5 pr-20 sm:pr-24"
            >
              <Image
                src={pose.src}
                alt=""
                aria-hidden="true"
                width={128}
                height={128}
                className={`pointer-events-none absolute -top-5 -right-4 h-16 w-16 drop-shadow-sm sm:h-20 sm:w-20 ${pose.rotate}`}
              />

              <Furigana
                tokens={sentence.tokens}
                highlightKanji={kanji}
                className="text-2xl sm:text-3xl"
              />
              <p className="mt-3 text-base text-foreground">{sentence.english}</p>

              {target ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  <span lang="ja" className="font-medium text-foreground">
                    {target.word}
                  </span>{' '}
                  <span lang="ja">({target.reading})</span>
                </p>
              ) : null}

              <Attribution
                japanese={sentence.source.japanese}
                english={sentence.source.english}
                className="mt-4 border-t border-border pt-3"
              />
            </li>
          );
        })}
      </ol>

      {/* The mascot's sign-off, now scoped to the section it's actually
          reacting to. `color-mix` against the page token rather than a
          slash-opacity modifier on the japan-* class, which compiles to
          nothing (see CLAUDE.md, "Design tokens"). */}
      <div className="mt-8 flex items-center gap-3 rounded-lg bg-[color-mix(in_srgb,var(--cherry-blossom)_18%,var(--temple-stone))] px-4 py-3">
        <Image
          src="/assets/tan-celebrate.png"
          alt="Tan the tanuki mascot celebrating"
          width={128}
          height={128}
          className="h-12 w-12 shrink-0"
        />
        <p className="text-sm text-japan-deep-ocean">
          Nice — one more kanji learned!{' '}
          <Link
            href="/kanji/review"
            className="font-medium underline underline-offset-2 hover:brightness-90"
          >
            Review what you&rsquo;ve learned →
          </Link>
        </p>
      </div>
    </section>
  );
}
