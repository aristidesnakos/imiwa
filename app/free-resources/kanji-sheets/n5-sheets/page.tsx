import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getSEOTags } from '@/lib/seo';
import { SITE_NAME, SITE_URL } from '@/lib/seo/site';
import Header from '@/components/sections/Header';
import { EmailCapture } from '@/components/EmailCapture';
import { N5_KANJI } from '@/lib/constants/n5-kanji';
import { KanjiN5WorkbookCTA } from '@/components/kanji/KanjiN5WorkbookCTA';
import { BookCTA } from '@/components/commerce/BookCTA';
import { SECTION_BAND, SECTION_HEADING } from '@/components/kanji/section';
import { N5QuizLink } from '@/components/levels/N5QuizLink';
import { GroupSheetLinks } from '@/components/sheets/GroupSheetLinks';
import { PrintSteps } from '@/components/sheets/PrintSteps';
import { SheetContents } from '@/components/sheets/SheetContents';
import { SheetsBreadcrumb, breadcrumbJsonLd, type Crumb } from '@/components/sheets/SheetsBreadcrumb';
import { sendDayName } from '@/lib/email/send-schedule';
import { levelPagePath } from '@/lib/levels';
import { N5_SEQUENCE } from '@/lib/levels/n5-sequence';
import { CUSTOM_SHEETS_PATH, kanjiSheetHref } from '@/lib/sheets/kanji-sheets';
import { cn } from '@/lib/utils';

/**
 * /free-resources/kanji-sheets/n5-sheets — N5 practice sheets.
 *
 * This page and /kanji/n5 cover the same 82 characters for two different
 * searches, and they stay apart on purpose (docs/3rdVersion/
 * level-pages-and-zero-click-review.md §2.4): this one is for someone who wants
 * paper — "n5 kanji practice sheets", "kanji worksheets" — and the list page is
 * for someone who wants the list. So the title and h1 here stay about sheets,
 * and each page links to the other rather than repeating it.
 *
 * Three ways to print, in the order a visitor meets them: one kanji from the
 * grid, all 82 as the free pack, then a themed group. By size the group belongs
 * between the other two, and it sits below the pack and the book on purpose.
 * The pack converts ~20% of this page's visitors and the book's measurement
 * has only just started (see the note on BookCTA below); eleven group cards
 * above them would move numbers that are being read right now, for a feature
 * with no baseline yet. The hero links straight down to the groups instead.
 * Once the book has a month of data, moving the section up is a one-block
 * change worth testing.
 */

export const metadata: Metadata = getSEOTags({
  title: 'N5 Kanji Practice Sheets Generator | Printable Japanese Worksheets',
  description: 'Generate printable kanji practice sheets for JLPT N5 characters. Download practice grids with stroke order diagrams for handwriting practice.',
  keywords: [
    'kanji practice sheets',
    'N5 kanji',
    'Japanese writing practice',
    'kanji worksheets',
    'stroke order',
    'kanji PDF',
    'Japanese handwriting',
    'JLPT N5',
    'kanji stroke order',
    'practice sheets',
    'Japanese learning'
  ],
  openGraph: {
    title: 'N5 Kanji Practice Sheets Generator | Printable Japanese Worksheets',
    description: 'Generate high-quality printable practice sheets for JLPT N5 kanji. Perfect for learning proper stroke order and building muscle memory.',
    type: 'website',
  },
  canonicalUrlRelative: '/free-resources/kanji-sheets/n5-sheets',
});

const PAGE_PATH = '/free-resources/kanji-sheets/n5-sheets';

const TRAIL: readonly Crumb[] = [
  { name: 'Home', href: '/' },
  { name: 'Free resources', href: '/free-resources' },
  { name: 'Kanji practice sheets', href: '/free-resources/kanji-sheets' },
  { name: 'N5', href: PAGE_PATH },
];

// A focus ring for the plain text links, which do not go through
// buttonVariants and so do not inherit one (CLAUDE.md, "Design tokens").
const TEXT_LINK =
  'rounded-sm font-medium text-japan-deep-ocean underline underline-offset-4 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

export default function N5KanjiSheetsPage() {
  const kanjiCount = N5_KANJI.length;
  // Null only if N5 ever loses its list page; the link then simply is not
  // rendered, rather than pointing somewhere its copy does not describe.
  const listPath = levelPagePath('N5');

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'N5 Kanji Practice Sheets Generator',
      description: 'Generate printable practice sheets for JLPT N5 kanji characters with stroke order diagrams',
      url: `${SITE_URL}${PAGE_PATH}`,
      applicationCategory: 'EducationalApplication',
      operatingSystem: 'Web Browser',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD'
      },
      author: {
        '@type': 'Organization',
        name: SITE_NAME,
        url: SITE_URL
      },
      keywords: 'kanji practice sheets, N5, JLPT, Japanese writing, stroke order'
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

        <div className="mb-10 text-center">
          <h1 className="mb-3 text-4xl font-bold text-japan-deep-ocean">
            N5 Kanji Practice Sheet Generator
          </h1>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-japan-mountain-mist">
            Click any of the {kanjiCount} JLPT N5 kanji below for a printable sheet with its stroke
            order and a practice grid, or{' '}
            <a href="#print-a-group" className={TEXT_LINK}>
              print a whole group
            </a>{' '}
            of them at once.
          </p>
          <p className="mt-3 text-japan-mountain-mist">
            Want several on one page, or your own list?{' '}
            <Link href={CUSTOM_SHEETS_PATH} prefetch={false} className={TEXT_LINK}>
              Make your own sheets
            </Link>
          </p>
          {listPath && (
            <p className="mt-4">
              <Link href={listPath} prefetch={false} className={cn(TEXT_LINK, 'inline-flex items-center gap-1')}>
                See all {kanjiCount} N5 kanji with meanings and readings
                <ArrowRight aria-hidden className="h-4 w-4" />
              </Link>
            </p>
          )}
        </div>

        <section
          aria-labelledby="kanji-grid-heading"
          className="mb-8 rounded-lg border border-border bg-japan-soft-mist p-6 md:p-8"
        >
          <h2 id="kanji-grid-heading" className="mb-5 text-xl font-semibold text-japan-deep-ocean">
            Print a practice sheet for any N5 kanji
          </h2>

          {/* `lg:grid-cols-15` was here before, and Tailwind has no such class,
              so the grid silently stayed at 12 columns. The arbitrary value is
              the 15 that was meant: fewer rows, so the pack below sits higher. */}
          <div className="grid grid-cols-6 gap-2 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-[repeat(15,minmax(0,1fr))]">
            {N5_KANJI.map((kanji) => (
              <a
                key={kanji.kanji}
                href={kanjiSheetHref(kanji.kanji)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex aspect-square items-center justify-center rounded border-2 border-[color:color-mix(in_srgb,var(--sakura-waters)_55%,var(--temple-stone))] bg-card text-2xl font-bold text-japan-ink-black transition-colors duration-200 hover:border-japan-mountain-mist hover:bg-japan-temple-stone focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                title={`${kanji.kanji} - ${kanji.meaning}`}
              >
                <span lang="ja">{kanji.kanji}</span>
                <span className="sr-only">
                  {' '}— {kanji.meaning.split(/[,;]/)[0].trim()}: practice sheet (opens in a new tab)
                </span>
              </a>
            ))}
          </div>
        </section>

        {/* The free pack: every N5 sheet in one PDF. */}
        <KanjiN5WorkbookCTA />

        {/* The paid book, BELOW the free pack and quieter than it. Renders
            nothing until AMAZON_BOOK_URL is filled in. The order is a decision,
            not an oversight: the pack CTA above converts ~20% of this page's
            visitors and produces the best cohort on the site (bounce 29%,
            session 9m58s), and that is not worth trading for a $5.83-net sale
            at this volume. It does mean `n5_sheets_book_click` is a LOWER
            bound on what the book could do from this page.

            `design="nextStep"` from 7 Oct 2026: the first of the sequential
            designs in BookCTA, judged after four weeks against the baseline
            recorded there (6 clicks per 422 landed, 1.4%). */}
        <BookCTA surface="n5Sheets" variant="card" design="nextStep" />

        {/* `scroll-mt-24` keeps the heading clear of the sticky header when the
            hero's in-page link jumps here. */}
        <section
          id="print-a-group"
          aria-labelledby="print-a-group-heading"
          className={cn(SECTION_BAND, 'scroll-mt-24')}
        >
          <h2 id="print-a-group-heading" className={cn(SECTION_HEADING, 'text-japan-deep-ocean')}>
            Print a whole group of N5 kanji at once
          </h2>
          <p className="mt-2 max-w-3xl text-japan-mountain-mist">
            The same {kanjiCount} kanji in the order we teach them, in {N5_SEQUENCE.length} themed
            groups. Each button opens the whole group as one document, one kanji per page, so a
            theme prints — or saves as a single PDF — in one go.
          </p>
          {/* `n5_sheets_group_click`: <place>_<thing>_<action>, with the place
              this page's other goals already use (`n5_sheets_book_click`). If it
              stays near zero, the section goes; if a real share of visitors
              print by group, N4 earns a themed sequence of its own. The theme
              travels as a property — see GroupSheetLinks. */}
          <GroupSheetLinks themes={N5_SEQUENCE} goal="n5_sheets_group_click" className="mt-6" />
        </section>

        {/* The weekly-story signup goes after the last way to print, not beside
            the pack, and that is the same decision as the groups' placement
            above. Directly under the pack it would push down the book card,
            whose click goal and `n5_sheets_scroll_book` marker are being read
            now. Above this section it would push down the group prints, which
            are downloads with a keep-or-cut goal of their own. Here nothing
            measured moves. Once the book has its month of data, trying it
            under the pack is a one-block change.

            `title=""` and `description=""`, not `{undefined}`: EmailCapture's
            props have defaults, a default parameter applies to `undefined`, and
            the card would then lead with an <h3> repeating this <h2>. */}
        <section aria-labelledby="weekly-story-heading" className={SECTION_BAND}>
          <h2 id="weekly-story-heading" className={cn(SECTION_HEADING, 'text-japan-deep-ocean')}>
            A weekly story you can actually read
          </h2>
          <p className="mt-2 max-w-3xl text-japan-mountain-mist">
            A short comic every {sendDayName()}, with a quiz on the words it teaches. It&rsquo;s
            written with N5 kanji and beginner grammar only, so every kanji in it is one you can
            print on this page.
          </p>
          <EmailCapture
            source="kanji-level-sheets"
            title=""
            description=""
            cta="Send me the stories"
            className="mt-6 max-w-xl"
          />
        </section>

        <PrintSteps
          className={SECTION_BAND}
          firstStep="Click a kanji in the grid above, or a group’s print button."
        />

        <SheetContents className={SECTION_BAND} />

        {/* From writing the kanji to recalling them: the page's one link to the quiz,
            closing the section that describes practising on a sheet. Last on the page
            for the same reason as the signup above: here nothing measured moves. */}
        <N5QuizLink lead="Written a few out? " className="mt-8 text-japan-ink-black" />
      </main>
    </>
  );
}
