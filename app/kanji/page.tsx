import { Metadata } from 'next';
import { Suspense } from 'react';
import { getSEOTags } from '@/lib/seo';
import { KanjiSearchClient } from './KanjiSearchClient';
import { N5_KANJI } from '@/lib/constants/n5-kanji';
import { N4_KANJI } from '@/lib/constants/n4-kanji';
import { N3_KANJI } from '@/lib/constants/n3-kanji';
import { N2_KANJI } from '@/lib/constants/n2-kanji';
import { N1_KANJI } from '@/lib/constants/n1-kanji';

const totalKanji = N5_KANJI.length + N4_KANJI.length + N3_KANJI.length + N2_KANJI.length + N1_KANJI.length;

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
    <Suspense fallback={<div className="container mx-auto p-8"><div className="text-center">Loading kanji dictionary...</div></div>}>
      <KanjiSearchClient />
    </Suspense>
  );
}