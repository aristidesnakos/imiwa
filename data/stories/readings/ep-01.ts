/**
 * Pronunciation kana for episode 1 (tan-climbs-the-mountain). DRAFT for the Japanese
 * reviewer; conventions and the `|` word-break marker are in
 * lib/stories/readings.ts. Edited by hand (unlike data/stories/ep-NN.ts, which
 * is generated); `pnpm validate:stories` checks it against the episode.
 */
import type { EpisodeReadings } from '../../../lib/stories/types';

export const READINGS: EpisodeReadings = {
  slug: "tan-climbs-the-mountain",
  panels: {
    P1: ["おおきい やま|です。"],
    P2: ["き|が たくさん あります。"],
    P3: ["き|の うえ|を みました。"],
    P4: ["こんにちわ。"],
    P5: ["やま|の うえ|に いきません|か。", "いきましょう。"],
    P6: ["そら|が おおきい|です。"],
  },
};
