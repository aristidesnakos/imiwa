/**
 * Pronunciation kana for episode 4 (a-rainy-day-off). DRAFT for the Japanese
 * reviewer; conventions and the `|` word-break marker are in
 * lib/stories/readings.ts. Edited by hand (unlike data/stories/ep-NN.ts, which
 * is generated); `pnpm validate:stories` checks it against the episode.
 */
import type { EpisodeReadings } from '../../../lib/stories/types';

export const READINGS: EpisodeReadings = {
  slug: "a-rainy-day-off",
  panels: {
    P1: ["きょう|わ あめ|です。"],
    P2: ["てんき|が よくない|です。"],
    P3: ["きょう|わ やすみ|の ひ|です。"],
    P4: ["タン|と チュン|わ うち|で やすみます。"],
    P5: ["おちゃ|を のみません|か。", "のみましょう。"],
    P6: ["あした|わ いい てんき|です。"],
  },
};
