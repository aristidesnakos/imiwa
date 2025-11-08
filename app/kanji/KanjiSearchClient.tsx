'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/sections/Header';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { N5_KANJI } from '@/lib/constants/n5-kanji';
import { N4_KANJI } from '@/lib/constants/n4-kanji';
import { N3_KANJI } from '@/lib/constants/n3-kanji';
import { N2_KANJI } from '@/lib/constants/n2-kanji';
import { N1_KANJI } from '@/lib/constants/n1-kanji';
import { Search, Check, Filter } from 'lucide-react';
import { useKanjiProgress } from '@/hooks/useKanjiProgress';

type JLPTLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1' | 'ALL';

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
  isKanjiLearned: (character: string) => boolean;
  toggleKanjiLearned: (character: string) => void;
  learnedCount: number;
  totalCount: number;
}

function KanjiSection({ title, kanji, search, description, isKanjiLearned, toggleKanjiLearned, learnedCount, totalCount }: KanjiSectionProps) {
  const progressPercentage = totalCount > 0 ? Math.round((learnedCount / totalCount) * 100) : 0;
  
  return (
    <>
      {/* Section Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-4 mb-2">
          <h2 className="text-2xl font-semibold">
            {title} {search && `(${kanji.length} results)`}
          </h2>
          {!search && (
            <div className="flex items-center gap-2">
              <div className="text-sm text-green-600 font-medium">
                {learnedCount}/{totalCount} learned ({progressPercentage}%)
              </div>
              <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          )}
        </div>
        <p className="text-gray-600 mb-4">{description}</p>
        <p className="text-sm text-gray-500">
          Click any kanji to see its stroke order, readings, and meaning
        </p>
      </div>
      
      {/* Kanji Grid */}
      <div className="grid grid-cols-4 md:grid-cols-8 lg:grid-cols-10 gap-4">
        {kanji.map((k, index) => {
          const isLearned = isKanjiLearned(k.kanji);
          return (
            <div key={`${k.kanji}-${k.level}-${index}`} className="relative">
              <Link
                href={`/kanji/${encodeURIComponent(k.kanji)}`}
                className={`group p-4 border rounded-lg hover:bg-gray-50 hover:border-blue-300 hover:shadow-md transition-all duration-200 text-center block ${
                  isLearned ? 'border-emerald-300 bg-emerald-50' : ''
                }`}
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
              
              {/* Check-off button */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  toggleKanjiLearned(k.kanji);
                }}
                className={`absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 ${
                  isLearned 
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600' 
                    : 'bg-gray-200 text-gray-400 hover:bg-gray-300'
                }`}
                title={isLearned ? 'Mark as unlearned' : 'Mark as learned'}
              >
                <Check className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}

export function KanjiSearchClient() {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<JLPTLevel>('ALL');
  const [showOnlyUnlearned, setShowOnlyUnlearned] = useState(false);
  const searchParams = useSearchParams();
  const { isKanjiLearned, getLearnedCountForLevel, totalLearned, toggleKanjiLearned } = useKanjiProgress();
  
  // Combine all kanji data with level information, removing duplicates
  const ALL_KANJI: KanjiWithLevel[] = (() => {
    const kanjiMap = new Map<string, KanjiWithLevel>();
    
    // Add N5 first (highest priority)
    N5_KANJI.forEach(k => kanjiMap.set(k.kanji, { ...k, level: 'N5' as JLPTLevel }));
    // Add N4, but don't overwrite N5
    N4_KANJI.forEach(k => {
      if (!kanjiMap.has(k.kanji)) {
        kanjiMap.set(k.kanji, { ...k, level: 'N4' as JLPTLevel });
      }
    });
    // Add N3, but don't overwrite N5/N4
    N3_KANJI.forEach(k => {
      if (!kanjiMap.has(k.kanji)) {
        kanjiMap.set(k.kanji, { ...k, level: 'N3' as JLPTLevel });
      }
    });
    // Add N2, but don't overwrite N5/N4/N3
    N2_KANJI.forEach(k => {
      if (!kanjiMap.has(k.kanji)) {
        kanjiMap.set(k.kanji, { ...k, level: 'N2' as JLPTLevel });
      }
    });
    // Add N1, but don't overwrite N5/N4/N3/N2
    N1_KANJI.forEach(k => {
      if (!kanjiMap.has(k.kanji)) {
        kanjiMap.set(k.kanji, { ...k, level: 'N1' as JLPTLevel });
      }
    });
    
    return Array.from(kanjiMap.values());
  })();
  
  useEffect(() => {
    const searchParam = searchParams.get('search');
    if (searchParam) {
      setSearch(searchParam);
    }
  }, [searchParams]);
  
  // Filter by search term and level
  const getFilteredKanji = (level: JLPTLevel) => {
    let kanjiSet = level === 'ALL' ? ALL_KANJI : ALL_KANJI.filter(k => k.level === level);
    
    // Apply search filter
    if (search) {
      kanjiSet = kanjiSet.filter(k => 
        k.kanji.includes(search) || 
        k.meaning.toLowerCase().includes(search.toLowerCase()) ||
        k.onyomi.toLowerCase().includes(search.toLowerCase()) ||
        k.kunyomi.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    // Apply unlearned filter
    if (showOnlyUnlearned) {
      kanjiSet = kanjiSet.filter(k => !isKanjiLearned(k.kanji));
    }
    
    return kanjiSet;
  };

  // Get counts for progress display
  const getLevelCounts = (level: JLPTLevel) => {
    const levelKanji = level === 'ALL' ? ALL_KANJI : ALL_KANJI.filter(k => k.level === level);
    const levelKanjiChars = levelKanji.map(k => k.kanji);
    return {
      learned: getLearnedCountForLevel(levelKanjiChars),
      total: levelKanji.length
    };
  };
  
  const filtered = getFilteredKanji(activeTab);
  
  return (
    <>
      <Header />
      <div className="container mx-auto p-8 space-y-6">
        {/* SEO Header */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold">Japanese Kanji Stroke Order Dictionary</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Learn Japanese kanji with interactive stroke order diagrams. Master the correct way to write each character.
          </p>
        </div>

        {/* Unified Control Bar */}
        <div className="bg-white border rounded-lg p-6 shadow-sm space-y-4">
          {/* Top Row: Search, Filter, and Progress Stats */}
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search kanji, meaning, or reading..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filter and Progress Controls */}
            <div className="flex items-center gap-3">
              <Button
                variant={showOnlyUnlearned ? "default" : "outline"}
                size="sm"
                onClick={() => setShowOnlyUnlearned(!showOnlyUnlearned)}
                className="flex items-center gap-2"
              >
                <Filter className="w-4 h-4" />
                {showOnlyUnlearned ? "Show all" : "Show unlearned"}
              </Button>
              
              <Link href="/learned-kanji">
                <div className="bg-blue-50 px-3 py-2 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer">
                  <span className="text-blue-600 font-semibold">{totalLearned}</span>
                  <span className="text-blue-800 ml-1">learned</span>
                </div>
              </Link>
            </div>
          </div>

          {/* JLPT Level Tabs */}
          <div className="flex justify-center">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as JLPTLevel)}>
              <TabsList className="grid grid-cols-6 w-full max-w-2xl">
                <TabsTrigger value="ALL" className="text-xs sm:text-sm">All</TabsTrigger>
                <TabsTrigger value="N5" className="text-xs sm:text-sm">N5</TabsTrigger>
                <TabsTrigger value="N4" className="text-xs sm:text-sm">N4</TabsTrigger>
                <TabsTrigger value="N3" className="text-xs sm:text-sm">N3</TabsTrigger>
                <TabsTrigger value="N2" className="text-xs sm:text-sm">N2</TabsTrigger>
                <TabsTrigger value="N1" className="text-xs sm:text-sm">N1</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as JLPTLevel)}>
          <TabsContent value="ALL" className="space-y-6">
            <KanjiSection 
              title="All JLPT Kanji" 
              kanji={filtered} 
              search={search}
              description="Browse all available kanji from N5, N4, N3, N2, and N1 levels"
              isKanjiLearned={isKanjiLearned}
              toggleKanjiLearned={toggleKanjiLearned}
              learnedCount={getLevelCounts('ALL').learned}
              totalCount={getLevelCounts('ALL').total}
            />
          </TabsContent>
          
          <TabsContent value="N5" className="space-y-6">
            <KanjiSection 
              title="JLPT N5 Kanji" 
              kanji={filtered} 
              search={search}
              description="Fundamental kanji for beginners - most essential characters"
              isKanjiLearned={isKanjiLearned}
              toggleKanjiLearned={toggleKanjiLearned}
              learnedCount={getLevelCounts('N5').learned}
              totalCount={getLevelCounts('N5').total}
            />
          </TabsContent>
          
          <TabsContent value="N4" className="space-y-6">
            <KanjiSection 
              title="JLPT N4 Kanji" 
              kanji={filtered} 
              search={search}
              description="Intermediate kanji building on N5 foundation"
              isKanjiLearned={isKanjiLearned}
              toggleKanjiLearned={toggleKanjiLearned}
              learnedCount={getLevelCounts('N4').learned}
              totalCount={getLevelCounts('N4').total}
            />
          </TabsContent>
          
          <TabsContent value="N3" className="space-y-6">
            <KanjiSection 
              title="JLPT N3 Kanji" 
              kanji={filtered} 
              search={search}
              description="Advanced intermediate kanji for complex expressions and formal contexts"
              isKanjiLearned={isKanjiLearned}
              toggleKanjiLearned={toggleKanjiLearned}
              learnedCount={getLevelCounts('N3').learned}
              totalCount={getLevelCounts('N3').total}
            />
          </TabsContent>
          
          <TabsContent value="N2" className="space-y-6">
            <KanjiSection 
              title="JLPT N2 Kanji" 
              kanji={filtered} 
              search={search}
              description="Advanced kanji for professional and academic contexts"
              isKanjiLearned={isKanjiLearned}
              toggleKanjiLearned={toggleKanjiLearned}
              learnedCount={getLevelCounts('N2').learned}
              totalCount={getLevelCounts('N2').total}
            />
          </TabsContent>
          
          <TabsContent value="N1" className="space-y-6">
            <KanjiSection 
              title="JLPT N1 Kanji" 
              kanji={filtered} 
              search={search}
              description="Expert-level kanji for advanced academic, professional, and literary contexts"
              isKanjiLearned={isKanjiLearned}
              toggleKanjiLearned={toggleKanjiLearned}
              learnedCount={getLevelCounts('N1').learned}
              totalCount={getLevelCounts('N1').total}
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
            JLPT N5, N4, N3, N2, and N1 levels. Starting with {N5_KANJI.length} fundamental N5 characters, 
            progressing through {N4_KANJI.length} intermediate N4 kanji, expanding to 
            {N3_KANJI.length} advanced N3 characters, {N2_KANJI.length} advanced N2 kanji 
            for professional and academic contexts, and culminating with {N1_KANJI.length} expert-level N1 kanji 
            for advanced academic, professional, and literary mastery.
          </p>
          
          <div className="grid md:grid-cols-5 gap-4 not-prose">
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
            <div className="bg-red-50 p-4 rounded-lg">
              <h4 className="font-semibold text-red-900 mb-2">JLPT N1 Level</h4>
              <p className="text-sm text-red-800">
                Expert-level kanji for advanced academic, professional, and literary contexts. 
                Complex characters for formal documents and specialized fields.
              </p>
            </div>
          </div>
          
          <h3>How to Use This Dictionary</h3>
          <ul>
            <li>Use the level tabs to focus on N5, N4, N3, N2, N1, or browse all kanji together</li>
            <li>Search by kanji character, meaning, or reading (onyomi/kunyomi)</li>
            <li>Click any kanji to see its dedicated page with stroke order animation</li>
            <li>Practice writing by following the animated stroke sequences</li>
            <li>Each kanji shows its JLPT level for targeted study</li>
          </ul>
        </div>
      </div>
    </>
  );
}
