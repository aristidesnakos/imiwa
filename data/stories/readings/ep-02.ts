/**
 * Pronunciation kana for episode 2 (tan-finds-the-river). DRAFT for the Japanese
 * reviewer; conventions and the `|` word-break marker are in
 * lib/stories/readings.ts. Edited by hand (unlike data/stories/ep-NN.ts, which
 * is generated); `pnpm validate:stories` checks it against the episode.
 */
import type { EpisodeReadings } from '../../../lib/stories/types';

export const READINGS: EpisodeReadings = {
  slug: "tan-finds-the-river",
  panels: {
    P1: ["やま|の した|に かわ|が あります。"],
    P2: ["みず|が とても きれい|です。"],
    P3: ["ちいさい さかな|が います。"],
    P4: ["しろい いし|も あります。"],
    P5: ["みず|に はいりません|か。", "はいりましょう。"],
    P6: ["みず|が つめたい|です。"],
  },
};
