import { Metadata } from 'next';
import { getSEOTags } from '@/lib/seo';
import Header from '@/components/sections/Header';
import Footer from '@/components/sections/Footer';
import { N1_KANJI } from '@/lib/constants/n1-kanji';
import { KanjiN5WorkbookCTA } from '@/components/kanji/KanjiN5WorkbookCTA';

export const metadata: Metadata = getSEOTags({
  title: 'N1 Kanji Practice Sheets Generator | Printable Japanese Worksheets',
  description: 'Generate printable kanji practice sheets for JLPT N1 characters. Download practice grids with stroke order diagrams for handwriting practice.',
  keywords: [
    'kanji practice sheets',
    'N1 kanji',
    'Japanese writing practice',
    'kanji worksheets',
    'stroke order',
    'kanji PDF',
    'Japanese handwriting',
    'JLPT N1',
    'kanji stroke order',
    'practice sheets',
    'Japanese learning'
  ],
  openGraph: {
    title: 'N1 Kanji Practice Sheets Generator | Printable Japanese Worksheets',
    description: 'Generate high-quality printable practice sheets for JLPT N1 kanji. Perfect for learning proper stroke order and building muscle memory.',
    type: 'website',
  },
  canonicalUrlRelative: '/free-resources/kanji-sheets/n1-sheets',
});

export default function N1KanjiSheetsPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'N1 Kanji Practice Sheets Generator',
    description: 'Generate printable practice sheets for JLPT N1 kanji characters with stroke order diagrams',
    url: 'https://www.michikanji.com/free-resources/kanji-sheets/n1-sheets',
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
    keywords: 'kanji practice sheets, N1, JLPT, Japanese writing, stroke order'
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
            N1 Kanji Practice Sheet Generator
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto">
            Generate printable practice sheets for JLPT N1 kanji with stroke order diagrams and practice grids
          </p>
        </div>

        <div className="bg-gray-50 p-8 rounded-lg mb-8">
          <h2 className="text-xl font-semibold text-gray-700 mb-5">
            Select a Kanji Character ({N1_KANJI.length} available):
          </h2>

          <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-15 gap-2 mb-6">
            {N1_KANJI.map((kanji) => (
              <a
                key={kanji.kanji}
                href={`/api/kanji-sheets?character=${encodeURIComponent(kanji.kanji)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="aspect-square flex items-center justify-center text-2xl font-bold bg-white hover:bg-blue-50 border-2 border-gray-300 hover:border-blue-500 rounded transition-all duration-200 cursor-pointer"
                title={`${kanji.kanji} - ${kanji.meaning}`}
                aria-label={`Generate practice sheet for ${kanji.kanji}`}
              >
                {kanji.kanji}
              </a>
            ))}
          </div>
        </div>

        {/* CTA Banner for Premium Workbook */}
        <KanjiN5WorkbookCTA />

        <section className="bg-cyan-50 p-6 rounded-md border border-cyan-200 mb-6" aria-labelledby="instructions">
          <h3 id="instructions" className="text-lg font-medium text-cyan-900 mb-4 flex items-center gap-2">
            <span role="img" aria-label="Document">📄</span>
            How to Print to PDF:
          </h3>
          <ol className="text-cyan-800 leading-relaxed space-y-1 list-decimal list-inside">
            <li>Click any kanji character above to open its practice sheet in a new tab</li>
            <li>Wait for the page to load completely (stroke order diagram will appear)</li>
            <li>Press <strong>Ctrl+P</strong> (Windows) or <strong>Cmd+P</strong> (Mac)</li>
            <li>In the print dialog, select <strong>&quot;Save as PDF&quot;</strong> as the destination</li>
            <li>Click <strong>&quot;Save&quot;</strong> to download your practice sheet</li>
          </ol>
          <div className="mt-4 p-3 bg-cyan-100 rounded-md">
            <p className="text-sm text-cyan-800 flex items-start gap-2">
              <span role="img" aria-label="Light bulb">💡</span>
              <span><strong>Tip:</strong> Each sheet includes character information, stroke order diagram, and an 80-square practice grid with guides in the first column.</span>
            </p>
          </div>
        </section>

        <section className="bg-green-50 p-6 rounded-md border border-green-200" aria-labelledby="features">
          <h3 id="features" className="text-lg font-medium text-green-900 mb-4">
            What&apos;s Included:
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
      </main>

      <Footer />
    </>
  );
}
