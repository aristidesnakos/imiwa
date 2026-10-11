/**
 * The signs Tan Dash shows, one per N5 kanji, and the game-only worlds.
 *
 * Hand-curated in the Tan Dash prototype (claude.ai artifact, 2026-10-11) and
 * ported verbatim. Two fields per kanji, because the data file cannot supply
 * either:
 *
 *  - `en`: ONE short English word for the meaning sign. The data's `meaning`
 *    is a list ("day, sun, Japan, counter for days"); a sign that size does
 *    not fit a 180px-wide screen, and a player reads it at a run.
 *  - `kana`: the ONE reading the kana sign asks for, in hiragana. It must be
 *    one of the kanji's own readings (stem or whole word), which
 *    `pnpm validate:play` asserts through lib/romaji/readings.ts.
 *
 * Everything else the game needs (the full meaning list and every reading,
 * for the one-right-answer check) is derived from lib/constants/n5-kanji.ts
 * by lib/play/build.ts, so it cannot drift from the dictionary.
 */

export interface PlaySign {
  en: string;
  kana: string;
}

export const PLAY_SIGNS: Readonly<Record<string, PlaySign>> = {
  '日': { en: "day", kana: 'ひ' },
  '本': { en: "book", kana: 'ほん' },
  '一': { en: "one", kana: 'いち' },
  '二': { en: "two", kana: 'に' },
  '三': { en: "three", kana: 'さん' },
  '四': { en: "four", kana: 'よん' },
  '五': { en: "five", kana: 'ご' },
  '六': { en: "six", kana: 'ろく' },
  '七': { en: "seven", kana: 'なな' },
  '八': { en: "eight", kana: 'はち' },
  '九': { en: "nine", kana: 'きゅう' },
  '十': { en: "ten", kana: 'じゅう' },
  '百': { en: "hundred", kana: 'ひゃく' },
  '千': { en: "thousand", kana: 'せん' },
  '万': { en: "ten thousand", kana: 'まん' },
  '円': { en: "yen", kana: 'えん' },
  '時': { en: "hour", kana: 'じ' },
  '年': { en: "year", kana: 'ねん' },
  '月': { en: "moon", kana: 'つき' },
  '午': { en: "noon", kana: 'ご' },
  '半': { en: "half", kana: 'はん' },
  '人': { en: "person", kana: 'ひと' },
  '女': { en: "woman", kana: 'おんな' },
  '男': { en: "man", kana: 'おとこ' },
  '子': { en: "child", kana: 'こ' },
  '母': { en: "mother", kana: 'はは' },
  '父': { en: "father", kana: 'ちち' },
  '友': { en: "friend", kana: 'とも' },
  '大': { en: "big", kana: 'おおきい' },
  '小': { en: "small", kana: 'ちいさい' },
  '高': { en: "tall", kana: 'たかい' },
  '長': { en: "long", kana: 'ながい' },
  '白': { en: "white", kana: 'しろい' },
  '暑': { en: "hot", kana: 'あつい' },
  '天': { en: "sky", kana: 'てん' },
  '火': { en: "fire", kana: 'ひ' },
  '水': { en: "water", kana: 'みず' },
  '木': { en: "tree", kana: 'き' },
  '土': { en: "soil", kana: 'つち' },
  '山': { en: "mountain", kana: 'やま' },
  '川': { en: "river", kana: 'かわ' },
  '雨': { en: "rain", kana: 'あめ' },
  '東': { en: "east", kana: 'ひがし' },
  '西': { en: "west", kana: 'にし' },
  '南': { en: "south", kana: 'みなみ' },
  '北': { en: "north", kana: 'きた' },
  '行': { en: "go", kana: 'いく' },
  '来': { en: "come", kana: 'くる' },
  '見': { en: "see", kana: 'みる' },
  '出': { en: "exit", kana: 'でる' },
  '入': { en: "enter", kana: 'はいる' },
  '読': { en: "read", kana: 'よむ' },
  '書': { en: "write", kana: 'かく' },
  '話': { en: "talk", kana: 'はなす' },
  '聞': { en: "listen", kana: 'きく' },
  '食': { en: "eat", kana: 'たべる' },
  '生': { en: "life", kana: 'せい' },
  '気': { en: "spirit", kana: 'き' },
  '休': { en: "rest", kana: 'やすむ' },
  '国': { en: "country", kana: 'くに' },
  '学': { en: "study", kana: 'がく' },
  '校': { en: "school", kana: 'こう' },
  '中': { en: "inside", kana: 'なか' },
  '上': { en: "up", kana: 'うえ' },
  '下': { en: "down", kana: 'した' },
  '前': { en: "front", kana: 'まえ' },
  '後': { en: "behind", kana: 'うしろ' },
  '間': { en: "between", kana: 'あいだ' },
  '外': { en: "outside", kana: 'そと' },
  '名': { en: "name", kana: 'な' },
  '分': { en: "minute", kana: 'ふん' },
  '今': { en: "now", kana: 'いま' },
  '金': { en: "gold", kana: 'かね' },
  '電': { en: "electricity", kana: 'でん' },
  '語': { en: "language", kana: 'ご' },
  '車': { en: "car", kana: 'くるま' },
  '何': { en: "what", kana: 'なに' },
  '毎': { en: "every", kana: 'まい' },
  '右': { en: "right", kana: 'みぎ' },
  '左': { en: "left", kana: 'ひだり' },
  '先': { en: "ahead", kana: 'さき' },
  '刀': { en: "sword", kana: 'かたな' },
};

/**
 * Worlds past the comic. Worlds 1-8 ARE episodes 1-8 (lib/play/build.ts reads
 * them from the stories registry, so a new episode becomes a world on its own).
 * These six hold the N5 kanji no episode has taught yet, in the prototype's
 * order. When an episode later teaches one of these kanji, build.ts drops it
 * from here (a world left empty is dropped), so a kanji is never in two worlds.
 *
 * Their titles are game-only and the page must never present them as episodes.
 */
export interface ExtraWorld {
  title: string;
  titleJa: string;
  kanji: readonly string[];
}

export const EXTRA_WORLDS: readonly ExtraWorld[] = [
  { title: "What time is it?", titleJa: "いま なんじですか", kanji: ["時", "分", "半", "午", "今", "毎"] },
  { title: "A hot summer day", titleJa: "あつい なつの 日", kanji: ["年", "月", "火", "土", "暑"] },
  { title: "Which way?", titleJa: "どっちですか", kanji: ["西", "南", "北", "右", "左", "外", "中"] },
  { title: "At the library", titleJa: "としょかんで", kanji: ["読", "書", "話", "聞", "本", "名"] },
  { title: "The festival", titleJa: "おまつり", kanji: ["人", "子", "食", "出", "入"] },
  { title: "The old castle", titleJa: "ふるい おしろ", kanji: ["刀", "長", "国", "前", "後", "間"] },
];

/**
 * Look-alikes: a decoy drawn from here teaches the difference (人/入, 日/白,
 * 千/十, 右/左). Keys and values are N5 kanji; `validate:play` asserts it.
 */
export const LOOK_ALIKES: Readonly<Record<string, string>> = {
  '大': '天人木',
  '天': '大',
  '人': '入八大',
  '入': '人八',
  '八': '人入',
  '木': '本休大',
  '本': '木',
  '休': '木',
  '日': '白月百',
  '白': '日百',
  '百': '白日',
  '月': '日円',
  '千': '十午',
  '十': '千',
  '午': '千年',
  '年': '午',
  '上': '下土',
  '下': '上',
  '土': '上',
  '右': '左',
  '左': '右',
  '東': '車',
  '車': '東',
  '川': '三',
  '三': '川二',
  '二': '三',
  '一': '二',
  '母': '毎女',
  '毎': '母',
  '女': '母',
  '雨': '電',
  '電': '雨',
  '間': '聞',
  '聞': '間',
  '読': '語話',
  '語': '話読',
  '話': '語読',
  '先': '生',
  '生': '先',
  '行': '後',
  '後': '行',
  '分': '刀',
  '刀': '分',
  '水': '火小',
  '火': '水',
  '小': '水',
  '山': '出',
  '出': '山',
  '長': '東',
  '円': '月',
};

/**
 * Gold boxes. Each power teaches its kanji by what it does to Tan; 何 ("what?")
 * is a mystery box that turns into one of the others.
 */
export const POWERS = {
  '生': { en: 'life', fx: '+1 HEART' },
  '大': { en: 'big', fx: 'GIANT TAN!' },
  '上': { en: 'up', fx: 'SUPER JUMP!' },
  '金': { en: 'gold', fx: '+500' },
} as const;

export type PowerKanji = keyof typeof POWERS;
export const MYSTERY_POWER = '何';
