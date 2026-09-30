/**
 * GENERATED FILE — do not edit.
 *
 * Source: strips/ep-07/script.json
 * Regenerate: python3 scripts/stories/import-episode.py <path-to-ep-dir>
 *
 * Editing this by hand puts the site out of step with the strip that gets
 * posted to Pinterest and Instagram, and nothing would report the mismatch.
 */
import type { Episode } from '../../lib/stories/types';

export const EPISODE: Episode = {
  number: 7,
  slug: "counting-at-the-market",
  titleEn: "Counting at the market",
  titleJa: "いちばで かぞえます",
  level: "N5",
  publishedAt: "2026-09-30",
  ogImage: "/stories/counting-at-the-market/og.jpg",
  focusKanji: ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"],
  targets: [
  { word: "一つ", reading: "ひとつ", en: "one (thing)", kanji: "一" },
  { word: "五つ", reading: "いつつ", en: "five (things)", kanji: "五" },
  { word: "十", reading: "じゅう・とお", en: "ten", kanji: "十" },
  ],
  panels: [
  {
    id: "P1",
    beat: "The errand",
    art: "/stories/counting-at-the-market/p1.webp",
    lines: [
      { speaker: "haha", ja: "りんごを 十 かって ください。", en: "Please buy ten apples.", bubble: { x: 2, y: 4, w: 80, tail: "bl", tailX: 29 } },
      { speaker: "tan", ja: "はい！", en: "Okay!", bubble: { x: 62, y: 22, w: 26, tail: "bl", tailX: 45 } },
    ],
  },
  {
    id: "P2",
    beat: "Arrival at the market",
    art: "/stories/counting-at-the-market/p2.webp",
    lines: [
      { speaker: "narration", ja: "いちばに 来ました。", en: "They came to the market.", bubble: { x: 1, y: 3, w: 70, tail: null } },
      { speaker: "chun", ja: "りんごが たくさん ありますね。", en: "There are lots of apples!", bubble: { x: 1, y: 15, w: 94, tail: "bl", tailX: 20 } },
    ],
  },
  {
    id: "P3",
    beat: "Counting up",
    art: "/stories/counting-at-the-market/p3.webp",
    lines: [
      { speaker: "tan", ja: "一、 二、 三、 四、 五、", en: "One, two, three, four, five,", bubble: { x: 2, y: 2, w: 72, tail: "bl", tailX: 24 } },
      { speaker: "tan", ja: "六、 七、 八、 九、 十！", en: "six, seven, eight, nine, ten!", bubble: { x: 28, y: 13, w: 70, tail: "bl", tailX: 34 } },
    ],
  },
  {
    id: "P4",
    beat: "The theft starts",
    art: "/stories/counting-at-the-market/p4.webp",
    lines: [
      { speaker: "chun", ja: "一つ いいですか。", en: "Can I have one?", bubble: { x: 46, y: 4, w: 54, tail: "bl", tailX: 22 } },
      { speaker: "tan", ja: "いいですよ。", en: "Sure.", bubble: { x: 4, y: 16, w: 42, tail: "bl", tailX: 86 } },
    ],
  },
  {
    id: "P5",
    beat: "Counting down",
    art: "/stories/counting-at-the-market/p5.webp",
    lines: [
      { speaker: "tan", ja: "九… 八… 七… 六…", en: "Nine... eight... seven... six...", bubble: { x: 0, y: 4, w: 38, tail: "bl", tailX: 90 } },
      { speaker: "chun", ja: "おいしいです！", en: "Yummy!", bubble: { x: 40, y: 4, w: 58, tail: "bl", tailX: 35 } },
    ],
  },
  {
    id: "P6",
    beat: "Payoff — five arrive",
    art: "/stories/counting-at-the-market/p6.webp",
    lines: [
      { speaker: "haha", ja: "いくつですか。", en: "How many are there?", bubble: { x: 4, y: 6, w: 50, tail: "bl", tailX: 48 } },
      { speaker: "tan", ja: "五つです…", en: "Five...", bubble: { x: 56, y: 19, w: 40, tail: "bl", tailX: 36 } },
    ],
  },
  ],
  quiz: [
  { prompt: "五つ", ask: "よみかたは？", askEn: "How do you read it?", options: ["いつつ", "むっつ", "ななつ"], answer: 0 },
  { prompt: "十", ask: "いみは？", askEn: "What does it mean?", options: ["two", "seven", "ten"], answer: 2 },
  { prompt: "タンは りんごを いくつ もって かえりましたか。", ask: "", askEn: "How many apples did Tan bring home?", options: ["二つ", "五つ", "三つ"], answer: 1 },
  ],
};
