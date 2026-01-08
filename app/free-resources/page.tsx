import { Metadata } from 'next';
import Link from 'next/link';
import { getSEOTags } from '@/lib/seo';
import Header from '@/components/sections/Header';
import Footer from '@/components/sections/Footer';
import { FileText, Download, BookOpen } from 'lucide-react';

export const metadata: Metadata = getSEOTags({
  title: 'Free Japanese Learning Resources | Printable Worksheets & Study Materials',
  description: 'Access free Japanese learning resources including printable kana practice sheets, study guides, and educational materials. Download PDFs for hiragana, katakana practice and more.',
  keywords: [
    'free Japanese resources',
    'Japanese learning materials',
    'printable worksheets',
    'kana practice sheets',
    'hiragana worksheets',
    'katakana worksheets',
    'Japanese study materials',
    'free PDFs',
    'language learning resources',
    'Japanese handwriting practice'
  ],
  openGraph: {
    title: 'Free Japanese Learning Resources | Printable Study Materials',
    description: 'Download free printable Japanese learning materials including kana practice sheets and study guides.',
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
      
      <main className="max-w-4xl mx-auto px-4 py-10 min-h-[60vh]">
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

          {/* Placeholder for future resources */}
          <section className="bg-gray-50 p-6 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-gray-200 rounded-lg">
                <BookOpen className="w-6 h-6 text-gray-500" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-500">More Resources Coming Soon</h2>
                <p className="text-sm text-gray-500">Additional study materials</p>
              </div>
            </div>
            
            <p className="text-gray-500 mb-4">
              We're working on expanding our collection of free Japanese learning resources. 
              Stay tuned for vocabulary cards, grammar guides, and more practice materials.
            </p>
            
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="px-2 py-1 bg-gray-200 text-gray-500 text-xs rounded">Coming Soon</span>
            </div>
            
            <button 
              disabled
              className="inline-flex items-center gap-2 bg-gray-400 text-white font-medium py-2 px-4 rounded cursor-not-allowed"
            >
              <BookOpen className="w-4 h-4" />
              Coming Soon
            </button>
          </section>

        </div>

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

      <Footer />
    </>
  );
}