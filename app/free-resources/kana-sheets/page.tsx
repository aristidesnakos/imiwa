import { Metadata } from 'next';
import { getSEOTags } from '@/lib/seo';
import Header from '@/components/sections/Header';
import Footer from '@/components/sections/Footer';
import { SheetCard } from '@/components/kana/SheetCard';
import { SHEET_CONFIGS } from './constants';
import { buildDownloadUrl, buildAriaLabel } from '@/lib/utils/kana-sheets';

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
        {/* Header */}
        <div className="text-center mb-10 pb-8 border-b-2 border-border">
          <h1 className="text-4xl font-bold text-card-foreground mb-3">
            Kana Practice Sheet Generator
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Generate printable practice sheets for hiragana and katakana learning with proper stroke order diagrams
          </p>
        </div>

        {/* Sheet Gallery */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-card-foreground mb-6">
            Choose Your Practice Sheet
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {SHEET_CONFIGS.map((config) => (
              <SheetCard
                key={config.id}
                title={config.title}
                badge={config.badge}
                badgeColor={config.badgeColor}
                description={config.description}
                imageUrl={config.imageUrl}
                imageAlt={config.imageAlt}
                downloadUrl={buildDownloadUrl(
                  config.kanaType,
                  config.sheetType,
                  config.includeRomaji
                )}
                ariaLabel={buildAriaLabel(config)}
              />
            ))}
          </div>
        </section>

        {/* Instructions */}
        <section className="bg-muted p-6 rounded-md border border-border" aria-labelledby="instructions">
          <h3 id="instructions" className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
            <span role="img" aria-label="Document">📄</span>
            How to Print to PDF:
          </h3>
          <ol className="text-muted-foreground leading-relaxed space-y-1 list-decimal list-inside">
            <li>Click any download button above to open the practice sheet in a new tab</li>
            <li>Wait for the page to load completely</li>
            <li>Press <strong>Ctrl+P</strong> (Windows) or <strong>Cmd+P</strong> (Mac)</li>
            <li>In the print dialog, select <strong>&quot;Save as PDF&quot;</strong> as the destination</li>
            <li>Click <strong>&quot;Save&quot;</strong> to download your practice sheet</li>
          </ol>
          <div className="mt-4 p-3 bg-[#7BB3D3]/10 rounded-md border border-[#7BB3D3]/20">
            <p className="text-sm text-foreground flex items-start gap-2">
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