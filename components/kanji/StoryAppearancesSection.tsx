import Link from 'next/link';
import { SECTION_BAND, SECTION_HEADING } from '@/components/kanji/section';
import { episodesForKanji } from '@/lib/stories';

/**
 * "You can read this character in a story" — the reciprocal link from a kanji
 * detail page back into `/stories`.
 *
 * Text, not the strip, and it stays text: this route is gated at 440 kB of
 * total transfer against a 363 kB baseline, and one composited strip export is
 * 1.3 MB. The comic's home is the story page, which has the budget; what the
 * detail page needed was the pointer. It is a server component with no client
 * boundary, so it adds nothing to the tighter script budget either.
 *
 * Returns null for the ~1,880 characters no episode teaches — no heading, no
 * empty state, exactly as `ExampleSentencesSection` does. A crawler that meets
 * the same stub on 1,880 pages learns the template rather than the content.
 */
export function StoryAppearancesSection({ kanji }: { kanji: string }) {
  const appearances = episodesForKanji(kanji);
  if (appearances.length === 0) return null;

  return (
    <section className={SECTION_BAND} aria-labelledby="stories-heading">
      <h2 id="stories-heading" className={`${SECTION_HEADING} mb-2`}>
        Read <span lang="ja">{kanji}</span> in a story
      </h2>
      <p className="mb-6 text-japan-mountain-mist">
        Short Japanese comics written so that every word in them is JLPT N5.{' '}
        {appearances.length === 1 ? 'One of them teaches' : `${appearances.length} of them teach`} this
        character — the match is on the words an episode teaches, not every character in its dialogue.
      </p>

      <ul className="space-y-3">
        {appearances.map(({ episode, target }) => (
          <li key={episode.slug}>
            <Link
              href={`/stories/${episode.slug}`}
              className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-lg border border-border bg-japan-soft-mist px-4 py-3 transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {/* Anchor text names the episode, not the character: "山" on a page
                  already about 山 says nothing to a reader or a crawler. */}
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
