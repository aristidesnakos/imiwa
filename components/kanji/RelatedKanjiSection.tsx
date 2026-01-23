/**
 * Related Kanji Section Component
 *
 * Displays a grid of semantically related kanji to improve internal linking
 * and user discovery of connected concepts.
 */

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { getRelatedKanji } from '@/lib/linking/kanji-links';
import type { KanjiData } from '@/lib/constants/n5-kanji';

interface Props {
  currentKanji: KanjiData & { level: string };
  allKanji: (KanjiData & { level: string })[];
}

export function RelatedKanjiSection({ currentKanji, allKanji }: Props) {
  const relatedKanji = getRelatedKanji(currentKanji, allKanji);

  // Don't render section if no related kanji found
  if (relatedKanji.length === 0) return null;

  return (
    <section className="mt-12 pt-8 border-t border-gray-200">
      <h2 className="text-2xl font-semibold mb-6">Related Kanji</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {relatedKanji.map((related) => (
          <Link
            key={related.kanji}
            href={`/kanji/${encodeURIComponent(related.kanji)}`}
            className="block p-4 bg-gray-50 hover:bg-blue-50 rounded-lg transition-colors text-center group"
          >
            <div className="text-4xl font-bold mb-2 group-hover:scale-110 transition-transform">
              {related.kanji}
            </div>
            <p className="text-sm text-gray-700 mb-2">{related.meaning}</p>
            <Badge variant="secondary" className="text-xs">
              JLPT {related.level}
            </Badge>
          </Link>
        ))}
      </div>
    </section>
  );
}
