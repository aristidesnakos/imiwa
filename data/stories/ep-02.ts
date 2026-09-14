/**
 * GENERATED FILE — do not edit.
 *
 * Source: strips/ep-02/script.json
 * Regenerate: python3 scripts/stories/import-episode.py <path-to-ep-dir>
 *
 * Editing this by hand puts the site out of step with the strip that gets
 * posted to Pinterest and Instagram, and nothing would report the mismatch.
 */
import type { Episode } from '../../lib/stories/types';

export const EPISODE: Episode = {
  number: 2,
  slug: 'tan-finds-the-river',
  titleEn: 'Tan finds the river',
  titleJa: 'タンは 川を 見つけます',
  level: 'N5',
  publishedAt: '2026-09-21',
  ogImage: '/stories/tan-finds-the-river/og.jpg',
  focusKanji: ['川', '水', '下', '小', '白'],
  targets: [
  { word: '川', reading: 'かわ', en: 'river', kanji: '川' },
  { word: '水', reading: 'みず', en: 'water', kanji: '水' },
  { word: '下', reading: 'した', en: 'below, under', kanji: '下' },
  { word: '小さい', reading: 'ちいさい', en: 'small', kanji: '小' },
  { word: '白い', reading: 'しろい', en: 'white', kanji: '白' },
  ],
  panels: [
  {
    id: 'P1',
    beat: 'Down from the mountain — the river appears below',
    art: '/stories/tan-finds-the-river/p1.webp',
    lines: [
      { speaker: 'narration', ja: '山の 下に 川が あります。', en: 'Below the mountain there is a river.', bubble: { x: 6, y: 4, w: 58, tail: null } },
    ],
  },
  {
    id: 'P2',
    beat: 'At the water\'s edge',
    art: '/stories/tan-finds-the-river/p2.webp',
    lines: [
      { speaker: 'tan', ja: '水が とても きれいです。', en: 'The water is very clean.', bubble: { x: 8, y: 4, w: 58, tail: 'br' } },
    ],
  },
  {
    id: 'P3',
    beat: 'Chun spots a fish',
    art: '/stories/tan-finds-the-river/p3.webp',
    lines: [
      { speaker: 'chun', ja: '小さい さかなが います。', en: 'There is a small fish.', bubble: { x: 26, y: 5, w: 56, tail: 'bl' } },
    ],
  },
  {
    id: 'P4',
    beat: 'White stones',
    art: '/stories/tan-finds-the-river/p4.webp',
    lines: [
      { speaker: 'tan', ja: '白い いしも あります。', en: 'There are white stones too.', bubble: { x: 10, y: 5, w: 56, tail: 'br' } },
    ],
  },
  {
    id: 'P5',
    beat: 'The invitation and the yes',
    art: '/stories/tan-finds-the-river/p5.webp',
    lines: [
      { speaker: 'chun', ja: '水に はいりませんか。', en: 'Shall we get in the water?', bubble: { x: 10, y: 3, w: 58, tail: 'bl' } },
      { speaker: 'tan', ja: 'はいりましょう。', en: 'Let\'s get in.', bubble: { x: 30, y: 24, w: 54, tail: 'br' } },
    ],
  },
  {
    id: 'P6',
    beat: 'Payoff — the water is cold',
    art: '/stories/tan-finds-the-river/p6.webp',
    lines: [
      { speaker: 'tan', ja: '水が つめたいです。', en: 'The water is cold.', bubble: { x: 14, y: 6, w: 56, tail: 'br' } },
    ],
  },
  ],
  quiz: [
  { prompt: '川', ask: 'よみかたは？', askEn: 'How do you read it?', options: ['かわ', 'やま', 'みず'], answer: 0 },
  { prompt: '小さい', ask: 'いみは？', askEn: 'What does it mean?', options: ['small', 'big', 'white'], answer: 0 },
  { prompt: '川に 何が いましたか。', ask: '', askEn: 'What was in the river?', options: ['さかな', 'いぬ', 'ねこ'], answer: 0 },
  ],
};
