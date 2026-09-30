/**
 * Pronunciation kana for episode 7 (counting-at-the-market). DRAFT for the Japanese
 * reviewer; conventions and the `|` word-break marker are in
 * lib/stories/readings.ts. Edited by hand (unlike data/stories/ep-NN.ts, which
 * is generated); `pnpm validate:stories` checks it against the episode.
 */
import type { EpisodeReadings } from '../../../lib/stories/types';

export const READINGS: EpisodeReadings = {
  slug: "counting-at-the-market",
  panels: {
    P1: ["りんご|を じゅう かって ください。", "はい！"],
    P2: ["いちば|に きました。", "りんご|が たくさん あります|ね。"],
    P3: ["いち、 に、 さん、 よん、 ご、", "ろく、 なな、 はち、 きゅう、 じゅう！"],
    P4: ["ひとつ いい|です|か。", "いい|です|よ。"],
    P5: ["きゅう… はち… なな… ろく…", "おいしい|です！"],
    P6: ["いくつ|です|か。", "いつつ|です…"],
  },
};
