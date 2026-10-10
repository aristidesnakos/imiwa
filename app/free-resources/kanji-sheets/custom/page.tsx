import { Metadata } from 'next';
import Link from 'next/link';
import { getSEOTags } from '@/lib/seo';
import { SITE_NAME, SITE_URL } from '@/lib/seo/site';
import Header from '@/components/sections/Header';
import { BookCTA } from '@/components/commerce/BookCTA';
import { buttonVariants } from '@/components/ui/button';
import { SECTION_BAND, SECTION_HEADING } from '@/components/kanji/section';
import { PrintSteps } from '@/components/sheets/PrintSteps';
import { SheetBuilder, type BuilderGroup, type BuilderLevel } from '@/components/sheets/SheetBuilder';
import { SheetsBreadcrumb, breadcrumbJsonLd, type Crumb } from '@/components/sheets/SheetsBreadcrumb';
import type { KanjiData } from '@/lib/constants/kanji-types';
import { N5_KANJI } from '@/lib/constants/n5-kanji';
import { N4_KANJI } from '@/lib/constants/n4-kanji';
import { N3_KANJI } from '@/lib/constants/n3-kanji';
import { N2_KANJI } from '@/lib/constants/n2-kanji';
import { N1_KANJI } from '@/lib/constants/n1-kanji';
import { JLPT_LEVELS, type JlptLevel } from '@/lib/levels';
import { N5_SEQUENCE } from '@/lib/levels/n5-sequence';
import { MAX_ROWS, MAX_ROWS_KANJI_PER_REQUEST, MAX_SHEETS_PER_REQUEST } from '@/lib/sheets/kanji-sheets';
import { kanjiPerPage, printedPageCount } from '@/lib/sheets/layout';
import { cn } from '@/lib/utils';

/**
 * /free-resources/kanji-sheets/custom — the kanji worksheet generator.
 *
 * Two visitors asked for it through the feedback form, both rating the site
 * 4★: "select multiple kanji, or select all kanji, and get 1 or N multiple rows
 * per kanji", and grids for practising on genkouyoushi. It is also written for
 * a search the first page of results answers badly (checked 2026-10-10):
 * "japanese kanji worksheet generator", where the results are forum posts and
 * a converter site.
 *
 * The sheets hub dropped "generator" from its h1 because nothing there was one
 * (see its header). This page is the generator, so the word lives here.
 *
 * A server page around one client island (components/sheets/SheetBuilder.tsx).
 * The page imports all five level lists to hand the island each level's
 * characters as a string: 5.7 kB for all 1,907, never the data itself. It is
 * prerendered; the island reads a shared link's parameters after mount.
 *
 * The book card sits under the print controls as surface `customSheets`, goal
 * `custom_book_click` (lib/commerce/links.ts says why this slot earns it).
 */

const LEVEL_LISTS: Record<JlptLevel, readonly KanjiData[]> = {
  N5: N5_KANJI,
  N4: N4_KANJI,
  N3: N3_KANJI,
  N2: N2_KANJI,
  N1: N1_KANJI,
};

const LEVELS: BuilderLevel[] = JLPT_LEVELS.map((level) => ({
  level,
  characters: LEVEL_LISTS[level].map((entry) => entry.kanji).join(''),
}));

const GROUPS: BuilderGroup[] = N5_SEQUENCE.map((theme) => ({
  id: theme.id,
  title: theme.title,
  characters: theme.kanji.join(''),
}));

const TOTAL_KANJI = LEVELS.reduce((n, level) => n + Array.from(level.characters).length, 0).toLocaleString('en-US');

// The worked example in the copy, from the same arithmetic the printer uses.
const ONE_ROW = { layout: 'rows', rows: 1, grid: 'cross' } as const;
const ONE_ROW_PER_PAGE = kanjiPerPage(ONE_ROW);
const N5_ONE_ROW_PAGES = printedPageCount(N5_KANJI.length, ONE_ROW);

const TITLE = 'Kanji Worksheet Generator — Make Your Own Printable Practice Sheets';
const DESCRIPTION = `Make your own printable kanji practice sheets: paste any kanji, a word or a vocabulary list, or add a whole JLPT level, then print one kanji per page or several per page with 1 to ${MAX_ROWS} rows each, on squares or genkouyoushi. Free, no signup.`;

export const metadata: Metadata = getSEOTags({
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    'kanji worksheet generator',
    'japanese kanji worksheet generator',
    'kanji practice sheet generator',
    'custom kanji practice sheets',
    'printable kanji worksheets',
    'kanji writing practice',
    'kanji stroke order worksheet',
    'kanji genkouyoushi',
  ],
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: 'website',
  },
  canonicalUrlRelative: '/free-resources/kanji-sheets/custom',
});

const PAGE_PATH = '/free-resources/kanji-sheets/custom';
const FORM_ID = 'custom-sheets-form';

const TRAIL: readonly Crumb[] = [
  { name: 'Home', href: '/' },
  { name: 'Free resources', href: '/free-resources' },
  { name: 'Kanji practice sheets', href: '/free-resources/kanji-sheets' },
  { name: 'Make your own', href: PAGE_PATH },
];

// A focus ring for plain text links, which do not go through buttonVariants.
const TEXT_LINK =
  'rounded-sm font-medium text-japan-deep-ocean underline underline-offset-4 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

export default function CustomKanjiSheetsPage() {
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'Kanji Worksheet Generator',
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
      keywords: 'kanji worksheet generator, custom kanji practice sheets, printable kanji worksheets, stroke order',
    },
    breadcrumbJsonLd(TRAIL),
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Without JavaScript the level and theme buttons, the chips and the
          print links cannot work, so they are hidden rather than left as dead
          controls; the form underneath still submits to the API. */}
      <noscript>
        <style>{'.js-only{display:none}'}</style>
      </noscript>

      <Header />

      <main id="main-content" tabIndex={-1} className="mx-auto min-h-[60vh] max-w-4xl px-4 py-10">
        <SheetsBreadcrumb trail={TRAIL} />

        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-japan-coral-sunset-ink">
            Free · No signup · Any of {TOTAL_KANJI} kanji, N5 to N1
          </p>
          <h1 className="mt-3 text-4xl font-bold leading-tight text-japan-deep-ocean md:text-5xl">
            Make your own kanji practice sheets
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-japan-mountain-mist">
            Choose exactly which kanji to practise and how much room each one gets, then print them
            all as one document, or save it as a PDF.
          </p>
        </div>

        <SheetBuilder formId={FORM_ID} levels={LEVELS} groups={GROUPS} />

        <noscript>
          <div className="mt-4">
            <button type="submit" form={FORM_ID} className={buttonVariants({ size: 'lg' })}>
              Open the sheets
            </button>
            <p className="mt-2 text-sm text-japan-mountain-mist">
              Without JavaScript the box has to hold kanji only, with nothing between them.
            </p>
          </div>
        </noscript>

        {/* Someone printing all 82 N5 kanji one per page is printing a book at
            home: the bound one is the honest next offer, and it goes under the
            controls, never in front of them. Renders nothing until the listing
            exists. */}
        <BookCTA surface="customSheets" variant="card" design="nextStep" headingLevel={2} />

        <section aria-labelledby="several-heading" className={SECTION_BAND}>
          <h2 id="several-heading" className={cn(SECTION_HEADING, 'text-japan-deep-ocean')}>
            Print several kanji on one page
          </h2>
          <p className="mt-3 max-w-3xl leading-relaxed text-japan-ink-black">
            Choose <strong>Several kanji per page</strong> and each kanji gets one line with its
            meaning, its readings and a small stroke-order diagram with the strokes numbered, then
            as many rows of ten squares as you pick, from 1 to {MAX_ROWS}. The first square of every
            row holds a faded copy to trace. With one row each, {ONE_ROW_PER_PAGE} kanji fit on a
            page, so all {N5_KANJI.length} N5 kanji print on {N5_ONE_ROW_PAGES} pages.
          </p>
        </section>

        <section aria-labelledby="genkou-heading" className={SECTION_BAND}>
          <h2 id="genkou-heading" className={cn(SECTION_HEADING, 'text-japan-deep-ocean')}>
            Kanji practice sheets on genkouyoushi
          </h2>
          <p className="mt-3 max-w-3xl leading-relaxed text-japan-ink-black">
            Choose <strong>Genkouyoushi</strong> under Squares and the practice squares become
            Japanese manuscript paper: plain squares in columns, written top to bottom and right to
            left, with the narrow strip for readings on the right of each column and a faded model
            at the top. With several kanji per page, each kanji gets columns instead of rows. For
            the paper on its own, there is{' '}
            <Link href="/free-resources/genkouyoushi" prefetch={false} className={TEXT_LINK}>
              free printable genkouyoushi paper
            </Link>
            .
          </p>
        </section>

        <section aria-labelledby="list-heading" className={SECTION_BAND}>
          <h2 id="list-heading" className={cn(SECTION_HEADING, 'text-japan-deep-ocean')}>
            Make a worksheet from a word list or a textbook lesson
          </h2>
          <p className="mt-3 max-w-3xl leading-relaxed text-japan-ink-black">
            Paste the vocabulary from a lesson, a page of a reader or a list of words you keep
            getting wrong. The kana, the punctuation and anything else that is not a kanji are left
            out, and each kanji is printed once, in the order it first appears. A kanji we do not
            have a sheet for yet is named, so you know it is missing. One document holds up to{' '}
            {MAX_ROWS_KANJI_PER_REQUEST} kanji in rows, or {MAX_SHEETS_PER_REQUEST} at one page each; a
            bigger set prints in parts.
          </p>
        </section>

        <section aria-labelledby="share-heading" className={SECTION_BAND}>
          <h2 id="share-heading" className={cn(SECTION_HEADING, 'text-japan-deep-ocean')}>
            Share a kanji worksheet with a class
          </h2>
          <p className="mt-3 max-w-3xl leading-relaxed text-japan-ink-black">
            The set and the layout are kept in the page&rsquo;s address, so the link is the
            worksheet. Copy it and anyone who opens it gets the same kanji, laid out the same way,
            ready to print. Nothing is saved on our side and there is no account to make.
          </p>
        </section>

        <PrintSteps
          className={SECTION_BAND}
          firstStep="Build your set above, then press Print."
        />

        <p className="mt-8 text-japan-ink-black">
          Prefer a ready-made set?{' '}
          <Link href="/free-resources/kanji-sheets" prefetch={false} className={TEXT_LINK}>
            Kanji practice sheets by JLPT level
          </Link>
        </p>
      </main>
    </>
  );
}
