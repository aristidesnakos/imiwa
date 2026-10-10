import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';

import { getSEOTags } from '@/lib/seo';
import { SITE_URL, SITE_NAME } from '@/lib/seo/site';
import Header from '@/components/sections/Header';
import EmailCapture from '@/components/EmailCapture';
import { SECTION_BAND, SECTION_HEADING } from '@/components/kanji/section';
import { EPISODES, episodesNewestFirst, upcomingInOrder } from '@/lib/stories';

/**
 * The hub: a heading, then the episode cards, and nothing above them.
 *
 * This used to open with prose ("what all N5 means", "how to use an episode",
 * "who it is for"), written to carry the category query. That copy came out on
 * 2026-10-09 because the average bounce rate was about 70% and the prose sat
 * between the heading and the cards. The category query now rests on the H1,
 * the title tag and the meta description. Each episode still links into the
 * kanji detail pages, which is the internal linking that matters.
 */
export const revalidate = 86400;

export const metadata: Metadata = getSEOTags({
  title: 'Easy Japanese Stories for Beginners — Free JLPT N5 Graded Reader',
  description:
    'Free Japanese reading practice written entirely in JLPT N5. Each episode is a six-panel comic with English translations, the words it teaches, and links to every kanji in it.',
  keywords: [
    'easy Japanese stories',
    'Japanese reading practice',
    'JLPT N5 reading',
    'Japanese graded reader',
    'beginner Japanese stories',
    'free Japanese reading practice',
    'Japanese comic for beginners',
    'N5 reading practice',
    'simple Japanese stories with English translation',
  ],
  openGraph: {
    title: 'Easy Japanese Stories for Beginners — Free N5 Graded Reader',
    description:
      'A weekly six-panel Japanese comic, written entirely in JLPT N5, with translations and linked kanji.',
    type: 'website',
  },
  canonicalUrlRelative: '/stories',
});

export default function StoriesHubPage() {
  const episodes = episodesNewestFirst();
  const latest = episodes[0];
  const upcoming = upcomingInOrder();

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Easy Japanese Stories for Beginners',
      description:
        'A free JLPT N5 graded reader: a weekly six-panel Japanese comic with English translations.',
      url: `${SITE_URL}/stories`,
      inLanguage: ['ja', 'en'],
      publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
      mainEntity: {
        '@type': 'ItemList',
        itemListElement: EPISODES.map(e => ({
          '@type': 'ListItem',
          position: e.number,
          name: `${e.titleEn} — ${e.titleJa}`,
          url: `${SITE_URL}/stories/${e.slug}`,
        })),
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Japanese Stories', item: `${SITE_URL}/stories` },
      ],
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Header />

      <main id="main-content" tabIndex={-1} className="container mx-auto max-w-4xl p-8">
        <nav className="mb-6 text-sm text-japan-mountain-mist" aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1">
            <li className="flex items-center">
              <Link href="/" className="flex items-center hover:text-japan-deep-ocean">
                <ArrowLeft className="mr-1 h-4 w-4" />
                Home
              </Link>
            </li>
            <li aria-hidden className="text-japan-sakura-waters">/</li>
            <li className="font-medium text-japan-ink-black" aria-current="page">
              Japanese Stories
            </li>
          </ol>
        </nav>

        <h1 className="mb-10 text-center text-3xl font-bold md:text-4xl">
          Stories for beginners in Japanese
        </h1>

        <section aria-label="Episodes">
          <ul className="grid gap-6 sm:grid-cols-2">
            {/*
              prefetch={false}: with the cards first, the top three sit in the
              viewport, and each one prefetched its episode's payload (~11 kB
              apiece) into this page's byte budget. One card renders per episode,
              so this is the "links that render many times" case.
            */}
            {episodes.map(episode => (
              <li key={episode.slug}>
                <Link
                  href={`/stories/${episode.slug}`}
                  prefetch={false}
                  className="group block overflow-hidden rounded-xl border border-border bg-card transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {/*
                    Panel art reserves its top quarter as empty space for the
                    speech bubble StoryPanel composites in CSS, so a top-anchored
                    crop is sky and no character. Anchor at 70%: by construction
                    the subject of a panel sits in its lower half.

                    `sizes` is the card's real width: main is min(100vw, 56rem)
                    less 2rem of padding a side, split in two at sm with a 1.5rem
                    gap. The old 45vw/92vw guess fetched 750w for a 348px card on
                    a phone and up to the full 1091px master on a retina desktop.
                  */}
                  <div className="relative aspect-[2/1] w-full">
                    <Image
                      src={episode.panels[0].art}
                      alt=""
                      fill
                      sizes="(min-width: 896px) 404px, (min-width: 640px) calc(50vw - 44px), calc(100vw - 64px)"
                      className="object-cover [object-position:center_70%]"
                    />
                  </div>
                  <div className="space-y-1 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-japan-mountain-mist">
                      Episode {episode.number} · JLPT {episode.level}
                    </p>
                    <p lang="ja" className="text-lg font-semibold">
                      {episode.titleJa}
                    </p>
                    <p className="text-sm text-japan-mountain-mist">{episode.titleEn}</p>
                    <p lang="ja" className="pt-1 text-sm text-japan-ink-black">
                      {episode.targets.map(t => t.word).join('・')}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {/*
            The rest of season one. Listed rather than hidden because the signup
            at the foot of the page promises a new episode every week, and a shelf
            with two things on it does not support that claim — these four are
            written and validated, they are waiting on art.

            Not links, and no art: there is no page to link to, and the panel
            crop above is what makes a card look clickable. They also stay out
            of the sitemap and out of the ItemList above, both of which are
            built from EPISODES — a URL that does not exist is a soft 404, and
            a soft 404 on a page built to rank is a bad trade for a teaser.
          */}
          {upcoming.length > 0 && (
            <div className="mt-10">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.12em] text-japan-mountain-mist">
                Coming soon
              </h3>
              <ul className="grid gap-3 sm:grid-cols-2">
                {upcoming.map(episode => (
                  <li
                    key={episode.number}
                    className="rounded-xl border border-dashed border-border bg-japan-soft-mist px-4 py-3"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-japan-mountain-mist">
                      Episode {episode.number}
                    </p>
                    <p lang="ja" className="mt-1 font-semibold text-japan-ink-black">
                      {episode.titleJa}
                    </p>
                    <p className="text-sm text-japan-mountain-mist">{episode.titleEn}</p>
                    <p lang="ja" className="pt-1 text-sm text-japan-ink-black">
                      {episode.teaches.join('・')}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/*
          A different capture surface from the one at the foot of an episode,
          and typed separately on purpose: someone here likes the idea of the
          thing, someone there has just read six panels of Japanese. Keeping the
          two sources distinct is how the per-surface signup rate stays readable.
        */}
        <section className={SECTION_BAND} aria-labelledby="subscribe-heading">
          <h2 id="subscribe-heading" className={`${SECTION_HEADING} mb-6`}>
            A new episode every week
          </h2>
          <EmailCapture
            source="story-hub"
            arrivalSource="short-quiz"
            title="Get each episode as it goes up"
            description={
              latest
                ? `One short Japanese comic a week, all N5, with its quiz card. The last one was ${latest.titleEn}.`
                : 'One short Japanese comic a week, all N5, with its quiz card.'
            }
            cta="Send me the stories"
          />
        </section>
      </main>
    </>
  );
}
