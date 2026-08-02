import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getSEOTags } from '@/lib/seo';
import { getOptimizedKanjiMetadata, getPrimaryMeaning } from '@/lib/seo/kanji-optimization';
import { kanjiReadings, romajiSearchKeys, primaryRomaji, romajiLabel, type Reading } from '@/lib/romaji/readings';
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

/**
 * One reading per line: the kana exactly as the dictionary records it, then its
 * romaji. The affix hyphen is re-attached on the romaji side so a bound form
 * (`-び` / `-bi`) still reads as bound — `Reading.display` deliberately holds
 * only clean romaji, which is what the validator's no-annotation-leakage sweep
 * asserts.
 */
function ReadingList({ readings }: { readings: Reading[] }) {
  if (readings.length === 0) {
    return <p className="text-lg font-mono text-gray-500">—</p>;
  }

  return (
    <ul className="text-lg font-mono space-y-0.5">
      {readings.map((r, i) => (
        <li key={`${r.raw}-${i}`}>
          <span lang="ja">{r.raw}</span>{' '}
          <span className="text-gray-600">
            {r.affix === 'suffix' ? `-${r.display}` : r.affix === 'prefix' ? `${r.display}-` : r.display}
          </span>
        </li>
      ))}
    </ul>
  );
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

  // Romaji spellings of the readings — "michi", but also "dou"/"do"/"dō" for
  // どう, since a long vowel has no single correct Latin spelling and learners
  // type all of them. Capped: the keys are ordered by reading, so the first
  // few cover the primary on/kun spellings, and a kanji with six readings
  // would otherwise emit fifty-odd near-duplicate phrases.
  const romajiKeys = romajiSearchKeys(kanjiData).slice(0, 6);

  return getSEOTags({
    title,
    description,
    keywords: [
      // Romaji phrases — the query class the page previously could not match
      // at all. "michi kanji", "michi kanji meaning", …
      ...romajiKeys.flatMap(r => [
        `${r} kanji`,
        `${r} kanji meaning`,
        `${r} in japanese`,
      ]),
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

  // Structured readings, with romaji. Every reading-bearing surface below goes
  // through this rather than reading the raw fields, which carry two different
  // okurigana notations and store 137 onyomi in katakana.
  const readings = kanjiReadings(kanjiData);
  const romaji = primaryRomaji(readings);

  /** `みち (michi)` — kana first, romaji in support. Used in prose answers. */
  const readingWithRomaji = (r: { kanaFull: string; romajiFull: string }) =>
    `${r.kanaFull} (${r.romajiFull})`;

  // Build a human-readable readings string used in FAQ answers.
  const readingsAnswer = [
    readings.onyomi.length &&
      `onyomi (Chinese-derived) ${readings.onyomi.map(readingWithRomaji).join(', ')}`,
    readings.kunyomi.length &&
      `kunyomi (native Japanese) ${readings.kunyomi.map(readingWithRomaji).join(', ')}`,
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
      // Every name this character goes by: its readings in kana, and each of
      // those in romaji. Previously this emitted the raw fields, which meant
      // annotation syntax ("ひと（つ）", "しげ.る") leaked into structured data
      // as though it were a name. `kanjiReadings` strips that.
      alternateName: Array.from(
        new Set([
          ...readings.all.map(r => r.kanaFull),
          ...readings.all.map(r => r.romajiFull),
        ]),
      ).filter(Boolean),
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
          text: `The kanji ${kanjiData.kanji}${romaji ? ` (${romaji})` : ''} means "${kanjiData.meaning}". It is a JLPT ${kanjiData.level} character.`,
        },
      },
      // The reverse question, and the one that exposed this whole gap: someone
      // has heard a word and wants the character. Phrased with the romaji
      // because that is what they can type. Omitted when we have no reading.
      ...(romaji
        ? [{
            '@type': 'Question',
            name: `What kanji is "${romaji}"?`,
            acceptedAnswer: {
              '@type': 'Answer',
              text: `"${romaji}" is written with the kanji ${kanjiData.kanji}, meaning "${kanjiData.meaning}". ${readingsAnswer ? `Its readings are ${readingsAnswer}.` : ''} It is a JLPT ${kanjiData.level} character.`.trim(),
            },
          }]
        : []),
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
      
      {/* <main id="main-content" tabIndex={-1}>, not <div>: Header and Footer emit banner/contentinfo landmarks,
          so without this every word of the page sits outside any landmark and
          there is no way to jump past the sticky header. The rest of the site
          (app/page.tsx, /tos, /advertise, …) already does this; the /kanji/*
          family was the holdout. */}
      <main id="main-content" tabIndex={-1} className="container mx-auto p-8 max-w-4xl">
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
              <span lang="ja">{kanjiData.kanji}</span> — {primaryMeaning}
            </li>
          </ol>
        </nav>
        
        {/* Header — meaning-bearing H1: big character stays visual, the
            English meaning is real, indexable text for "[meaning] kanji" queries. */}
        <div className="text-center mb-8 space-y-4">
          {/* lang="ja" on every run of Japanese: the document is lang="en", so
              without it a screen reader hands these to an English voice, which
              either skips the character or mangles the readings. The sentences
              layer already does this per token (components/sentences/furigana);
              this markup predates it. */}
          <h1 className="space-y-1">
            <span lang="ja" className="block text-8xl font-bold">
              {kanjiData.kanji}
            </span>
            <span className="block text-2xl font-semibold text-gray-700">
              &ldquo;{primaryMeaning}&rdquo; Kanji
            </span>
            {/* Inside the h1, not beside it: the romaji is part of what this
                character is called, and it is the form the arriving searcher
                actually typed. Kept visually subordinate so the hierarchy of
                character → meaning is unchanged. */}
            {romaji && (
              <span className="block text-lg font-normal text-gray-500">
                {romajiLabel(kanjiData)}
              </span>
            )}
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
              How to write <span lang="ja">{kanjiData.kanji}</span>
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

            {/* Readings carry their romaji beside them. This is the page's only
                indexable romaji, and it is also the reason the page is legible
                to a learner who cannot yet read kana — which is most of the
                people arriving here from a "michi kanji" style search.

                lang="ja" is scoped to the kana run alone: the romaji is Latin
                script and an English voice should read it as such. */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-700 mb-2">
                Onyomi (<span lang="ja">音読み</span>)
              </h3>
              <ReadingList readings={readings.onyomi} />
              <p className="text-sm text-gray-600 mt-1">Chinese reading</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-700 mb-2">
                Kunyomi (<span lang="ja">訓読み</span>)
              </h3>
              <ReadingList readings={readings.kunyomi} />
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
          <p className="text-sm text-gray-600">Nice — one more kanji learned!</p>
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

        {/* CTA Section */}
        <section className={SECTION_BAND}>
          <CTASection variant="with-image" />
        </section>
      </main>
    </>
  );
}