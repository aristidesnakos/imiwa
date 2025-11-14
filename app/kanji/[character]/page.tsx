import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { StrokeOrderViewer } from '@/components/StrokeOrderViewer';
import { CTASection } from '@/components/CTASection';
import Header from '@/components/sections/Header';
import { N5_KANJI } from '@/lib/constants/n5-kanji';
import { N4_KANJI } from '@/lib/constants/n4-kanji';
import { N3_KANJI } from '@/lib/constants/n3-kanji';
import { N2_KANJI } from '@/lib/constants/n2-kanji';
import { N1_KANJI } from '@/lib/constants/n1-kanji';
import { strokeOrderService } from '@/lib/stroke-order';
import { ArrowLeft, BookOpen } from 'lucide-react';

// Combine all kanji data with levels
const ALL_KANJI_DATA = [
  ...N5_KANJI.map(k => ({ ...k, level: 'N5' })),
  ...N4_KANJI.map(k => ({ ...k, level: 'N4' })),
  ...N3_KANJI.map(k => ({ ...k, level: 'N3' })),
  ...N2_KANJI.map(k => ({ ...k, level: 'N2' })),
  ...N1_KANJI.map(k => ({ ...k, level: 'N1' })),
];

interface Props {
  params: Promise<{ character: string }>;
}

// Force dynamic rendering to bypass any static generation issues
export const dynamic = 'force-dynamic';

// Generate static paths for all kanji
export async function generateStaticParams(): Promise<{ character: string }[]> {
  // Return empty array to force all pages to be dynamic
  return [];
}

// Enable ISR for missing pages
export const dynamicParams = true;

// SEO metadata generation
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { character } = await params;
  const decodedCharacter = decodeURIComponent(character);
  const kanjiData = ALL_KANJI_DATA.find(k => k.kanji === decodedCharacter);
  
  if (!kanjiData) {
    return {
      title: 'Kanji Not Found | Japanese Stroke Order Dictionary',
      description: 'The requested kanji was not found in our database.',
    };
  }
  
  const title = `${kanjiData.kanji} Kanji: Stroke Order, Meaning & Readings | ${kanjiData.level} JLPT`;
  const description = `Learn how to write ${kanjiData.kanji} kanji with interactive stroke order diagram. Meaning: ${kanjiData.meaning}. Onyomi: ${kanjiData.onyomi}. Kunyomi: ${kanjiData.kunyomi}. JLPT ${kanjiData.level} level.`;
  
  return {
    title,
    description,
    keywords: [
      `${kanjiData.kanji} kanji`,
      `${kanjiData.kanji} stroke order`,
      `${kanjiData.kanji} meaning`,
      `JLPT ${kanjiData.level}`,
      'Japanese kanji',
      'kanji writing',
      'stroke order animation',
      kanjiData.meaning,
    ].join(', '),
    openGraph: {
      title,
      description,
      type: 'article',
      url: `/kanji/${encodeURIComponent(kanjiData.kanji)}`,
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
    alternates: {
      canonical: `/kanji/${encodeURIComponent(kanjiData.kanji)}`,
    },
  };
}

export default async function KanjiDetailPage({ params }: Props) {
  const { character } = await params;
  const decodedCharacter = decodeURIComponent(character);
  const kanjiData = ALL_KANJI_DATA.find(k => k.kanji === decodedCharacter);
  
  if (!kanjiData) {
    notFound();
  }
  
  const unicodeInfo = strokeOrderService.getUnicodeInfo(kanjiData.kanji);
  
  // Generate JSON-LD structured data for SEO
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${kanjiData.kanji} Kanji Stroke Order and Meaning`,
    description: `Learn the kanji ${kanjiData.kanji} with interactive stroke order diagram, readings, and meaning.`,
    author: {
      '@type': 'Organization',
      name: 'Imiwa',
    },
    datePublished: new Date().toISOString(),
    mainEntity: {
      '@type': 'Thing',
      name: `${kanjiData.kanji} Kanji`,
      description: kanjiData.meaning,
      alternateName: [kanjiData.onyomi, kanjiData.kunyomi],
    },
    keywords: `${kanjiData.kanji}, kanji, stroke order, Japanese, JLPT ${kanjiData.level}`,
  };
  
  return (
    <>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      <Header />
      
      <div className="container mx-auto p-8 max-w-4xl">
        {/* Breadcrumbs */}
        <nav className="text-sm text-gray-600 mb-6">
          <Link href="/kanji" className="hover:text-blue-600 flex items-center">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Kanji Dictionary
          </Link>
        </nav>
        
        {/* Header */}
        <div className="text-center mb-8 space-y-4">
          <h1 className="text-8xl font-bold mb-4">{kanjiData.kanji}</h1>
          <div className="flex justify-center space-x-2">
            <Badge variant="secondary" className="text-lg px-3 py-1">
              <BookOpen className="w-4 h-4 mr-1" />
              JLPT {kanjiData.level}
            </Badge>
          </div>
        </div>
        
        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Stroke Order */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Stroke Order Animation</h2>
            <StrokeOrderViewer kanji={kanjiData.kanji} />
          </div>
          
          {/* Kanji Information */}
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-4">Meaning & Readings</h2>
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-700 mb-2">Meaning</h3>
                  <p className="text-xl">{kanjiData.meaning}</p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-700 mb-2">Onyomi (音読み)</h3>
                  <p className="text-lg font-mono">{kanjiData.onyomi}</p>
                  <p className="text-sm text-gray-600 mt-1">Chinese reading</p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-700 mb-2">Kunyomi (訓読み)</h3>
                  <p className="text-lg font-mono">{kanjiData.kunyomi}</p>
                  <p className="text-sm text-gray-600 mt-1">Japanese reading</p>
                </div>
              </div>
            </div>
            
            {/* Additional Information */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium mb-3">Character Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">JLPT Level:</span>
                  <span className="font-medium">{kanjiData.level}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Unicode:</span>
                  <span className="font-mono">{unicodeInfo.unicode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Hex Code:</span>
                  <span className="font-mono">{unicodeInfo.hex}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* CTA Section */}
        <section className="mt-12 pt-8 border-t border-gray-200">
          <CTASection variant="with-image" />
        </section>
        
        {/* SEO Content */}
        <div className="mt-16 prose prose-lg max-w-none">
          <h2>How to Write {kanjiData.kanji}</h2>
          <p>
            The kanji <strong>{kanjiData.kanji}</strong> means &quot;{kanjiData.meaning}&quot; and is part of the 
            JLPT {kanjiData.level} curriculum. This character is essential for Japanese learners 
            to master. Use the interactive stroke order diagram above to learn the correct writing 
            sequence and practice until you can write it from memory.
          </p>
          
          <h3>Readings and Usage</h3>
          <p>
            <strong>{kanjiData.kanji}</strong> has multiple readings depending on context:
          </p>
          <ul>
            <li><strong>Onyomi</strong> (音読み): {kanjiData.onyomi} - This is the Chinese-derived reading</li>
            <li><strong>Kunyomi</strong> (訓読み): {kanjiData.kunyomi} - This is the native Japanese reading</li>
          </ul>
          
          <h3>Learning Tips for {kanjiData.kanji}</h3>
          <ul>
            <li>Practice writing the strokes in the correct order shown in the animation on paper</li>
            <li>Pay attention to stroke direction and sequence</li>
            <li>Start slowly and build up speed as you become more comfortable</li>
            <li>Use spaced repetition to review this kanji regularly</li>
            <li>Watch captioned YouTube videos such as Speak Japanese Naturally</li>
          </ul>
        </div>
      </div>
    </>
  );
}