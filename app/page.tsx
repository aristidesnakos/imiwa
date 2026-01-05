'use client';

import { useState } from 'react';
import { Suspense } from "react";
import Link from 'next/link';
import Header from "@/components/sections/Header";
import Footer from "@/components/sections/Footer";
import { Button } from '@/components/ui/button';
import { N5_KANJI } from '@/lib/constants/n5-kanji';
import { N4_KANJI } from '@/lib/constants/n4-kanji';
import { N3_KANJI } from '@/lib/constants/n3-kanji';
import { N2_KANJI } from '@/lib/constants/n2-kanji';
import { N1_KANJI } from '@/lib/constants/n1-kanji';
import { ArrowRight } from 'lucide-react';

export default function LandingPage() {
  const [search] = useState('');
  
  // Combine all kanji counts for display but only search N5 for simplicity on homepage
  const ALL_KANJI_COUNT = N5_KANJI.length + N4_KANJI.length + N3_KANJI.length + N2_KANJI.length + N1_KANJI.length;
  
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
        {/* Hero Section with Japan-inspired design */}
        <section className="relative bg-gradient-to-b from-japan-soft-mist via-background to-muted/20 pt-20 pb-16 overflow-hidden">
          {/* Mountain silhouette background */}
          <div className="absolute inset-0 w-full h-full">
            <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-japan-mountain-mist/20 to-transparent"></div>
            <div className="absolute bottom-0 left-0 w-full h-20 bg-gradient-to-t from-japan-deep-ocean/10 to-transparent"></div>
          </div>
          
          <div className="relative container mx-auto px-4 text-center space-y-8 z-10">
            {/* Hero Header */}
            <div className="space-y-4">
              <h1 className="text-4xl md:text-6xl font-bold text-japan-deep-ocean">
                Learn Japanese Kanji
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
                Master kanji with interactive stroke order diagrams.
              </p>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
                Search, learn, and practice the correct way to write each character.
              </p>
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
                    className="group p-4 border border-japan-sakura-waters/20 rounded-lg bg-card hover:bg-japan-soft-mist hover:border-japan-sakura-waters hover:shadow-lg transition-all duration-300 text-center"
                  >
                    <div className="text-3xl mb-2 group-hover:scale-110 transition-transform text-japan-deep-ocean">
                      {kanji.kanji}
                    </div>
                    <div className="text-xs text-japan-mountain-mist truncate">
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
                  Start with these fundamental characters from N5-N1 levels
                </p>
              </div>
              
              {/* Featured Kanji Grid - First 20 kanji from all levels */}
              <div className="grid grid-cols-4 md:grid-cols-8 lg:grid-cols-10 gap-4 max-w-6xl mx-auto">
                {N5_KANJI.slice(0, 20).map(kanji => (
                  <Link
                    key={kanji.kanji}
                    href={`/kanji/${encodeURIComponent(kanji.kanji)}`}
                    className="group p-4 border border-japan-sakura-waters/20 rounded-lg bg-card hover:bg-japan-soft-mist hover:border-japan-sakura-waters hover:shadow-lg transition-all duration-300 text-center"
                  >
                    <div className="text-3xl mb-2 group-hover:scale-110 transition-transform text-japan-deep-ocean">
                      {kanji.kanji}
                    </div>
                    <div className="text-xs text-japan-mountain-mist truncate">
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

      </main>

      <Footer />
    </>
  );
}
