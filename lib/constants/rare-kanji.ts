export interface KanjiData {
  kanji: string;
  onyomi: string;
  kunyomi: string;
  meaning: string;
}

export const RARE_KANJI: KanjiData[] = [
  { kanji: "闙", onyomi: "ケイ", kunyomi: "", meaning: "open, release, spread open" },
];