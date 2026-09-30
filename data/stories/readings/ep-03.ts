/**
 * Pronunciation kana for episode 3 (tan-goes-to-school). DRAFT for the Japanese
 * reviewer; conventions and the `|` word-break marker are in
 * lib/stories/readings.ts. Edited by hand (unlike data/stories/ep-NN.ts, which
 * is generated); `pnpm validate:stories` checks it against the episode.
 */
import type { EpisodeReadings } from '../../../lib/stories/types';

export const READINGS: EpisodeReadings = {
  slug: "tan-goes-to-school",
  panels: {
    P1: ["タン|わ がっこう|に いきました。", "おおきい がっこう|です。"],
    P2: ["わたし|わ せんせい|です。", "はじめまして。 タン|です。"],
    P3: ["ここ|で にほんご|を べんきょう|します。", "はい、せんせい。"],
    P4: ["にほんご|わ むずかしい|です|か。"],
    P5: ["むずかしくない|です。", "べんきょう|したい|です。"],
    P6: ["ぼく|わ がくせい|です。", "わたし|も がくせい|です。"],
  },
};
