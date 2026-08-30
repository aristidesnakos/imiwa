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
          <Link
            key={related.kanji}
            href={`/kanji/${encodeURIComponent(related.kanji)}`}
            className="group block min-h-[220px] rounded-xl bg-japan-cloud-ice p-4 text-center transition-colors hover:bg-japan-sky-ice"
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
            <p className="mt-5 text-sm leading-relaxed text-gray-700">{related.meaning}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
