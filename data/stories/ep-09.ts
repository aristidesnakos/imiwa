/**
 * GENERATED FILE — do not edit.
 *
 * Source: strips/ep-09/script.json
 * Regenerate: python3 scripts/stories/import-episode.py <path-to-ep-dir>
 *
 * Editing this by hand puts the site out of step with the strip that gets
 * posted to Pinterest and Instagram, and nothing would report the mismatch.
 */
import type { Episode } from '../../lib/stories/types';

export const EPISODE: Episode = {
  number: 9,
  slug: "what-time-is-it",
  titleEn: "What time is it?",
  titleJa: "いま なんじですか",
  level: "N5",
  publishedAt: "2026-10-14",
  ogImage: "/stories/what-time-is-it/og.jpg",
  focusKanji: ["時", "分", "半", "午", "今", "毎"],
  targets: [
  { word: "何時", reading: "なんじ", en: "what time", kanji: "時" },
  { word: "半", reading: "はん", en: "half past", kanji: "半" },
  { word: "午前", reading: "ごぜん", en: "morning; a.m.", kanji: "午" },
  { word: "今", reading: "いま", en: "now", kanji: "今" },
  { word: "毎日", reading: "まいにち", en: "every day", kanji: "毎" },
  ],
  panels: [
  {
    id: "P1",
    beat: "Morning in the town",
    art: "/stories/what-time-is-it/p1.webp",
    lines: [
      { speaker: "narration", ja: "午前です。", en: "It's morning.", bubble: { x: 2, y: 2, w: 32, tail: null } },
      { speaker: "tan", ja: "今 何時ですか。", en: "What time is it now?", bubble: { x: 2, y: 15, w: 60, tail: "bl", tailX: 80 } },
    ],
  },
  {
    id: "P2",
    beat: "The fox with a watch",
    art: "/stories/what-time-is-it/p2.webp",
    lines: [
      { speaker: "kon", ja: "10時ですよ。", en: "It's ten o'clock.", bubble: { x: 53, y: 3, w: 43, tail: "bl", tailX: 50 } },
      { speaker: "tan", ja: "あれ、 かさの…", en: "Huh, the umbrella...", bubble: { x: 2, y: 17, w: 49, tail: "bl", tailX: 50 } },
    ],
  },
  {
    id: "P3",
    beat: "The denial",
    art: "/stories/what-time-is-it/p3.webp",
    lines: [
      { speaker: "kon", ja: "いいえ、 はじめまして。", en: "No. Nice to meet you.", bubble: { x: 16, y: 4, w: 70, tail: "bl", tailX: 50 } },
    ],
  },
  {
    id: "P4",
    beat: "Half an hour later",
    art: "/stories/what-time-is-it/p4.webp",
    lines: [
      { speaker: "narration", ja: "30分 あとです。", en: "Thirty minutes later.", bubble: { x: 2, y: 2, w: 47, tail: null } },
      { speaker: "tan", ja: "今は 10時半ですか。", en: "Is it half past ten now?", bubble: { x: 2, y: 15, w: 64, tail: "bl", tailX: 50 } },
    ],
  },
  {
    id: "P5",
    beat: "Still ten",
    art: "/stories/what-time-is-it/p5.webp",
    lines: [
      { speaker: "kon", ja: "いいえ、 10時です。", en: "No, it's ten o'clock.", bubble: { x: 22, y: 4, w: 60, tail: "bl", tailX: 50 } },
    ],
  },
  {
    id: "P6",
    beat: "Payoff (Kon walks off)",
    art: "/stories/what-time-is-it/p6.webp",
    lines: [
      { speaker: "chun", ja: "あの とけいは チクタク しません。 毎日 10時です。", en: "That watch doesn't tick. It's ten o'clock every day.", bubble: { x: 2, y: 2, w: 94, tail: "bl", tailX: 46 } },
      { speaker: "tan", ja: "じゃあ、 今 何時ですか！", en: "Then what time is it now?!", bubble: { x: 55, y: 22, w: 42, tail: "bl", tailX: 22 } },
    ],
  },
  ],
  quiz: [
  { prompt: "午前", ask: "よみかたは？", askEn: "How do you read it?", options: ["ごご", "ごぜん", "ごはん"], answer: 1 },
  { prompt: "半", ask: "いみは？", askEn: "What does it mean?", options: ["half", "minute", "hour"], answer: 0 },
  { prompt: "きつねの とけいは 毎日 何時ですか。", ask: "", askEn: "What time does the fox's watch say every day?", options: ["10時半", "9時", "10時"], answer: 2 },
  ],
};
