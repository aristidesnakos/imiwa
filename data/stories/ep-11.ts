/**
 * GENERATED FILE — do not edit.
 *
 * Source: strips/ep-11/script.json
 * Regenerate: python3 scripts/stories/import-episode.py <path-to-ep-dir>
 *
 * Editing this by hand puts the site out of step with the strip that gets
 * posted to Pinterest and Instagram, and nothing would report the mismatch.
 */
import type { Episode } from '../../lib/stories/types';

export const EPISODE: Episode = {
  number: 11,
  slug: "which-way",
  titleEn: "Which way?",
  titleJa: "どっちですか",
  level: "N5",
  publishedAt: "2026-10-31",
  ogImage: "/stories/which-way/og.jpg",
  focusKanji: ["西", "南", "北", "右", "左", "外", "中"],
  targets: [
  { word: "右", reading: "みぎ", en: "right", kanji: "右" },
  { word: "左", reading: "ひだり", en: "left", kanji: "左" },
  { word: "北", reading: "きた", en: "north", kanji: "北" },
  { word: "外", reading: "そと", en: "outside", kanji: "外" },
  { word: "中", reading: "なか", en: "inside", kanji: "中" },
  ],
  panels: [
  {
    id: "P1",
    beat: "Where is the shop?",
    art: "/stories/which-way/p1.webp",
    lines: [
      { speaker: "tan", ja: "みせは どこですか。", en: "Where is the shop?", bubble: { x: 1, y: 3, w: 44, tail: "bl", tailX: 80 } },
      { speaker: "chun", ja: "ちずを 見ましょう。", en: "Let's look at the map.", bubble: { x: 57, y: 8, w: 41, tail: "bl", tailX: 12 } },
    ],
  },
  {
    id: "P2",
    beat: "North is up",
    art: "/stories/which-way/p2.webp",
    lines: [
      { speaker: "chun", ja: "上は 北です。", en: "Up is north.", bubble: { x: 1, y: 8, w: 30, tail: "bl", tailX: 85 } },
      { speaker: "tan", ja: "木は 北、 いけは 南ですね。", en: "The tree is north, the pond is south.", bubble: { x: 60, y: 8, w: 39, tail: "bl", tailX: 30 } },
    ],
  },
  {
    id: "P3",
    beat: "West, and left of the tree",
    art: "/stories/which-way/p3.webp",
    lines: [
      { speaker: "chun", ja: "西に いえが あります。", en: "There is a house in the west.", bubble: { x: 1, y: 8, w: 36, tail: "bl", tailX: 85 } },
      { speaker: "tan", ja: "いえは 木の 左ですね。", en: "The house is to the left of the tree.", bubble: { x: 60, y: 8, w: 39, tail: "bl", tailX: 30 } },
    ],
  },
  {
    id: "P4",
    beat: "The shop is right of the tree",
    art: "/stories/which-way/p4.webp",
    lines: [
      { speaker: "narration", ja: "みせは 木の 右です。", en: "The shop is to the right of the tree.", bubble: { x: 2, y: 2, w: 44, tail: null } },
      { speaker: "tan", ja: "じゃあ、 右へ 行きましょう！", en: "Then let's go right!", bubble: { x: 50, y: 2, w: 48, tail: "bl", tailX: 8 } },
    ],
  },
  {
    id: "P5",
    beat: "Outside the shop",
    art: "/stories/which-way/p5.webp",
    lines: [
      { speaker: "chun", ja: "ここは みせの 外ですよ。", en: "This is outside the shop.", bubble: { x: 2, y: 3, w: 58, tail: "bl", tailX: 30 } },
      { speaker: "tan", ja: "中へ 行きましょう！", en: "Let's go inside!", bubble: { x: 30, y: 27, w: 50, tail: "bl", tailX: 25 } },
    ],
  },
  {
    id: "P6",
    beat: "Inside is big",
    art: "/stories/which-way/p6.webp",
    lines: [
      { speaker: "tan", ja: "中は 大きいですね！", en: "It is big inside!", bubble: { x: 1, y: 3, w: 49, tail: "bl", tailX: 60 } },
      { speaker: "chun", ja: "外は 小さいですよ。", en: "The outside is small.", bubble: { x: 51, y: 6, w: 48, tail: "bl", tailX: 12 } },
    ],
  },
  ],
  quiz: [
  { prompt: "北", ask: "よみかたは？", askEn: "How do you read it?", options: ["みなみ", "にし", "きた"], answer: 2 },
  { prompt: "右", ask: "いみは？", askEn: "What does it mean?", options: ["left", "right", "north"], answer: 1 },
  { prompt: "みせは どこ？", ask: "", askEn: "Where was the shop?", options: ["Right of tree", "Left of tree", "Under the pond"], answer: 0 },
  ],
};
