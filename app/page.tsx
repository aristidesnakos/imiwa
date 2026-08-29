'use client';

import { Suspense } from "react";
import Link from 'next/link';
import Image from 'next/image';
import Header from "@/components/sections/Header";
import { Button } from '@/components/ui/button';
import { N5_KANJI } from '@/lib/constants/n5-kanji';
import { N4_KANJI } from '@/lib/constants/n4-kanji';
import { N3_KANJI } from '@/lib/constants/n3-kanji';
import { N2_KANJI } from '@/lib/constants/n2-kanji';
import { N1_KANJI } from '@/lib/constants/n1-kanji';
import { ArrowRight, PenLine, Layers3, Search, Sparkles } from 'lucide-react';
import { trackConversion } from '@/lib/analytics';
import EmailCapture from '@/components/EmailCapture';

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

// `accent` is used as a solid fill under white 18px-bold text. 18px bold is
// 13.5pt, which misses the 14pt-bold large-text threshold by 0.67pt, so these
// owe the full 4.5:1 rather than 3:1 — an easy one to mis-assess. N5 uses the
// coral ink for that reason; cherry-blossom and sakura-waters fail the same
// test and are NOT fixed here (see the note in the JSX below).
const LEVELS = [
  { level: 'N5', count: N5_KANJI.length, label: 'Beginner', accent: 'var(--coral-sunset-ink)' },
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

      <main id="main-content" tabIndex={-1} className="min-h-screen">
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
        {/* DataFast scroll markers (`data-fast-scroll`) start here and continue
            to the closing CTA. They are the input to the "Homepage scroll
            depth" funnel in DataFast, which answers the one question this page
            has never been able to answer: how far down does a visitor actually
            get before leaving.

            The marker is on the HEADING BLOCK, never on the <section>. The
            DataFast script registers its IntersectionObserver with
            `threshold: [0, t]` and fires on `isIntersecting`, so it fires the
            moment the FIRST PIXEL of the observed element enters the viewport —
            not at the 50% the docs describe. On a full-height section that
            means the goal fires as the previous section scrolls off, which
            measures "they left the hero", not "they read the features". A
            heading block is short enough that first-pixel and read-it are the
            same event.

            Also: the script clears its `fired` flag when the element leaves the
            viewport, so scrolling back up and down re-fires the goal. Funnel
            steps count VISITORS, so this does not distort the funnel — but it
            does inflate raw goal completions and monthly event usage. Read the
            funnel, not the goal counter. */}
        <section className="border-t border-japan-sakura-waters/10 bg-background py-16 md:py-20">
          <div className="container mx-auto px-4">
            <div className="mx-auto mb-12 max-w-2xl text-center" data-fast-scroll="home_scroll_features">
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
            <div className="mx-auto mb-12 max-w-2xl text-center" data-fast-scroll="home_scroll_levels">
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
            <div className="mx-auto mb-12 max-w-2xl text-center" data-fast-scroll="home_scroll_popular">
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

        {/* Weekly story newsletter capture.
            Homepage first, not /kanji: /kanji has ~9 kB of script headroom left
            against an error-level budget and has already drifted ~32 kB past its
            recorded baseline, so it is the assertion that trips first. `/` has
            ~25 kB. See docs/prd/weekly-story-newsletter.md.

            `title={undefined}` because EmailCapture's own heading is an <h3> and
            this page's sections lead with an <h2>; letting the card render its
            title here would skip a heading level.

            The band is a real surface, not a wash. `bg-japan-soft-mist/60` drew
            NOTHING: Tailwind cannot fold an opacity modifier into a colour that
            is a bare `var(--x)` holding a hex, so it drops the whole utility
            silently — the same class of failure as the dropped HSL triplets in
            app/globals.css, and it is why the tints here are `color-mix` on the
            token rather than `/25`. Verified against compiled CSS, not by
            reading the class list.

            The gradient ends on the accent so the page cools from warm
            off-white through this band into the navy closing CTA. The hairline
            is `border-t` only: the navy edge below is already a hard contrast
            step, and a light rule on top of it reads as an artifact. */}
        <section className="border-t border-border bg-gradient-to-b from-japan-soft-mist to-[color-mix(in_srgb,var(--sakura-waters)_25%,var(--temple-stone))] py-16 md:py-20">
          <div className="container mx-auto px-4">
            <div className="mx-auto mb-8 max-w-2xl text-center" data-fast-scroll="home_scroll_newsletter">
              {/* coral-sunset-INK, never coral-sunset: the fill is 2.7:1 here and
                  cannot legally carry a label. The ink is 4.70:1 against the top
                  of the gradient, which this line sits on. See app/globals.css. */}
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-japan-coral-sunset-ink">
                Free weekly newsletter
              </p>
              <h2 className="mt-3 text-balance text-2xl font-bold text-japan-deep-ocean md:text-3xl">
                A weekly story you can actually read
              </h2>
              <p className="mt-3 text-pretty text-japan-mountain-mist">
                One short story a week, written with beginner (N5) kanji and grammar only.
              </p>
            </div>

            <div className="mx-auto max-w-xl">
              {/* `border-[color:...]`, not `border-[...]`: without the type hint
                  tailwind-merge reads the arbitrary value as a border-WIDTH and
                  strips the card's own `border` class, and preflight sets
                  border-width to 0 — so the card loses its border entirely. */}
              <EmailCapture
                source="homepage-weekly-story"
                title={undefined}
                description={undefined}
                cta="Send me the stories"
                className="border-[color:color-mix(in_srgb,var(--sakura-waters)_55%,var(--temple-stone))] shadow-md"
              />
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
              <h2 className="mt-5 text-2xl font-bold text-white md:text-3xl" data-fast-scroll="home_scroll_final_cta">
                Ready to start writing kanji?
              </h2>
              <p className="mt-3 max-w-xl text-japan-sakura-waters">
                No sign-up, no cost. Jump straight into {ALL_KANJI_COUNT.toLocaleString()} kanji
                with animated stroke order and readings.
              </p>
              {/* brightness-90, not /90. An alpha hover composites against
                  whatever is behind it, so the same class darkened on this navy
                  section but LIGHTENED on the advertise page — a hover that
                  reduced contrast below the resting state. A filter darkens
                  regardless of backdrop: 4.84:1 white-on-hover.

                  The focus ring is inverted here, and this is the only place on
                  the site that needs it. The shared ring is deep ocean on a
                  page-coloured offset, which on THIS navy section renders as an
                  invisible ring inside a bright near-white halo — the indicator
                  upside down. */}
              <Button
                asChild
                size="lg"
                className="mt-8 bg-japan-coral-sunset-ink text-white hover:brightness-90 focus-visible:ring-white focus-visible:ring-offset-japan-deep-ocean"
              >
                <Link
                  href="/kanji"
                  data-fast-goal="home_final_cta_click"
                  onClick={() => handleExploreClick('homepage_footer_cta')}
                >
                  Start learning now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

    </>
  );
}
