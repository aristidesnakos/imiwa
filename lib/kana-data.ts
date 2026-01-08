/**
 * Complete kana data structure for practice sheet generation
 * Organized by gojuon order with unicode values for SVG lookup
 */

export type KanaChar = {
  char: string;
  unicode: number;
  romaji: string;
};

export type KanaRow = {
  consonant: string;
  label: string;
  chars: (KanaChar | null)[];
};

// Vowel order: a, i, u, e, o
export const VOWELS = ['a', 'i', 'u', 'e', 'o'] as const;

// Complete hiragana grid in gojuon order
export const HIRAGANA_GRID: KanaRow[] = [
  {
    consonant: '',
    label: '',
    chars: [
      { char: 'あ', unicode: 12354, romaji: 'a' },
      { char: 'い', unicode: 12356, romaji: 'i' },
      { char: 'う', unicode: 12358, romaji: 'u' },
      { char: 'え', unicode: 12360, romaji: 'e' },
      { char: 'お', unicode: 12362, romaji: 'o' },
    ]
  },
  {
    consonant: 'k',
    label: 'K',
    chars: [
      { char: 'か', unicode: 12363, romaji: 'ka' },
      { char: 'き', unicode: 12365, romaji: 'ki' },
      { char: 'く', unicode: 12367, romaji: 'ku' },
      { char: 'け', unicode: 12369, romaji: 'ke' },
      { char: 'こ', unicode: 12371, romaji: 'ko' },
    ]
  },
  {
    consonant: 's',
    label: 'S',
    chars: [
      { char: 'さ', unicode: 12373, romaji: 'sa' },
      { char: 'し', unicode: 12375, romaji: 'shi' },
      { char: 'す', unicode: 12377, romaji: 'su' },
      { char: 'せ', unicode: 12379, romaji: 'se' },
      { char: 'そ', unicode: 12381, romaji: 'so' },
    ]
  },
  {
    consonant: 't',
    label: 'T',
    chars: [
      { char: 'た', unicode: 12383, romaji: 'ta' },
      { char: 'ち', unicode: 12385, romaji: 'chi' },
      { char: 'つ', unicode: 12388, romaji: 'tsu' },
      { char: 'て', unicode: 12390, romaji: 'te' },
      { char: 'と', unicode: 12392, romaji: 'to' },
    ]
  },
  {
    consonant: 'n',
    label: 'N',
    chars: [
      { char: 'な', unicode: 12394, romaji: 'na' },
      { char: 'に', unicode: 12395, romaji: 'ni' },
      { char: 'ぬ', unicode: 12396, romaji: 'nu' },
      { char: 'ね', unicode: 12397, romaji: 'ne' },
      { char: 'の', unicode: 12398, romaji: 'no' },
    ]
  },
  {
    consonant: 'h',
    label: 'H',
    chars: [
      { char: 'は', unicode: 12399, romaji: 'ha' },
      { char: 'ひ', unicode: 12402, romaji: 'hi' },
      { char: 'ふ', unicode: 12405, romaji: 'fu' },
      { char: 'へ', unicode: 12408, romaji: 'he' },
      { char: 'ほ', unicode: 12411, romaji: 'ho' },
    ]
  },
  {
    consonant: 'm',
    label: 'M',
    chars: [
      { char: 'ま', unicode: 12414, romaji: 'ma' },
      { char: 'み', unicode: 12415, romaji: 'mi' },
      { char: 'む', unicode: 12416, romaji: 'mu' },
      { char: 'め', unicode: 12417, romaji: 'me' },
      { char: 'も', unicode: 12418, romaji: 'mo' },
    ]
  },
  {
    consonant: 'y',
    label: 'Y',
    chars: [
      { char: 'や', unicode: 12420, romaji: 'ya' },
      null,
      { char: 'ゆ', unicode: 12422, romaji: 'yu' },
      null,
      { char: 'よ', unicode: 12424, romaji: 'yo' },
    ]
  },
  {
    consonant: 'r',
    label: 'R',
    chars: [
      { char: 'ら', unicode: 12425, romaji: 'ra' },
      { char: 'り', unicode: 12426, romaji: 'ri' },
      { char: 'る', unicode: 12427, romaji: 'ru' },
      { char: 'れ', unicode: 12428, romaji: 're' },
      { char: 'ろ', unicode: 12429, romaji: 'ro' },
    ]
  },
  {
    consonant: 'w',
    label: 'W',
    chars: [
      { char: 'わ', unicode: 12431, romaji: 'wa' },
      null,
      null,
      null,
      { char: 'を', unicode: 12434, romaji: 'wo' },
    ]
  },
  {
    consonant: 'n_final',
    label: 'ん',
    chars: [
      { char: 'ん', unicode: 12435, romaji: 'n' },
      null,
      null,
      null,
      null,
    ]
  },
];

// Complete katakana grid in gojuon order
export const KATAKANA_GRID: KanaRow[] = [
  {
    consonant: '',
    label: '',
    chars: [
      { char: 'ア', unicode: 12450, romaji: 'a' },
      { char: 'イ', unicode: 12452, romaji: 'i' },
      { char: 'ウ', unicode: 12454, romaji: 'u' },
      { char: 'エ', unicode: 12456, romaji: 'e' },
      { char: 'オ', unicode: 12458, romaji: 'o' },
    ]
  },
  {
    consonant: 'k',
    label: 'K',
    chars: [
      { char: 'カ', unicode: 12459, romaji: 'ka' },
      { char: 'キ', unicode: 12461, romaji: 'ki' },
      { char: 'ク', unicode: 12463, romaji: 'ku' },
      { char: 'ケ', unicode: 12465, romaji: 'ke' },
      { char: 'コ', unicode: 12467, romaji: 'ko' },
    ]
  },
  {
    consonant: 's',
    label: 'S',
    chars: [
      { char: 'サ', unicode: 12469, romaji: 'sa' },
      { char: 'シ', unicode: 12471, romaji: 'shi' },
      { char: 'ス', unicode: 12473, romaji: 'su' },
      { char: 'セ', unicode: 12475, romaji: 'se' },
      { char: 'ソ', unicode: 12477, romaji: 'so' },
    ]
  },
  {
    consonant: 't',
    label: 'T',
    chars: [
      { char: 'タ', unicode: 12479, romaji: 'ta' },
      { char: 'チ', unicode: 12481, romaji: 'chi' },
      { char: 'ツ', unicode: 12484, romaji: 'tsu' },
      { char: 'テ', unicode: 12486, romaji: 'te' },
      { char: 'ト', unicode: 12488, romaji: 'to' },
    ]
  },
  {
    consonant: 'n',
    label: 'N',
    chars: [
      { char: 'ナ', unicode: 12490, romaji: 'na' },
      { char: 'ニ', unicode: 12491, romaji: 'ni' },
      { char: 'ヌ', unicode: 12492, romaji: 'nu' },
      { char: 'ネ', unicode: 12493, romaji: 'ne' },
      { char: 'ノ', unicode: 12494, romaji: 'no' },
    ]
  },
  {
    consonant: 'h',
    label: 'H',
    chars: [
      { char: 'ハ', unicode: 12495, romaji: 'ha' },
      { char: 'ヒ', unicode: 12498, romaji: 'hi' },
      { char: 'フ', unicode: 12501, romaji: 'fu' },
      { char: 'ヘ', unicode: 12504, romaji: 'he' },
      { char: 'ホ', unicode: 12507, romaji: 'ho' },
    ]
  },
  {
    consonant: 'm',
    label: 'M',
    chars: [
      { char: 'マ', unicode: 12510, romaji: 'ma' },
      { char: 'ミ', unicode: 12511, romaji: 'mi' },
      { char: 'ム', unicode: 12512, romaji: 'mu' },
      { char: 'メ', unicode: 12513, romaji: 'me' },
      { char: 'モ', unicode: 12514, romaji: 'mo' },
    ]
  },
  {
    consonant: 'y',
    label: 'Y',
    chars: [
      { char: 'ヤ', unicode: 12516, romaji: 'ya' },
      null,
      { char: 'ユ', unicode: 12518, romaji: 'yu' },
      null,
      { char: 'ヨ', unicode: 12520, romaji: 'yo' },
    ]
  },
  {
    consonant: 'r',
    label: 'R',
    chars: [
      { char: 'ラ', unicode: 12521, romaji: 'ra' },
      { char: 'リ', unicode: 12522, romaji: 'ri' },
      { char: 'ル', unicode: 12523, romaji: 'ru' },
      { char: 'レ', unicode: 12524, romaji: 're' },
      { char: 'ロ', unicode: 12525, romaji: 'ro' },
    ]
  },
  {
    consonant: 'w',
    label: 'W',
    chars: [
      { char: 'ワ', unicode: 12527, romaji: 'wa' },
      null,
      null,
      null,
      { char: 'ヲ', unicode: 12530, romaji: 'wo' },
    ]
  },
  {
    consonant: 'n_final',
    label: 'ン',
    chars: [
      { char: 'ン', unicode: 12531, romaji: 'n' },
      null,
      null,
      null,
      null,
    ]
  },
];

export type KanaType = 'hiragana' | 'katakana';

export function getKanaGrid(type: KanaType): KanaRow[] {
  return type === 'hiragana' ? HIRAGANA_GRID : KATAKANA_GRID;
}

export function getKanaTitle(type: KanaType): string {
  return type === 'hiragana' ? 'Hiragana ひらがな' : 'Katakana カタカナ';
}