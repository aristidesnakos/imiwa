import Header from '@/components/sections/Header';
import { HomeHero } from '@/components/home/HomeHero';
import { KanjiLookup } from '@/components/home/KanjiLookup';
import { LevelPills } from '@/components/home/search-field';
import { StartDoors } from '@/components/home/StartDoors';
import { NewsletterBand } from '@/components/home/NewsletterBand';
import { ALL_KANJI_COUNT, LEVEL_COUNTS } from '@/components/home/level-counts';

// Search first, since 2026-10-10. The old page opened on a tagline and two
// buttons, then feature cards, level cards, ten popular kanji and a closing
// call to action. About two in three homepage visitors left without a second
// page (65.8% bounce, Sep 10 - Oct 9, China excluded), half never scrolled past
// the hero, and only 14% clicked through. Most of them arrive from Google
// wanting one character ("michi kanji", "kanji stroke order"), so the hero is
// now the search, with Tan pointing at it, and three doors below it for the
// visitor who has nothing to type.
//
// Measured by pageviews, not goals: nothing else on this page links to a
// character page or to /kanji?search=, so a visit from / to either one is a
// search, and the doors' destinations are pages of their own.
//
// A server component, and keeping it one is the point. The level lists are
// read at build time and only the counts reach the browser. The parts that
// need the browser are islands: the search, the signup form and the Header.
// The search asks the server for matches (lib/kanji-lookup.ts), so the
// dictionary never reaches this page. Every link here is `prefetch={false}`:
// a prefetched /kanji would put the whole dictionary into this page's
// Lighthouse byte budget.

export default function LandingPage() {
  return (
    <>
      <Header />

      <main id="main-content" tabIndex={-1} className="min-h-screen">
        <HomeHero kanjiCount={ALL_KANJI_COUNT} search={<KanjiLookup />}>
          <LevelPills counts={LEVEL_COUNTS} className="mt-6" />
        </HomeHero>

        <StartDoors n5Count={LEVEL_COUNTS.N5} />

        <NewsletterBand />
      </main>
    </>
  );
}
