/**
 * Pronunciation kana for episode 5 (the-train-east). DRAFT for the Japanese
 * reviewer; conventions and the `|` word-break marker are in
 * lib/stories/readings.ts. Edited by hand (unlike data/stories/ep-NN.ts, which
 * is generated); `pnpm validate:stories` checks it against the episode.
 */
import type { EpisodeReadings } from '../../../lib/stories/types';

export const READINGS: EpisodeReadings = {
  slug: "the-train-east",
  panels: {
    P1: ["なにか|が きました。", "あれ|わ くるま|です|か。"],
    P2: ["いいえ、 でんしゃ|です。", "でんしゃ|に のりましょう。"],
    P3: ["でんしゃ|わ ひがし|に いきます。", "はやい|です|ね。"],
    P4: ["あ、 おおきい やま|です。"],
    P5: ["つぎ|の えき|で おりません|か。", "おりましょう。"],
    P6: ["いい まち|に きました。", "ひがし|の まち|です|ね。"],
  },
};
