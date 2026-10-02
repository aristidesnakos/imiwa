import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';

import config from '@/config';
import { getSEOTags } from '@/lib/seo';
import { SITE_URL, SITE_NAME } from '@/lib/seo/site';
import Header from '@/components/sections/Header';
import { SECTION_BAND, SECTION_HEADING } from '@/components/kanji/section';
import { levelPagePath } from '@/lib/levels';

export const metadata: Metadata = getSEOTags({
  title: `About ${config.appName} | Who Makes It and Where the Data Comes From`,
  description:
    'MichiKanji is made by Ari Nakos, a builder rather than a Japanese teacher. See where the kanji data, sentences and stories come from, and how the Japanese is checked.',
  canonicalUrlRelative: '/about',
});

/**
 * Written 2026-10-02, on one premise: the person behind this site is not
 * Japanese and not a Japanese teacher, and the page says so in its second
 * sentence rather than leaving a visitor to wonder. What a site like this can
 * offer in place of credentials is a paper trail, so most of the page is one:
 * where each layer of data comes from, what a program checks, what a person
 * checks, and what is not finished.
 *
 * Every claim below describes what the code does, so when the code changes this
 * changes with it. The ones worth re-checking on any edit:
 *
 *  - Sources and licences match the site-wide footer (components/sections/
 *    Footer.tsx) and docs/prd/content-source-licence-investigation.md. A new
 *    content source needs a line here as well as in the footer.
 *  - "Only reviewed sentences are shown" is the sentences pipeline
 *    (data/sentences/decisions -> published, CLAUDE.md "Example sentences"),
 *    and an empty published file renders nothing, which is why gaps exist.
 *  - The story readings are authored by hand (data/stories/readings) and the
 *    N5-only rule is asserted by `pnpm validate:stories`.
 *  - The story art is AI-generated and the Japanese is composited as text
 *    (components/stories/StoryPanel.tsx). If that ever changes, so does the
 *    "Where does the data come from?" bullet on it.
 *  - "N5 is furthest along" is true while only N5 has a list page, a quiz and
 *    published sentences (lib/levels). Revisit when N4 gets its list.
 *  - Operator and contact come from `config.business` and `config.resend`, the
 *    same definitions the privacy policy reads.
 */

const LINK =
  'rounded-sm font-medium text-japan-deep-ocean underline underline-offset-2 hover:brightness-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const LIST = 'list-disc space-y-3 pl-6 leading-relaxed';

const YOUTUBE_URL = 'https://www.youtube.com/@officialmichikanji';
const OPERATOR_URL = 'https://theauspiciouscompany.com';

export default function AboutPage() {
  const { legalName, registration } = config.business;
  const email = config.resend.supportEmail;
  const n5ListPath = levelPagePath('N5');

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: `About ${SITE_NAME}`,
    url: `${SITE_URL}/about`,
    description:
      'Who makes MichiKanji, where its kanji data, sentences and stories come from, and how the Japanese is checked.',
    inLanguage: 'en',
    about: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    mainEntity: {
      '@type': 'Person',
      name: 'Ari Nakos',
      worksFor: { '@type': 'Organization', name: legalName, url: OPERATOR_URL },
      sameAs: ['https://twitter.com/just_aristides'],
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Header />

      <main id="main-content" tabIndex={-1} className="container mx-auto max-w-3xl px-4 py-12">
        <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
          <Image
            src="/assets/tan-wave.png"
            alt="Tan the tanuki, the mascot of MichiKanji, waving"
            width={160}
            height={160}
            priority
            className="h-32 w-32 shrink-0 sm:h-40 sm:w-40"
          />
          <div className="space-y-3">
            <h1 className="text-3xl font-bold md:text-4xl">About MichiKanji</h1>
            <p className="text-lg text-japan-mountain-mist">
              MichiKanji is a free kanji dictionary and reading practice site for people learning
              Japanese. This page says who makes it, where everything on it comes from, and how the
              Japanese gets checked, so you can decide how far to trust it.
            </p>
          </div>
        </div>

        <section className={SECTION_BAND} aria-labelledby="who-heading">
          <h2 id="who-heading" className={SECTION_HEADING}>
            Who makes MichiKanji?
          </h2>
          <div className="mt-4 space-y-4 leading-relaxed">
            <p>
              I&rsquo;m Ari Nakos. I&rsquo;m not Japanese, and I&rsquo;m not a Japanese teacher. I
              build and run MichiKanji myself, through{' '}
              <a href={OPERATOR_URL} target="_blank" rel="noopener noreferrer" className={LINK}>
                {legalName}
              </a>
              , {registration}.
            </p>
            <p>
              Since I can&rsquo;t offer credentials, I&rsquo;ve tried to offer something you can
              check instead: a plain account of where each part of the site comes from, which parts
              a program verifies, which parts a person reviews, and what isn&rsquo;t finished yet.
              That&rsquo;s the rest of this page.
            </p>
          </div>
        </section>

        <section className={SECTION_BAND} aria-labelledby="data-heading">
          <h2 id="data-heading" className={SECTION_HEADING}>
            Where does the data come from?
          </h2>
          <ul className={`mt-4 ${LIST}`}>
            <li>
              <strong>Stroke order diagrams</strong> come from{' '}
              <a href="https://kanjivg.tagaini.net/" target="_blank" rel="noopener noreferrer" className={LINK}>
                KanjiVG
              </a>
              , by Ulrich Apel and contributors, under{' '}
              <a
                href="https://creativecommons.org/licenses/by-sa/3.0/"
                target="_blank"
                rel="noopener noreferrer"
                className={LINK}
              >
                CC BY-SA 3.0
              </a>
              .
            </li>
            <li>
              <strong>Meanings and readings</strong> are in the site&rsquo;s own kanji dataset, which
              includes entries from{' '}
              <a
                href="https://www.edrdg.org/wiki/index.php/KANJIDIC_Project"
                target="_blank"
                rel="noopener noreferrer"
                className={LINK}
              >
                KANJIDIC
              </a>
              , the property of the Electronic Dictionary Research and Development Group and used
              under its licence.
            </li>
            <li>
              <strong>Romaji</strong> is not typed in by hand. A program derives it from each kana
              reading using fixed Hepburn rules, and a test runs it over every reading on the site.
              It&rsquo;s there so you can search and sound out a kanji before you can type kana.
            </li>
            <li>
              <strong>JLPT levels</strong> follow widely used community lists, because the JLPT
              does not publish an official kanji list. Another site may place a few kanji at a
              different level.
            </li>
            <li>
              <strong>Example sentences</strong> come from{' '}
              <a href="https://tatoeba.org/" target="_blank" rel="noopener noreferrer" className={LINK}>
                the Tatoeba Project
              </a>
              , under{' '}
              <a
                href="https://creativecommons.org/licenses/by/2.0/fr/"
                target="_blank"
                rel="noopener noreferrer"
                className={LINK}
              >
                CC BY 2.0 FR
              </a>
              . Each sentence credits the person who contributed it.
            </li>
            <li>
              <strong>The stories</strong> (
              <Link href="/stories" className={LINK}>
                The Travels of Tan
              </Link>
              ) are original to this site. The scene art is generated with AI image tools. The
              Japanese is real text laid over the art, so you can select it, search it and have it
              read aloud.
            </li>
          </ul>
        </section>

        <section className={SECTION_BAND} aria-labelledby="checked-heading">
          <h2 id="checked-heading" className={SECTION_HEADING}>
            How is the Japanese checked?
          </h2>
          <div className="mt-4 space-y-4 leading-relaxed">
            <p>
              <strong>A program checks what a program can.</strong> Every kanji in a story has to be
              on the N5 list. Every quiz question has to have exactly one right answer. Automated
              checks enforce both before a change can go live.
            </p>
            <p>
              <strong>A person checks the rest.</strong> Example sentences are picked from Tatoeba
              by a script, but one appears on the site only after I have reviewed and approved it.
              Anything not approved is not shown, which is why many kanji have no example sentences
              yet. The kana behind each story line&rsquo;s romaji is written by hand, because a
              program can&rsquo;t tell whether 十 is じゅう or とお in a given sentence, and it is
              reviewed before an episode goes out.
            </p>
            <p>
              I&rsquo;m not a native speaker, so when I&rsquo;m not sure of something I leave it
              out rather than guess.
            </p>
          </div>
        </section>

        <section className={SECTION_BAND} aria-labelledby="status-heading">
          <h2 id="status-heading" className={SECTION_HEADING}>
            What&rsquo;s finished, and what isn&rsquo;t?
          </h2>
          <p className="mt-4 leading-relaxed">
            N5 is the level I&rsquo;ve taken furthest.{' '}
            {n5ListPath ? (
              <>
                It has a full{' '}
                <Link href={n5ListPath} className={LINK}>
                  kanji list
                </Link>
                , a{' '}
                <Link href="/kanji/n5/quiz" className={LINK}>
                  quiz
                </Link>
                , reviewed example sentences and the weekly story.
              </>
            ) : (
              <>It has a quiz, reviewed example sentences and the weekly story.</>
            )}{' '}
            Every kanji from N4 to N1 has its own page with a stroke order diagram, meanings and
            readings, but those level lists are still being filled in and the example sentences
            haven&rsquo;t reached them yet.
          </p>
        </section>

        <section className={SECTION_BAND} aria-labelledby="mistake-heading">
          <h2 id="mistake-heading" className={SECTION_HEADING}>
            Found a mistake?
          </h2>
          <p className="mt-4 leading-relaxed">
            Please tell me. Email{' '}
            <a href={`mailto:${email}`} className={LINK}>
              {email}
            </a>{' '}
            with the kanji and what looks wrong: a reading, a meaning, a missing kanji, a sentence
            that sounds unnatural. Corrections to the Japanese are the most useful thing you can
            send.
          </p>
        </section>

        <section className={SECTION_BAND} aria-labelledby="follow-heading">
          <h2 id="follow-heading" className={SECTION_HEADING}>
            Where can I follow along?
          </h2>
          <ul className={`mt-4 ${LIST}`}>
            <li>
              A new episode of{' '}
              <Link href="/stories" className={LINK}>
                The Travels of Tan
              </Link>{' '}
              comes out every week, and you can have it emailed to you each Saturday.
            </li>
            <li>
              Each episode is also on the{' '}
              <a href={YOUTUBE_URL} target="_blank" rel="noopener noreferrer" className={LINK}>
                MichiKanji YouTube channel
              </a>
              .
            </li>
            <li>
              There are no accounts. Your progress stays in your own browser, and the{' '}
              <Link href="/privacy-policy" className={LINK}>
                privacy policy
              </Link>{' '}
              says exactly what we do collect.
            </li>
          </ul>
        </section>
      </main>
    </>
  );
}
