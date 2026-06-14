import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getSEOTags } from '@/lib/seo';
import { getOptimizedKanjiMetadata, getPrimaryMeaning } from '@/lib/seo/kanji-optimization';
import { Badge } from '@/components/ui/badge';
import { StrokeOrderViewer } from '@/components/StrokeOrderViewer';
import { CTASection } from '@/components/CTASection';
import Header from '@/components/sections/Header';
import { RelatedKanjiSection } from '@/components/kanji/RelatedKanjiSection';
import { N5_KANJI } from '@/lib/constants/n5-kanji';
import { N4_KANJI } from '@/lib/constants/n4-kanji';
import { N3_KANJI } from '@/lib/constants/n3-kanji';
import { N2_KANJI } from '@/lib/constants/n2-kanji';
import { N1_KANJI } from '@/lib/constants/n1-kanji';
// import { strokeOrderService } from '@/lib/stroke-order';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { AdBanner } from '@/components/AdBanner';

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
    return getSEOTags({
      title: 'Kanji Not Found | Japanese Stroke Order Dictionary',
      description: 'The requested kanji was not found in our database.',
    });
  }
  
  // Use the optimized metadata function from dedicated utility
  const { title, description } = getOptimizedKanjiMetadata(kanjiData);
  const primaryMeaning = getPrimaryMeaning(kanjiData.meaning);
  
  return getSEOTags({
    title,
    description,
    keywords: [
      // Kanji + meaning combinations – matches "[kanji] [meaning] kanji" searches
      `${kanjiData.kanji} kanji`,
      `${kanjiData.kanji} ${primaryMeaning} kanji`,
      `${kanjiData.kanji} ${primaryMeaning}`,
      // Meaning-first phrases – matches "[meaning] kanji stroke order" searches
      `${primaryMeaning} kanji`,
      `${primaryMeaning} kanji stroke order`,
      `${kanjiData.kanji} ${primaryMeaning} kanji stroke order`,
      // Stroke-order focused
      `${kanjiData.kanji} stroke order`,
      `${kanjiData.kanji} ${primaryMeaning} stroke order`,
      `how to write ${kanjiData.kanji}`,
      // Meaning and readings
      `${kanjiData.kanji} meaning`,
      ...kanjiData.meaning.split(',').map(m => m.trim()),
      // Level / generic
      `JLPT ${kanjiData.level}`,
      'Japanese kanji',
      'kanji stroke order',
    ],
    openGraph: {
      title,
      description,
      type: 'article',
    },
    canonicalUrlRelative: `/kanji/${encodeURIComponent(kanjiData.kanji)}`,
  });
}

export default async function KanjiDetailPage({ params }: Props) {
  const { character } = await params;
  const decodedCharacter = decodeURIComponent(character);
  const kanjiData = ALL_KANJI_DATA.find(k => k.kanji === decodedCharacter);
  
  if (!kanjiData) {
    notFound();
  }
  
  // const unicodeInfo = strokeOrderService.getUnicodeInfo(kanjiData.kanji);
  const primaryMeaning = getPrimaryMeaning(kanjiData.meaning);
  // First available reading, for the reverse-intent intro sentence.
  const firstReading = kanjiData.onyomi || kanjiData.kunyomi || '';
  
  const baseUrl = 'https://www.michikanji.com';
  const pageUrl = `${baseUrl}/kanji/${encodeURIComponent(kanjiData.kanji)}`;

  // Build a human-readable readings string used in FAQ answers.
  const readingsAnswer = [
    kanjiData.onyomi && `onyomi (Chinese-derived) ${kanjiData.onyomi}`,
    kanjiData.kunyomi && `kunyomi (native Japanese) ${kanjiData.kunyomi}`,
  ]
    .filter(Boolean)
    .join(', ');

  // Generate JSON-LD structured data for SEO. We emit three linked types:
  // Article (kept), FAQPage (expandable rich result), and BreadcrumbList.
  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${kanjiData.kanji} ${primaryMeaning} Kanji – Stroke Order and Meaning`,
    description: `Learn the ${primaryMeaning} kanji ${kanjiData.kanji} with interactive stroke order diagram, readings, and meaning. JLPT ${kanjiData.level}.`,
    author: {
      '@type': 'Organization',
      name: 'Imiwa',
    },
    mainEntity: {
      '@type': 'Thing',
      name: `${kanjiData.kanji} – ${primaryMeaning} Kanji`,
      description: kanjiData.meaning,
      // Skip empty reading fields so we don't emit blank alternate names.
      alternateName: [kanjiData.onyomi, kanjiData.kunyomi].filter(Boolean),
    },
    keywords: `${kanjiData.kanji}, ${primaryMeaning} kanji, ${primaryMeaning} kanji stroke order, kanji stroke order, Japanese, JLPT ${kanjiData.level}`,
  };

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `What does the kanji ${kanjiData.kanji} mean?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `The kanji ${kanjiData.kanji} means "${kanjiData.meaning}". It is a JLPT ${kanjiData.level} character.`,
        },
      },
      {
        '@type': 'Question',
        name: `How do you write the kanji ${kanjiData.kanji}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Write ${kanjiData.kanji} ("${primaryMeaning}") by following the correct stroke order. Use the interactive, step-by-step stroke order animation on this page to practise each stroke in sequence and build muscle memory.`,
        },
      },
      {
        '@type': 'Question',
        name: `What are the readings of ${kanjiData.kanji}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: readingsAnswer
            ? `${kanjiData.kanji} has these readings: ${readingsAnswer}.`
            : `${kanjiData.kanji} is the "${primaryMeaning}" kanji. See its onyomi and kunyomi readings on this page.`,
        },
      },
    ],
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: baseUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Kanji Dictionary',
        item: `${baseUrl}/kanji`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: `${kanjiData.kanji} — ${primaryMeaning}`,
        item: pageUrl,
      },
    ],
  };

  const jsonLd = [articleJsonLd, faqJsonLd, breadcrumbJsonLd];

  return (
    <>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      <Header />
      
      <div className="container mx-auto p-8 max-w-4xl">
        {/* Breadcrumbs (mirror the BreadcrumbList JSON-LD) */}
        <nav className="text-sm text-gray-600 mb-6" aria-label="Breadcrumb">
          <ol className="flex items-center flex-wrap gap-1">
            <li className="flex items-center">
              <Link href="/" className="hover:text-blue-600 flex items-center">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Home
              </Link>
            </li>
            <li aria-hidden className="text-gray-400">/</li>
            <li>
              <Link href="/kanji" className="hover:text-blue-600">
                Kanji Dictionary
              </Link>
            </li>
            <li aria-hidden className="text-gray-400">/</li>
            <li className="text-gray-800 font-medium" aria-current="page">
              {kanjiData.kanji} — {primaryMeaning}
            </li>
          </ol>
        </nav>
        
        {/* Header — meaning-bearing H1: big character stays visual, the
            English meaning is real, indexable text for "[meaning] kanji" queries. */}
        <div className="text-center mb-8 space-y-4">
          <h1 className="space-y-1">
            <span className="block text-8xl font-bold">{kanjiData.kanji}</span>
            <span className="block text-2xl font-semibold text-gray-700">
              &ldquo;{primaryMeaning}&rdquo; Kanji
            </span>
          </h1>

          {/* Above-the-fold intro targeting reverse intent
              ("kanji for X" / "X in Japanese"). */}
          <p className="text-base text-gray-600 max-w-2xl mx-auto">
            The Japanese kanji for &ldquo;{primaryMeaning}&rdquo; is{' '}
            <strong>{kanjiData.kanji}</strong>
            {firstReading && (
              <> (<span className="font-mono">{firstReading}</span>)</>
            )}
            . It&rsquo;s a JLPT {kanjiData.level} character — follow the animated
            stroke order below to learn how to write it, along with its readings
            and full meaning.
          </p>

          {/* Full comma-separated meaning */}
          <p className="text-lg text-gray-700">{kanjiData.meaning}</p>

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
            {/* <div className="bg-blue-50 p-4 rounded-lg">
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
            </div> */}
          </div>
        </div>

        {/* Tan thumbs-up accent – between kanji content and related kanji */}
        <div className="flex flex-col items-center gap-2 mt-10">
          <Image
            src="/assets/tan-thumbsup.png"
            alt="Tan the tanuki mascot giving a thumbs up"
            width={160}
            height={160}
            className="w-32 md:w-40 drop-shadow-sm"
          />
          <p className="text-sm text-gray-500">Nice — one more kanji learned!</p>
        </div>

          {/* Related Kanji - BEFORE CTA */}
        <RelatedKanjiSection
          currentKanji={kanjiData}
          allKanji={ALL_KANJI_DATA}
        />

        {/* Sponsor Ad */}
        <section className="mt-10">
          <AdBanner />
        </section>

        {/* CTA Section */}
        <section className="mt-12 pt-8 border-t border-gray-200">
          <CTASection variant="with-image" />
        </section>
        
        {/* SEO Content */}
        <div className="mt-16 prose prose-lg max-w-none">
          <h2>How to Write the {primaryMeaning} Kanji {kanjiData.kanji} – Stroke Order</h2>
          <p>
            The kanji <strong>{kanjiData.kanji}</strong> means &quot;{kanjiData.meaning}&quot; and is part of the 
            JLPT {kanjiData.level} curriculum. This character is essential for Japanese learners 
            to master. Use the interactive stroke order diagram above to learn the correct writing 
            sequence and practice until you can write it from memory.
          </p>
          
          <h3>{kanjiData.kanji} {primaryMeaning} Kanji – Readings and Usage</h3>
          <p>
            <strong>{kanjiData.kanji}</strong> has multiple readings depending on context:
          </p>
          <ul>
            <li><strong>Onyomi</strong> (音読み): {kanjiData.onyomi} - This is the Chinese-derived reading</li>
            <li><strong>Kunyomi</strong> (訓読み): {kanjiData.kunyomi} - This is the native Japanese reading</li>
          </ul>
          
          <h3>Learning Tips for {kanjiData.kanji} ({primaryMeaning})</h3>
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