/**
 * lib/levels/n5-sequence.ts
 *
 * The N5 list as a learning sequence: themed groups, in teaching order.
 *
 * The groups and their order are the ones `lib/constants/n5-kanji.ts` already
 * carries as source comments ("Numbers 1-10", "People", …). They are surfaced
 * here as data because a comment cannot be rendered, and /kanji/n5 is a page
 * people study from, which means the order is part of the content. The titles
 * and summaries are our own editorial copy, not licensed text, and contain no
 * Japanese beyond the characters themselves.
 *
 * Contract, asserted by `pnpm validate:kanji-data`: every N5 character appears
 * exactly once, and nothing outside the N5 list appears at all. The page does
 * not trust that blindly either: a character the sequence misses is rendered
 * in a trailing group rather than dropped, because a list page that silently
 * loses an entry is the one failure its visitors cannot see.
 *
 * Deliberately NOT a field on the N5 data itself: that array ships in the
 * /kanji client bundle, which runs against an error-level byte budget, and a
 * theme per entry would pay for this page there.
 */

export interface LevelTheme {
  /** Anchor id and stable key — lowercase, hyphenated. Never reuse one. */
  id: string;
  /** The group's heading. */
  title: string;
  /** One line under the heading saying what is in the group. */
  summary: string;
  /** The group's characters, in teaching order. */
  kanji: readonly string[];
}

export const N5_SEQUENCE: readonly LevelTheme[] = [
  {
    id: 'start-here',
    title: 'Start here',
    summary: 'The two kanji that write 日本, Japan.',
    kanji: ['日', '本'],
  },
  {
    id: 'numbers',
    title: 'Numbers',
    summary: 'One to ten, the base of every larger number.',
    kanji: ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'],
  },
  {
    id: 'big-numbers-and-money',
    title: 'Big numbers and money',
    summary: 'Hundred, thousand and ten thousand, and 円, the yen.',
    kanji: ['百', '千', '万', '円'],
  },
  {
    id: 'time',
    title: 'Time',
    summary: 'Hour, year, month, noon and half.',
    kanji: ['時', '年', '月', '午', '半'],
  },
  {
    id: 'people',
    title: 'People',
    summary: 'Person, woman, man, child, mother, father and friend.',
    kanji: ['人', '女', '男', '子', '母', '父', '友'],
  },
  {
    id: 'describing-things',
    title: 'Describing things',
    summary: 'Big, small, tall, long, white and hot.',
    kanji: ['大', '小', '高', '長', '白', '暑'],
  },
  {
    id: 'nature',
    title: 'Nature',
    summary: 'Sky, fire, water, tree, earth, mountain, river and rain.',
    kanji: ['天', '火', '水', '木', '土', '山', '川', '雨'],
  },
  {
    id: 'directions',
    title: 'Directions',
    summary: 'East, west, south and north.',
    kanji: ['東', '西', '南', '北'],
  },
  {
    id: 'verbs',
    title: 'Verbs',
    summary: 'Go, come, see, go out, enter, read, write, talk, hear, eat, live and rest, plus 気, spirit.',
    kanji: ['行', '来', '見', '出', '入', '読', '書', '話', '聞', '食', '生', '気', '休'],
  },
  {
    id: 'places-and-positions',
    title: 'Places and positions',
    summary: 'Country and school, and where things are: in, above, below, in front, behind, between and outside.',
    kanji: ['国', '学', '校', '中', '上', '下', '前', '後', '間', '外'],
  },
  {
    id: 'everyday-words',
    title: 'Everyday words',
    summary: 'Name, minute, now, money, electricity, language, car, what, every, right, left, ahead and sword.',
    kanji: ['名', '分', '今', '金', '電', '語', '車', '何', '毎', '右', '左', '先', '刀'],
  },
];

/** Every character in the sequence, in teaching order. */
export function n5SequenceOrder(): string[] {
  return N5_SEQUENCE.flatMap((theme) => theme.kanji);
}
