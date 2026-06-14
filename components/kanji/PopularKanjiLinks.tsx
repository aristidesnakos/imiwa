/**
 * Popular Kanji Links
 *
 * Crawlable internal links from resource/landing pages to high-priority kanji
 * detail pages (Phase 0, task S3). Spreads authority to the pages that already
 * rank but under-convert, and gives readers a natural next step from the free
 * worksheets into the interactive dictionary.
 */

import Link from 'next/link';
import { PRIORITY_KANJI_UNIQUE } from '@/lib/linking/priority-kanji';
import { N5_KANJI } from '@/lib/constants/n5-kanji';
import { N4_KANJI } from '@/lib/constants/n4-kanji';
import { N3_KANJI } from '@/lib/constants/n3-kanji';
import { N2_KANJI } from '@/lib/constants/n2-kanji';
import { N1_KANJI } from '@/lib/constants/n1-kanji';

// First-wins lookup so each character maps to its most-basic level/meaning.
const KANJI_LOOKUP = (() => {
  const map = new Map<string, { meaning: string; level: string }>();
  const add = (list: { kanji: string; meaning: string }[], level: string) => {
    for (const k of list) {
      if (!map.has(k.kanji)) map.set(k.kanji, { meaning: k.meaning, level });
    }
  };
  add(N5_KANJI, 'N5');
  add(N4_KANJI, 'N4');
  add(N3_KANJI, 'N3');
  add(N2_KANJI, 'N2');
  add(N1_KANJI, 'N1');
  return map;
})();

interface Props {
  /** How many links to render (default: all priority kanji). */
  limit?: number;
  title?: string;
  description?: string;
}

export function PopularKanjiLinks({
  limit,
  title = 'Popular Kanji',
  description = 'Jump straight to an interactive stroke-order page for a frequently searched kanji:',
}: Props) {
  const items = PRIORITY_KANJI_UNIQUE
    .map((kanji) => {
      const meta = KANJI_LOOKUP.get(kanji);
      return meta ? { kanji, meaning: meta.meaning.split(',')[0].trim(), level: meta.level } : null;
    })
    .filter((x): x is { kanji: string; meaning: string; level: string } => x !== null)
    .slice(0, limit ?? PRIORITY_KANJI_UNIQUE.length);

  if (items.length === 0) return null;

  return (
    <section className="mt-12">
      <h2 className="text-xl font-semibold text-gray-800 mb-2">{title}</h2>
      <p className="text-sm text-gray-600 mb-4">{description}</p>
      <ul className="flex flex-wrap gap-2">
        {items.map((item) => (
          <li key={item.kanji}>
            <Link
              href={`/kanji/${encodeURIComponent(item.kanji)}`}
              className="inline-flex items-baseline gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 hover:border-blue-300 hover:bg-blue-50 transition-colors"
              title={`${item.kanji} — ${item.meaning} kanji stroke order (JLPT ${item.level})`}
            >
              <span className="text-lg font-semibold">{item.kanji}</span>
              <span className="text-sm text-gray-600">{item.meaning}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
