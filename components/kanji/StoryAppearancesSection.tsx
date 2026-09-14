import Link from 'next/link';
import { SECTION_BAND, SECTION_HEADING } from '@/components/kanji/section';
import { episodesForKanji } from '@/lib/stories';

/**
 * "You can read this character in a story" — the reciprocal link from a kanji
 * detail page back into `/stories`.
 *
 * ---------------------------------------------------------------------------
 * Why this is text and will stay text
 * ---------------------------------------------------------------------------
 *
 * The obvious version of this block shows the strip. It cannot. This route is
 * gated in `lighthouserc.js` at 440 kB of total transfer against a 363 kB
 * baseline — about 77 kB of headroom across ~1,890 prerendered pages — and a
 * single composited strip export is 1.3 MB. Even one panel would eat most of
 * what is left, on every kanji page, for a link.
 *
 * The comic's home is the story page, which has the budget for it. What the
 * detail page needed was the pointer, and a pointer costs a few hundred bytes.
 *
 * The same reasoning rules out making this interactive: it is a server
 * component with no client boundary, so it adds nothing at all to the script
 * budget, which is the tighter of the two.
 *
 * ---------------------------------------------------------------------------
 * Why it renders nothing most of the time, and why that is correct
 * ---------------------------------------------------------------------------
 *
 * Two episodes teach ten characters between them. Every other page returns
 * null — no heading, no empty state, no "coming soon", exactly as
 * `ExampleSentencesSection` does when a kanji has no reviewed sentences. An
 * empty band advertising an absence is worse than silence, and a crawler that
 * meets the same stub on 1,880 pages learns the template rather than the
 * content.
 */
export function StoryAppearancesSection({ kanji }: { kanji: string }) {
  const appearances = episodesForKanji(kanji);
  if (appearances.length === 0) return null;

  return (
    <section className={SECTION_BAND} aria-labelledby="stories-heading">
      <h2 id="stories-heading" className={`${SECTION_HEADING} mb-2`}>
        Read <span lang="ja">{kanji}</span> in a story
      </h2>
      {/*
        The heading is phrased as something a person would search rather than
        as a label for the widget underneath it — the one rhythm this page's
        five other headings already keep.
      */}
      <p className="mb-6 text-japan-mountain-mist">
        Short Japanese comics written so that every word in them is JLPT N5. This character
        appears in {appearances.length === 1 ? 'one of them' : `${appearances.length} of them`}.
      </p>

      <ul className="space-y-3">
        {appearances.map(({ episode, target }) => (
          <li key={episode.slug}>
            <Link
              href={`/stories/${episode.slug}`}
              className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-lg border border-border bg-japan-soft-mist px-4 py-3 transition-colors hover:bg-card"
            >
              {/*
                The anchor text names the episode, not the character. "山" as
                anchor text on a page that is already about 山 says nothing to
                a reader or to a crawler; the title is the actual description
                of what is on the other end.
              */}
              <span className="font-medium text-japan-deep-ocean">{episode.titleEn}</span>
              <span lang="ja" className="text-sm text-japan-ink-black">
                {episode.titleJa}
              </span>
              <span className="ml-auto text-sm text-japan-mountain-mist">
                teaches{' '}
                <span lang="ja" className="font-medium">
                  {target.word}
                </span>{' '}
                ({target.en})
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
