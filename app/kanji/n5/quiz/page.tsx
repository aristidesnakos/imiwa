import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import Header from '@/components/sections/Header';
import { SECTION_BAND, SECTION_HEADING } from '@/components/kanji/section';
import { getSEOTags } from '@/lib/seo';
import { SITE_URL } from '@/lib/seo/site';
import { levelHref } from '@/lib/levels';
import { N5_KANJI } from '@/lib/constants/n5-kanji';
import { N5QuizClient } from './N5QuizClient';

/**
 * /kanji/n5/quiz — a free quiz on the N5 kanji, and the per-level way into
 * spaced-repetition review.
 *
 * docs/3rdVersion/level-pages-and-zero-click-review.md §4.1 and §4.2 #4. The
 * site's clicks come from things people have to *use* — stroke order and
 * practice convert at 6.5%, character lookups at 0.1% — and a quiz cannot be
 * answered in a snippet. It is also the missing way in: /kanji/review only
 * reviews kanji someone has already marked learned, so a newcomer had nothing
 * to review and no per-level place to start.
 *
 * A server component. Metadata, the breadcrumb, JSON-LD and the explanatory
 * copy are all in the HTML, and N5QuizClient's first render is its setup
 * screen, so everything but playing works before any script loads.
 *
 * Every link here carries prefetch={false}. On a phone the header nav is
 * hidden, so these would be the page's only prefetches — and /kanji's payload,
 * with its full index of ~1,900 links, is heavy to fetch for a visitor who
 * came to play a quiz. This route will get its own byte budget.
 */

const PATH = '/kanji/n5/quiz';
const N5_COUNT = N5_KANJI.length;
/** `/kanji/n5` — or, if N5 ever lost its page, /kanji filtered to it. */
const N5_LIST = levelHref('N5');

const TITLE = `JLPT N5 Kanji Quiz: Free Practice Test (${N5_COUNT} Kanji)`;
const DESCRIPTION = `Free JLPT N5 kanji quiz on all ${N5_COUNT} kanji: meanings, readings with romaji, and the kanji for a meaning. Four choices, answers as you go, no sign-up.`;

export const metadata: Metadata = getSEOTags({
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    'JLPT N5 kanji quiz',
    'N5 kanji quiz',
    'N5 kanji practice test',
    'JLPT N5 practice test',
    'N5 kanji practice',
    'kanji quiz',
    'kanji reading quiz',
    'kanji meaning quiz',
    'kanji quiz with romaji',
  ],
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: 'website',
  },
  canonicalUrlRelative: PATH,
});

/** Mirrors the visible breadcrumb below. Absolute, canonical-host URLs (lib/seo/site.ts). */
const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
    { '@type': 'ListItem', position: 2, name: 'Kanji Dictionary', item: `${SITE_URL}/kanji` },
    { '@type': 'ListItem', position: 3, name: 'JLPT N5 kanji', item: `${SITE_URL}${N5_LIST}` },
    { '@type': 'ListItem', position: 4, name: 'Quiz', item: `${SITE_URL}${PATH}` },
  ],
};

const RING =
  'rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';
const CRUMB = `hover:text-japan-deep-ocean ${RING}`;
const TEXT_LINK = `font-medium text-japan-deep-ocean underline underline-offset-4 hover:no-underline ${RING}`;

export default function N5QuizPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <Header />

      <main id="main-content" tabIndex={-1} className="container mx-auto max-w-3xl px-4 py-8 sm:px-8">
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-japan-mountain-mist">
          <ol className="flex flex-wrap items-center gap-1">
            <li className="flex items-center">
              <Link prefetch={false} href="/" className={`flex items-center ${CRUMB}`}>
                <ArrowLeft aria-hidden="true" className="mr-1 h-4 w-4" />
                Home
              </Link>
            </li>
            <li aria-hidden="true" className="text-japan-sakura-waters">
              /
            </li>
            <li>
              <Link prefetch={false} href="/kanji" className={CRUMB}>
                Kanji Dictionary
              </Link>
            </li>
            <li aria-hidden="true" className="text-japan-sakura-waters">
              /
            </li>
            <li>
              <Link prefetch={false} href={N5_LIST} className={CRUMB}>
                JLPT N5 kanji
              </Link>
            </li>
            <li aria-hidden="true" className="text-japan-sakura-waters">
              /
            </li>
            <li className="font-medium text-japan-ink-black" aria-current="page">
              Quiz
            </li>
          </ol>
        </nav>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-japan-deep-ocean md:text-4xl">JLPT N5 Kanji Quiz</h1>
          <p className="mt-3 text-lg text-japan-ink-black">
            Practise all {N5_COUNT} JLPT N5 kanji: what each one means, how it is read, and which kanji
            matches a meaning. Four choices a question and the answer straight after, free, with no
            sign-up.
          </p>
          <p className="mt-3 text-japan-mountain-mist">
            New to them?{' '}
            <Link prefetch={false} href={N5_LIST} className={TEXT_LINK}>
              Study the N5 kanji list
            </Link>{' '}
            first. Already learning?{' '}
            <Link prefetch={false} href="/kanji/review" className={TEXT_LINK}>
              Review the kanji you have learned
            </Link>
            .
          </p>
        </div>

        <N5QuizClient />

        {/* Written for the person deciding whether to play, and it is also the
            page's only prose: the quiz itself is a form until someone starts.
            Deliberately not FAQ-shaped (§4.3 of the review above). */}
        <section className={SECTION_BAND} aria-labelledby="quiz-how-heading">
          <h2 id="quiz-how-heading" className={`${SECTION_HEADING} text-japan-deep-ocean`}>
            How the N5 kanji quiz works
          </h2>
          <div className="mt-4 space-y-4 text-japan-ink-black">
            <p>
              A round is ten questions unless you ask for twenty or for every kanji you picked, and no
              kanji comes up twice in one round. There are three kinds of question:
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong>Kanji to meaning.</strong> See <span lang="ja">水</span>, pick &ldquo;water&rdquo;.
              </li>
              <li>
                <strong>Kanji to reading.</strong> See <span lang="ja">水</span>, pick{' '}
                <span lang="ja">みず / すい</span> (mizu / sui). Every reading carries its romaji, so you
                can play before you can read kana.
              </li>
              <li>
                <strong>Meaning to kanji.</strong> See &ldquo;water&rdquo;, pick <span lang="ja">水</span>{' '}
                out of four characters.
              </li>
            </ul>
            <p>
              Where a group has them, two of the three wrong answers come from the same group as the
              right one: <span lang="ja">東</span> is asked against other directions,{' '}
              <span lang="ja">三</span> against other numbers. Those are the mix-ups that actually happen.
              No two choices ever share a meaning, or on a reading question a reading, so exactly one is
              right.
            </p>
            <p>
              After each question you see the answer, its readings and a link to the kanji&rsquo;s stroke
              order. At the end, mark the ones you got right as learned and they join your{' '}
              <Link prefetch={false} href="/kanji/review" className={TEXT_LINK}>
                spaced-repetition reviews
              </Link>
              , which bring each kanji back at growing intervals.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
