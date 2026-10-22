/**
 * GENERATED FILE — do not edit.
 *
 * Source: strips/ep-10/script.json
 * Regenerate: python3 scripts/stories/import-episode.py <path-to-ep-dir>
 *
 * Editing this by hand puts the site out of step with the strip that gets
 * posted to Pinterest and Instagram, and nothing would report the mismatch.
 */
import type { Episode } from '../../lib/stories/types';

export const EPISODE: Episode = {
  number: 10,
  slug: "a-hot-summer-day",
  titleEn: "A hot summer day",
  titleJa: "あつい なつの 日",
  level: "N5",
  publishedAt: "2026-10-22",
  ogImage: "/stories/a-hot-summer-day/og.jpg",
  focusKanji: ["年", "月", "火", "土", "暑"],
  targets: [
  { word: "今年", reading: "ことし", en: "this year", kanji: "年" },
  { word: "来月", reading: "らいげつ", en: "next month", kanji: "月" },
  { word: "火よう日", reading: "かようび", en: "Tuesday", kanji: "火" },
  { word: "土よう日", reading: "どようび", en: "Saturday", kanji: "土" },
  { word: "暑い", reading: "あつい", en: "hot (weather)", kanji: "暑" },
  ],
  panels: [
  {
    id: "P1",
    beat: "A hot year",
    art: "/stories/a-hot-summer-day/p1.webp",
    lines: [
      { speaker: "narration", ja: "今年は 暑いです。", en: "It's hot this year.", bubble: { x: 2, y: 3, w: 64, tail: null } },
      { speaker: "tan", ja: "ああ、 暑い！", en: "Ah, it's hot!", bubble: { x: 2, y: 16, w: 50, tail: "bl", tailX: 50 } },
    ],
  },
  {
    id: "P2",
    beat: "Tuesday",
    art: "/stories/a-hot-summer-day/p2.webp",
    lines: [
      { speaker: "narration", ja: "火よう日です。", en: "It's Tuesday.", bubble: { x: 2, y: 3, w: 46, tail: null } },
      { speaker: "tan", ja: "きょうも 暑いですね。", en: "It's hot today too.", bubble: { x: 2, y: 14, w: 44, tail: "br", tailX: 85 } },
    ],
  },
  {
    id: "P3",
    beat: "Saturday",
    art: "/stories/a-hot-summer-day/p3.webp",
    lines: [
      { speaker: "narration", ja: "土よう日です。", en: "It's Saturday.", bubble: { x: 2, y: 3, w: 46, tail: null } },
      { speaker: "chun", ja: "きょうも 暑いですよ。", en: "It's hot today too.", bubble: { x: 56, y: 4, w: 42, tail: "bl", tailX: 20 } },
    ],
  },
  {
    id: "P4",
    beat: "Next month?",
    art: "/stories/a-hot-summer-day/p4.webp",
    lines: [
      { speaker: "tan", ja: "来月は 暑くないですよね。", en: "Next month won't be hot, right?", bubble: { x: 2, y: 14, w: 58, tail: "bl", tailX: 90 } },
      { speaker: "chun", ja: "いいえ、 来月も 暑いです。", en: "No, next month is hot too.", bubble: { x: 62, y: 12, w: 36, tail: "bl", tailX: 50 } },
    ],
  },
  {
    id: "P5",
    beat: "Next year?",
    art: "/stories/a-hot-summer-day/p5.webp",
    lines: [
      { speaker: "tan", ja: "じゃあ、 来年は？", en: "Then, next year?", bubble: { x: 10, y: 4, w: 70, tail: "bl", tailX: 50 } },
    ],
  },
  {
    id: "P6",
    beat: "Payoff",
    art: "/stories/a-hot-summer-day/p6.webp",
    lines: [
      { speaker: "chun", ja: "来年も 暑いですよ。", en: "Next year is hot too.", bubble: { x: 8, y: 3, w: 80, tail: "bl", tailX: 50 } },
      { speaker: "tan", ja: "えーっ！", en: "Whaaat?!", bubble: { x: 2, y: 15, w: 36, tail: "br", tailX: 85 } },
    ],
  },
  ],
  quiz: [
  { prompt: "暑い", ask: "よみかたは？", askEn: "How do you read it?", options: ["さむい", "あつい", "ひろい"], answer: 1 },
  { prompt: "土よう日", ask: "いみは？", askEn: "What does it mean?", options: ["Saturday", "Tuesday", "Sunday"], answer: 0 },
  { prompt: "来月は？", ask: "", askEn: "What does Chun say about next month?", options: ["It's cool", "It's rainy", "It's hot too"], answer: 2 },
  ],
};
