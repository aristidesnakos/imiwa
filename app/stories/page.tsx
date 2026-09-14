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
 * The hub — and the page in this pair actually built to rank.
 *
 * The division of labour is deliberate and worth not losing: the hub carries
 * the category query ("easy Japanese stories for beginners", "JLPT N5 graded
 * reader", "Japanese reading practice for beginners"), and the individual
 * episodes carry the internal linking into the ~1,890 kanji detail pages that
 * cannot win from the SERP on their own. An episode is unlikely to outrank NHK
 * Easy News or Satori Reader any time soon; a well-written hub has a chance at
 * a query neither of them targets, and every episode it lists is a link.
 *
 * So this is prose first and an index second. A bare list of six links is not a
 * page anyone links to.
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

        <div className="mb-10 space-y-4 text-center">
          <h1 className="text-3xl font-bold md:text-4xl">
            Easy Japanese stories for beginners
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-japan-mountain-mist">
            <em>The Travels of Tan</em> is a six-panel comic in Japanese, written so that every
            single word in it is JLPT N5. Read it, understand all of it, and keep the words.
          </p>
        </div>

        {/*
          The explanatory prose is the ranking surface, so it answers the three
          things someone typing "easy Japanese stories" is actually asking:
          can I read this yet, what will it cost me, and how do I use it.
        */}
        <section aria-labelledby="what-heading" className="space-y-8">
          <h2 id="what-heading" className={SECTION_HEADING}>
            What &ldquo;all N5&rdquo; means, and why it matters
          </h2>
          <div className="space-y-4 text-japan-ink-black">
            <p>
              Most Japanese reading material aimed at beginners is <em>nearly</em> within reach —
              a graded story with three unknown words per sentence still stops you three times a
              sentence, and stopping is what ends a reading habit. Every episode here is checked
              against the N5 kanji list by a script before it is published: if a character outside
              the list appears anywhere in the dialogue, the build fails and the episode does not
              go up.
            </p>
            <p>
              That constraint costs the stories their plot. You cannot build cause and effect out
              of N5 grammar, so these are journeys rather than dramas: Tan the tanuki goes
              somewhere, meets someone, notices something. What you get in exchange is the thing
              that actually matters at this level — a page of Japanese you can read straight
              through without looking anything up.
            </p>
          </div>

          <h2 id="how-heading" className={SECTION_HEADING}>
            How to use an episode
          </h2>
          <ol className="ml-5 list-decimal space-y-2 text-japan-ink-black">
            <li>
              Read the six panels first, ignoring the English captions. Guess at whatever you do
              not know.
            </li>
            <li>
              Read the transcript underneath with the translations, and see how close your guesses
              were.
            </li>
            <li>
              Tap the words the episode teaches. Each one opens that kanji&rsquo;s page with its
              stroke order, readings and example sentences.
            </li>
            <li>Read the six panels again. This is the part people skip and the part that works.</li>
          </ol>

          <h2 id="who-heading" className={SECTION_HEADING}>
            Who it is for
          </h2>
          <p className="text-japan-ink-black">
            Someone who has finished — or is part-way through — hiragana, katakana and the first
            hundred or so kanji, and has nothing to read. If you are studying for JLPT N5, this is
            reading practice at exactly the level of the exam. If you dropped Japanese once and
            came back, this is a way in that does not start with a textbook.
          </p>
        </section>

        <section className={SECTION_BAND} aria-labelledby="episodes-heading">
          <h2 id="episodes-heading" className={`${SECTION_HEADING} mb-6`}>
            Every episode
          </h2>
          <ul className="grid gap-6 sm:grid-cols-2">
            {episodes.map(episode => (
              <li key={episode.slug}>
                <Link
                  href={`/stories/${episode.slug}`}
                  className="group block overflow-hidden rounded-xl border border-border bg-card transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {/*
                    Panel art reserves its top quarter as empty space for the
                    speech bubble StoryPanel composites in CSS, so a top-anchored
                    crop is sky and no character. Anchor at 70%: by construction
                    the subject of a panel sits in its lower half.
                  */}
                  <div className="relative aspect-[2/1] w-full">
                    <Image
                      src={episode.panels[0].art}
                      alt=""
                      fill
                      sizes="(min-width: 640px) 45vw, 92vw"
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
            The rest of season one. Listed rather than hidden because the page
            two paragraphs up promises a new episode every week, and a shelf
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
