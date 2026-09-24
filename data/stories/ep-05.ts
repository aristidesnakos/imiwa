/**
 * GENERATED FILE — do not edit.
 *
 * Source: strips/ep-05/script.json
 * Regenerate: python3 scripts/stories/import-episode.py <path-to-ep-dir>
 *
 * Editing this by hand puts the site out of step with the strip that gets
 * posted to Pinterest and Instagram, and nothing would report the mismatch.
 */
import type { Episode } from '../../lib/stories/types';

export const EPISODE: Episode = {
  number: 5,
  slug: "the-train-east",
  titleEn: "The train east",
  titleJa: "東へ 行く 電車",
  level: "N5",
  publishedAt: "2026-09-24",
  ogImage: "/stories/the-train-east/og.jpg",
  focusKanji: ["電", "車", "東", "行", "来"],
  targets: [
  { word: "電車", reading: "でんしゃ", en: "train", kanji: "電" },
  { word: "車", reading: "くるま", en: "car", kanji: "車" },
  { word: "東", reading: "ひがし", en: "east", kanji: "東" },
  { word: "行く", reading: "いく", en: "to go", kanji: "行" },
  { word: "来る", reading: "くる", en: "to come", kanji: "来" },
  ],
  panels: [
  {
    id: "P1",
    beat: "Something is coming",
    art: "/stories/the-train-east/p1.webp",
    lines: [
      { speaker: "narration", ja: "なにかが 来ました。", en: "Something came.", bubble: { x: 4, y: 4, w: 52, tail: null } },
      { speaker: "tan", ja: "あれは 車ですか。", en: "Is that a car?", bubble: { x: 4, y: 40, w: 46, tail: "bl", tailX: 24 } },
    ],
  },
  {
    id: "P2",
    beat: "It's a train",
    art: "/stories/the-train-east/p2.webp",
    lines: [
      { speaker: "chun", ja: "いいえ、 電車です。", en: "No, it's a train.", bubble: { x: 2, y: 3, w: 46, tail: "bl", tailX: 39 } },
      { speaker: "tan", ja: "電車に のりましょう。", en: "Let's get on the train.", bubble: { x: 50, y: 3, w: 48, tail: "bl", tailX: 17 } },
    ],
  },
  {
    id: "P3",
    beat: "Heading east, fast",
    art: "/stories/the-train-east/p3.webp",
    lines: [
      { speaker: "chun", ja: "電車は 東に 行きます。", en: "The train goes east.", bubble: { x: 2, y: 3, w: 78, tail: "bl", tailX: 36 } },
      { speaker: "tan", ja: "はやいですね。", en: "It's fast!", bubble: { x: 42, y: 17, w: 48, tail: "bl", tailX: 33 } },
    ],
  },
  {
    id: "P4",
    beat: "A big mountain",
    art: "/stories/the-train-east/p4.webp",
    lines: [
      { speaker: "tan", ja: "あ、 大きい 山です。", en: "Oh, a big mountain.", bubble: { x: 40, y: 8, w: 52, tail: "br", tailX: 65 } },
    ],
  },
  {
    id: "P5",
    beat: "Getting off",
    art: "/stories/the-train-east/p5.webp",
    lines: [
      { speaker: "chun", ja: "つぎの えきで おりませんか。", en: "Shall we get off at the next station?", bubble: { x: 2, y: 3, w: 92, tail: "bl", tailX: 28 } },
      { speaker: "tan", ja: "おりましょう。", en: "Let's get off.", bubble: { x: 48, y: 17, w: 50, tail: "bl", tailX: 36 } },
    ],
  },
  {
    id: "P6",
    beat: "Payoff — a town in the east",
    art: "/stories/the-train-east/p6.webp",
    lines: [
      { speaker: "tan", ja: "いい まちに 来ました。", en: "We came to a nice town.", bubble: { x: 28, y: 4, w: 70, tail: "bl", tailX: 40 } },
      { speaker: "chun", ja: "東の まちですね。", en: "It's a town in the east.", bubble: { x: 2, y: 19, w: 46, tail: "br", tailX: 85 } },
    ],
  },
  ],
  quiz: [
  { prompt: "電車", ask: "よみかたは？", askEn: "How do you read it?", options: ["じてんしゃ", "くるま", "でんしゃ"], answer: 2 },
  { prompt: "東", ask: "いみは？", askEn: "What does it mean?", options: ["west", "east", "north"], answer: 1 },
  { prompt: "電車は どこに 行きましたか。", ask: "", askEn: "Where did the train go?", options: ["東", "にし", "学校"], answer: 0 },
  ],
};
