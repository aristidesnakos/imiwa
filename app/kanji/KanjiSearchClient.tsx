'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { N5_KANJI } from '@/lib/constants/n5-kanji';
import { N4_KANJI } from '@/lib/constants/n4-kanji';
import { N3_KANJI } from '@/lib/constants/n3-kanji';
import { N2_KANJI } from '@/lib/constants/n2-kanji';
import { Search, BookOpen } from 'lucide-react';

type JLPTLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'ALL';

interface KanjiWithLevel {
  kanji: string;
  onyomi: string;
  kunyomi: string;
  meaning: string;
  level: JLPTLevel;
}

interface KanjiSectionProps {
  title: string;
  kanji: KanjiWithLevel[];
  search: string;
  description: string;
}

function KanjiSection({ title, kanji, search, description }: KanjiSectionProps) {
  return (
    <>
      {/* Section Header */}
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-2">
          {title} {search && `(${kanji.length} results)`}
        </h2>
        <p className="text-gray-600 mb-4">{description}</p>
        <p className="text-sm text-gray-500">
          Click any kanji to see its stroke order, readings, and meaning
        </p>
      </div>
      
      {/* Kanji Grid */}
      <div className="grid grid-cols-4 md:grid-cols-8 lg:grid-cols-10 gap-4">
        {kanji.map(k => (
          <Link
            key={k.kanji}
            href={`/kanji/${encodeURIComponent(k.kanji)}`}
            className="group p-4 border rounded-lg hover:bg-gray-50 hover:border-blue-300 hover:shadow-md transition-all duration-200 text-center relative"
          >
            <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">
              {k.kanji}
            </div>
            <div className="text-xs text-gray-500 truncate mb-1">
              {k.meaning.split(',')[0]}
            </div>
            <Badge variant="outline" className="text-xs">
              {k.level}
            </Badge>
          </Link>
        ))}
      </div>
    </>
  );
}

export function KanjiSearchClient() {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<JLPTLevel>('ALL');
  const searchParams = useSearchParams();
  
  // Combine all kanji data with level information
  const ALL_KANJI: KanjiWithLevel[] = [
    ...N5_KANJI.map(k => ({ ...k, level: 'N5' as JLPTLevel })),
    ...N4_KANJI.map(k => ({ ...k, level: 'N4' as JLPTLevel })),
    ...N3_KANJI.map(k => ({ ...k, level: 'N3' as JLPTLevel })),
    ...N2_KANJI.map(k => ({ ...k, level: 'N2' as JLPTLevel })),
  ];
  
  useEffect(() => {
    const searchParam = searchParams.get('search');
    if (searchParam) {
      setSearch(searchParam);
    }
  }, [searchParams]);
  
  // Filter by search term and level
  const getFilteredKanji = (level: JLPTLevel) => {
    let kanjiSet = level === 'ALL' ? ALL_KANJI : ALL_KANJI.filter(k => k.level === level);
    
    if (!search) return kanjiSet;
    
    return kanjiSet.filter(k => 
      k.kanji.includes(search) || 
      k.meaning.toLowerCase().includes(search.toLowerCase()) ||
      k.onyomi.toLowerCase().includes(search.toLowerCase()) ||
      k.kunyomi.toLowerCase().includes(search.toLowerCase())
    );
  };
  
  const filtered = getFilteredKanji(activeTab);
  
  return (
    <div className="container mx-auto p-8 space-y-8">
      {/* SEO Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Japanese Kanji Stroke Order Dictionary</h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Learn Japanese kanji with interactive stroke order diagrams. Master the correct way to write each character.
        </p>
        <div className="flex justify-center space-x-2 flex-wrap gap-2">
          <Badge variant="secondary" className="text-sm">
            <BookOpen className="w-4 h-4 mr-1" />
            {N5_KANJI.length} N5 Kanji
          </Badge>
          <Badge variant="secondary" className="text-sm">
            <BookOpen className="w-4 h-4 mr-1" />
            {N4_KANJI.length} N4 Kanji
          </Badge>
          <Badge variant="secondary" className="text-sm">
            <BookOpen className="w-4 h-4 mr-1" />
            {N3_KANJI.length} N3 Kanji
          </Badge>
          <Badge variant="secondary" className="text-sm">
            <BookOpen className="w-4 h-4 mr-1" />
            {N2_KANJI.length} N2 Kanji
          </Badge>
          <Badge variant="default" className="text-sm">
            <BookOpen className="w-4 h-4 mr-1" />
            {ALL_KANJI.length} Total Available
          </Badge>
        </div>
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
      
      {/* Level Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as JLPTLevel)} className="w-full">
        <TabsList className="grid w-full grid-cols-5 max-w-2xl mx-auto">
          <TabsTrigger value="ALL">All ({ALL_KANJI.length})</TabsTrigger>
          <TabsTrigger value="N5">N5 ({N5_KANJI.length})</TabsTrigger>
          <TabsTrigger value="N4">N4 ({N4_KANJI.length})</TabsTrigger>
          <TabsTrigger value="N3">N3 ({N3_KANJI.length})</TabsTrigger>
          <TabsTrigger value="N2">N2 ({N2_KANJI.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="ALL" className="space-y-6">
          <KanjiSection 
            title="All JLPT Kanji" 
            kanji={filtered} 
            search={search}
            description="Browse all available kanji from N5, N4, N3, and N2 levels"
          />
        </TabsContent>
        
        <TabsContent value="N5" className="space-y-6">
          <KanjiSection 
            title="JLPT N5 Kanji" 
            kanji={filtered} 
            search={search}
            description="Fundamental kanji for beginners - most essential characters"
          />
        </TabsContent>
        
        <TabsContent value="N4" className="space-y-6">
          <KanjiSection 
            title="JLPT N4 Kanji" 
            kanji={filtered} 
            search={search}
            description="Intermediate kanji building on N5 foundation"
          />
        </TabsContent>
        
        <TabsContent value="N3" className="space-y-6">
          <KanjiSection 
            title="JLPT N3 Kanji" 
            kanji={filtered} 
            search={search}
            description="Advanced intermediate kanji for complex expressions and formal contexts"
          />
        </TabsContent>
        
        <TabsContent value="N2" className="space-y-6">
          <KanjiSection 
            title="JLPT N2 Kanji" 
            kanji={filtered} 
            search={search}
            description="Advanced kanji for professional and academic contexts"
          />
        </TabsContent>
      </Tabs>
      
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
        
        <h3>JLPT Kanji Collection</h3>
        <p>
          This comprehensive collection contains {ALL_KANJI.length} kanji characters covering 
          JLPT N5, N4, N3, and N2 levels. Starting with {N5_KANJI.length} fundamental N5 characters, 
          progressing through {N4_KANJI.length} intermediate N4 kanji, expanding to 
          {N3_KANJI.length} advanced N3 characters, and reaching {N2_KANJI.length} advanced N2 kanji 
          for professional and academic contexts.
        </p>
        
        <div className="grid md:grid-cols-4 gap-4 not-prose">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">JLPT N5 Level</h4>
            <p className="text-sm text-blue-800">
              Basic kanji for beginners - essential characters for daily communication 
              and fundamental reading comprehension.
            </p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="font-semibold text-green-900 mb-2">JLPT N4 Level</h4>
            <p className="text-sm text-green-800">
              Intermediate kanji expanding vocabulary - includes more complex characters 
              for business, education, and social contexts.
            </p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <h4 className="font-semibold text-purple-900 mb-2">JLPT N3 Level</h4>
            <p className="text-sm text-purple-800">
              Advanced intermediate kanji for complex expressions, formal writing, 
              and sophisticated communication.
            </p>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <h4 className="font-semibold text-orange-900 mb-2">JLPT N2 Level</h4>
            <p className="text-sm text-orange-800">
              Advanced kanji for professional and academic contexts, 
              newspapers, and complex literature.
            </p>
          </div>
        </div>
        
        <h3>How to Use This Dictionary</h3>
        <ul>
          <li>Use the level tabs to focus on N5, N4, N3, N2, or browse all kanji together</li>
          <li>Search by kanji character, meaning, or reading (onyomi/kunyomi)</li>
          <li>Click any kanji to see its dedicated page with stroke order animation</li>
          <li>Practice writing by following the animated stroke sequences</li>
          <li>Each kanji shows its JLPT level for targeted study</li>
        </ul>
      </div>
    </div>
  );
}