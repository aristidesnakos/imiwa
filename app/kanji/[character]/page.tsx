import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getSEOTags } from '@/lib/seo';
import { getOptimizedKanjiMetadata, getPrimaryMeaning } from '@/lib/seo/kanji-optimization';
import {
  SITE_URL,
  SITE_NAME,
  SITE_LOGO,
  SITE_OG_IMAGE,
  KANJI_CONTENT_PUBLISHED,
  KANJI_CONTENT_LAST_MODIFIED,
} from '@/lib/seo/site';
import { Badge } from '@/components/ui/badge';
import { StrokeOrderViewer } from '@/components/StrokeOrderViewer';
import { CTASection } from '@/components/CTASection';
import Header from '@/components/sections/Header';
import { RelatedKanjiSection } from '@/components/kanji/RelatedKanjiSection';
import { ExampleSentencesSection } from '@/components/kanji/ExampleSentencesSection';
import { KanjiActionBar } from '@/components/kanji/KanjiActionBar';
import { SECTION_BAND, SECTION_HEADING } from '@/components/kanji/section';
import { sentencesForKanji } from '@/lib/sentences/published';
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

// Malformed percent-encoding (e.g. a crawler hitting /kanji/%E6) makes
// decodeURIComponent throw. Fall back to the raw segment so we serve a 404
// instead of a 500.
function safeDecode(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

// Kanji data is compiled into the bundle from lib/constants, so every page can be
// prerendered at build time and served from the CDN. Revalidate daily so a content
// change ships without a full rebuild.
export const revalidate = 86400;

// Prerender every kanji we have data for.
export async function generateStaticParams(): Promise<{ character: string }[]> {
  return ALL_KANJI_DATA.map(k => ({ character: k.kanji }));
}

// Anything outside that set still renders on demand (and 404s if unknown).
export const dynamicParams = true;


// SEO metadata generation
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { character } = await params;
  const decodedCharacter = safeDecode(character);
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
  const decodedCharacter = safeDecode(character);
  const kanjiData = ALL_KANJI_DATA.find(k => k.kanji === decodedCharacter);
  
  if (!kanjiData) {
    notFound();
  }
  
  // const unicodeInfo = strokeOrderService.getUnicodeInfo(kanjiData.kanji);
  const primaryMeaning = getPrimaryMeaning(kanjiData.meaning);

  // Layer 4. Empty for most kanji for a long time — the section omits itself.
  const exampleSentences = sentencesForKanji(kanjiData.kanji);

  const pageUrl = `${SITE_URL}/kanji/${encodeURIComponent(kanjiData.kanji)}`;

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
    // Google requires all four of these for Article to be rich-result eligible;
    // without them the block is inert markup.
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': pageUrl,
    },
    datePublished: KANJI_CONTENT_PUBLISHED,
    dateModified: KANJI_CONTENT_LAST_MODIFIED,
    image: {
      '@type': 'ImageObject',
      url: SITE_OG_IMAGE.url,
      width: SITE_OG_IMAGE.width,
      height: SITE_OG_IMAGE.height,
    },
    author: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: SITE_LOGO.url,
        width: SITE_LOGO.width,
        height: SITE_LOGO.height,
      },
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
        item: SITE_URL,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Kanji Dictionary',
        item: `${SITE_URL}/kanji`,
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

          <div className="flex justify-center space-x-2">
            <Badge variant="secondary" className="text-lg px-3 py-1">
              <BookOpen className="w-4 h-4 mr-1" />
              JLPT {kanjiData.level}
            </Badge>
          </div>
        </div>
        
        {/* The two halves of "what this character is": how you write it and what
            it says. Side by side because they are read together — but they are
            real sections, not column labels, so they carry the same heading
            treatment as every other band on the page. */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Stroke Order */}
          <section className="space-y-4" aria-labelledby="writing-heading">
            <h2 id="writing-heading" className={SECTION_HEADING}>
              How to write {kanjiData.kanji}
            </h2>
            <StrokeOrderViewer kanji={kanjiData.kanji} />
          </section>

          {/* Kanji Information */}
          <section className="space-y-4" aria-labelledby="readings-heading">
            <h2 id="readings-heading" className={SECTION_HEADING}>
              Meaning and readings
            </h2>

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
          </section>
        </div>

        {/* Actions on this character. Its own tier, on the page's left spine —
            not an appendix to the stroke-order column. See KanjiActionBar. */}
        <KanjiActionBar kanji={kanjiData.kanji} />

        {/* Example sentences (layer 4). Renders nothing when there are none —
            which is the normal state until a level has been through review. */}
        <ExampleSentencesSection kanji={kanjiData.kanji} sentences={exampleSentences} />

        {/* Tan thumbs-up accent. Centred, and centring on this page means exactly
            one thing: a moment rather than content. The hero is the only other
            place it is used. */}
        <div className="flex flex-col items-center gap-2 mt-16">
          <Image
            src="/assets/tan-thumbsup.png"
            alt="Tan the tanuki mascot giving a thumbs up"
            width={160}
            height={160}
            className="w-32 md:w-40 drop-shadow-sm"
          />
          <p className="text-sm text-gray-500">Nice — one more kanji learned!</p>
          {/* The one place a reader is guaranteed to be in a learning mindset.
              Server-rendered and always visible, unlike the nav links, so it is
              also the crawlable inbound link to /kanji/review. */}
          <Link
            href="/kanji/review"
            className="text-sm font-medium text-purple-700 hover:text-purple-900 transition-colors"
          >
            Review what you&rsquo;ve learned →
          </Link>
        </div>

        {/* Related Kanji — last content section, before the commercial blocks. */}
        <RelatedKanjiSection
          currentKanji={kanjiData}
          allKanji={ALL_KANJI_DATA}
        />

        {/* Sponsor Ad. No rule: it is not part of the page's outline, and giving
            it one would read as a fifth content section. */}
        <section className="mt-12">
          <AdBanner />
        </section>

        {/* CTA Section */}
        <section className={SECTION_BAND}>
          <CTASection variant="with-image" />
        </section>
      </div>
    </>
  );
}