/**
 * The episode registry, and the only place that knows which episodes exist.
 *
 * Static imports, not `fs`. `lib/sentences/published.ts` learned this the
 * expensive way: a runtime `fs` read works at build time and then fails inside
 * a serverless function, because Next's file tracing never saw the path.
 * Adding an episode means committing its generated file *and* adding a line
 * here, so the build fails loudly rather than rendering an empty shelf.
 */
import type { Episode, PanelLine, TargetWord, UpcomingEpisode } from './types';
// Relative paths, not the `@/` alias: `pnpm validate:stories` runs this module
// under tsx from scripts/, exactly as lib/sentences/validate.ts does.
import { EPISODE as EP01 } from '../../data/stories/ep-01';
import { EPISODE as EP02 } from '../../data/stories/ep-02';
import { EPISODE as EP03 } from '../../data/stories/ep-03';
import { EPISODE as EP04 } from '../../data/stories/ep-04';

export const EPISODES: readonly Episode[] = [EP01, EP02, EP03, EP04];

/**
 * The rest of season one: written, validated against the N5 list upstream, and
 * waiting on art.
 *
 * Hand-maintained, and that is the cheaper side of the trade. The alternative
 * is reading `strips/season-01.json`, which lives outside this repo — so it
 * would be either an untraceable `fs` read (the trap `lib/sentences/
 * published.ts` documents) or a second generated file to keep in step. Four
 * entries deleted one at a time over four weeks is less machinery than either.
 *
 * Delete an entry when its episode is imported. `validate:stories` fails if a
 * number appears in both lists, so this cannot be forgotten silently.
 */
export const UPCOMING: readonly UpcomingEpisode[] = [
  {
    number: 5,
    titleEn: 'The train east',
    titleJa: '東へ 行く 電車',
    teaches: ['電車', '東', '行く', '来る'],
  },
  {
    number: 6,
    titleEn: "Tan's family and friends",
    titleJa: 'タンの かぞくと ともだち',
    teaches: ['父', '母', '友だち', '男の子', '女の子'],
  },
];

/** Oldest first — the order they will actually arrive in. */
export function upcomingInOrder(): UpcomingEpisode[] {
  return [...UPCOMING].sort((a, b) => a.number - b.number);
}

export function episodeBySlug(slug: string): Episode | undefined {
  return EPISODES.find(e => e.slug === slug);
}

/** Newest first — what the hub lists and what "latest episode" means. */
export function episodesNewestFirst(): Episode[] {
  return [...EPISODES].sort((a, b) => b.number - a.number);
}

/** Every line in reading order — the transcript the page renders as text. */
export function episodeLines(episode: Episode): PanelLine[] {
  return episode.panels.flatMap(panel => panel.lines);
}

/**
 * Every episode that teaches this character, with the word that taught it so
 * the link can say 大きい rather than just 大.
 *
 * Matches on `targets`, deliberately, not `focusKanji` or the dialogue. A story
 * is worth linking from a kanji page only when the episode actually teaches a
 * word for that character; linking every character that merely *appears* would
 * put an episode about rivers on 山's page.
 *
 * Runs once per prerendered kanji page (~1,890 times). It is a linear scan over
 * a handful of episodes; if the season ever grows enough for that to matter,
 * build a Map at module scope rather than memoising per call.
 */
export function episodesForKanji(kanji: string): { episode: Episode; target: TargetWord }[] {
  return EPISODES.flatMap(episode => {
    const target = episode.targets.find(t => t.kanji === kanji);
    return target ? [{ episode, target }] : [];
  });
}
