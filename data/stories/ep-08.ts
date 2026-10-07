/**
 * GENERATED FILE — do not edit.
 *
 * Source: strips/ep-08/script.json
 * Regenerate: python3 scripts/stories/import-episode.py <path-to-ep-dir>
 *
 * Editing this by hand puts the site out of step with the strip that gets
 * posted to Pinterest and Instagram, and nothing would report the mismatch.
 */
import type { Episode } from '../../lib/stories/types';

export const EPISODE: Episode = {
  number: 8,
  slug: "how-much-is-it",
  titleEn: "How much is it?",
  titleJa: "いくらですか",
  level: "N5",
  publishedAt: "2026-10-07",
  ogImage: "/stories/how-much-is-it/og.jpg",
  focusKanji: ["百", "千", "万", "円", "金", "高", "何"],
  targets: [
  { word: "百円", reading: "ひゃくえん", en: "100 yen", kanji: "百" },
  { word: "千円", reading: "せんえん", en: "1,000 yen", kanji: "千" },
  { word: "一万円", reading: "いちまんえん", en: "10,000 yen", kanji: "万" },
  { word: "高い", reading: "たかい", en: "expensive; high", kanji: "高" },
  { word: "お金", reading: "おかね", en: "money", kanji: "金" },
  ],
  panels: [
  {
    id: "P1",
    beat: "Caught in the rain",
    art: "/stories/how-much-is-it/p1.webp",
    lines: [
      { speaker: "narration", ja: "雨です。", en: "It's raining.", bubble: { x: 2, y: 3, w: 40, tail: null } },
      { speaker: "chun", ja: "かさが ありませんね。", en: "We have no umbrella.", bubble: { x: 2, y: 19, w: 88, tail: "bl", tailX: 53 } },
    ],
  },
  {
    id: "P2",
    beat: "The seller",
    art: "/stories/how-much-is-it/p2.webp",
    lines: [
      { speaker: "kon", ja: "かさ、 ありますよ。", en: "I have an umbrella!", bubble: { x: 38, y: 3, w: 58, tail: "bl", tailX: 50 } },
      { speaker: "tan", ja: "いくらですか。", en: "How much is it?", bubble: { x: 2, y: 27, w: 54, tail: "bl", tailX: 50 } },
    ],
  },
  {
    id: "P3",
    beat: "The price",
    art: "/stories/how-much-is-it/p3.webp",
    lines: [
      { speaker: "kon", ja: "一万円です。", en: "It's 10,000 yen.", bubble: { x: 22, y: 4, w: 60, tail: "bl", tailX: 33 } },
    ],
  },
  {
    id: "P4",
    beat: "Too much",
    art: "/stories/how-much-is-it/p4.webp",
    lines: [
      { speaker: "tan", ja: "高い！", en: "Expensive!", bubble: { x: 2, y: 3, w: 34, tail: "bl", tailX: 80 } },
      { speaker: "chun", ja: "お金は 何円 ありますか。", en: "How many yen do you have?", bubble: { x: 38, y: 3, w: 60, tail: "bl", tailX: 17 } },
    ],
  },
  {
    id: "P5",
    beat: "The haggle",
    art: "/stories/how-much-is-it/p5.webp",
    lines: [
      { speaker: "tan", ja: "お金は 百円です…", en: "I have 100 yen...", bubble: { x: 2, y: 3, w: 36, tail: "bl", tailX: 75 } },
      { speaker: "kon", ja: "じゃあ、 千円… いいえ、 百円です！", en: "Then 1,000... no, 100 yen!", bubble: { x: 40, y: 3, w: 58, tail: "bl", tailX: 55 } },
    ],
  },
  {
    id: "P6",
    beat: "Payoff",
    art: "/stories/how-much-is-it/p6.webp",
    lines: [
      { speaker: "tan", ja: "やすい！", en: "Cheap!", bubble: { x: 2, y: 3, w: 34, tail: "bl", tailX: 80 } },
      { speaker: "chun", ja: "はじめから 百円でしたね。", en: "It was 100 yen from the start.", bubble: { x: 38, y: 3, w: 60, tail: "bl", tailX: 20 } },
    ],
  },
  ],
  quiz: [
  { prompt: "百円", ask: "よみかたは？", askEn: "How do you read it?", options: ["ひゃくえん", "せんえん", "まんえん"], answer: 0 },
  { prompt: "高い", ask: "いみは？", askEn: "What does it mean?", options: ["cheap", "small", "expensive"], answer: 2 },
  { prompt: "タンは いくら もって いましたか。", ask: "", askEn: "How much money did Tan have?", options: ["千円", "百円", "一万円"], answer: 1 },
  ],
};
