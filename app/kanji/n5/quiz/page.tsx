import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import Header from '@/components/sections/Header';
import { SECTION_BAND, SECTION_HEADING } from '@/components/kanji/section';
import { getSEOTags } from '@/lib/seo';
import { SITE_URL } from '@/lib/seo/site';
import { levelHref } from '@/lib/levels';
import { N5_KANJI } from '@/lib/constants/n5-kanji';
import { BookCTA } from '@/components/commerce/BookCTA';
import EmailCapture from '@/components/EmailCapture';
import { PUBLISHED_JLPT_ITEMS, PUBLISHED_JLPT_SETS, PUBLISHED_JLPT_SHAPE } from '@/lib/jlpt/published';
import { N5QuizClient } from './N5QuizClient';
import { JlptFormatQuiz } from './JlptFormatQuiz';
import { QuizModes } from './QuizModes';
import { JLPT_SAMPLE_INDEX_URL, JLPT_SAMPLE_QUESTIONS_URL } from './jlpt-format';

/**
 * THE ASK ON THE JLPT-FORMAT RESULTS SCREEN. One constant so it can be reviewed in one
 * place. It describes only what the app can send: the double-opt-in confirmation, the
 * welcome quiz card on the latest episode (lib/email/quiz-email.ts), and then the weekly
 * Travels of Tan broadcast. It must not promise new question sets, JLPT practice or
 * anything else.
 */
const JLPT_RESULTS_SIGNUP_COPY = {
  title: 'Join the weekly Travels of Tan newsletter',
  description:
    'Each week, one short Japanese comic written only in N5, with a quiz card on the words it teaches. It is the story newsletter, not more question sets.',
  cta: 'Send me the stories',
  successTitle: 'Nearly there',
  successMessage:
    'Check your inbox for a confirmation link. Tap it to join, and we will send you the latest episode with its quiz card.',
  footnote:
    'We send one confirmation email first. Nothing else arrives until you tap it, and you can unsubscribe anytime.',
} as const;

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

/**
 * The published JLPT-format items. Only reviewed items are ever in this file, and it is
 * empty until some are: with none, the page below is the kanji quiz exactly as it was —
 * no tab, no section, no empty state. Read by lib/jlpt/published.ts (server-only, and the
 * same source the links to this mode count sets from), imported here in the server page
 * and handed down as a prop; the (much larger) example-sentence data is never imported by
 * this route.
 */
const JLPT_ITEMS = PUBLISHED_JLPT_ITEMS;
const JLPT_SETS = PUBLISHED_JLPT_SETS;
const JLPT_SHAPE = PUBLISHED_JLPT_SHAPE;
/** `/kanji/n5` — or, if N5 ever lost its page, /kanji filtered to it. */
const N5_LIST = levelHref('N5');

const TITLE = `JLPT N5 Kanji Quiz: Free Practice Test (${N5_COUNT} Kanji)`;
/**
 * Names the JLPT-format sets only while there are published items, counted from the file,
 * so the snippet never promises a tab the page does not have.
 */
const DESCRIPTION = JLPT_SETS.length
  ? `Free JLPT N5 kanji quiz on all ${N5_COUNT} kanji, plus ${JLPT_SETS.length} ${JLPT_SETS.length === 1 ? 'set' : 'sets'} of our own JLPT-format kanji questions. Readings with romaji, answers as you go, no sign-up.`
  : `Free JLPT N5 kanji quiz on all ${N5_COUNT} kanji: meanings, readings with romaji, and the kanji for a meaning. Four choices, answers as you go, no sign-up.`;

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

        {JLPT_SHAPE ? (
          <QuizModes
            kanjiQuiz={<N5QuizClient />}
            jlptQuiz={
              <JlptFormatQuiz
                items={JLPT_ITEMS}
                book={<BookCTA surface="jlptFormat" variant="band" className="mt-0" />}
                signup={
                  <EmailCapture
                    source="jlpt-format-results"
                    title={JLPT_RESULTS_SIGNUP_COPY.title}
                    description={JLPT_RESULTS_SIGNUP_COPY.description}
                    cta={JLPT_RESULTS_SIGNUP_COPY.cta}
                    successTitle={JLPT_RESULTS_SIGNUP_COPY.successTitle}
                    successMessage={JLPT_RESULTS_SIGNUP_COPY.successMessage}
                    footnote={JLPT_RESULTS_SIGNUP_COPY.footnote}
                  />
                }
              />
            }
          />
        ) : (
          <N5QuizClient />
        )}

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

        {/* The JLPT-format mode, described. Renders nothing until there are published
            items, like the other empty-is-valid sections. Deliberately says what the
            mode is NOT: its questions are ours, in the real format, and a set is a small
            slice of the real exam. No FAQ markup: this page has none. */}
        {JLPT_SHAPE && (
          <section className={SECTION_BAND} aria-labelledby="jlpt-format-heading">
            <h2 id="jlpt-format-heading" className={`${SECTION_HEADING} text-japan-deep-ocean`}>
              JLPT N5 kanji practice questions: our own, in the exam&rsquo;s format
            </h2>
            <div className="mt-4 space-y-4 text-japan-ink-black">
              <p>
                The <strong>JLPT format</strong> tab above plays our own practice questions in the same
                two formats that open the vocabulary part of the real N5 exam. Pick one of{' '}
                {JLPT_SETS.length} {JLPT_SETS.length === 1 ? 'set' : 'sets'} and answer{' '}
                {JLPT_SHAPE.all.length} questions in order, with the answer after each one. Each question
                is built on a real example sentence from Tatoeba, credited beside it.
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong>Mondai 1</strong> ({JLPT_SHAPE.mondai1.length} per set): a word in kanji is
                  underlined in a sentence, and you choose how it is read from four kana spellings.
                </li>
                <li>
                  <strong>Mondai 2</strong> ({JLPT_SHAPE.mondai2.length} per set): a word in hiragana is
                  underlined, and you choose the kanji it is written with.
                </li>
              </ul>
              <p>
                These are not questions from the JLPT, and a set is only a small slice of the real exam,
                which asks far more questions of many other kinds. Your score tells you how a set went,
                not what you would score on the day. For real questions, use the official free{' '}
                <a
                  href={JLPT_SAMPLE_QUESTIONS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={TEXT_LINK}
                >
                  sample questions
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>{' '}
                and{' '}
                <a
                  href={JLPT_SAMPLE_INDEX_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={TEXT_LINK}
                >
                  practice workbook
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
                .
              </p>
              <p>
                <a href="#jlpt-format" className={TEXT_LINK}>
                  Go to the JLPT-format questions
                </a>
              </p>
            </div>
          </section>
        )}
      </main>
    </>
  );
}
