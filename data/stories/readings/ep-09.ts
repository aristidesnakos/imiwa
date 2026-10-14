/**
 * Pronunciation kana for episode 9 (what-time-is-it). DRAFT for the Japanese
 * reviewer; conventions and the `|` word-break marker are in
 * lib/stories/readings.ts. Edited by hand (unlike data/stories/ep-NN.ts, which
 * is generated); `pnpm validate:stories` checks it against the episode.
 *
 * Judgement calls:
 *  - 10時 is じゅうじ; the times avoid 4時 よじ, 7時 しちじ and 9時 くじ.
 *  - 30分 is さんじゅっぷん (the sound change; さんじっぷん is also heard).
 *  - 10時半 is じゅうじはん: the は in はん is the word 半, so it stays は.
 *  - 午前 is ごぜん, 毎日 is まいにち, 今 is いま, 何時 is なんじ.
 *  - The topic は after とけい and 今 is わ.
 *  - はじめまして: は is part of the word, so it stays は.
 *  - チクタク (ticking) is read ちくたく; P6 Chun: 「あの とけいは チクタク しません。 毎日 10時です。」 (14 Oct, replaces 「...毎日 10時ですね。」).
 */
import type { EpisodeReadings } from '../../../lib/stories/types';

export const READINGS: EpisodeReadings = {
  slug: "what-time-is-it",
  panels: {
    P1: ["ごぜん|です。", "いま なんじ|です|か。"],
    P2: ["じゅうじ|です|よ。", "あれ、 かさ|の…"],
    P3: ["いいえ、 はじめまして。"],
    P4: ["さんじゅっぷん あと|です。", "いま|わ じゅうじはん|です|か。"],
    P5: ["いいえ、 じゅうじ|です。"],
    P6: ["あの とけい|わ ちくたく しません。 まいにち じゅうじ|です。", "じゃあ、 いま なんじ|です|か！"],
  },
};
