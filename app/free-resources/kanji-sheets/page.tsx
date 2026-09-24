import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowDown, ArrowRight, Download } from 'lucide-react';
import { getSEOTags } from '@/lib/seo';
import { SITE_NAME, SITE_URL } from '@/lib/seo/site';
import Header from '@/components/sections/Header';
import { buttonVariants } from '@/components/ui/button';
import { SECTION_BAND, SECTION_HEADING } from '@/components/kanji/section';
import { PopularKanjiLinks } from '@/components/kanji/PopularKanjiLinks';
import { PrintSteps } from '@/components/sheets/PrintSteps';
import { SheetContents } from '@/components/sheets/SheetContents';
import { SheetsBreadcrumb, breadcrumbJsonLd, type Crumb } from '@/components/sheets/SheetsBreadcrumb';
import type { KanjiData } from '@/lib/constants/kanji-types';
import { N5_KANJI } from '@/lib/constants/n5-kanji';
import { N4_KANJI } from '@/lib/constants/n4-kanji';
import { N3_KANJI } from '@/lib/constants/n3-kanji';
import { N2_KANJI } from '@/lib/constants/n2-kanji';
import { N1_KANJI } from '@/lib/constants/n1-kanji';
import { JLPT_LEVELS, LEVEL_LABELS, levelHref, type JlptLevel } from '@/lib/levels';
import { N5_SEQUENCE } from '@/lib/levels/n5-sequence';
import {
  PACK_DESTINATION,
  PACK_DOWNLOADS,
  PACK_DOWNLOAD_GOALS,
  PACK_FILENAMES,
} from '@/lib/commerce/links';
import { cn } from '@/lib/utils';

/**
 * /free-resources/kanji-sheets — the landing page for "kanji practice sheets".
 *
 * Printables are the best-converting non-brand intent the site has: 358
 * impressions / 17 clicks at position 6.1 for "kanji practice sheets" and
 * 672 / 25 / 7.6 for "kanji practice" (28 days to 2026-09-18). A download is
 * transactional intent, where AI Overviews appear least, and the competitors
 * that rank for it keep their PDFs behind a membership. See
 * docs/3rdVersion/level-pages-and-zero-click-review.md §4.2 #3.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY "GENERATOR" LEFT THE H1
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The page was "Kanji Practice Sheets Generator". Nobody searches for the tool;
 * they search for the sheets, and "generator" promises a form to fill in when
 * the reality is one click to a finished page. The h1 and title now name the
 * thing people want — free, printable, kanji practice sheets — and the URL,
 * which carries the rankings, does not move.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * NUMBERS COME FROM THE DATA
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The old cards said N5 had "~100 characters" when it had 82, and marked all
 * five levels "Available" — a badge with nothing to contrast against. Every
 * count below is read from the level lists. This is a server component, so
 * importing all five costs the client nothing.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT IS ON THE PAGE, AND WHAT IS NOT
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The free N5 pack leads, because it IS the N5 sheets — all of them, in one
 * file — so offering it first shortens the path to the thing this page is for
 * rather than competing with it. It fires the same goal as the pack on the N5
 * sheets page, with this page as the `source` property: one offer, and the
 * surface is a breakdown (lib/commerce/links.ts, "DATAFAST GOAL NAMES").
 *
 * The paid book is deliberately absent. lib/commerce/links.ts explains why
 * this index is the one sheets surface without it.
 */

const LEVEL_LISTS: Record<JlptLevel, readonly KanjiData[]> = {
  N5: N5_KANJI,
  N4: N4_KANJI,
  N3: N3_KANJI,
  N2: N2_KANJI,
  N1: N1_KANJI,
};

// Distinct characters, so one appearing in two lists could never be counted
// twice. The lists are disjoint today (`pnpm validate:kanji-data`), so this is
// also their sum.
const TOTAL_KANJI = new Set(
  JLPT_LEVELS.flatMap((level) => LEVEL_LISTS[level].map((entry) => entry.kanji))
).size.toLocaleString('en-US');

const N5_COUNT = N5_KANJI.length;

const TITLE = 'Free Kanji Practice Sheets — Printable JLPT N5–N1 Worksheets';
const DESCRIPTION = `Free printable kanji practice sheets for ${TOTAL_KANJI} kanji, JLPT N5 to N1: stroke order, readings and 80 practice squares each. No signup. All ${N5_COUNT} N5 kanji in one PDF.`;

export const metadata: Metadata = getSEOTags({
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    'kanji practice sheets',
    'free kanji practice sheets',
    'printable kanji worksheets',
    'kanji practice',
    'kanji worksheets',
    'kanji writing practice',
    'kanji stroke order',
    'JLPT kanji',
    'N5 kanji practice sheets',
    'kanji PDF',
    'Japanese handwriting practice',
  ],
  openGraph: {
    title: TITLE,
    description: `One printable sheet per kanji — stroke order, readings and an 80-square practice grid — for ${TOTAL_KANJI} kanji from JLPT N5 to N1. Free, no signup.`,
    type: 'website',
  },
  canonicalUrlRelative: '/free-resources/kanji-sheets',
});

const PAGE_PATH = '/free-resources/kanji-sheets';

const TRAIL: readonly Crumb[] = [
  { name: 'Home', href: '/' },
  { name: 'Free resources', href: '/free-resources' },
  { name: 'Kanji practice sheets', href: PAGE_PATH },
];

// The first two N5 themes — 日本, then one to ten — for the stroke-order links
// at the foot of the page. See the note there.
const N5_OPENING = N5_SEQUENCE.slice(0, 2).flatMap((theme) => theme.kanji);

// A focus ring for plain text links, which do not go through buttonVariants.
const TEXT_LINK =
  'rounded-sm font-medium text-japan-deep-ocean underline underline-offset-4 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

function sheetsPath(level: JlptLevel): string {
  return `/free-resources/kanji-sheets/${level.toLowerCase()}-sheets`;
}

export default function KanjiSheetsLandingPage() {
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'Free Kanji Practice Sheets',
      description: DESCRIPTION,
      url: `${SITE_URL}${PAGE_PATH}`,
      applicationCategory: 'EducationalApplication',
      operatingSystem: 'Web Browser',
      isAccessibleForFree: true,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      author: {
        '@type': 'Organization',
        name: SITE_NAME,
        url: SITE_URL,
      },
      keywords: 'kanji practice sheets, printable kanji worksheets, JLPT N5 N4 N3 N2 N1, stroke order',
    },
    breadcrumbJsonLd(TRAIL),
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Header />

      <main id="main-content" tabIndex={-1} className="mx-auto min-h-[60vh] max-w-6xl px-4 py-10">
        <SheetsBreadcrumb trail={TRAIL} />

        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-japan-coral-sunset-ink">
            Print at home · No signup · JLPT N5 to N1
          </p>
          <h1 className="mt-3 text-4xl font-bold leading-tight text-japan-deep-ocean md:text-5xl">
            Free printable kanji practice sheets
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-japan-mountain-mist">
            One A4 sheet per kanji — its stroke order, its readings and 80 squares to write it
            in — for all {TOTAL_KANJI} kanji on this site. Open a sheet, then print it or save it
            as a PDF.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {/* The same file, filename and goal as the pack on the N5 sheets
                page; only `source` differs. A download never navigates the
                tab, so there is no new tab to announce and the attribute-fired
                goal is not raced by an unload. */}
            <a
              href={PACK_DOWNLOADS.n5Kanji}
              download={PACK_FILENAMES.n5Kanji}
              data-fast-goal={PACK_DOWNLOAD_GOALS.n5Kanji}
              data-fast-goal-source="kanji_sheets_page"
              data-fast-goal-destination={PACK_DESTINATION}
              className={cn(buttonVariants({ size: 'lg' }), 'w-full sm:w-auto')}
            >
              <Download aria-hidden />
              Get all {N5_COUNT} N5 sheets as one PDF
              <span className="sr-only"> (free, downloads to your device)</span>
            </a>
            <a
              href="#levels"
              className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'w-full sm:w-auto')}
            >
              Choose a level
              <ArrowDown aria-hidden />
            </a>
          </div>
          <p className="mt-3 text-sm text-japan-mountain-mist">
            The N5 pack is free, one page per kanji, with no email to give.
          </p>
        </div>

        {/* `scroll-mt-24` keeps the heading clear of the sticky header when
            "Choose a level" jumps here. */}
        <section id="levels" aria-labelledby="levels-heading" className={cn(SECTION_BAND, 'scroll-mt-24')}>
          <h2 id="levels-heading" className={cn(SECTION_HEADING, 'text-japan-deep-ocean')}>
            Kanji practice sheets by JLPT level
          </h2>
          <p className="mt-2 max-w-3xl text-japan-mountain-mist">
            New to kanji? Start with N5. Each level&rsquo;s page shows every one of its kanji;
            click one and its sheet opens, ready to print.
          </p>

          <ul className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {JLPT_LEVELS.map((level) => {
              const list = LEVEL_LISTS[level];
              return (
                <li
                  key={level}
                  className={cn(
                    'flex flex-col rounded-xl border border-border bg-card p-5',
                    // N5 spans the two-column layout: it is where most visitors
                    // should start, and it keeps 5 cards from leaving an orphan.
                    level === 'N5' && 'sm:col-span-2 xl:col-span-1'
                  )}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-japan-mountain-mist">
                    {LEVEL_LABELS[level]}
                  </p>
                  <h3 className="mt-1 text-2xl font-bold text-japan-deep-ocean">JLPT {level}</h3>
                  <p className="text-sm text-japan-mountain-mist">
                    {list.length.toLocaleString('en-US')} kanji
                  </p>
                  <p lang="ja" className="mt-3 text-xl tracking-wide text-japan-ink-black">
                    {list.slice(0, 4).map((entry) => entry.kanji).join(' ')}
                  </p>
                  {level === 'N5' && (
                    <p className="mt-3 text-sm leading-relaxed text-japan-mountain-mist">
                      Also printable by theme, a whole group at a time.
                    </p>
                  )}

                  <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-5">
                    <Link
                      href={sheetsPath(level)}
                      prefetch={false}
                      className={buttonVariants({ size: 'sm' })}
                    >
                      {level} practice sheets
                    </Link>
                    <Link href={levelHref(level)} prefetch={false} className={cn(TEXT_LINK, 'text-sm')}>
                      See the list
                      <span className="sr-only"> of {level} kanji</span>
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <SheetContents className={SECTION_BAND} />

        <PrintSteps
          className={SECTION_BAND}
          firstStep="Choose your level above, then click any kanji on its page."
        />

        {/* This used to be the site-wide "priority kanji" set — 止, 死, 大,
            日, 出… — headed "Study These Kanji Online" and described as popular.
            That list is an internal-linking seed (lib/linking/priority-kanji.ts),
            not a measure of anything a visitor would call popular, and 死 is an
            odd second offer on a page most beginners reach first. What is here
            now is a claim a reader can check: the start of the N5 sequence,
            which /kanji/n5 continues. */}
        <PopularKanjiLinks
          kanji={N5_OPENING}
          className={SECTION_BAND}
          title="Watch the stroke order before you write"
          description={`Every kanji on these sheets also has a page that draws its strokes one at a time, with its meaning and readings. These are the first ${N5_OPENING.length} of N5, in the order we teach them:`}
        />
        <p className="mt-4">
          <Link href={levelHref('N5')} prefetch={false} className={cn(TEXT_LINK, 'inline-flex items-center gap-1')}>
            All {N5_COUNT} N5 kanji, in order
            <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
        </p>
      </main>
    </>
  );
}
