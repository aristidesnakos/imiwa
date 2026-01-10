import { Metadata } from 'next';
import { getSEOTags } from '@/lib/seo';
import Header from '@/components/sections/Header';
import Footer from '@/components/sections/Footer';
import Link from 'next/link';

export const metadata: Metadata = getSEOTags({
  title: 'Kanji Practice Sheets Generator | JLPT N5-N1 Printable Worksheets',
  description: 'Generate printable kanji practice sheets for all JLPT levels. Download practice grids with stroke order diagrams for handwriting practice.',
  keywords: [
    'kanji practice sheets',
    'JLPT kanji',
    'Japanese writing practice',
    'kanji worksheets',
    'stroke order',
    'kanji PDF',
    'Japanese handwriting',
    'JLPT N5 N4 N3 N2 N1',
    'kanji stroke order',
    'practice sheets',
    'Japanese learning'
  ],
  openGraph: {
    title: 'Kanji Practice Sheets Generator | JLPT N5-N1 Printable Worksheets',
    description: 'Generate high-quality printable practice sheets for JLPT kanji. Perfect for learning proper stroke order and building muscle memory.',
    type: 'website',
  },
  canonicalUrlRelative: '/free-resources/kanji-sheets',
});

export default function KanjiSheetsLandingPage() {
  const levels = [
    {
      level: 'N5',
      title: 'N5 Kanji Practice Sheets',
      description: 'Basic kanji (~100 characters) for beginners',
      count: '~100 characters',
      available: true,
      href: '/free-resources/kanji-sheets/n5-sheets',
      color: 'green'
    },
    {
      level: 'N4',
      title: 'N4 Kanji Practice Sheets',
      description: 'Elementary kanji (~170 characters)',
      count: '~170 characters',
      available: false,
      href: '/free-resources/kanji-sheets/n4-sheets',
      color: 'blue'
    },
    {
      level: 'N3',
      title: 'N3 Kanji Practice Sheets',
      description: 'Intermediate kanji (~370 characters)',
      count: '~370 characters',
      available: false,
      href: '/free-resources/kanji-sheets/n3-sheets',
      color: 'yellow'
    },
    {
      level: 'N2',
      title: 'N2 Kanji Practice Sheets',
      description: 'Upper intermediate kanji (~370 characters)',
      count: '~370 characters',
      available: false,
      href: '/free-resources/kanji-sheets/n2-sheets',
      color: 'orange'
    },
    {
      level: 'N1',
      title: 'N1 Kanji Practice Sheets',
      description: 'Advanced kanji (~1000+ characters)',
      count: '~1000+ characters',
      available: false,
      href: '/free-resources/kanji-sheets/n1-sheets',
      color: 'red'
    }
  ];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Kanji Practice Sheets Generator',
    description: 'Generate printable practice sheets for JLPT kanji characters with stroke order diagrams',
    url: 'https://www.michikanji.com/free-resources/kanji-sheets',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Web Browser',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD'
    },
    author: {
      '@type': 'Organization',
      name: 'MichiKanji'
    },
    keywords: 'kanji practice sheets, JLPT, Japanese writing, stroke order'
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Header />

      <main className="max-w-6xl mx-auto px-4 py-10 min-h-[60vh]">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-800 mb-3">
            Kanji Practice Sheets Generator
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto">
            Generate printable practice sheets for JLPT kanji with stroke order diagrams and practice grids
          </p>
        </div>

        <div className="bg-gray-50 p-8 rounded-lg mb-8">
          <h2 className="text-xl font-semibold text-gray-700 mb-5">
            Select Your JLPT Level:
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {levels.map((level) => (
              <div
                key={level.level}
                className={`bg-white border-2 rounded-lg p-6 transition-all duration-200 ${
                  level.available
                    ? 'border-gray-300 hover:border-green-500 hover:shadow-lg'
                    : 'border-gray-200 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-2xl font-bold text-gray-800">{level.level}</h3>
                  {level.available ? (
                    <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">
                      Available
                    </span>
                  ) : (
                    <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2.5 py-0.5 rounded">
                      Coming Soon
                    </span>
                  )}
                </div>
                <p className="text-gray-700 font-medium mb-2">{level.title}</p>
                <p className="text-gray-600 text-sm mb-3">{level.description}</p>
                <p className="text-gray-500 text-xs mb-4">{level.count}</p>
                {level.available ? (
                  <Link
                    href={level.href}
                    className="block w-full text-center bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded transition-colors duration-200"
                  >
                    Generate Sheets
                  </Link>
                ) : (
                  <button
                    disabled
                    className="w-full bg-gray-300 text-gray-500 font-medium py-2 px-4 rounded cursor-not-allowed"
                  >
                    Not Available Yet
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <section className="bg-green-50 p-6 rounded-md border border-green-200 mb-6" aria-labelledby="features">
          <h3 id="features" className="text-lg font-medium text-green-900 mb-4">
            What&apos;s Included in Each Sheet:
          </h3>
          <ul className="text-green-800 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-green-600">✓</span>
              <span><strong>Character Information:</strong> Meaning, onyomi, kunyomi, and stroke count</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600">✓</span>
              <span><strong>Stroke Order Diagram:</strong> Visual reference for proper writing technique</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600">✓</span>
              <span><strong>Practice Grid:</strong> 80 squares (10×8) with crosshair guides</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600">✓</span>
              <span><strong>Guided Practice:</strong> First column shows stroke order for reference</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600">✓</span>
              <span><strong>Print-Optimized:</strong> A4 portrait layout ready for home printing</span>
            </li>
          </ul>
        </section>

        <section className="bg-cyan-50 p-6 rounded-md border border-cyan-200" aria-labelledby="instructions">
          <h3 id="instructions" className="text-lg font-medium text-cyan-900 mb-4 flex items-center gap-2">
            <span role="img" aria-label="Document">📄</span>
            How to Use:
          </h3>
          <ol className="text-cyan-800 leading-relaxed space-y-1 list-decimal list-inside">
            <li>Select your JLPT level above</li>
            <li>Click on any kanji character to open its practice sheet</li>
            <li>Press <strong>Ctrl+P</strong> (Windows) or <strong>Cmd+P</strong> (Mac)</li>
            <li>Select <strong>&quot;Save as PDF&quot;</strong> as the destination</li>
            <li>Click <strong>&quot;Save&quot;</strong> to download your practice sheet</li>
          </ol>
        </section>
      </main>

      <Footer />
    </>
  );
}
