/**
 * GENERATED FILE — do not edit.
 *
 * Source: strips/ep-04/script.json
 * Regenerate: python3 scripts/stories/import-episode.py <path-to-ep-dir>
 *
 * Editing this by hand puts the site out of step with the strip that gets
 * posted to Pinterest and Instagram, and nothing would report the mismatch.
 */
import type { Episode } from '../../lib/stories/types';

export const EPISODE: Episode = {
  number: 4,
  slug: "a-rainy-day-off",
  titleEn: "A rainy day off",
  titleJa: "あめの 休みの 日",
  level: "N5",
  publishedAt: "2026-09-23",
  ogImage: "/stories/a-rainy-day-off/og.jpg",
  focusKanji: ["雨", "天", "気", "休", "日"],
  targets: [
  { word: "雨", reading: "あめ", en: "rain", kanji: "雨" },
  { word: "天気", reading: "てんき", en: "weather", kanji: "天" },
  { word: "休み", reading: "やすみ", en: "rest, day off", kanji: "休" },
  { word: "日", reading: "ひ", en: "day, sun", kanji: "日" },
  { word: "気", reading: "き", en: "spirit, air", kanji: "気" },
  ],
  panels: [
  {
    id: "P1",
    beat: "Rain",
    art: "/stories/a-rainy-day-off/p1.webp",
    lines: [
      { speaker: "narration", ja: "きょうは 雨です。", en: "Today it is raining.", bubble: { x: 6, y: 4, w: 54, tail: null } },
    ],
  },
  {
    id: "P2",
    beat: "Disappointed",
    art: "/stories/a-rainy-day-off/p2.webp",
    lines: [
      { speaker: "tan", ja: "天気が よくないです。", en: "The weather isn't good.", bubble: { x: 38, y: 5, w: 56, tail: "bl" } },
    ],
  },
  {
    id: "P3",
    beat: "Chun arrives, soaked",
    art: "/stories/a-rainy-day-off/p3.webp",
    lines: [
      { speaker: "chun", ja: "きょうは 休みの 日です。", en: "Today is a day off.", bubble: { x: 18, y: 4, w: 60, tail: "bl" } },
    ],
  },
  {
    id: "P4",
    beat: "Settling in together",
    art: "/stories/a-rainy-day-off/p4.webp",
    lines: [
      { speaker: "narration", ja: "タンと チュンは うちで 休みます。", en: "Tan and Chun rest at home.", bubble: { x: 6, y: 4, w: 62, tail: null } },
    ],
  },
  {
    id: "P5",
    beat: "Tea",
    art: "/stories/a-rainy-day-off/p5.webp",
    lines: [
      { speaker: "chun", ja: "おちゃを のみませんか。", en: "Shall we drink some tea?", bubble: { x: 6, y: 3, w: 56, tail: "bl", tailX: 23 } },
      { speaker: "tan", ja: "のみましょう。", en: "Let's drink.", bubble: { x: 46, y: 25, w: 50, tail: "br", tailX: 44 } },
    ],
  },
  {
    id: "P6",
    beat: "Payoff — the rain stops",
    art: "/stories/a-rainy-day-off/p6.webp",
    lines: [
      { speaker: "tan", ja: "あしたは いい 天気です。", en: "Tomorrow the weather will be good.", bubble: { x: 14, y: 6, w: 58, tail: "br", tailX: 74 } },
    ],
  },
  ],
  quiz: [
  { prompt: "雨", ask: "よみかたは？", askEn: "How do you read it?", options: ["ゆき", "あめ", "かぜ"], answer: 1 },
  { prompt: "天気", ask: "いみは？", askEn: "What does it mean?", options: ["weather", "holiday", "rain"], answer: 0 },
  { prompt: "きょうの 天気は どうですか。", ask: "", askEn: "How is the weather today?", options: ["いい 天気", "ゆき", "雨"], answer: 2 },
  ],
};
