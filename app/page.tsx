'use client';

import { useState } from 'react';
import { Suspense } from "react";
import Link from 'next/link';
import Header from "@/components/sections/Header";
import Footer from "@/components/sections/Footer";
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { N5_KANJI } from '@/lib/constants/n5-kanji';
import { N4_KANJI } from '@/lib/constants/n4-kanji';
import { N3_KANJI } from '@/lib/constants/n3-kanji';
import { N2_KANJI } from '@/lib/constants/n2-kanji';
import { Search, BookOpen, ArrowRight } from 'lucide-react';

export default function LandingPage() {
  const [search, setSearch] = useState('');
  
  // Combine all kanji counts for display but only search N5 for simplicity on homepage
  const ALL_KANJI_COUNT = N5_KANJI.length + N4_KANJI.length + N3_KANJI.length + N2_KANJI.length;
  
  const filtered = N5_KANJI.filter(k => 
    k.kanji.includes(search) || 
    k.meaning.toLowerCase().includes(search.toLowerCase()) ||
    k.onyomi.toLowerCase().includes(search.toLowerCase()) ||
    k.kunyomi.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 20); // Show only first 20 results on homepage

  return (
    <>
      <Suspense fallback={<div>Loading...</div>}>
        <Header />
      </Suspense>
      
      <main className="min-h-screen">
        {/* Hero Section with Immediate Search */}
        <section className="bg-gradient-to-b from-background to-muted/20 pt-20 pb-16">
          <div className="container mx-auto px-4 text-center space-y-8">
            {/* Hero Header */}
            <div className="space-y-4">
              <h1 className="text-4xl md:text-6xl font-bold">
                Learn Japanese Kanji
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
                Master kanji with interactive stroke order diagrams. Search, learn, and practice the correct way to write each character.
              </p>
              <div className="flex justify-center space-x-2 flex-wrap gap-2">
                <Badge variant="secondary" className="text-sm">
                  <BookOpen className="w-4 h-4 mr-1" />
                  {ALL_KANJI_COUNT} JLPT N5-N2 Kanji
                </Badge>
                <Badge variant="outline" className="text-sm">
                  N5: {N5_KANJI.length}
                </Badge>
                <Badge variant="outline" className="text-sm">
                  N4: {N4_KANJI.length}
                </Badge>
                <Badge variant="outline" className="text-sm">
                  N3: {N3_KANJI.length}
                </Badge>
                <Badge variant="outline" className="text-sm">
                  N2: {N2_KANJI.length}
                </Badge>
              </div>
            </div>
            
            {/* Immediate Search */}
            <div className="max-w-md mx-auto space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search kanji, meaning, or reading..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 text-lg py-3"
                />
              </div>
              <Button asChild size="lg" className="w-full">
                <Link href="/kanji">
                  View All Kanji
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Search Results Preview */}
        {search && (
          <section className="py-16 bg-background">
            <div className="container mx-auto px-4">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-semibold mb-2">
                  Search Results ({filtered.length > 0 ? `${filtered.length}${filtered.length === 20 ? '+' : ''}` : '0'})
                </h2>
                <p className="text-gray-600">
                  Click any kanji to see its stroke order and details
                </p>
              </div>
              
              {/* Kanji Grid */}
              <div className="grid grid-cols-4 md:grid-cols-8 lg:grid-cols-10 gap-4 max-w-6xl mx-auto">
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

              {/* Show more link if there are more results */}
              {filtered.length === 20 && (
                <div className="text-center mt-8">
                  <Button asChild variant="outline">
                    <Link href={`/kanji?search=${encodeURIComponent(search)}`}>
                      View All Results
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Default Kanji Preview (when no search) */}
        {!search && (
          <section className="py-16 bg-background">
            <div className="container mx-auto px-4">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-semibold mb-2">
                  Popular JLPT Kanji
                </h2>
                <p className="text-gray-600">
                  Start with these fundamental characters from N5-N2 levels
                </p>
              </div>
              
              {/* Featured Kanji Grid - First 20 kanji from all levels */}
              <div className="grid grid-cols-4 md:grid-cols-8 lg:grid-cols-10 gap-4 max-w-6xl mx-auto">
                {N5_KANJI.slice(0, 20).map(kanji => (
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
              
              <div className="text-center mt-8">
                <Button asChild size="lg">
                  <Link href="/kanji">
                    Explore All {ALL_KANJI_COUNT} Kanji
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* Features Section */}
        <section className="py-16 bg-muted/50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Why Learn Kanji Here?</h2>
              <p className="text-lg text-gray-600">Everything you need to master Japanese characters from N5 to N2</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="text-center space-y-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto">
                  <Search className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold">Smart Search</h3>
                <p className="text-gray-600">Find kanji by character, meaning, or reading instantly</p>
              </div>
              
              <div className="text-center space-y-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto">
                  <BookOpen className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold">Stroke Order</h3>
                <p className="text-gray-600">Learn proper stroke order with interactive animations</p>
              </div>
              
              <div className="text-center space-y-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto">
                  <ArrowRight className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold">JLPT N5-N2 Focused</h3>
                <p className="text-gray-600">Complete coverage from beginner to advanced intermediate levels</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
