/**
 * Pronunciation kana for episode 8 (how-much-is-it). DRAFT for the Japanese
 * reviewer; conventions and the `|` word-break marker are in
 * lib/stories/readings.ts. Edited by hand (unlike data/stories/ep-NN.ts, which
 * is generated); `pnpm validate:stories` checks it against the episode.
 * Replaces readings.draft.ts (the 30 Sep Chun's-shop script).
 *
 * Judgement calls:
 *  - 一万円 is いちまんえん, never bare 万円.
 *  - 何円 is なんえん (なん before え).
 *  - 百円 ひゃくえん and 千円 せんえん take no sound change.
 *  - お金 is おかね; the topic は after it is わ.
 *  - はじめから: は is part of the word はじめ, so it stays は.
 */
import type { EpisodeReadings } from '../../../lib/stories/types';

export const READINGS: EpisodeReadings = {
  slug: "how-much-is-it",
  panels: {
    P1: ["あめ|です。", "かさ|が ありません|ね。"],
    P2: ["かさ、 あります|よ。", "いくら|です|か。"],
    P3: ["いちまんえん|です。"],
    P4: ["たかい！", "おかね|わ なんえん あります|か。"],
    P5: ["おかね|わ ひゃくえん|です…", "じゃあ、 せんえん… いいえ、 ひゃくえん|です！"],
    P6: ["やすい！", "はじめ|から ひゃくえん|でした|ね。"],
  },
};
