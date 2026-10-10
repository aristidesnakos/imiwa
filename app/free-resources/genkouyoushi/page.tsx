import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Download, Printer } from 'lucide-react';
import { getSEOTags } from '@/lib/seo';
import { SITE_NAME, SITE_URL } from '@/lib/seo/site';
import Header from '@/components/sections/Header';
import { buttonVariants } from '@/components/ui/button';
import { SECTION_BAND, SECTION_HEADING } from '@/components/kanji/section';
import { SheetsBreadcrumb, breadcrumbJsonLd, type Crumb } from '@/components/sheets/SheetsBreadcrumb';
import { GENKOUYOUSHI_DOWNLOAD_GOAL, PAPER_DOWNLOADS, PAPER_FILENAMES } from '@/lib/commerce/links';
import {
  GENKOUYOUSHI_FORMATS,
  GENKOUYOUSHI_FORMAT_IDS,
  genkouyoushiSvg,
  squareCount,
  type GenkouyoushiFormatId,
} from '@/lib/sheets/genkouyoushi';
import { CUSTOM_SHEETS_PATH } from '@/lib/sheets/kanji-sheets';
import { cn } from '@/lib/utils';

/**
 * /free-resources/genkouyoushi — blank genkōyōshi (原稿用紙) to print or
 * download.
 *
 * A search page first. "genkouyoushi paper printable", "genkouyoushi pdf" and
 * "genkouyoushi template" are what Google's autocomplete offers, and on
 * 2026-10-10 their first pages were forum posts, a converter site and spam
 * PDFs. Someone searching "pdf" wants a file, so each format has a direct
 * download as well as a print button, and the PDFs are what the print buttons
 * print (scripts/sheets/render-genkouyoushi-pdfs.ts).
 *
 * The two formats and the conventions behind them, with sources, are in
 * lib/sheets/genkouyoushi.ts. The how-to section below is editorial copy about
 * Japanese writing conventions: re-check it with the Japanese reviewer before
 * extending it.
 *
 * One goal for every control, `genkouyoushi_paper_download`, with `format` and
 * `output` as properties (lib/commerce/links.ts has its Gate 0).
 */

const PAGE_PATH = '/free-resources/genkouyoushi';

const TITLE = 'Free Printable Genkouyoushi Paper (原稿用紙) — PDF and Print';
const DESCRIPTION =
  'Free printable genkouyoushi (原稿用紙), Japanese manuscript paper: the standard 400-square 20×20 sheet and a large-square sheet for learners. Print it or download the PDF, no signup.';

export const metadata: Metadata = getSEOTags({
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    'genkouyoushi',
    'genkouyoushi paper',
    'genkouyoushi pdf',
    'genkouyoushi printable',
    'genkouyoushi template',
    '原稿用紙',
    'japanese manuscript paper',
  ],
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: 'website',
  },
  canonicalUrlRelative: PAGE_PATH,
});

const TRAIL: readonly Crumb[] = [
  { name: 'Home', href: '/' },
  { name: 'Free resources', href: '/free-resources' },
  { name: 'Genkouyoushi paper', href: PAGE_PATH },
];

const FORMAT_COPY: Record<GenkouyoushiFormatId, { heading: string; facts: string[]; body: string }> = {
  standard: {
    heading: 'Standard 400-square genkouyoushi (20×20)',
    facts: ['20 columns of 20 squares', '8.5 mm squares', 'A4, landscape'],
    body: 'The sheet Japanese students write essays on, laid out as on the paper sold in Japan: two halves of ten columns either side of a centre column where the sheet folds.',
  },
  large: {
    heading: 'Large-square genkouyoushi for beginners',
    facts: ['12 columns of 10 squares', '15 mm squares', 'A4, landscape'],
    body: 'Squares nearly twice as wide, like the composition paper used in the first years of school in Japan, so a kanji you are still learning has room for every stroke.',
  },
};

// A focus ring for plain text links, which do not go through buttonVariants.
const TEXT_LINK =
  'rounded-sm font-medium text-japan-deep-ocean underline underline-offset-4 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

export default function GenkouyoushiPage() {
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Free printable genkouyoushi paper',
      description: DESCRIPTION,
      url: `${SITE_URL}${PAGE_PATH}`,
      isAccessibleForFree: true,
      publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
      hasPart: GENKOUYOUSHI_FORMAT_IDS.map((id) => ({
        '@type': 'DigitalDocument',
        name: FORMAT_COPY[id].heading,
        encodingFormat: 'application/pdf',
        url: `${SITE_URL}${PAPER_DOWNLOADS[id]}`,
      })),
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

      <main id="main-content" tabIndex={-1} className="mx-auto min-h-[60vh] max-w-5xl px-4 py-10">
        <SheetsBreadcrumb trail={TRAIL} />

        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-japan-coral-sunset-ink">
            Free · Print or PDF · No signup
          </p>
          <h1 className="mt-3 text-4xl font-bold leading-tight text-japan-deep-ocean md:text-5xl">
            Free printable genkouyoushi paper (<span lang="ja">原稿用紙</span>)
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-japan-mountain-mist">
            Genkouyoushi is Japanese manuscript paper: a grid of squares, one character to each,
            written in columns from top to bottom and right to left. Print a sheet from here, or
            download it as a PDF to print as many as you need.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {GENKOUYOUSHI_FORMAT_IDS.map((id) => {
            const format = GENKOUYOUSHI_FORMATS[id];
            const copy = FORMAT_COPY[id];
            const headingId = `${id}-heading`;
            return (
              <section
                key={id}
                aria-labelledby={headingId}
                className="flex flex-col rounded-xl border border-border bg-card p-5 md:p-6"
              >
                {/* The sheet itself, drawn by the same code that prints it.
                    Decorative: the heading and the facts below say what it is. */}
                <div
                  className="rounded-md border border-border bg-japan-temple-stone p-3"
                  dangerouslySetInnerHTML={{
                    __html: genkouyoushiSvg(format, 'aria-hidden="true" focusable="false" style="display:block;width:100%;height:auto"'),
                  }}
                />
                <h2 id={headingId} className="mt-5 text-xl font-semibold text-japan-deep-ocean">
                  {copy.heading}
                </h2>
                <p className="mt-1 text-sm text-japan-mountain-mist">
                  {squareCount(format)} squares · {copy.facts.join(' · ')}
                </p>
                <p className="mt-3 leading-relaxed text-japan-ink-black">{copy.body}</p>

                <div className="mt-auto flex flex-wrap gap-3 pt-5">
                  {/* A new tab for the print document, which is what lets the
                      goal's request finish; the PDF downloads in place. */}
                  <a
                    href={`/api/genkouyoushi/${id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-fast-goal={GENKOUYOUSHI_DOWNLOAD_GOAL}
                    data-fast-goal-format={id}
                    data-fast-goal-output="print"
                    className={buttonVariants()}
                  >
                    <Printer aria-hidden />
                    Print
                    <span className="sr-only"> the {copy.heading.toLowerCase()} (opens in a new tab)</span>
                  </a>
                  <a
                    href={PAPER_DOWNLOADS[id]}
                    download={PAPER_FILENAMES[id]}
                    data-fast-goal={GENKOUYOUSHI_DOWNLOAD_GOAL}
                    data-fast-goal-format={id}
                    data-fast-goal-output="pdf"
                    className={buttonVariants({ variant: 'outline' })}
                  >
                    <Download aria-hidden />
                    Download the PDF
                    <span className="sr-only"> of the {copy.heading.toLowerCase()}</span>
                  </a>
                </div>
              </section>
            );
          })}
        </div>

        <section aria-labelledby="how-heading" className={SECTION_BAND}>
          <h2 id="how-heading" className={cn(SECTION_HEADING, 'text-japan-deep-ocean')}>
            How to write on genkouyoushi paper
          </h2>
          <ul className="ml-5 mt-4 max-w-3xl list-disc space-y-2 leading-relaxed text-japan-ink-black">
            <li>
              Start in the top square of the right-hand column and write down it, then move to the
              next column on the left.
            </li>
            <li>
              Every character takes its own square: kanji, kana, the small{' '}
              <span lang="ja">ゃ</span> and <span lang="ja">っ</span>, and punctuation such as{' '}
              <span lang="ja">。</span> and <span lang="ja">、</span>.
            </li>
            <li>Begin each new paragraph one square down from the top.</li>
            <li>
              A <span lang="ja">。</span> or <span lang="ja">、</span> never starts a column. If one
              falls there, it goes into the last square of the column before, with the character it
              follows.
            </li>
            <li>
              The narrow strip to the right of each column is for furigana, the small readings
              written beside a kanji, and for corrections.
            </li>
            <li>On the 400-square sheet, the centre column is where the paper folds. Leave it empty.</li>
          </ul>
        </section>

        <section aria-labelledby="kanji-heading" className={SECTION_BAND}>
          <h2 id="kanji-heading" className={cn(SECTION_HEADING, 'text-japan-deep-ocean')}>
            Practise kanji on genkouyoushi squares
          </h2>
          <p className="mt-3 max-w-3xl leading-relaxed text-japan-ink-black">
            The sheet builder prints any kanji on genkouyoushi squares, with each kanji&rsquo;s
            stroke order and readings beside its columns and a faded model at the top of each one to
            trace. Paste a word list or pick a JLPT level.
          </p>
          <Link
            href={`${CUSTOM_SHEETS_PATH}?grid=genkou`}
            prefetch={false}
            className={cn(buttonVariants({ variant: 'outline' }), 'mt-4')}
          >
            Make kanji sheets on genkouyoushi
            <ArrowRight aria-hidden />
          </Link>
          <p className="mt-6 text-japan-ink-black">
            Or print ready-made{' '}
            <Link href="/free-resources/kanji-sheets" prefetch={false} className={TEXT_LINK}>
              kanji practice sheets by JLPT level
            </Link>
            .
          </p>
        </section>
      </main>
    </>
  );
}
