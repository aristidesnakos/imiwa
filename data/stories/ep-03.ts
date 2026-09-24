/**
 * GENERATED FILE — do not edit.
 *
 * Source: strips/ep-03/script.json
 * Regenerate: python3 scripts/stories/import-episode.py <path-to-ep-dir>
 *
 * Editing this by hand puts the site out of step with the strip that gets
 * posted to Pinterest and Instagram, and nothing would report the mismatch.
 */
import type { Episode } from '../../lib/stories/types';

export const EPISODE: Episode = {
  number: 3,
  slug: "tan-goes-to-school",
  titleEn: "Tan goes to school",
  titleJa: "タンは 学校に 行きます",
  level: "N5",
  publishedAt: "2026-09-16",
  ogImage: "/stories/tan-goes-to-school/og.jpg",
  focusKanji: ["学", "校", "先", "生", "語"],
  targets: [
  { word: "学校", reading: "がっこう", en: "school", kanji: "学" },
  { word: "先生", reading: "せんせい", en: "teacher", kanji: "先" },
  { word: "学生", reading: "がくせい", en: "student", kanji: "生" },
  { word: "日本語", reading: "にほんご", en: "Japanese language", kanji: "語" },
  { word: "校", reading: "こう", en: "school building", kanji: "校" },
  ],
  panels: [
  {
    id: "P1",
    beat: "Arriving at the school",
    art: "/stories/tan-goes-to-school/p1.webp",
    lines: [
      { speaker: "narration", ja: "タンは 学校に 行きました。", en: "Tan went to the school.", bubble: { x: 4, y: 3, w: 78, tail: null } },
      { speaker: "tan", ja: "大きい 学校です。", en: "It is a big school.", bubble: { x: 24, y: 20, w: 52, tail: "bl" } },
    ],
  },
  {
    id: "P2",
    beat: "The owl teacher at the door",
    art: "/stories/tan-goes-to-school/p2.webp",
    lines: [
      { speaker: "sensei", ja: "わたしは 先生です。", en: "I am the teacher.", bubble: { x: 22, y: 5, w: 56, tail: "bl" } },
      { speaker: "tan", ja: "はじめまして。 タンです。", en: "Nice to meet you. I am Tan.", bubble: { x: 48, y: 18, w: 48, tail: "br" } },
    ],
  },
  {
    id: "P3",
    beat: "Inside the classroom",
    art: "/stories/tan-goes-to-school/p3.webp",
    lines: [
      { speaker: "sensei", ja: "ここで 日本語を べんきょうします。", en: "We study Japanese here.", bubble: { x: 13, y: 3, w: 66, tail: "bl" } },
      { speaker: "tan", ja: "はい、先生。", en: "Yes, teacher.", bubble: { x: 58, y: 25, w: 40, tail: "br" } },
    ],
  },
  {
    id: "P4",
    beat: "Chun worries",
    art: "/stories/tan-goes-to-school/p4.webp",
    lines: [
      { speaker: "chun", ja: "日本語は むずかしいですか。", en: "Is Japanese difficult?", bubble: { x: 18, y: 4, w: 60, tail: "bl" } },
    ],
  },
  {
    id: "P5",
    beat: "Reassurance and resolve",
    art: "/stories/tan-goes-to-school/p5.webp",
    lines: [
      { speaker: "sensei", ja: "むずかしくないです。", en: "It isn't difficult.", bubble: { x: 8, y: 3, w: 68, tail: "bl" } },
      { speaker: "tan", ja: "べんきょうしたいです。", en: "I want to study.", bubble: { x: 26, y: 18, w: 72, tail: "br" } },
    ],
  },
  {
    id: "P6",
    beat: "Payoff — Tan is a student now",
    art: "/stories/tan-goes-to-school/p6.webp",
    lines: [
      { speaker: "tan", ja: "ぼくは 学生です。", en: "I am a student.", bubble: { x: 40, y: 5, w: 56, tail: "bl" } },
      { speaker: "chun", ja: "わたしも 学生です。", en: "I am a student too.", bubble: { x: 1, y: 5, w: 36.5, tail: "bl" } },
    ],
  },
  ],
  quiz: [
  { prompt: "先生", ask: "よみかたは？", askEn: "How do you read it?", options: ["がくせい", "せんせい", "がっこう"], answer: 1 },
  { prompt: "学校", ask: "いみは？", askEn: "What does it mean?", options: ["school", "teacher", "student"], answer: 0 },
  { prompt: "タンは だれに あいましたか。", ask: "", askEn: "Who did Tan meet?", options: ["おかあさん", "ねこ", "先生"], answer: 2 },
  ],
};
