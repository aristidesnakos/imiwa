import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Download, Printer } from 'lucide-react';

import { getSEOTags } from '@/lib/seo';
import { SITE_URL, SITE_NAME } from '@/lib/seo/site';
import Header from '@/components/sections/Header';
import EmailCapture from '@/components/EmailCapture';
import { BookCTA } from '@/components/commerce/BookCTA';
import { KanjiListCard } from '@/components/levels/KanjiListCard';
import { SECTION_BAND, SECTION_HEADING } from '@/components/kanji/section';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { withJapanese } from '@/components/ja-text';
import { kanjiSheetsHref, MAX_SHEETS_PER_REQUEST } from '@/lib/sheets/kanji-sheets';
import { N5_KANJI } from '@/lib/constants/n5-kanji';
import type { KanjiData } from '@/lib/constants/kanji-types';
import { N5_SEQUENCE } from '@/lib/levels/n5-sequence';
import { levelHref } from '@/lib/levels';
import { episodesNewestFirst } from '@/lib/stories';
import {
  N5_LIST_PACK_GOAL,
  PACK_DESTINATION,
  PACK_DOWNLOADS,
  PACK_FILENAMES,
} from '@/lib/commerce/links';

/**
 * /kanji/n5 — the JLPT N5 list, as a page built to be studied from.
 *
 * Why this page exists at all: "n5 kanji" and its variants are one of the few
 * query classes where impressions still turn into clicks (1.8% CTR against
 * 0.1% for single-character lookups), and until now nothing on the site was
 * built for them — the level tabs on /kanji changed no URL, so there was
 * nothing to rank. See docs/3rdVersion/level-pages-and-zero-click-review.md.
 *
 * Why it looks like this: an AI answer can say "N5 has about 80 kanji", but it
 * cannot be the list someone studies from, prints and works through. So the
 * list comes first, in teaching order rather than by frequency, and every
 * block after it is something to DO with the list — print it, read it in a
 * story, keep going by email — rather than more facts about it.
 *
 * A Server Component. The only client code on the page is the shared header
 * and the email form; the 82 entries are plain HTML.
 */

const COUNT = N5_KANJI.length;
const PAGE_PATH = '/kanji/n5';
const PAGE_URL = `${SITE_URL}${PAGE_PATH}`;

const TITLE = `JLPT N5 Kanji List: All ${COUNT} Kanji with Readings & Stroke Order`;
const DESCRIPTION =
  `Every JLPT N5 kanji in the order to learn them, with meanings, on'yomi and kun'yomi ` +
  `in kana and romaji, and stroke order for each. Free printable practice sheets, no sign-up.`;

export const metadata: Metadata = getSEOTags({
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    'JLPT N5 kanji',
    'N5 kanji list',
    'N5 kanji',
    'kanji N5',
    'JLPT N5 kanji list',
    'beginner kanji',
    'N5 kanji with readings',
    'N5 kanji stroke order',
  ],
  openGraph: {
    title: `JLPT N5 Kanji List — all ${COUNT} kanji, in the order to learn them`,
    description: DESCRIPTION,
    type: 'website',
  },
  canonicalUrlRelative: PAGE_PATH,
});

/**
 * The sequence resolved against the data. The sequence is the ORDER; the data
 * is the TRUTH about what is on the list. A character the sequence names but
 * the list lacks is skipped, and one the list has but the sequence misses goes
 * into a trailing group — so an edit to either file can never make an entry
 * silently disappear from the page. `pnpm validate:kanji-data` fails on both
 * conditions; this is the belt to that brace.
 */
const GROUPS = (() => {
  const byChar = new Map(N5_KANJI.map((k) => [k.kanji, k] as const));
  const placed = new Set<string>();

  const groups = N5_SEQUENCE.map((theme) => {
    const entries = theme.kanji.flatMap((c) => {
      const entry = byChar.get(c);
      if (!entry || placed.has(c)) return [];
      placed.add(c);
      return [entry];
    });
    return { id: theme.id, title: theme.title, summary: theme.summary, entries };
  }).filter((g) => g.entries.length > 0);

  const leftover = N5_KANJI.filter((k) => !placed.has(k.kanji));
  if (leftover.length > 0) {
    groups.push({
      id: 'also-on-the-list',
      title: 'Also on the list',
      summary: 'N5 kanji not yet placed in a group above.',
      entries: leftover,
    });
  }
  return groups;
})();

const ORDERED: KanjiData[] = GROUPS.flatMap((g) => g.entries);

export default function N5KanjiListPage() {
  const episodes = episodesNewestFirst();

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'JLPT N5 Kanji List',
      description: DESCRIPTION,
      url: PAGE_URL,
      inLanguage: 'en',
      educationalLevel: 'JLPT N5',
      publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
      mainEntity: {
        '@type': 'ItemList',
        name: 'JLPT N5 kanji',
        numberOfItems: ORDERED.length,
        itemListOrder: 'https://schema.org/ItemListOrderAscending',
        itemListElement: ORDERED.map((k, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: `${k.kanji} — ${k.meaning.split(/[,;]/)[0].trim()}`,
          url: `${SITE_URL}/kanji/${encodeURIComponent(k.kanji)}`,
        })),
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Kanji Dictionary', item: `${SITE_URL}/kanji` },
        { '@type': 'ListItem', position: 3, name: 'JLPT N5 kanji', item: PAGE_URL },
      ],
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <Header />

      <main id="main-content" tabIndex={-1} className="container mx-auto max-w-5xl px-4 py-8 md:px-8">
        <nav className="mb-6 text-sm text-japan-mountain-mist" aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1">
            <li className="flex items-center">
              <Link href="/" className="flex items-center hover:text-japan-deep-ocean">
                <ArrowLeft className="mr-1 h-4 w-4" aria-hidden />
                Home
              </Link>
            </li>
            <li aria-hidden className="text-japan-sakura-waters">
              /
            </li>
            <li>
              {/* prefetch={false}: /kanji is the heaviest route on the site —
                  a ~62 kB RSC payload plus the whole dictionary as a script
                  chunk — and a breadcrumb in the first viewport would pull
                  all of it on every visit to a page that is otherwise light. */}
              <Link href="/kanji" prefetch={false} className="hover:text-japan-deep-ocean">
                Kanji Dictionary
              </Link>
            </li>
            <li aria-hidden className="text-japan-sakura-waters">
              /
            </li>
            <li className="font-medium text-japan-ink-black" aria-current="page">
              JLPT N5 kanji
            </li>
          </ol>
        </nav>

        <header className="mb-8 max-w-3xl">
          {/* coral-sunset-INK: the fill is 2.7:1 on this background and cannot
              carry a label. See app/globals.css. */}
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-japan-coral-sunset-ink">
            JLPT N5 · Beginner
          </p>
          <h1 className="mt-2 text-3xl font-bold text-japan-deep-ocean md:text-4xl">JLPT N5 Kanji List</h1>
          <p className="mt-4 text-lg text-japan-mountain-mist">
            All {COUNT} kanji for the JLPT N5, grouped in the order to learn them. Each one comes with
            its meaning, its readings in kana and romaji, and a page showing how to write it stroke by
            stroke.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            {/* Same-origin download: no new tab, so no "(opens in a new tab)".
                Tracked from the attribute, with no client boundary — the
                DataFast script resolves `data-fast-goal` from one listener on
                document. See lib/commerce/links.ts for why this placement has
                its own goal name. */}
            <a
              href={PACK_DOWNLOADS.n5Kanji}
              download={PACK_FILENAMES.n5Kanji}
              data-fast-goal={N5_LIST_PACK_GOAL}
              data-fast-goal-destination={PACK_DESTINATION}
              className={cn(buttonVariants({ size: 'lg' }), 'w-full sm:w-auto')}
            >
              <Download aria-hidden />
              All {COUNT} as practice sheets
              <span className="sr-only"> (free PDF, downloads to your device)</span>
            </a>
            <Link
              href="/free-resources/kanji-sheets/n5-sheets"
              className={cn(buttonVariants({ size: 'lg', variant: 'outline' }), 'w-full sm:w-auto')}
            >
              <Printer aria-hidden />
              Print one kanji at a time
            </Link>
          </div>
        </header>

        {/* The groups, as a table of contents. Plain same-page anchors: this is
            the one navigation on the page that must work before any script. */}
        <nav aria-labelledby="groups-heading" className="rounded-lg border border-border bg-japan-soft-mist p-4">
          <h2 id="groups-heading" className="text-sm font-semibold text-japan-deep-ocean">
            {GROUPS.length} groups, in teaching order
          </h2>
          <ol className="mt-3 flex flex-wrap gap-2">
            {GROUPS.map((group) => (
              <li key={group.id}>
                <a
                  href={`#${group.id}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-sm text-japan-ink-black transition-colors hover:border-japan-sakura-waters focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {group.title}
                  <span className="text-xs text-japan-mountain-mist">{group.entries.length}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {GROUPS.map((group, index) => (
          <section
            key={group.id}
            id={group.id}
            aria-labelledby={`${group.id}-heading`}
            className={cn(SECTION_BAND, 'scroll-mt-24')}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 id={`${group.id}-heading`} className={SECTION_HEADING}>
                <span className="mr-2 text-japan-mountain-mist">{index + 1}.</span>
                {group.title}
              </h2>
              {/* Print the group as one document, one sheet per kanji — the
                  study unit this page is organised around. A plain <a>: the
                  target is an API route returning HTML, which client
                  navigation cannot render. Its own goal name, so the list
                  page's group printing reads apart from the sheets page's. */}
              {group.entries.length <= MAX_SHEETS_PER_REQUEST ? (
                <a
                  href={kanjiSheetsHref(group.entries.map((e) => e.kanji))}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-fast-goal="n5_list_group_click"
                  data-fast-goal-group={group.id}
                  className="inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-japan-deep-ocean underline underline-offset-2 hover:brightness-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Printer className="h-4 w-4" aria-hidden />
                  {group.entries.length === 1 ? 'Print this sheet' : `Print all ${group.entries.length} sheets`}
                  <span className="sr-only"> for {group.title} (opens in a new tab)</span>
                </a>
              ) : (
                <p className="text-sm text-japan-mountain-mist">{group.entries.length} kanji</p>
              )}
            </div>
            <p className="mt-1 text-japan-mountain-mist">{withJapanese(group.summary)}</p>
            <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-fast-goal="n5_list_kanji_click">
              {group.entries.map((entry) => (
                <li key={entry.kanji}>
                  <KanjiListCard entry={entry} />
                </li>
              ))}
            </ol>
          </section>
        ))}

        {/* Printing. The pack is the lead offer on this page as on the sheets
            page; the book sits under it and quieter. N5 is the one level the
            book covers, so this is the most on-target slot it can have — and
            its own goal name, so that claim gets tested rather than assumed. */}
        <section className={SECTION_BAND} aria-labelledby="print-heading">
          <h2 id="print-heading" className={SECTION_HEADING}>
            Practise the N5 kanji on paper
          </h2>
          <p className="mt-2 max-w-3xl text-japan-ink-black">
            Every kanji on this list has a free practice sheet: its stroke order, its readings and
            eighty squares to write in, with guides in the first column. Take all {COUNT} in one PDF, or
            print them one at a time as you reach them.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <a
              href={PACK_DOWNLOADS.n5Kanji}
              download={PACK_FILENAMES.n5Kanji}
              data-fast-goal={N5_LIST_PACK_GOAL}
              data-fast-goal-destination={PACK_DESTINATION}
              className={cn(buttonVariants({ size: 'default' }), 'w-full sm:w-auto')}
            >
              <Download aria-hidden />
              Download the free N5 pack
              <span className="sr-only"> (PDF, downloads to your device)</span>
            </a>
            <Link
              href="/free-resources/kanji-sheets/n5-sheets"
              className={cn(buttonVariants({ size: 'default', variant: 'outline' }), 'w-full sm:w-auto')}
            >
              Choose single sheets
              <ArrowRight aria-hidden />
            </Link>
          </div>
          <BookCTA surface="n5List" variant="band" className="mt-6" />
        </section>

        {/* The one thing on the page nobody else has. Text only, no panel art:
            a card image per episode would cost more transfer than the whole
            list above it. */}
        {episodes.length > 0 && (
          <section className={SECTION_BAND} aria-labelledby="stories-heading">
            <h2 id="stories-heading" className={SECTION_HEADING}>
              Read the N5 kanji in a story
            </h2>
            <p className="mt-2 max-w-3xl text-japan-ink-black">
              <em>The Travels of Tan</em> is a six-panel comic written entirely in N5 Japanese: every
              kanji in it is on this list, and a script checks that before an episode goes up. Each
              episode teaches a few words and links them back to their kanji.
            </p>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {episodes.map((episode) => (
                <li key={episode.slug}>
                  <Link
                    href={`/stories/${episode.slug}`}
                    prefetch={false}
                    className="block h-full rounded-lg border border-border bg-card p-4 transition-colors hover:border-japan-sakura-waters focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-japan-mountain-mist">
                      Episode {episode.number}
                    </span>
                    <span lang="ja" className="mt-1 block text-lg font-semibold text-japan-ink-black">
                      {episode.titleJa}
                    </span>
                    <span className="block text-sm text-japan-mountain-mist">{episode.titleEn}</span>
                    <span lang="ja" className="mt-1 block text-sm text-japan-ink-black">
                      {episode.targets.map((t) => t.word).join('・')}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href="/stories"
              className="mt-4 inline-flex items-center gap-1 rounded-sm text-sm font-medium text-japan-deep-ocean underline underline-offset-2 hover:brightness-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              About the stories
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </section>
        )}

        <section className={SECTION_BAND} aria-labelledby="subscribe-heading">
          <h2 id="subscribe-heading" className={`${SECTION_HEADING} mb-6`}>
            Keep reading N5, one story a week
          </h2>
          <EmailCapture
            source="kanji-level-list"
            title="Get each new story by email"
            description="One short Japanese comic a week, written only in N5, with a quiz card on the words it teaches."
            cta="Send me the stories"
          />
        </section>

        {/* The honest answer to the question every N5 list dodges. Our own
            editorial copy; how the list itself was sourced is an open decision
            for the owner (review doc §3.2), so this says nothing it would have
            to retract. */}
        <section className={SECTION_BAND} aria-labelledby="about-heading">
          <h2 id="about-heading" className={SECTION_HEADING}>
            How many kanji are on the JLPT N5?
          </h2>
          <div className="mt-2 max-w-3xl space-y-4 text-japan-ink-black">
            <p>
              The JLPT has not published an official kanji list since the test was revised in 2010, so
              every N5 list, this one included, is a study list rather than an official syllabus. That
              is why they disagree: the lists you will find online run from about 80 kanji to more than
              100.
            </p>
            <p>
              Ours has {COUNT}, grouped by theme in the order we would teach them, starting with{' '}
              <span lang="ja">日本</span> and the numbers.
            </p>
          </div>
          <Link
            href={levelHref('N4')}
            prefetch={false}
            className="mt-4 inline-flex items-center gap-1 rounded-sm text-sm font-medium text-japan-deep-ocean underline underline-offset-2 hover:brightness-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Next level: the N4 kanji
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </section>
      </main>
    </>
  );
}
