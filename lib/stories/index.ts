/**
 * The episode registry, and the only place that knows which episodes exist.
 *
 * Static imports, not `fs`. `lib/sentences/published.ts` learned this the
 * expensive way: a runtime `fs` read works at build time and then fails inside
 * a serverless function, because Next's file tracing never saw the path.
 * Adding an episode means committing its generated file *and* adding a line
 * here — and the build should fail loudly on a missing import rather than
 * quietly render an empty shelf.
 *
 * Order is publication order, and it is asserted rather than assumed:
 * `validate:stories` checks `number` is contiguous from 1.
 */
import type { Episode, TargetWord } from './types';
// Relative paths, not the `@/` alias: `pnpm validate:stories` runs this
// module under tsx from scripts/, and lib/sentences/validate.ts avoids the
// alias in exactly the same position for the same reason. Components under
// app/ still import the alias, where Next resolves it.
import { EPISODE as EP01 } from '../../data/stories/ep-01';
import { EPISODE as EP02 } from '../../data/stories/ep-02';

export const EPISODES: readonly Episode[] = [EP01, EP02];

export function episodeBySlug(slug: string): Episode | undefined {
  return EPISODES.find(e => e.slug === slug);
}

/** Newest first — what the hub lists and what "latest episode" means. */
export function episodesNewestFirst(): Episode[] {
  return [...EPISODES].sort((a, b) => b.number - a.number);
}

export interface KanjiAppearance {
  episode: Episode;
  /** The word that taught it, so the link can say 大きい rather than just 大. */
  target: TargetWord;
}

/**
 * Every episode that teaches this character, in publication order.
 *
 * This is the lookup behind the block on `/kanji/[character]`, so it runs about
 * 1,890 times per build and must stay cheap. It is a linear scan over a handful
 * of episodes today; if the season ever reaches a size where that matters,
 * build a Map at module scope rather than memoising per call — a per-call cache
 * on a server component buys nothing across separate renders.
 *
 * Matches on `targets`, deliberately, not `focusKanji`. A story is worth
 * linking from a kanji page only when the page's character is one the episode
 * actually teaches a word for; linking every character that merely *appears* in
 * the dialogue would put a story link on 山 for an episode about rivers.
 */
export function episodesForKanji(kanji: string): KanjiAppearance[] {
  const found: KanjiAppearance[] = [];
  for (const episode of EPISODES) {
    const target = episode.targets.find(t => t.kanji === kanji);
    if (target) found.push({ episode, target });
  }
  return found;
}

/** `/stories/<slug>`. Slugs are ASCII, so this needs no encoding. */
export function episodeHref(episode: Episode): string {
  return `/stories/${episode.slug}`;
}

/**
 * The flat JP/EN transcript, in reading order.
 *
 * The page renders this as real text under the art. That is not a redundant
 * copy of the bubbles: the bubbles are positioned absolutely over an image and
 * are hard to read in sequence, and this is the version a crawler, a screen
 * reader and a translator all get to use. It is also what takes a ~300-character
 * strict-N5 story from thin to substantive.
 */
export function transcript(episode: Episode): { ja: string; en: string; speaker: string }[] {
  return episode.panels.flatMap(panel =>
    panel.lines.map(line => ({ ja: line.ja, en: line.en, speaker: line.speaker })),
  );
}
