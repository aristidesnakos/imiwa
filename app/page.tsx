'use client';

import { Suspense } from "react";
import Link from 'next/link';
import Image from 'next/image';
import Header from "@/components/sections/Header";
import Footer from "@/components/sections/Footer";
import { Button } from '@/components/ui/button';
import { N5_KANJI } from '@/lib/constants/n5-kanji';
import { N4_KANJI } from '@/lib/constants/n4-kanji';
import { N3_KANJI } from '@/lib/constants/n3-kanji';
import { N2_KANJI } from '@/lib/constants/n2-kanji';
import { N1_KANJI } from '@/lib/constants/n1-kanji';
import { ArrowRight, PenLine, Layers3, Search, Sparkles } from 'lucide-react';
import { trackConversion } from '@/lib/analytics';

const ALL_KANJI_COUNT =
  N5_KANJI.length + N4_KANJI.length + N3_KANJI.length + N2_KANJI.length + N1_KANJI.length;

const FEATURES = [
  {
    icon: PenLine,
    title: 'Animated stroke order',
    body: 'Watch each character drawn stroke by stroke with KanjiVG diagrams, then practice the correct way to write it.',
    accent: 'var(--coral-sunset)',
  },
  {
    icon: Layers3,
    title: 'Organized by JLPT level',
    body: 'Every kanji is grouped from N5 to N1 so you always know what to learn next on your path to fluency.',
    accent: 'var(--cherry-blossom)',
  },
  {
    icon: Search,
    title: 'Readings & instant search',
    body: 'Find any kanji by character, meaning, on’yomi or kun’yomi — with all readings and meanings on every card.',
    accent: 'var(--sakura-waters)',
  },
];

const LEVELS = [
  { level: 'N5', count: N5_KANJI.length, label: 'Beginner', accent: 'var(--coral-sunset)' },
  { level: 'N4', count: N4_KANJI.length, label: 'Elementary', accent: 'var(--cherry-blossom)' },
  { level: 'N3', count: N3_KANJI.length, label: 'Intermediate', accent: 'var(--sakura-waters)' },
  { level: 'N2', count: N2_KANJI.length, label: 'Upper-int.', accent: 'var(--mountain-mist)' },
  { level: 'N1', count: N1_KANJI.length, label: 'Advanced', accent: 'var(--deep-ocean)' },
];

export default function LandingPage() {
  const popularKanji = N5_KANJI.slice(0, 10);

  const handleExploreClick = async (source: string) => {
    await trackConversion({
      name: 'explore_all_kanji_clicked',
      properties: { kanji_count: ALL_KANJI_COUNT, source },
    });
  };

  return (
    <>
      <Suspense fallback={<div>Loading...</div>}>
        <Header />
      </Suspense>

      <main className="min-h-screen">
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-b from-japan-soft-mist via-background to-background pt-14 pb-20 md:pt-20 md:pb-28">
          {/* Soft mountain horizon */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-japan-sakura-waters/15 to-transparent" />

          <div className="relative z-10 container mx-auto px-4">
            <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
              <Image
                src="/assets/tan-wave.png"
                alt="Tan the tanuki mascot waving hello"
                width={220}
                height={220}
                className="w-28 md:w-40 drop-shadow-md"
                priority
              />

              <span className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-japan-sakura-waters/40 bg-background/70 px-3.5 py-1.5 text-xs font-medium text-japan-mountain-mist backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5 text-japan-coral-sunset" />
                Free · No account needed · {ALL_KANJI_COUNT.toLocaleString()} kanji
              </span>

              <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight text-japan-deep-ocean md:text-6xl">
                Learn Japanese Kanji
              </h1>
              <p className="mt-4 max-w-2xl text-lg text-japan-mountain-mist md:text-xl">
                Master every JLPT kanji with interactive stroke-order diagrams.
                Search, learn, and practice the correct way to write each character.
              </p>

              <div className="mt-8 flex w-full flex-col items-center justify-center gap-3 sm:flex-row">
                <Button asChild size="lg" className="w-full sm:w-auto">
                  <Link href="/kanji" onClick={() => handleExploreClick('homepage_hero')}>
                    Explore all {ALL_KANJI_COUNT.toLocaleString()} kanji
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="w-full border-japan-sakura-waters/40 text-japan-deep-ocean hover:bg-japan-soft-mist sm:w-auto"
                >
                  <Link href="/kanji#level-N5">Start with N5 basics</Link>
                </Button>
              </div>

              {/* Quick stats */}
              <dl className="mt-10 grid w-full max-w-lg grid-cols-3 gap-4">
                {[
                  { value: ALL_KANJI_COUNT.toLocaleString(), label: 'Kanji' },
                  { value: '5', label: 'JLPT levels' },
                  { value: 'Animated', label: 'Stroke order' },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-xl border border-japan-sakura-waters/20 bg-card/60 py-3 backdrop-blur-sm">
                    <dt className="text-lg font-bold text-japan-deep-ocean md:text-xl">{stat.value}</dt>
                    <dd className="text-xs text-japan-mountain-mist">{stat.label}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-t border-japan-sakura-waters/10 bg-background py-16 md:py-20">
          <div className="container mx-auto px-4">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <h2 className="text-2xl font-bold text-japan-deep-ocean md:text-3xl">
                Everything you need to read and write kanji
              </h2>
              <p className="mt-3 text-japan-mountain-mist">
                A focused, distraction-free way to build real kanji fluency.
              </p>
            </div>

            <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="rounded-2xl border border-japan-sakura-waters/20 bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
                >
                  <div
                    className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `color-mix(in srgb, ${f.accent} 15%, transparent)`, color: f.accent }}
                  >
                    <f.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-japan-deep-ocean">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-japan-mountain-mist">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* JLPT Levels */}
        <section className="bg-japan-soft-mist/60 py-16 md:py-20">
          <div className="container mx-auto px-4">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <h2 className="text-2xl font-bold text-japan-deep-ocean md:text-3xl">
                Study by JLPT level
              </h2>
              <p className="mt-3 text-japan-mountain-mist">
                Start at N5 and work your way up to N1 — one level at a time.
              </p>
            </div>

            <div className="mx-auto grid max-w-5xl grid-cols-2 gap-4 md:grid-cols-5">
              {LEVELS.map((lvl) => (
                <Link
                  key={lvl.level}
                  href={`/kanji#level-${lvl.level}`}
                  className="group flex flex-col items-center rounded-2xl border border-japan-sakura-waters/20 bg-card p-5 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
                >
                  <span
                    className="flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold text-white"
                    style={{ backgroundColor: lvl.accent }}
                  >
                    {lvl.level}
                  </span>
                  <span className="mt-3 text-2xl font-bold text-japan-deep-ocean">
                    {lvl.count.toLocaleString()}
                  </span>
                  <span className="text-xs text-japan-mountain-mist">kanji · {lvl.label}</span>
                  <span className="mt-2 inline-flex items-center text-xs font-medium text-japan-sakura-waters opacity-0 transition-opacity group-hover:opacity-100">
                    Browse <ArrowRight className="ml-1 h-3 w-3" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Popular Kanji */}
        <section className="bg-background py-16 md:py-20">
          <div className="container mx-auto px-4">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <h2 className="text-2xl font-bold text-japan-deep-ocean md:text-3xl">
                Popular JLPT kanji
              </h2>
              <p className="mt-3 text-japan-mountain-mist">
                Start with these fundamental characters from the N5 level.
              </p>
            </div>

            <div className="mx-auto grid max-w-5xl grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
              {popularKanji.map((kanji) => (
                <Link
                  key={kanji.kanji}
                  href={`/kanji/${encodeURIComponent(kanji.kanji)}`}
                  className="group flex flex-col items-center rounded-2xl border border-japan-sakura-waters/20 bg-card p-5 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-japan-sakura-waters hover:shadow-md"
                >
                  <span className="text-4xl text-japan-deep-ocean transition-transform duration-300 group-hover:scale-110 md:text-5xl">
                    {kanji.kanji}
                  </span>
                  <span className="mt-3 text-sm font-medium capitalize text-japan-deep-ocean">
                    {kanji.meaning.split(',')[0]}
                  </span>
                  <span className="mt-1 truncate text-xs text-japan-mountain-mist" title={kanji.onyomi}>
                    {kanji.onyomi}
                  </span>
                </Link>
              ))}
            </div>

            <div className="mt-10 text-center">
              <Button asChild size="lg">
                <Link href="/kanji" onClick={() => handleExploreClick('homepage_popular_grid')}>
                  Explore all {ALL_KANJI_COUNT.toLocaleString()} kanji
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="bg-japan-deep-ocean py-16 md:py-20">
          <div className="container mx-auto px-4">
            <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
              <Image
                src="/assets/tan-thumbsup.png"
                alt="Tan the tanuki mascot giving a thumbs up"
                width={160}
                height={160}
                className="w-24 md:w-28 drop-shadow-lg"
              />
              <h2 className="mt-5 text-2xl font-bold text-white md:text-3xl">
                Ready to start writing kanji?
              </h2>
              <p className="mt-3 max-w-xl text-japan-sakura-waters">
                No sign-up, no cost. Jump straight into {ALL_KANJI_COUNT.toLocaleString()} kanji
                with animated stroke order and readings.
              </p>
              <Button
                asChild
                size="lg"
                className="mt-8 bg-japan-coral-sunset text-white hover:bg-japan-coral-sunset/90"
              >
                <Link href="/kanji" onClick={() => handleExploreClick('homepage_footer_cta')}>
                  Start learning now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
