import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import Header from '@/components/sections/Header';
import { SECTION_BAND, SECTION_HEADING } from '@/components/kanji/section';
import { BookCTA } from '@/components/commerce/BookCTA';
import { TanDash } from '@/components/play/TanDash';
import { getSEOTags } from '@/lib/seo';
import { SITE_URL, SITE_NAME, SITE_LOGO } from '@/lib/seo/site';
import { buildPlayData, episodeWorldCount } from '@/lib/play/build';
import { CATCHES_PER_WORLD } from '@/lib/play/rules';
import { PLAY_PATH, PLAY_URL, PLAY_OG_IMAGE } from '@/lib/play/seo';
import { episodeBySlug } from '@/lib/stories';

/**
 * /play — Tan Dash, the one-thumb kanji runner.
 *
 * A server component around one client island. The game comes first, straight
 * under a short breadcrumb and heading, so the stage starts above the fold on a
 * phone; everything a crawler or a deciding visitor reads is server-rendered
 * below it: how to play, the worlds (which double as the page's index of every
 * kanji in the game, each linking its character page) and a few questions.
 *
 * `buildPlayData()` is server-only (it imports the N5 list and every episode)
 * and runs here, once, at build; the island gets the ~8 kB result as a prop and
 * never imports the data. Every count in the copy below is read from that data
 * or from lib/play/rules.ts, so a new episode that reshapes the worlds cannot
 * leave the page describing the old ones.
 *
 * Every link carries prefetch={false}, as on the quiz page: on a phone these are
 * the page's only prefetches, and 82 kanji pages plus /kanji's dictionary would
 * land in this route's byte budget for a visitor who came to play.
 */

const DATA = buildPlayData();
const KANJI_COUNT = DATA.kanji.length;
const WORLD_COUNT = DATA.worlds.length;
const EPISODE_WORLDS = episodeWorldCount(DATA);
const SIGN_WORD = new Map(DATA.kanji.map(k => [k.c, k.en]));

const TITLE = `Tan Dash: Free Kanji Game for JLPT N5 Beginners (${KANJI_COUNT} Kanji)`;
const DESCRIPTION = `A free one-thumb kanji game: tap to jump and grab the kanji the sign asks for. All ${KANJI_COUNT} JLPT N5 kanji, on phone or desktop. No sign-up, no download.`;

export const metadata: Metadata = getSEOTags({
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    'kanji game',
    'free kanji game',
    'JLPT N5 kanji game',
    'learn kanji game online',
    'kanji reading game',
    'Japanese kanji game for beginners',
    'kanji runner game',
  ],
  openGraph: {
    title: 'Tan Dash: a free one-thumb kanji game',
    description: DESCRIPTION,
    type: 'website',
    // Named explicitly: getSEOTags fills `openGraph.images` with the site-wide
    // card whenever it is left out, and Next then ignores this route's
    // opengraph-image.tsx. Twitter inherits this image (getSEOTags leaves
    // `twitter.images` empty when openGraph has images).
    images: [
      {
        url: PLAY_OG_IMAGE.url,
        width: PLAY_OG_IMAGE.width,
        height: PLAY_OG_IMAGE.height,
        alt: PLAY_OG_IMAGE.alt,
      },
    ],
  },
  canonicalUrlRelative: PLAY_PATH,
});

/**
 * The game as a VideoGame, plus the trail. Absolute URLs on the canonical www
 * host (lib/seo/site.ts). No aggregateRating or review, because there are none,
 * and no FAQPage: the questions below are prose, as on the quiz page.
 */
const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    '@id': `${PLAY_URL}#game`,
    name: 'Tan Dash',
    url: PLAY_URL,
    description: `A free one-thumb kanji game that runs in the browser. Tan the tanuki runs; you jump for the kanji the sign asks for and over the wrong ones. ${WORLD_COUNT} worlds cover all ${KANJI_COUNT} JLPT N5 kanji.`,
    image: PLAY_OG_IMAGE.url,
    genre: ['Educational game', 'Endless runner'],
    gamePlatform: 'Web browser',
    applicationCategory: 'GameApplication',
    operatingSystem: 'Any',
    playMode: 'https://schema.org/SinglePlayer',
    offers: {
      '@type': 'Offer',
      price: 0,
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    },
    isAccessibleForFree: true,
    inLanguage: ['en', 'ja'],
    educationalLevel: 'JLPT N5',
    teaches: `Reading the ${KANJI_COUNT} JLPT N5 kanji`,
    character: {
      '@type': 'Person',
      name: 'Tan',
      description: 'A tanuki, the traveller in The Travels of Tan',
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: SITE_LOGO.url,
        width: SITE_LOGO.width,
        height: SITE_LOGO.height,
      },
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Tan Dash', item: PLAY_URL },
    ],
  },
];

const RING =
  'rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';
const CRUMB = `hover:text-japan-deep-ocean ${RING}`;
const TEXT_LINK = `font-medium text-japan-deep-ocean underline underline-offset-4 hover:no-underline ${RING}`;
const KANJI_LINK =
  'flex items-baseline gap-1.5 rounded-md border border-border bg-background px-2 py-1 transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

/** The gold boxes. Each teaches its kanji by doing what it means. */
const POWER_UPS: { c: string; en: string; does: string }[] = [
  { c: '大', en: 'big', does: 'Tan turns giant.' },
  { c: '上', en: 'up', does: 'super jumps.' },
  { c: '生', en: 'life', does: 'an extra heart.' },
  { c: '金', en: 'gold', does: '500 points.' },
  { c: '何', en: 'what?', does: 'a mystery: you find out when you catch it.' },
];

export default function PlayPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <Header />

      {/* Kept short above the game on a phone: a one-line trail, a small H1 and
          one sentence, so the stage starts within the first screen. */}
      <main id="main-content" tabIndex={-1} className="container mx-auto max-w-3xl px-4 pb-8 pt-3 sm:px-8 sm:pt-6">
        <nav aria-label="Breadcrumb" className="mb-2 text-sm text-japan-mountain-mist sm:mb-4">
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
            <li className="font-medium text-japan-ink-black" aria-current="page">
              Tan Dash
            </li>
          </ol>
        </nav>

        <div className="mb-3 sm:mb-6">
          <h1 className="text-2xl font-bold text-japan-deep-ocean sm:text-3xl md:text-4xl">Tan Dash</h1>
          <p className="mt-1 text-sm text-japan-ink-black sm:mt-2 sm:text-lg">
            A free one-thumb kanji game. Jump for the kanji the sign asks for.
          </p>
        </div>

        <TanDash data={DATA} />

        <section className={SECTION_BAND} aria-labelledby="play-how-heading">
          <h2 id="play-how-heading" className={`${SECTION_HEADING} text-japan-deep-ocean`}>
            How to play Tan Dash, the kanji runner game
          </h2>
          <div className="mt-4 space-y-4 text-japan-ink-black">
            <p>
              Tan the tanuki does the running. All you do is jump, so one thumb is enough, and a run
              lasts a minute or two.
            </p>
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                <strong>Read the sign.</strong> It says which kanji to grab: by its meaning in English,
                like &ldquo;mountain&rdquo;, or by its reading in kana, like <span lang="ja">やま</span>.
              </li>
              <li>
                <strong>Jump for that kanji.</strong> Kanji tiles roll in along the ground and through
                the air. Tap to jump, and tap again in the air to jump higher. On a keyboard, press
                Space.
              </li>
              <li>
                <strong>Jump over the rest.</strong> Running into a wrong kanji or a tree stump costs a
                heart. The wrong ones are often look-alikes: <span lang="ja">人</span> and{' '}
                <span lang="ja">入</span>, <span lang="ja">日</span> and <span lang="ja">白</span>,{' '}
                <span lang="ja">千</span> and <span lang="ja">十</span>, <span lang="ja">右</span> and{' '}
                <span lang="ja">左</span>.
              </li>
              <li>
                <strong>Keep the combo going.</strong> Correct catches in a row build a combo that
                multiplies your score, and every {CATCHES_PER_WORLD} correct catches open the next
                world, with new kanji.
              </li>
            </ol>
            <p>
              When your hearts run out, the results screen shows your score, every kanji you caught,
              each linking to its page here, and the ones you mixed up.
            </p>

            <h3 className="pt-2 text-lg font-semibold text-japan-deep-ocean">
              Power-ups: kanji that do what they mean
            </h3>
            <p>Gold boxes hold a kanji, and catching one does what that kanji means:</p>
            <ul className="space-y-2">
              {POWER_UPS.map(p => (
                <li key={p.c} className="flex items-baseline gap-3">
                  <span lang="ja" className="w-8 shrink-0 text-2xl font-semibold text-japan-deep-ocean">
                    {p.c}
                  </span>
                  <span>
                    <strong>{p.en}</strong>: {p.does}
                  </span>
                </li>
              ))}
            </ul>

            <h3 className="pt-2 text-lg font-semibold text-japan-deep-ocean">Settings</h3>
            <p>
              <strong>Chill</strong> is a slower run with five hearts. Signs can be in English, in kana
              or a mix; in the mix, kana signs start in world 3 and only ask for kanji you have already
              caught, so a reading is never the first thing you meet. Sound can be switched off.
            </p>
          </div>
        </section>

        {/* The crawlable index of the game: every kanji, once, each linking its
            character page. It is the only kanji grid on the page by design. */}
        <section className={SECTION_BAND} aria-labelledby="play-worlds-heading">
          <h2 id="play-worlds-heading" className={`${SECTION_HEADING} text-japan-deep-ocean`}>
            All {KANJI_COUNT} JLPT N5 kanji in the game, world by world
          </h2>
          <div className="mt-4 space-y-4 text-japan-ink-black">
            <p>
              Tan Dash has {WORLD_COUNT} worlds. Each adds its kanji to the ones before it, and{' '}
              {CATCHES_PER_WORLD} correct catches open the next. Worlds 1 to {EPISODE_WORLDS} are the{' '}
              {EPISODE_WORLDS} episodes of{' '}
              <Link prefetch={false} href="/stories" className={TEXT_LINK}>
                The Travels of Tan
              </Link>
              , our weekly comic written entirely in N5, with the same kanji, so you can read an episode
              and then play it. The rest are game-only worlds for the N5 kanji the comic has not reached
              yet.
            </p>
            <p>Every kanji below links to its page, with its stroke order and readings.</p>
          </div>

          <ol className="mt-6 grid gap-4 md:grid-cols-2">
            {DATA.worlds.map(world => {
              const episode = world.episodeSlug ? episodeBySlug(world.episodeSlug) : undefined;
              return (
                <li key={world.n} className="rounded-lg border border-border bg-card p-4">
                  <h3 className="text-lg font-semibold text-japan-deep-ocean">
                    World {world.n}: {world.title}
                  </h3>
                  <p lang="ja" className="mt-0.5 text-sm text-japan-mountain-mist">
                    {world.titleJa}
                  </p>
                  <ul aria-label={`Kanji in world ${world.n}`} className="mt-3 flex flex-wrap gap-2">
                    {world.kanji.map(c => (
                      <li key={c}>
                        <Link prefetch={false} href={`/kanji/${encodeURIComponent(c)}`} className={KANJI_LINK}>
                          <span lang="ja" className="text-xl font-semibold text-japan-ink-black">
                            {c}
                          </span>
                          <span className="text-xs text-japan-mountain-mist">{SIGN_WORD.get(c)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-sm text-japan-mountain-mist">
                    {episode ? (
                      <>
                        Episode {episode.number} of the comic.{' '}
                        <Link prefetch={false} href={`/stories/${episode.slug}`} className={TEXT_LINK}>
                          Read the episode
                          <span className="sr-only">: {episode.titleEn}</span>
                        </Link>
                      </>
                    ) : (
                      'A game-only world.'
                    )}
                  </p>
                </li>
              );
            })}
          </ol>
        </section>

        <section className={SECTION_BAND} aria-labelledby="play-questions-heading">
          <h2 id="play-questions-heading" className={`${SECTION_HEADING} text-japan-deep-ocean`}>
            Is this kanji game free? And other questions
          </h2>
          <div className="mt-4 space-y-6 text-japan-ink-black">
            <div>
              <h3 className="text-lg font-semibold text-japan-deep-ocean">Is it free?</h3>
              <p className="mt-1">
                Yes. There is no sign-up, no account and nothing to download: it runs in your web
                browser.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-japan-deep-ocean">Does it work on a phone?</h3>
              <p className="mt-1">
                Yes, it is made for one thumb on a phone: tap the game to jump. On a computer, play with
                the keyboard.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-japan-deep-ocean">Where is my progress saved?</h3>
              <p className="mt-1">
                In this browser only. Your best score, your Kanji-dex (it fills as you catch each of the{' '}
                {KANJI_COUNT}) and your daily streak stay on this device. There is no account, so they
                are not kept on our servers: another browser, another device or clearing this
                site&rsquo;s data starts you from zero.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-japan-deep-ocean">What should I do after a run?</h3>
              <p className="mt-1">
                Open the kanji you caught: each one&rsquo;s page shows its stroke order, so you can learn
                to write it. Then test yourself on all {KANJI_COUNT} with the{' '}
                <Link prefetch={false} href="/kanji/n5/quiz" className={TEXT_LINK}>
                  N5 kanji quiz
                </Link>
                . At the end of a quiz you can mark the ones you got right as learned, and they come back
                in your{' '}
                <Link prefetch={false} href="/kanji/review" className={TEXT_LINK}>
                  spaced-repetition reviews
                </Link>
                .
              </p>
            </div>
          </div>
        </section>

        {/* The N5 book: every N5 page shows it (owner's call, 2026-10-07). The
            `nextStep` card with the `play` opening, an <h2> because it is a
            section of the page; `mt-12` matches the section rhythm in place of a
            band rule, since the card has its own border. */}
        <BookCTA surface="play" variant="card" design="nextStep" headingLevel={2} className="mb-0 mt-12" />
      </main>
    </>
  );
}
