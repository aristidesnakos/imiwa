import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';

import { getSEOTags } from '@/lib/seo';
import { SITE_URL, SITE_NAME } from '@/lib/seo/site';
import Header from '@/components/sections/Header';
import { SECTION_BAND, SECTION_HEADING } from '@/components/kanji/section';

const PATH = '/katakana/shi-tsu-so-n';
const TITLE = 'シ vs ツ and ソ vs ン: How to Tell These Katakana Apart';
const DESCRIPTION =
  'シ, ツ, ソ and ン look almost the same. One trick from the hiragana you already know, two backup clues, and a short test to tell them apart.';
const CARD = '/og/katakana-shi-tsu-so-n.jpg';
const PUBLISHED = '2026-10-21';

/**
 * Written 2026-10-21 for the queries "shi vs tsu katakana" and "so vs n katakana".
 *
 * The trick is a memory aid about the DIRECTION of the long stroke, not about
 * history, and the page says so. The origins are from Wikipedia's kana pages:
 * し/シ from 之, つ/ツ from 川, そ/ソ from 曽, but ん from 无 and ン from 尓.
 * Do not claim all four pairs share a source kanji.
 *
 * The graphic is drawn in HTML with Klee One (OFL), not from KanjiVG, so it
 * carries no share-alike obligation. The link card is a hand-made static JPEG
 * and is deliberately NOT in lib/seo/share-cards.ts, whose renderer has no
 * template for it. No goal is wired: DataFast is over its event limit, so
 * the read is Search Console plus the UTM on the Facebook post.
 * The katakana words in the test are plain loanwords, N5-level or below.
 */

const LINK =
  'rounded-sm font-medium text-japan-deep-ocean underline underline-offset-2 hover:brightness-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const CELL = 'border-b border-border px-3 py-2';

export const metadata: Metadata = getSEOTags({
  title: `${TITLE} | ${SITE_NAME}`,
  description: DESCRIPTION,
  keywords: [
    'shi vs tsu katakana',
    'so vs n katakana',
    'katakana shi tsu so n',
    'シ ツ 違い',
    'ソ ン 違い',
    'katakana similar characters',
    'how to tell shi and tsu apart',
  ],
  openGraph: {
    type: 'article',
    title: TITLE,
    description: DESCRIPTION,
    images: [
      {
        url: `${SITE_URL}${CARD}`,
        width: 1200,
        height: 630,
        alt: 'シ ツ ン ソ: Tan the tanuki points at the four katakana and the hiragana that give them away.',
      },
    ],
  },
  canonicalUrlRelative: PATH,
});

const ROWS = [
  { kana: 'シ', reads: 'shi', strokes: 3, finish: 'rises to the upper right', twin: 'し' },
  { kana: 'ツ', reads: 'tsu', strokes: 3, finish: 'falls to the lower left', twin: 'つ' },
  { kana: 'ン', reads: 'n', strokes: 2, finish: 'rises to the upper right', twin: 'ん' },
  { kana: 'ソ', reads: 'so', strokes: 2, finish: 'falls to the lower left', twin: 'そ' },
];

const WORDS = [
  { kana: 'ツナ', romaji: 'tsuna', meaning: 'tuna' },
  { kana: 'シーツ', romaji: 'shītsu', meaning: 'bed sheets' },
  { kana: 'ソファ', romaji: 'sofa', meaning: 'sofa' },
  { kana: 'パン', romaji: 'pan', meaning: 'bread' },
  { kana: 'シーソー', romaji: 'shīsō', meaning: 'seesaw' },
  { kana: 'ツアー', romaji: 'tsuā', meaning: 'tour' },
];

const FAQ = [
  {
    q: 'Why do シ and ツ look so alike?',
    a: 'Both are two short strokes plus one long sweep. They come from different kanji (シ from 之, ツ from 川), but they ended up with the same parts, so only the angle of the strokes differs.',
  },
  {
    q: 'Which one is shi and which is tsu?',
    a: 'シ is shi: the two dots are stacked on the left and the long stroke rises to the upper right. ツ is tsu: the two dots sit side by side on top and the long stroke falls to the lower left.',
  },
  {
    q: 'What about ソ and ン?',
    a: 'The same rule. ン (n) has one flat dot and a long stroke that rises to the upper right. ソ (so) has one upright dot and a long stroke that falls from the top to the lower left.',
  },
  {
    q: 'What if handwriting is messy?',
    a: 'Native handwriting is often loose too. Read the whole word: a loanword such as ツナ or パン is easy to guess from context, and that is how most readers settle it.',
  },
];

export default function ShiTsuSoNPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        headline: TITLE,
        description: DESCRIPTION,
        url: `${SITE_URL}${PATH}`,
        image: `${SITE_URL}/assets/shi-tsu-so-n.jpg`,
        datePublished: PUBLISHED,
        dateModified: PUBLISHED,
        inLanguage: 'en',
        author: { '@type': 'Person', name: 'Ari Nakos' },
        publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
      },
      {
        '@type': 'FAQPage',
        mainEntity: FAQ.map(({ q, a }) => ({
          '@type': 'Question',
          name: q,
          acceptedAnswer: { '@type': 'Answer', text: a },
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: SITE_NAME, item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'シ vs ツ, ソ vs ン', item: `${SITE_URL}${PATH}` },
        ],
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <Header />

      <main id="main-content" tabIndex={-1} className="container mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-bold md:text-4xl">シ vs ツ and ソ vs ン: how to tell them apart</h1>
        <p className="mt-4 text-lg leading-relaxed text-japan-mountain-mist">
          シ (shi), ツ (tsu), ソ (so) and ン (n) look almost identical, and they catch nearly everyone who has just
          finished hiragana. Here is one trick that works from the hiragana you already know, two backup clues, and a
          short test.
        </p>

        <figure className="mt-8">
          <Image
            src="/assets/shi-tsu-so-n.jpg"
            alt="Four cards pair each hiragana with its katakana: し with シ, つ with ツ, ん with ン and そ with ソ. A red arrow traces the last curve of each hiragana and the long stroke of each katakana. シ and ン rise to the upper right; ツ and ソ fall to the lower left."
            width={1080}
            height={1350}
            priority
            className="mx-auto h-auto w-full max-w-md rounded-lg border border-border"
          />
          <figcaption className="mt-3 text-center text-sm text-japan-mountain-mist">
            Trace the hiragana. Its last curve points the same way as the long stroke of its katakana twin.
          </figcaption>
        </figure>

        <section className={SECTION_BAND} aria-labelledby="trick-heading">
          <h2 id="trick-heading" className={SECTION_HEADING}>
            The trick: where does the long stroke finish?
          </h2>
          <div className="mt-4 space-y-4 leading-relaxed">
            <p>
              Each of the four ends on one long stroke. In <strong>シ</strong> and <strong>ン</strong> it starts low on
              the left and <strong>rises</strong> to the upper right. In <strong>ツ</strong> and <strong>ソ</strong> it
              starts at the top and <strong>falls</strong> to the lower left.
            </p>
            <p>
              Your hiragana already show it. し and ん both finish by sweeping up to the right. つ ends curling down to
              the left, and the diagonal at the top of そ falls the same way as the long stroke of ソ.
            </p>
          </div>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[32rem] border-collapse text-left">
              <caption className="sr-only">The four katakana, how many strokes each has, and where the long stroke goes</caption>
              <thead>
                <tr>
                  <th scope="col" className={CELL}>Katakana</th>
                  <th scope="col" className={CELL}>Reads</th>
                  <th scope="col" className={CELL}>Strokes</th>
                  <th scope="col" className={CELL}>Long stroke</th>
                  <th scope="col" className={CELL}>Hiragana twin</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((r) => (
                  <tr key={r.kana}>
                    <th scope="row" className={`${CELL} text-2xl`}>{r.kana}</th>
                    <td className={CELL}>{r.reads}</td>
                    <td className={CELL}>{r.strokes}</td>
                    <td className={CELL}>{r.finish}</td>
                    <td className={`${CELL} text-xl`}>{r.twin}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className={SECTION_BAND} aria-labelledby="clues-heading">
          <h2 id="clues-heading" className={SECTION_HEADING}>
            Two backup clues: the dots
          </h2>
          <ul className="mt-4 list-disc space-y-3 pl-6 leading-relaxed">
            <li>
              <strong>シ vs ツ.</strong> シ has two dots stacked one above the other, lying fairly flat. ツ has two dots
              side by side on top, standing more upright, like two ticks above the long stroke.
            </li>
            <li>
              <strong>ン vs ソ.</strong> ン has one flat dot in the upper left, and its long stroke starts low. ソ has one
              upright dot, and its long stroke starts high, right beside it.
            </li>
          </ul>
        </section>

        <section className={SECTION_BAND} aria-labelledby="origin-heading">
          <h2 id="origin-heading" className={SECTION_HEADING}>
            Is it really the same shape as the hiragana?
          </h2>
          <div className="mt-4 space-y-4 leading-relaxed">
            <p>
              Partly, and it is worth being honest about. し and シ both come from the kanji 之, つ and ツ from 川, and そ
              and ソ from 曽. But ん comes from 无 while ン comes from 尓. So treat the trick as a memory aid for the
              direction of the stroke, not as history.
            </p>
            <p className="text-sm text-japan-mountain-mist">
              Sources: Wikipedia,{' '}
              <a href="https://en.wikipedia.org/wiki/Shi_(kana)" className={LINK} target="_blank" rel="noopener noreferrer">
                Shi
              </a>
              ,{' '}
              <a href="https://en.wikipedia.org/wiki/Tsu_(kana)" className={LINK} target="_blank" rel="noopener noreferrer">
                Tsu
              </a>
              ,{' '}
              <a href="https://en.wikipedia.org/wiki/N_(kana)" className={LINK} target="_blank" rel="noopener noreferrer">
                N
              </a>
              ,{' '}
              <a href="https://en.wikipedia.org/wiki/So_(kana)" className={LINK} target="_blank" rel="noopener noreferrer">
                So
              </a>{' '}
              (kana).
            </p>
          </div>
        </section>

        <section className={SECTION_BAND} aria-labelledby="test-heading">
          <h2 id="test-heading" className={SECTION_HEADING}>
            Test yourself: read these six words
          </h2>
          <p className="mt-4 leading-relaxed">Say each one in your head, then open it to check.</p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {WORDS.map((w) => (
              <li key={w.kana}>
                <details className="rounded-md border border-border bg-card px-4 py-3">
                  <summary className="cursor-pointer rounded-sm text-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    {w.kana}
                  </summary>
                  <p className="mt-2">
                    {w.romaji} &mdash; {w.meaning}
                  </p>
                </details>
              </li>
            ))}
          </ul>
        </section>

        <section className={SECTION_BAND} aria-labelledby="practise-heading">
          <h2 id="practise-heading" className={SECTION_HEADING}>
            Practise them on paper
          </h2>
          <p className="mt-4 leading-relaxed">
            Writing the long stroke the right way is the fastest fix.{' '}
            <Link href="/free-resources/kana-sheets" className={LINK}>
              Print free katakana practice sheets with stroke order
            </Link>
            .
          </p>
        </section>

        <section className={SECTION_BAND} aria-labelledby="faq-heading">
          <h2 id="faq-heading" className={SECTION_HEADING}>
            Questions people ask
          </h2>
          <dl className="mt-4 space-y-5 leading-relaxed">
            {FAQ.map(({ q, a }) => (
              <div key={q}>
                <dt className="font-semibold">{q}</dt>
                <dd className="mt-1">{a}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>
    </>
  );
}
