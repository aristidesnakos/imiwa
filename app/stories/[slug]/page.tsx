import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, BookOpen } from 'lucide-react';

import { getSEOTags } from '@/lib/seo';
import { SITE_URL, SITE_NAME, SITE_LOGO } from '@/lib/seo/site';
import Header from '@/components/sections/Header';
import { Badge } from '@/components/ui/badge';
import EmailCapture from '@/components/EmailCapture';
import { CTASection } from '@/components/CTASection';
import { StoryPanel } from '@/components/stories/StoryPanel';
import { SECTION_BAND, SECTION_HEADING } from '@/components/kanji/section';
import { EPISODES, episodeBySlug, episodeLines } from '@/lib/stories';

/**
 * One episode of The Travels of Tan.
 *
 * `dynamicParams = false`, unlike `/kanji/[character]`: an unknown character is
 * a character we simply have not written up yet and is worth rendering on
 * demand, but an unknown story slug is a typo or a dead link, and rendering
 * something for it would put soft-404s in the index.
 */
export const dynamicParams = false;
export const revalidate = 86400;

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return EPISODES.map(e => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const episode = episodeBySlug(slug);
  if (!episode) return {};

  const words = episode.targets.map(t => t.word).join('、');

  return getSEOTags({
    title: `${episode.titleEn} — Easy Japanese Reading Practice (JLPT ${episode.level})`,
    description: `A six-panel Japanese comic written entirely in JLPT ${episode.level}. Read ${episode.titleJa} with English translations, then learn the words it teaches: ${words}.`,
    keywords: [
      'easy Japanese reading',
      `JLPT ${episode.level} reading practice`,
      'Japanese graded reader',
      'Japanese comic for beginners',
      'beginner Japanese story',
      ...episode.targets.map(t => `${t.kanji} kanji`),
    ],
    openGraph: {
      title: `${episode.titleEn} — ${episode.titleJa}`,
      description: `Episode ${episode.number} of The Travels of Tan. Six panels, all JLPT ${episode.level}, with translations.`,
      type: 'article',
      images: [{ url: `${SITE_URL}${episode.ogImage}`, width: 1080, height: 1080 }],
    },
    canonicalUrlRelative: `/stories/${episode.slug}`,
  });
}

export default async function EpisodePage({ params }: Props) {
  const { slug } = await params;
  const episode = episodeBySlug(slug);
  if (!episode) notFound();

  const lines = episodeLines(episode);
  const previous = EPISODES.find(e => e.number === episode.number - 1);
  const next = EPISODES.find(e => e.number === episode.number + 1);

  /**
   * `LearningResource` rather than `Article`. The kanji pages are articles about
   * a character; this is a thing you practise with, and the properties that
   * actually describe it — the level it is pitched at, the words it teaches —
   * have no home on Article.
   */
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'LearningResource',
      name: `${episode.titleEn} — ${episode.titleJa}`,
      description: `Episode ${episode.number} of The Travels of Tan: a six-panel Japanese comic written entirely within JLPT ${episode.level}, with English translations.`,
      url: `${SITE_URL}/stories/${episode.slug}`,
      inLanguage: ['ja', 'en'],
      educationalLevel: `JLPT ${episode.level}`,
      learningResourceType: 'Graded reader',
      teaches: episode.targets.map(t => `${t.word} (${t.reading}) — ${t.en}`),
      datePublished: episode.publishedAt,
      isAccessibleForFree: true,
      image: `${SITE_URL}${episode.ogImage}`,
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
        { '@type': 'ListItem', position: 2, name: 'Japanese Stories', item: `${SITE_URL}/stories` },
        {
          '@type': 'ListItem',
          position: 3,
          name: episode.titleEn,
          item: `${SITE_URL}/stories/${episode.slug}`,
        },
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
            <li>
              <Link href="/stories" className="hover:text-japan-deep-ocean">
                Japanese Stories
              </Link>
            </li>
            <li aria-hidden className="text-japan-sakura-waters">/</li>
            <li className="font-medium text-japan-ink-black" aria-current="page">
              {episode.titleEn}
            </li>
          </ol>
        </nav>

        <div className="mb-8 space-y-4 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-japan-mountain-mist">
            The Travels of Tan · Episode {episode.number}
          </p>
          <h1 className="space-y-2">
            <span lang="ja" className="block text-3xl font-bold md:text-4xl">
              {episode.titleJa}
            </span>
            <span className="block text-xl font-semibold text-japan-mountain-mist">
              {episode.titleEn}
            </span>
          </h1>
          <div className="flex justify-center">
            <Badge variant="secondary" className="px-3 py-1 text-base">
              <BookOpen className="mr-1 h-4 w-4" />
              Every word is JLPT {episode.level}
            </Badge>
          </div>
        </div>

        {/*
          The comic. Column counts are driven by one measured number: the
          Japanese face is 5.3% of the panel width, so panel width IS legibility.

          `main` is capped at max-w-4xl (832px of content), and three columns
          inside that cap gave a 261px panel and a 13.5px face — measured, and
          *smaller* than the 16.2px the same page renders on a 375px phone. The
          third column therefore only appears at `xl`, where the section breaks
          out of the cap by 8rem a side to pay for it (346px panel, 18.4px).
          Two columns start at `md` rather than `sm` for the same reason: the
          640-767px band was the worst on the page at 14.6px, and one column
          there is 30px.
        */}
        <section aria-labelledby="comic-heading" className="xl:-mx-32">
          <h2 id="comic-heading" className="sr-only">
            The comic
          </h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {episode.panels.map((panel, i) => (
              <StoryPanel key={panel.id} panel={panel} priority={i === 0} />
            ))}
          </div>
        </section>

        {/*
          The transcript IS a second copy of the bubbles, and saying otherwise
          misleads the next editor: the bubbles are real DOM text inside each
          figure, so a screen reader meets every line here for the second time.
          It stays because reading the story in sequence, away from the art, is
          a different act from reading it panel by panel — and because it is
          what a translator and a crawler get to use. The heading below says so
          out loud rather than presenting it as new material.
        */}
        <section className={SECTION_BAND} aria-labelledby="transcript-heading">
          <h2 id="transcript-heading" className={`${SECTION_HEADING} mb-6`}>
            Read it as text
          </h2>
          <ol className="space-y-4">
            {lines.map((line, i) => (
              <li
                key={i}
                className="rounded-lg border border-border bg-japan-soft-mist px-4 py-3"
              >
                <p lang="ja" className="text-lg font-medium [word-break:keep-all]">
                  {line.ja}
                </p>
                <p className="mt-1 text-sm text-japan-mountain-mist">{line.en}</p>
              </li>
            ))}
          </ol>
        </section>

        {/*
          The words, each linking its character's page. Targets only — five
          links with real anchor text, not every kanji in the dialogue. Linking
          all of them wrecks readability and inflates the link count for no
          gain, and the anchor stops meaning anything.

          `encodeURIComponent` at render time, never a stored href: a hand-typed
          encoded URL is how you eventually ship %25E5%25B1%25B1 and a 404.
        */}
        <section className={SECTION_BAND} aria-labelledby="words-heading">
          <h2 id="words-heading" className={`${SECTION_HEADING} mb-6`}>
            Words this episode teaches
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {episode.targets.map(target => (
              <li key={target.kanji}>
                <Link
                  href={`/kanji/${encodeURIComponent(target.kanji)}`}
                  className="flex items-baseline gap-3 rounded-lg border border-border bg-card px-4 py-3 transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <span lang="ja" className="text-2xl font-semibold">
                    {target.word}
                  </span>
                  <span lang="ja" className="text-sm text-japan-mountain-mist">
                    {target.reading}
                  </span>
                  <span className="ml-auto text-sm text-japan-ink-black">{target.en}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/*
          The gate, and the only thing on this page that asks for anything.

          It sits here rather than at the top on purpose: someone who reaches it
          has read six panels of Japanese and a transcript, which makes them a
          materially different person from a visitor who bounced at panel two.
          That difference is the whole reason this surface has its own
          `EmailSignupSource` — per-surface signup rate is how "who actually
          engages" gets answered with behaviour rather than a guess.

          What is gated is the quiz card, not the story. The story is free,
          crawlable and shareable; the practice is what a serious learner wants
          and a browser does not, and that asymmetry is the filter.
        */}
        <section className={SECTION_BAND} aria-labelledby="quiz-heading">
          <h2 id="quiz-heading" className={`${SECTION_HEADING} mb-6`}>
            Test yourself on this episode
          </h2>
          <EmailCapture
            source="story-episode-quiz"
            title="Get the quiz card for this episode"
            description={`Three questions on ${episode.titleEn}, drawn from the words above, with the answer key on the back. We'll email it to you, along with each new episode as it goes up.`}
            cta="Send me the quiz"
            successTitle="On its way"
            successMessage="Check your inbox — confirm the address and the quiz card follows."
          />
        </section>

        {/* Season navigation. Server-rendered, so it is also crawlable depth. */}
        <nav className={SECTION_BAND} aria-label="Episodes">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {previous ? (
              <Link
                href={`/stories/${previous.slug}`}
                className="text-sm font-medium text-japan-deep-ocean hover:underline"
              >
                ← Ep. {previous.number}: {previous.titleEn}
              </Link>
            ) : (
              <Link
                href="/stories"
                className="text-sm font-medium text-japan-deep-ocean hover:underline"
              >
                ← All episodes
              </Link>
            )}
            {next && (
              <Link
                href={`/stories/${next.slug}`}
                className="text-sm font-medium text-japan-deep-ocean hover:underline"
              >
                Ep. {next.number}: {next.titleEn} →
              </Link>
            )}
          </div>
        </nav>

        <section className={SECTION_BAND}>
          <CTASection variant="with-image" />
        </section>
      </main>
    </>
  );
}
