/**
 * GENERATED FILE — do not edit.
 *
 * Source: strips/ep-01/script.json
 * Regenerate: python3 scripts/stories/import-episode.py <path-to-ep-dir>
 *
 * Editing this by hand puts the site out of step with the strip that gets
 * posted to Pinterest and Instagram, and nothing would report the mismatch.
 */
import type { Episode } from '../../lib/stories/types';

export const EPISODE: Episode = {
  number: 1,
  slug: 'tan-climbs-the-mountain',
  titleEn: 'Tan climbs the mountain',
  titleJa: 'タンは 山に のぼります',
  level: 'N5',
  publishedAt: '2026-09-14',
  ogImage: '/stories/tan-climbs-the-mountain/og.jpg',
  focusKanji: ['山', '木', '上', '見', '大'],
  targets: [
  { word: '山', reading: 'やま', en: 'mountain', kanji: '山' },
  { word: '木', reading: 'き', en: 'tree', kanji: '木' },
  { word: '上', reading: 'うえ', en: 'top, above', kanji: '上' },
  { word: '見る', reading: 'みる', en: 'to look', kanji: '見' },
  { word: '大きい', reading: 'おおきい', en: 'big', kanji: '大' },
  ],
  panels: [
  {
    id: 'P1',
    beat: 'Arrival — the mountain is bigger than he expected',
    art: '/stories/tan-climbs-the-mountain/p1.webp',
    lines: [
      { speaker: 'tan', ja: '大きい 山です。', en: 'It\'s a big mountain.', bubble: { x: 4, y: 4, w: 54, tail: 'bl' } },
    ],
  },
  {
    id: 'P2',
    beat: 'Into the trees',
    art: '/stories/tan-climbs-the-mountain/p2.webp',
    lines: [
      { speaker: 'tan', ja: '木が たくさん あります。', en: 'There are lots of trees.', bubble: { x: 5, y: 4, w: 58, tail: 'br' } },
    ],
  },
  {
    id: 'P3',
    beat: 'He notices something above',
    art: '/stories/tan-climbs-the-mountain/p3.webp',
    lines: [
      { speaker: 'narration', ja: '木の 上を 見ました。', en: 'He looked at the top of the tree.', bubble: { x: 40, y: 5, w: 56, tail: null } },
    ],
  },
  {
    id: 'P4',
    beat: 'The bird',
    art: '/stories/tan-climbs-the-mountain/p4.webp',
    lines: [
      { speaker: 'chun', ja: 'こんにちは。', en: 'Hello.', bubble: { x: 42, y: 6, w: 54, tail: 'bl' } },
    ],
  },
  {
    id: 'P5',
    beat: 'The invitation and the yes',
    art: '/stories/tan-climbs-the-mountain/p5.webp',
    lines: [
      { speaker: 'chun', ja: '山の 上に 行きませんか。', en: 'Shall we go to the top of the mountain?', bubble: { x: 28, y: 3, w: 62, tail: 'bl' } },
      { speaker: 'tan', ja: '行きましょう。', en: 'Let\'s go.', bubble: { x: 6, y: 58, w: 46, tail: 'br' } },
    ],
  },
  {
    id: 'P6',
    beat: 'The summit — payoff, bookending 大きい',
    art: '/stories/tan-climbs-the-mountain/p6.webp',
    lines: [
      { speaker: 'tan', ja: 'そらが 大きいです。', en: 'The sky is big.', bubble: { x: 22, y: 8, w: 56, tail: 'bl' } },
    ],
  },
  ],
  quiz: [
  { prompt: '山', ask: 'よみかたは？', askEn: 'How do you read it?', options: ['やま', 'かわ', 'き'], answer: 0 },
  { prompt: '大きい', ask: 'いみは？', askEn: 'What does it mean?', options: ['big', 'small', 'white'], answer: 0 },
  { prompt: 'タンと チュンは どこに 行きましたか。', ask: '', askEn: 'Where did Tan and Chun go?', options: ['山の 上', 'かわ', 'がっこう'], answer: 0 },
  ],
};
