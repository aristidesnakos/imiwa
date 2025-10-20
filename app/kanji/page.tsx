'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { N5_KANJI } from '@/lib/constants/n5-kanji';
import { Search, BookOpen } from 'lucide-react';

export default function KanjiSearchPage() {
  const [search, setSearch] = useState('');
  
  const filtered = N5_KANJI.filter(k => 
    k.kanji.includes(search) || 
    k.meaning.toLowerCase().includes(search.toLowerCase()) ||
    k.onyomi.toLowerCase().includes(search.toLowerCase()) ||
    k.kunyomi.toLowerCase().includes(search.toLowerCase())
  );
  
  return (
    <div className="container mx-auto p-8 space-y-8">
      {/* SEO Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Japanese Kanji Stroke Order Dictionary</h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Learn Japanese kanji with interactive stroke order diagrams. Master the correct way to write each character.
        </p>
        <Badge variant="secondary" className="text-sm">
          <BookOpen className="w-4 h-4 mr-1" />
          {N5_KANJI.length} JLPT N5 Kanji Available
        </Badge>
      </div>
      
      {/* Search */}
      <div className="max-w-md mx-auto relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="Search kanji, meaning, or reading..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>
      
      {/* Results Header */}
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-2">
          JLPT N5 Kanji {search && `(${filtered.length} results)`}
        </h2>
        <p className="text-gray-600">
          Click any kanji to see its stroke order, readings, and meaning
        </p>
      </div>
      
      {/* Kanji Grid */}
      <div className="grid grid-cols-4 md:grid-cols-8 lg:grid-cols-10 gap-4">
        {filtered.map(kanji => (
          <Link
            key={kanji.kanji}
            href={`/kanji/${encodeURIComponent(kanji.kanji)}`}
            className="group p-4 border rounded-lg hover:bg-gray-50 hover:border-blue-300 hover:shadow-md transition-all duration-200 text-center"
          >
            <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">
              {kanji.kanji}
            </div>
            <div className="text-xs text-gray-500 truncate">
              {kanji.meaning.split(',')[0]}
            </div>
          </Link>
        ))}
      </div>
      
      {/* No results */}
      {filtered.length === 0 && search && (
        <div className="text-center text-gray-500 py-12">
          <div className="text-lg mb-2">No kanji found</div>
          <div className="text-sm">Try searching for a different term</div>
        </div>
      )}
      
      {/* SEO Content */}
      <div className="max-w-4xl mx-auto mt-16 prose prose-gray">
        <h3>About Japanese Kanji Stroke Order</h3>
        <p>
          Learning proper kanji stroke order is essential for Japanese writing. Our interactive 
          stroke order diagrams help you master the correct way to write each character. Each 
          kanji page includes detailed stroke-by-stroke animations, multiple readings (onyomi 
          and kunyomi), and English meanings.
        </p>
        
        <h3>JLPT N5 Kanji Collection</h3>
        <p>
          This collection contains all {N5_KANJI.length} kanji characters required for the 
          JLPT N5 level exam. These are the most fundamental kanji that every Japanese learner 
          should master first. Each character includes comprehensive information to help you 
          learn effectively.
        </p>
        
        <h3>How to Use This Dictionary</h3>
        <ul>
          <li>Browse all kanji or use the search box to find specific characters</li>
          <li>Click any kanji to see its dedicated page with stroke order animation</li>
          <li>Practice writing by following the animated stroke sequences</li>
          <li>Learn both onyomi (Chinese reading) and kunyomi (Japanese reading)</li>
        </ul>
      </div>
    </div>
  );
}