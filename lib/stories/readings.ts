/**
 * The readings registry: pronunciation kana for each episode's dialogue.
 *
 * WHY THIS IS DATA
 * ----------------
 * The dialogue is written the way a beginner reads it, with kanji (十, 来ました,
 * 東). Nothing in the episode data says how those are pronounced, and a program
 * cannot guess: 十 is じゅう when counted aloud and とお as a native count, 一つ
 * is ひとつ, 六 is ろく. So a person drafts `data/stories/readings/ep-NN.ts` and
 * the Japanese reviewer approves it. Romaji (lib/stories/romaji-lines.ts) is
 * then derived from these by rule, so the review is of kana, not of romaji.
 *
 * CONVENTIONS (what a reading line means)
 * ---------------------------------------
 *  - One string per line of the panel, in line order, under the panel's id.
 *  - Hiragana, with katakana kept for names (タン, チュン), and ー for a long
 *    vowel in katakana. Nothing else but the punctuation 。、！？… .
 *  - PRONUNCIATION kana, not spelling: the topic particle は is written わ and
 *    the direction particle へ is written え. を stays を (Hepburn writes it o
 *    either way, so nothing is lost). こんにちは is こんにちわ, which is how it
 *    is said. Everywhere else は is は.
 *  - Spacing follows the `ja` line, which is word-spaced (分かち書き). On top of
 *    that, `|` marks a word break the Japanese spacing does not show: a
 *    particle, です, か, ね, よ or ください split from what they follow. It is
 *    only there so romaji reads "Tan no uchi desu ka" rather than "tanno
 *    uchidesuka", and it is dropped for anything that shows kana.
 *  - Numerals and counters are the risky spots. The reading is what is said in
 *    context: 十 counted aloud or as a quantity is じゅう, 四 and 七 and 九 when
 *    counting are よん, なな and きゅう, 一つ is ひとつ, 五つ is いつつ.
 *
 * Static imports, not `fs`, for the same reason lib/stories/index.ts gives:
 * a runtime read works at build time and then fails in a serverless function.
 * Relative paths, because `pnpm validate:stories` runs this under tsx.
 * An episode with no entry here simply has no romaji line; `validate:stories`
 * is what makes that an error for a registered episode.
 */
import type { EpisodeReadings } from './types';
import { READINGS as R01 } from '../../data/stories/readings/ep-01';
import { READINGS as R02 } from '../../data/stories/readings/ep-02';
import { READINGS as R03 } from '../../data/stories/readings/ep-03';
import { READINGS as R04 } from '../../data/stories/readings/ep-04';
import { READINGS as R05 } from '../../data/stories/readings/ep-05';
import { READINGS as R06 } from '../../data/stories/readings/ep-06';
import { READINGS as R07 } from '../../data/stories/readings/ep-07';
import { READINGS as R08 } from '../../data/stories/readings/ep-08';

export const READINGS: readonly EpisodeReadings[] = [R01, R02, R03, R04, R05, R06, R07, R08];

export function readingsForSlug(slug: string): EpisodeReadings | undefined {
  return READINGS.find(r => r.slug === slug);
}
