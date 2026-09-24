import { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import Header from '@/components/sections/Header';
import { getSEOTags } from '@/lib/seo';
import { hasLevelPage, LEVEL_LABELS, levelHref, levelPagePath, type JlptLevel } from '@/lib/levels';
import { KanjiSearchClient } from './KanjiSearchClient';
import { N5_KANJI } from '@/lib/constants/n5-kanji';
import { N4_KANJI } from '@/lib/constants/n4-kanji';
import { N3_KANJI } from '@/lib/constants/n3-kanji';
import { N2_KANJI } from '@/lib/constants/n2-kanji';
import { N1_KANJI } from '@/lib/constants/n1-kanji';

const totalKanji = N5_KANJI.length + N4_KANJI.length + N3_KANJI.length + N2_KANJI.length + N1_KANJI.length;

// Server-rendered, deduped index of every kanji (first/most-basic level wins),
// grouped by level. The interactive client list paginates and lives behind
// JS — this static index guarantees every kanji detail page is linked from the
// hub in the initial HTML, so crawlers can reach all 1000+ pages (S3).
const LEVEL_GROUPS = (() => {
  const seen = new Set<string>();
  const groups: { level: JlptLevel; kanji: { kanji: string; meaning: string }[] }[] = [];
  ([
    ['N5', N5_KANJI],
    ['N4', N4_KANJI],
    ['N3', N3_KANJI],
    ['N2', N2_KANJI],
    ['N1', N1_KANJI],
  ] as const).forEach(([level, list]) => {
    const kanji = list.filter((k) => {
      if (seen.has(k.kanji)) return false;
      seen.add(k.kanji);
      return true;
    });
    groups.push({ level, kanji });
  });
  return groups;
})();

const LEVEL_SUMMARIES: Record<JlptLevel, string> = {
  N5: 'The essential characters for daily life and first reading: numbers, time, people, nature and places.',
  N4: 'Builds on N5 with the kanji of everyday routines, school, work and travel.',
  N3: 'The bridge from everyday to formal Japanese: complex expressions and formal writing.',
  N2: 'Kanji for professional and academic contexts, newspapers and complex literature.',
  N1: 'Expert-level kanji for academic, professional and literary Japanese, formal documents and specialised fields.',
};

// Plain links on this page do not go through buttonVariants, so they carry the ring themselves.
const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

export const metadata: Metadata = getSEOTags({
  title: 'Japanese Kanji Stroke Order Dictionary | JLPT N5, N4, N3, N2 & N1 | Interactive Learning',
  description: `Learn Japanese kanji with interactive stroke order diagrams. ${totalKanji} JLPT kanji covering N5 (${N5_KANJI.length}), N4 (${N4_KANJI.length}), N3 (${N3_KANJI.length}), N2 (${N2_KANJI.length}), and N1 (${N1_KANJI.length}) levels. Master proper writing technique with animated guides.`,
  keywords: [
    'Japanese kanji',
    'stroke order',
    'JLPT N5 kanji',
    'JLPT N4 kanji',
    'JLPT N3 kanji',
    'JLPT N2 kanji',
    'JLPT N1 kanji',
    'kanji dictionary',
    'Japanese writing',
    'stroke order animation',
    'kanji learning',
    'Japanese language',
    'kanji practice'
  ],
  openGraph: {
    title: 'Japanese Kanji Stroke Order Dictionary | JLPT N5, N4, N3, N2 & N1',
    description: `Interactive kanji learning with ${totalKanji} characters. Master stroke order, readings, and meanings.`,
    type: 'website',
  },
  canonicalUrlRelative: '/kanji',
});

/**
 * The guide below the grid. It used to be JSX inside KanjiSearchClient, which
 * cost script bytes for static text and — because useSearchParams opts that
 * whole subtree out of the prerender — kept it out of the HTML entirely. Here
 * it is in the initial HTML and ships no script at all.
 */
function HubGuide() {
  const n5ListPath = levelPagePath('N5');
  return (
    <section aria-labelledby="kanji-guide-heading" className="max-w-4xl mx-auto mt-16 space-y-6">
      <div className="prose">
        <h2 id="kanji-guide-heading">About Japanese Kanji Stroke Order</h2>
        <p>
          Learning proper kanji stroke order is essential for Japanese writing. Our interactive
          stroke order diagrams help you master the correct way to write each character. Each
          kanji page includes a stroke-by-stroke animation, its readings (onyomi and kunyomi, with
          romaji) and English meanings, and a practice sheet you can print.
        </p>

        <h2>JLPT Kanji Collection</h2>
        <p>
          This collection contains {totalKanji} kanji covering JLPT N5, N4, N3, N2 and N1. It
          starts with {N5_KANJI.length} fundamental N5 characters, progresses through{' '}
          {N4_KANJI.length} N4 kanji and {N3_KANJI.length} at N3, expands to {N2_KANJI.length} N2
          kanji for professional and academic contexts, and culminates with {N1_KANJI.length}{' '}
          expert-level N1 kanji for advanced academic, professional and literary reading.
        </p>
      </div>

      {/* Each card goes where every other link to a level goes (lib/levels):
          the level's list page if it has one, the filtered grid if not. The
          link is the heading, stretched over the card, so the whole card is
          the target but a screen reader hears "JLPT N4 Level", not the
          paragraph under it. prefetch={false}: the filtered grid is this page
          again, so each card would prefetch the whole /kanji payload once more
          as the visitor scrolls past. */}
      <ul className="grid md:grid-cols-5 gap-4">
        {LEVEL_GROUPS.map(({ level, kanji }) => (
          <li
            key={level}
            className="relative flex flex-col rounded-lg border border-border bg-card p-4 transition-colors hover:border-japan-sakura-waters hover:bg-muted has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background"
          >
            <h3 className="font-semibold text-japan-deep-ocean">
              <Link
                href={levelHref(level)}
                prefetch={false}
                className="after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none"
              >
                JLPT {level} Level
              </Link>
            </h3>
            <p className="mb-2 text-xs font-medium text-japan-mountain-mist">
              {LEVEL_LABELS[level]} · {kanji.length} kanji
            </p>
            <p className="text-sm text-japan-mountain-mist">{LEVEL_SUMMARIES[level]}</p>
            <p aria-hidden className="mt-auto pt-3 text-sm font-medium text-japan-deep-ocean">
              {hasLevelPage(level) ? 'Open the study list →' : 'Show them in the grid →'}
            </p>
          </li>
        ))}
      </ul>

      <div className="prose">
        <h2>How to Use This Dictionary</h2>
        <ul>
          <li>
            Pick a level above the grid: All, N5, N4, N3, N2 or N1. Each level is a link with an
            address of its own, so you can bookmark or share it, and Back returns you to the level
            you left.
          </li>
          <li>
            Search by kanji, English meaning or kana reading: <span lang="ja">水</span>,
            &ldquo;water&rdquo; and <span lang="ja">みず</span> all find <span lang="ja">水</span>.
            Romaji such as &ldquo;mizu&rdquo; does not, so type the reading in kana.
          </li>
          <li>Click any kanji to open its page, with the stroke order animation, readings and meanings.</li>
          <li>Practice writing by following the animated stroke sequences.</li>
          <li>
            Tick the circle on a card to mark a kanji as learned. Your progress stays in this
            browser, and learned kanji come back in Review.
          </li>
          {n5ListPath && (
            <li>
              New to kanji? <Link href={n5ListPath} prefetch={false}>The N5 study list</Link> puts
              all {N5_KANJI.length} N5 kanji in learning order, grouped by theme.
            </li>
          )}
        </ul>
      </div>
    </section>
  );
}

export default function KanjiPage() {
  return (
    <>
      <Header />
      <main id="main-content" tabIndex={-1}>
        <div className="container mx-auto p-8 space-y-6">
          {/* In the page, not the client component, so the heading is in the
              prerendered HTML rather than arriving with the grid. */}
          <div className="text-center space-y-3">
            <h1 className="text-4xl font-bold">Japanese Kanji Stroke Order Dictionary</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Learn Japanese kanji with interactive stroke order diagrams. Master the correct way to write each character.
            </p>
          </div>

          {/* useSearchParams opts the grid out of the prerender, so this
              fallback is what the HTML holds in its place until the client
              renders it. min-h-screen (matched by the grid's own wrapper) keeps
              everything after it below the fold meanwhile. Without it the
              guide, index and footer painted in the first viewport and were
              shoved down when the grid arrived: a layout shift, and — because
              the footer's links were on screen at hydration — prefetches of
              four routes that nobody had asked for, ~28 kB of script that the
              budget counted on some runs and not others. */}
          <Suspense
            fallback={
              <div className="min-h-screen text-center text-muted-foreground">Loading kanji dictionary...</div>
            }
          >
            <KanjiSearchClient />
          </Suspense>

          <HubGuide />
        </div>

        {/* Crawlable complete index — every kanji page linked in the initial HTML. */}
        <section
          className="container mx-auto px-8 pb-12"
          aria-label="Complete kanji index"
          data-fast-scroll="kanji_scroll_index"
        >
          <details className="mt-4 border-t border-border pt-6">
            <summary className={`cursor-pointer rounded-sm text-lg font-semibold text-foreground ${FOCUS_RING}`}>
              Complete kanji index ({totalKanji} characters)
            </summary>
            <p className="text-sm text-muted-foreground mt-2 mb-4">
              Browse every JLPT kanji by level. Each links to its interactive
              stroke-order page.
            </p>
            {LEVEL_GROUPS.map((group) => (
              <div key={group.level} id={`level-${group.level}`} className="mb-6 scroll-mt-24">
                <h2 className="text-base font-semibold text-japan-deep-ocean mb-2">
                  {/* prefetch={false}: see the level cards above. */}
                  <Link
                    href={levelHref(group.level)}
                    prefetch={false}
                    className={`rounded-sm underline-offset-4 hover:underline ${FOCUS_RING}`}
                  >
                    JLPT {group.level} Kanji ({group.kanji.length})
                  </Link>
                </h2>
                {/* lang="ja" and the link styling sit once on the list, not on
                    each link: every run of text in it is a single kanji, and the
                    list is ~1,900 links written out twice, in the HTML and again
                    in the RSC payload. A class attribute repeated on each link
                    cost ~5 kB of the gzipped document.
                    prefetch={false} for the reason the grid has it: opening the
                    index puts hundreds of these on screen at once, and each
                    would prefetch a ~10 kB page. */}
                <ul
                  lang="ja"
                  className="flex flex-wrap gap-1.5 [&_a]:inline-block [&_a]:rounded [&_a]:border [&_a]:border-border [&_a]:px-2 [&_a]:py-1 [&_a]:text-lg [&_a]:transition-colors [&_a:hover]:border-japan-sakura-waters [&_a:hover]:bg-muted"
                  data-fast-goal="kanji_index_click"
                >
                  {group.kanji.map((k) => (
                    <li key={k.kanji}>
                      <Link
                        href={`/kanji/${encodeURIComponent(k.kanji)}`}
                        prefetch={false}
                        title={`${k.kanji} — ${k.meaning.split(',')[0].trim()} kanji stroke order`}
                      >
                        {k.kanji}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </details>
        </section>
      </main>
    </>
  );
}
