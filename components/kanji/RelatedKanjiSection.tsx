/**
 * Related Kanji Section Component
 *
 * Displays a grid of semantically related kanji to improve internal linking
 * and user discovery of connected concepts.
 */

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { getRelatedKanji } from '@/lib/linking/kanji-links';
import { SECTION_BAND, SECTION_HEADING } from '@/components/kanji/section';
import type { KanjiWithLevel } from '@/lib/constants/kanji-types';

interface Props {
  currentKanji: KanjiWithLevel;
  allKanji: KanjiWithLevel[];
}

export function RelatedKanjiSection({ currentKanji, allKanji }: Props) {
  const relatedKanji = getRelatedKanji(currentKanji, allKanji);

  if (relatedKanji.length === 0) return null;

  return (
    <section className={SECTION_BAND} aria-labelledby="related-kanji-heading">
      <h2 id="related-kanji-heading" className={`${SECTION_HEADING} mb-6`}>
        Related kanji
      </h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
        {relatedKanji.map((related) => (
          /* The card fill used to be `bg-japan-cloud-ice`, with a
             `hover:bg-japan-sky-ice` hover — two tokens defined nowhere, so
             both compiled to nothing and these cards rendered with no surface
             and no hover at all. Now tints of sakura-waters, written as
             color-mix because an alpha suffix on a japan-* token also compiles
             to nothing (CLAUDE.md, "Design tokens"). The ring is explicit: this
             link does not go through buttonVariants. */
          <Link
            key={related.kanji}
            href={`/kanji/${encodeURIComponent(related.kanji)}`}
            className="group block min-h-[220px] rounded-xl bg-[color-mix(in_srgb,var(--sakura-waters)_10%,var(--temple-stone))] p-4 text-center transition-colors hover:bg-[color-mix(in_srgb,var(--sakura-waters)_20%,var(--temple-stone))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Badge
              variant="secondary"
              className="rounded-md px-2.5 py-1 text-[10px] font-bold tracking-[0.08em] text-secondary-foreground"
            >
              {related.level}
            </Badge>

            {/* lang="ja": the document is lang="en", and this character is the
                entire accessible name of the link. */}
            <div
              lang="ja"
              className="mt-4 text-5xl transition-transform group-hover:scale-105"
            >
              {related.kanji}
            </div>
            <p className="mt-5 text-sm leading-relaxed text-japan-ink-black">{related.meaning}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
