/**
 * GENERATED FILE — do not edit.
 *
 * Source: strips/ep-06/script.json
 * Regenerate: python3 scripts/stories/import-episode.py <path-to-ep-dir>
 *
 * Editing this by hand puts the site out of step with the strip that gets
 * posted to Pinterest and Instagram, and nothing would report the mismatch.
 */
import type { Episode } from '../../lib/stories/types';

export const EPISODE: Episode = {
  number: 6,
  slug: "tans-family-and-friends",
  titleEn: "Tan's family and friends",
  titleJa: "タンの かぞくと ともだち",
  level: "N5",
  publishedAt: "2026-09-24",
  ogImage: "/stories/tans-family-and-friends/og.jpg",
  focusKanji: ["父", "母", "友", "男", "女"],
  targets: [
  { word: "父", reading: "ちち", en: "father", kanji: "父" },
  { word: "母", reading: "はは", en: "mother", kanji: "母" },
  { word: "友だち", reading: "ともだち", en: "friend", kanji: "友" },
  { word: "男の子", reading: "おとこのこ", en: "boy", kanji: "男" },
  { word: "女の子", reading: "おんなのこ", en: "girl", kanji: "女" },
  ],
  panels: [
  {
    id: "P1",
    beat: "Coming home",
    art: "/stories/tans-family-and-friends/p1.webp",
    lines: [
      { speaker: "narration", ja: "タンは うちに かえりました。", en: "Tan came back home.", bubble: { x: 2, y: 4, w: 94, tail: null } },
      { speaker: "chun", ja: "あれは タンの うちですか。", en: "Is that your house, Tan?", bubble: { x: 2, y: 17, w: 54, tail: "bl", tailX: 37 } },
    ],
  },
  {
    id: "P2",
    beat: "Mother and father",
    art: "/stories/tans-family-and-friends/p2.webp",
    lines: [
      { speaker: "haha", ja: "タン、 おかえりなさい。", en: "Welcome home, Tan.", bubble: { x: 44, y: 4, w: 54, tail: "bl", tailX: 48 } },
      { speaker: "narration", ja: "タンの 父と 母です。", en: "These are Tan's father and mother.", bubble: { x: 2, y: 4, w: 40, tail: null } },
    ],
  },
  {
    id: "P3",
    beat: "Rice from mother",
    art: "/stories/tans-family-and-friends/p3.webp",
    lines: [
      { speaker: "haha", ja: "ごはんを たべませんか。", en: "Won't you eat some rice?", bubble: { x: 2, y: 4, w: 52, tail: "bl", tailX: 44 } },
      { speaker: "tan", ja: "はい、 いただきます。", en: "Yes, thank you!", bubble: { x: 50, y: 19, w: 48, tail: "bl", tailX: 54 } },
    ],
  },
  {
    id: "P4",
    beat: "The children run in",
    art: "/stories/tans-family-and-friends/p4.webp",
    lines: [
      { speaker: "narration", ja: "男の子と 女の子も 来ました。", en: "A boy and a girl came too.", bubble: { x: 4, y: 4, w: 66, tail: null } },
    ],
  },
  {
    id: "P5",
    beat: "A friend",
    art: "/stories/tans-family-and-friends/p5.webp",
    lines: [
      { speaker: "tomo", ja: "ぼくは タンの 友だちです。", en: "I'm Tan's friend.", bubble: { x: 2, y: 4, w: 90, tail: "bl", tailX: 26 } },
      { speaker: "tan", ja: "あそびましょう。", en: "Let's play!", bubble: { x: 42, y: 19, w: 56, tail: "bl", tailX: 50 } },
    ],
  },
  {
    id: "P6",
    beat: "Payoff — everyone together",
    art: "/stories/tans-family-and-friends/p6.webp",
    lines: [
      { speaker: "tan", ja: "かぞくと 友だちが 大すきです。", en: "I love my family and my friends.", bubble: { x: 2, y: 4, w: 94, tail: "bl", tailX: 60 } },
      { speaker: "chun", ja: "チュンも 友だちですよ。", en: "Chun is your friend too!", bubble: { x: 50, y: 31, w: 48, tail: "bl", tailX: 23 } },
    ],
  },
  ],
  quiz: [
  { prompt: "父", ask: "よみかたは？", askEn: "How do you read it?", options: ["はは", "ちち", "あに"], answer: 1 },
  { prompt: "友だち", ask: "いみは？", askEn: "What does it mean?", options: ["friend", "family", "teacher"], answer: 0 },
  { prompt: "だれが タンの うちに 来ましたか。", ask: "", askEn: "Who came to Tan's house?", options: ["先生", "ねこ", "男の子"], answer: 2 },
  ],
};
