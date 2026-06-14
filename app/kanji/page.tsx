import { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { getSEOTags } from '@/lib/seo';
import { KanjiSearchClient } from './KanjiSearchClient';
import { N5_KANJI } from '@/lib/constants/n5-kanji';
import { N4_KANJI } from '@/lib/constants/n4-kanji';
import { N3_KANJI } from '@/lib/constants/n3-kanji';
import { N2_KANJI } from '@/lib/constants/n2-kanji';
import { N1_KANJI } from '@/lib/constants/n1-kanji';

const totalKanji = N5_KANJI.length + N4_KANJI.length + N3_KANJI.length + N2_KANJI.length + N1_KANJI.length;

// Server-rendered, deduped index of every kanji (first/most-basic level wins),
// grouped by level. The interactive client list paginates and lives behind
// JS — this static index guarantees every kanji detail page is linked from the
// hub in the initial HTML, so crawlers can reach all 1000+ pages (S3).
const LEVEL_GROUPS = (() => {
  const seen = new Set<string>();
  const groups: { level: string; kanji: { kanji: string; meaning: string }[] }[] = [];
  ([
    ['N5', N5_KANJI],
    ['N4', N4_KANJI],
    ['N3', N3_KANJI],
    ['N2', N2_KANJI],
    ['N1', N1_KANJI],
  ] as const).forEach(([level, list]) => {
    const kanji = list.filter((k) => {
      if (seen.has(k.kanji)) return false;
      seen.add(k.kanji);
      return true;
    });
    groups.push({ level, kanji });
  });
  return groups;
})();

export const metadata: Metadata = getSEOTags({
  title: 'Japanese Kanji Stroke Order Dictionary | JLPT N5, N4, N3, N2 & N1 | Interactive Learning',
  description: `Learn Japanese kanji with interactive stroke order diagrams. ${totalKanji} JLPT kanji covering N5 (${N5_KANJI.length}), N4 (${N4_KANJI.length}), N3 (${N3_KANJI.length}), N2 (${N2_KANJI.length}), and N1 (${N1_KANJI.length}) levels. Master proper writing technique with animated guides.`,
  keywords: [
    'Japanese kanji',
    'stroke order', 
    'JLPT N5 kanji',
    'JLPT N4 kanji', 
    'JLPT N3 kanji',
    'JLPT N2 kanji',
    'JLPT N1 kanji',
    'kanji dictionary',
    'Japanese writing',
    'stroke order animation',
    'kanji learning',
    'Japanese language',
    'kanji practice'
  ],
  openGraph: {
    title: 'Japanese Kanji Stroke Order Dictionary | JLPT N5, N4, N3, N2 & N1',
    description: `Interactive kanji learning with ${totalKanji} characters. Master stroke order, readings, and meanings.`,
    type: 'website',
  },
  canonicalUrlRelative: '/kanji',
});

export default function KanjiPage() {
  return (
    <>
      <Suspense fallback={<div className="container mx-auto p-8"><div className="text-center">Loading kanji dictionary...</div></div>}>
        <KanjiSearchClient />
      </Suspense>

      {/* Crawlable complete index — every kanji page linked in the initial HTML. */}
      <section className="container mx-auto px-8 pb-12" aria-label="Complete kanji index">
        <details className="mt-4 border-t border-gray-200 pt-6">
          <summary className="cursor-pointer text-lg font-semibold text-gray-800">
            Complete kanji index ({totalKanji} characters)
          </summary>
          <p className="text-sm text-gray-500 mt-2 mb-4">
            Browse every JLPT kanji by level. Each links to its interactive
            stroke-order page.
          </p>
          {LEVEL_GROUPS.map((group) => (
            <div key={group.level} id={`level-${group.level}`} className="mb-6 scroll-mt-24">
              <h2 className="text-base font-semibold text-gray-700 mb-2">
                JLPT {group.level} Kanji ({group.kanji.length})
              </h2>
              <ul className="flex flex-wrap gap-1.5">
                {group.kanji.map((k) => (
                  <li key={k.kanji}>
                    <Link
                      href={`/kanji/${encodeURIComponent(k.kanji)}`}
                      title={`${k.kanji} — ${k.meaning.split(',')[0].trim()} kanji stroke order`}
                      className="inline-block px-2 py-1 text-lg rounded border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                    >
                      {k.kanji}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </details>
      </section>
    </>
  );
}