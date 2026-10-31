/**
 * Pronunciation kana for episode 11 (which-way). DRAFT for the Japanese
 * reviewer; conventions and the `|` word-break marker are in
 * lib/stories/readings.ts. Edited by hand (unlike data/stories/ep-NN.ts, which
 * is generated); `pnpm validate:stories` checks it against the episode.
 *
 * Judgement calls:
 *  - 右 みぎ, 左 ひだり, 北 きた, 西 にし, 南 みなみ, 外 そと, 中 なか (all kun).
 *  - The direction particle へ after みぎ and なか is え.

 *  - みせ, いけ, いえ and ちず stay kana (not on the N5 82). 見ましょう is read みましょう; を is お; the topic は is わ, the location に stays に, が stays が.
 */
import type { EpisodeReadings } from '../../../lib/stories/types';

export const READINGS: EpisodeReadings = {
  slug: "which-way",
  panels: {
    P1: ["みせ|わ どこ|です|か。", "ちず|お みましょう。"],
    P2: ["うえ|わ きた|です。", "き|わ きた、 いけ|わ みなみ|です|ね。"],
    P3: ["にし|に いえ|が あります。", "いえ|わ き|の ひだり|です|ね。"],
    P4: ["みせ|わ き|の みぎ|です。", "じゃあ、 みぎ|え いきましょう！"],
    P5: ["ここ|わ みせ|の そと|です|よ。", "なか|え いきましょう！"],
    P6: ["なか|わ おおきい|です|ね！", "そと|わ ちいさい|です|よ。"],
  },
};
