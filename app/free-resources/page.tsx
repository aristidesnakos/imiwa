import { Metadata } from 'next';
import Link from 'next/link';
import { getSEOTags } from '@/lib/seo';
import Header from '@/components/sections/Header';
import { FileText, Download, Package } from 'lucide-react';
import { PopularKanjiLinks } from '@/components/kanji/PopularKanjiLinks';
import { buttonVariants } from '@/components/ui/button';
import EmailCapture from '@/components/EmailCapture';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export const metadata: Metadata = getSEOTags({
  title: 'Free Japanese Learning Resources | Printable Worksheets & Study Materials',
  description: 'Access free Japanese learning resources including printable kana and kanji practice sheets, study guides, and educational materials. Download PDFs for hiragana, katakana, and JLPT kanji practice.',
  keywords: [
    'free Japanese resources',
    'Japanese learning materials',
    'printable worksheets',
    'kana practice sheets',
    'kanji practice sheets',
    'hiragana worksheets',
    'katakana worksheets',
    'JLPT kanji',
    'Japanese study materials',
    'free PDFs',
    'language learning resources',
    'Japanese handwriting practice'
  ],
  openGraph: {
    title: 'Free Japanese Learning Resources | Printable Study Materials',
    description: 'Download free printable Japanese learning materials including kana and kanji practice sheets and study guides.',
    type: 'website',
  },
  canonicalUrlRelative: '/free-resources',
});

export default function FreeResourcesPage() {
  // JSON-LD structured data for SEO
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Free Japanese Learning Resources',
    description: 'Collection of free printable Japanese learning materials and study resources',
    url: 'https://www.michikanji.com/free-resources',
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: [
        {
          '@type': 'CreativeWork',
          name: 'Kana Practice Sheets',
          description: 'Printable hiragana and katakana practice worksheets with stroke order diagrams',
          url: 'https://www.michikanji.com/free-resources/kana-sheets'
        },
        {
          '@type': 'CreativeWork',
          name: 'Kanji Practice Sheets',
          description: 'Printable JLPT kanji practice worksheets for all levels with stroke order diagrams',
          url: 'https://www.michikanji.com/free-resources/kanji-sheets'
        }
      ]
    },
    author: {
      '@type': 'Organization',
      name: 'MichiKanji'
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      <Header />
      
      <main id="main-content" tabIndex={-1} className="max-w-4xl mx-auto px-4 py-10 min-h-[60vh]">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-800 mb-3">
            Free Japanese Learning Resources
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto">
            Access high-quality printable study materials and worksheets to enhance your Japanese learning journey
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
          
          {/* Kana Practice Sheets */}
          <section className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-800">Kana Practice Sheets</h2>
                <p className="text-sm text-gray-600">Hiragana & Katakana Worksheets</p>
              </div>
            </div>
            
            <p className="text-gray-600 mb-4">
              Generate printable practice sheets for Japanese kana characters with stroke order diagrams 
              and empty grids for handwriting practice.
            </p>
            
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">Hiragana</span>
              <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">Katakana</span>
              <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">Stroke Order</span>
              <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">Printable PDF</span>
            </div>
            
            <Link 
              href="/free-resources/kana-sheets"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors duration-200"
            >
              <Download className="w-4 h-4" />
              Access Kana Sheets
            </Link>
          </section>

          {/* Kanji Practice Sheets */}
          <section className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-800">Kanji Practice Sheets</h2>
                <p className="text-sm text-gray-600">JLPT N5-N1 Worksheets</p>
              </div>
            </div>

            <p className="text-gray-600 mb-4">
              Generate printable practice sheets for JLPT kanji characters with stroke order diagrams
              and 80-square practice grids for handwriting practice.
            </p>

            <div className="flex flex-wrap gap-2 mb-4">
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded font-medium">N5 Available</span>
              <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">Stroke Order</span>
              <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">Printable PDF</span>
              <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">80 Practice Squares</span>
            </div>

            <Link
              href="/free-resources/kanji-sheets"
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded transition-colors duration-200"
            >
              <Download className="w-4 h-4" />
              Access Kanji Sheets
            </Link>
          </section>

        </div>

        {/* ─────────────────────────────────────────────────────────────────
            THE PACKS BAND

            The two cards above are generators: pick a character, get a sheet.
            That covers the reader who wants one thing and leaves the reader who
            wants the set with nothing to do — which described this page
            entirely until now. It ranked for "free printable kanji worksheets",
            sent people to a tool, and asked for nothing in return; the store it
            could have handed them to took ONE referral from this whole domain
            in thirty days.

            So: same material, other shape. A generator is a visit, a pack is a
            download, and a download is an email address.

            Deliberately below the generators rather than above them. The
            free tool is the reason the page ranks and the reason a stranger
            trusts it; leading with an offsite link would spend that trust
            before earning it.
            ───────────────────────────────────────────────────────────────── */}
        <section className="mt-8 overflow-hidden rounded-lg border border-border bg-japan-soft-mist">
          <div className="grid grid-cols-1 gap-0 lg:grid-cols-2">
            <div className="order-2 flex flex-col justify-center p-6 md:p-8 lg:order-1">
              <div className="mb-3 flex items-center gap-3">
                <span
                  aria-hidden
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-japan-temple-stone text-japan-deep-ocean"
                >
                  <Package className="h-5 w-5" />
                </span>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-japan-coral-sunset-ink">
                  Free printable PDFs
                </p>
              </div>

              <h2 className="mb-3 text-xl font-semibold text-japan-deep-ocean md:text-2xl">
                Prefer the whole set in one file?
              </h2>

              <p className="mb-5 text-sm leading-relaxed text-japan-mountain-mist md:text-base">
                Hiragana, katakana and every JLPT N5 kanji, collected into printable packs with
                stroke order and practice grids on every page. Free — print as many copies as
                your desk, your class or your study group needs.
              </p>

              <div>
                <a
                  href="https://michikanji.gumroad.com/l/n5-kanji-kana-sheets"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(buttonVariants({ size: 'lg' }), 'w-full sm:w-auto')}
                >
                  <Download aria-hidden />
                  Get the free starter pack
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </div>
            </div>

            <div className="order-1 flex items-center justify-center p-6 md:p-8 lg:order-2">
              <Image
                src="/assets/pack-cover-pack.jpg"
                alt="Free Japanese writing starter pack — hiragana, katakana and every N5 kanji"
                width={960}
                height={540}
                className="h-auto w-full rounded-md"
                sizes="(max-width: 1024px) 90vw, 45vw"
              />
            </div>
          </div>
        </section>

        {/* Internal links to high-priority kanji pages (S3) */}
        <PopularKanjiLinks
          description="Beyond the printables, study any of these frequently searched kanji with an interactive stroke-order animation:"
        />

        {/* The page's only ask. It sits after the material rather than in
            front of it: everything above is usable without an address, which is
            what makes the address worth asking for.

            `title={undefined}` because EmailCapture leads with an <h3> and this
            page's sections lead with an <h2> — letting the card render its own
            title here would skip a heading level. Same reasoning as the
            homepage band; see app/page.tsx. */}
        <section className="mt-12" aria-labelledby="weekly-story-heading">
          <div className="mx-auto mb-6 max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-japan-coral-sunset-ink">
              Free weekly newsletter
            </p>
            <h2
              id="weekly-story-heading"
              className="mt-3 text-2xl font-semibold text-japan-deep-ocean"
            >
              A weekly story you can actually read
            </h2>
            <p className="mt-3 text-japan-mountain-mist">
              One short story a week, written with beginner (N5) kanji and grammar only — the same
              characters these sheets drill.
            </p>
          </div>

          <div className="mx-auto max-w-xl">
            <EmailCapture
              source="free-resources"
              title={undefined}
              description={undefined}
              cta="Send me the stories"
            />
          </div>
        </section>

        <section className="mt-12 bg-blue-50 p-6 rounded-lg border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            How to Use These Resources
          </h3>
          <ul className="text-blue-800 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>All resources are completely free to download and use</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>Print materials are optimized for standard A4 paper</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>Use landscape orientation for best results when printing</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>Perfect for self-study, classroom use, or tutoring sessions</span>
            </li>
          </ul>
        </section>
      </main>

    </>
  );
}