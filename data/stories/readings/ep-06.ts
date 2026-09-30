/**
 * Pronunciation kana for episode 6 (tans-family-and-friends). DRAFT for the Japanese
 * reviewer; conventions and the `|` word-break marker are in
 * lib/stories/readings.ts. Edited by hand (unlike data/stories/ep-NN.ts, which
 * is generated); `pnpm validate:stories` checks it against the episode.
 */
import type { EpisodeReadings } from '../../../lib/stories/types';

export const READINGS: EpisodeReadings = {
  slug: "tans-family-and-friends",
  panels: {
    P1: ["タン|わ うち|に かえりました。", "あれ|わ タン|の うち|です|か。"],
    P2: ["タン、 おかえりなさい。", "タン|の ちち|と はは|です。"],
    P3: ["ごはん|を たべません|か。", "はい、 いただきます。"],
    P4: ["おとこ|の|こ|と おんな|の|こ|も きました。"],
    P5: ["ぼく|わ タン|の ともだち|です。", "あそびましょう。"],
    P6: ["かぞく|と ともだち|が だいすき|です。", "チュン|も ともだち|です|よ。"],
  },
};
