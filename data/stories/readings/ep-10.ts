/**
 * Pronunciation kana for episode 10 (a-hot-summer-day). DRAFT for the Japanese
 * reviewer; conventions and the `|` word-break marker are in
 * lib/stories/readings.ts. Edited by hand (unlike data/stories/ep-NN.ts, which
 * is generated); `pnpm validate:stories` checks it against the episode.
 *
 * Judgement calls:
 *  - 今年 is ことし (irregular), 来年 is らいねん, 来月 is らいげつ.
 *  - 火よう日 is かようび, 土よう日 is どようび (よう日 stays kana: 曜 is not N5).
 *  - きょう stays kana (今日 would add a second irregular reading).
 *  - 暑い is あつい; 暑くない is あつくない.
 *  - The topic は after ことし, らいげつ and らいねん is わ.
 */
import type { EpisodeReadings } from '../../../lib/stories/types';

export const READINGS: EpisodeReadings = {
  slug: "a-hot-summer-day",
  panels: {
    P1: ["ことし|わ あつい|です。", "ああ、 あつい！"],
    P2: ["かようび|です。", "きょう|も あつい|です|ね。"],
    P3: ["どようび|です。", "きょう|も あつい|です|よ。"],
    P4: ["らいげつ|わ あつくない|です|よね。", "いいえ、 らいげつ|も あつい|です。"],
    P5: ["じゃあ、 らいねん|わ？"],
    P6: ["らいねん|も あつい|です|よ。", "えーっ！"],
  },
};
