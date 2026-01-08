import { Metadata } from 'next';
import { getSEOTags } from '@/lib/seo';
import Header from '@/components/sections/Header';
import Footer from '@/components/sections/Footer';

export const metadata: Metadata = getSEOTags({
  title: 'Kana Practice Sheets Generator | Hiragana & Katakana PDF Worksheets',
  description: 'Generate printable kana practice sheets for Japanese hiragana and katakana. Download empty practice grids and stroke order reference PDFs for handwriting practice.',
  keywords: [
    'kana practice sheets',
    'hiragana practice',
    'katakana practice', 
    'Japanese writing practice',
    'kana worksheets',
    'stroke order',
    'hiragana PDF',
    'katakana PDF',
    'Japanese handwriting',
    'kana stroke order',
    'practice sheets',
    'Japanese learning'
  ],
  openGraph: {
    title: 'Kana Practice Sheets Generator | Printable Hiragana & Katakana PDFs',
    description: 'Generate high-quality printable practice sheets for Japanese kana. Perfect for learning proper hiragana and katakana stroke order.',
    type: 'website',
  },
  canonicalUrlRelative: '/free-resources/kana-sheets',
});

// Constants
const SHEET_TYPES = {
  EMPTY: 'empty',
  STROKE_ORDER: 'stroke-order'
} as const;

const KANA_TYPES = {
  HIRAGANA: 'hiragana', 
  KATAKANA: 'katakana'
} as const;

export default function KanaSheetsPage() {
  // JSON-LD structured data for SEO
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Kana Practice Sheets Generator',
    description: 'Generate printable practice sheets for Japanese hiragana and katakana with stroke order diagrams',
    url: 'https://www.michikanji.com/free-resources/kana-sheets',
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
    keywords: 'kana practice sheets, hiragana, katakana, Japanese writing, stroke order'
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 py-10 min-h-[60vh]">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-800 mb-3">
            Kana Practice Sheet Generator
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto">
            Generate printable practice sheets for hiragana and katakana learning with proper stroke order diagrams
          </p>
        </div>

        <div className="bg-gray-50 p-8 rounded-lg mb-8">
          <h2 className="text-xl font-semibold text-gray-700 mb-5">Available Practice Sheets:</h2>
          
          <div className="space-y-6">
            
            <section className="bg-white p-6 rounded-md border border-gray-200" aria-labelledby="empty-sheets">
              <h3 id="empty-sheets" className="text-lg font-medium text-green-600 mb-3 flex items-center gap-2">
                <span role="img" aria-label="Writing">📝</span>
                Empty Practice Sheets
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Blank grids with guidelines for practicing stroke order
              </p>
              <div className="flex flex-wrap gap-3">
                <a 
                  href={`/api/kana-sheets?type=${KANA_TYPES.HIRAGANA}&format=${SHEET_TYPES.EMPTY}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded transition-colors duration-200 text-sm"
                  aria-label="Download Hiragana empty practice sheet"
                >
                  Hiragana Empty
                </a>
                <a 
                  href={`/api/kana-sheets?type=${KANA_TYPES.KATAKANA}&format=${SHEET_TYPES.EMPTY}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded transition-colors duration-200 text-sm"
                  aria-label="Download Katakana empty practice sheet"
                >
                  Katakana Empty
                </a>
              </div>
            </section>


            <section className="bg-white p-6 rounded-md border border-gray-200" aria-labelledby="stroke-order-sheets">
              <h3 id="stroke-order-sheets" className="text-lg font-medium text-red-600 mb-3 flex items-center gap-2">
                <span role="img" aria-label="Pen">✏️</span>
                Stroke Order Diagrams
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Interactive stroke order diagrams showing the correct way to write each character
              </p>
              <div className="flex flex-wrap gap-3">
                <a 
                  href={`/api/kana-sheets?type=${KANA_TYPES.HIRAGANA}&format=${SHEET_TYPES.STROKE_ORDER}&romaji=true`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded transition-colors duration-200 text-sm"
                  aria-label="Download Hiragana stroke order sheet with romaji"
                >
                  Hiragana Strokes + Romaji
                </a>
                <a 
                  href={`/api/kana-sheets?type=${KANA_TYPES.KATAKANA}&format=${SHEET_TYPES.STROKE_ORDER}&romaji=true`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded transition-colors duration-200 text-sm"
                  aria-label="Download Katakana stroke order sheet with romaji"
                >
                  Katakana Strokes + Romaji
                </a>
              </div>
            </section>

          </div>
        </div>

        <section className="bg-cyan-50 p-6 rounded-md border border-cyan-200" aria-labelledby="instructions">
          <h3 id="instructions" className="text-lg font-medium text-cyan-900 mb-4 flex items-center gap-2">
            <span role="img" aria-label="Document">📄</span>
            How to Print to PDF:
          </h3>
          <ol className="text-cyan-800 leading-relaxed space-y-1 list-decimal list-inside">
            <li>Click any link above to open the practice sheet in a new tab</li>
            <li>Wait for the page to load completely</li>
            <li>Press <strong>Ctrl+P</strong> (Windows) or <strong>Cmd+P</strong> (Mac)</li>
            <li>In the print dialog, select <strong>&quot;Save as PDF&quot;</strong> as the destination</li>
            <li>Click <strong>&quot;Save&quot;</strong> to download your practice sheet</li>
          </ol>
          <div className="mt-4 p-3 bg-cyan-100 rounded-md">
            <p className="text-sm text-cyan-800 flex items-start gap-2">
              <span role="img" aria-label="Light bulb">💡</span>
              <span><strong>Tip:</strong> For best results, use landscape orientation for a larger grid.</span>
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}