import { SheetConfig, KANA_TYPES, SHEET_TYPES } from '@/types/kana-sheets';

/**
 * Configuration data for all available kana practice sheets
 *
 * This array defines the content and metadata for each sheet type,
 * making it easy to add new sheets or modify existing ones.
 */
export const SHEET_CONFIGS: SheetConfig[] = [
  {
    id: 'hiragana-empty',
    title: 'Hiragana ひらがな',
    badge: 'Empty Practice Grid',
    badgeColor: 'sakura',
    description: 'Blank practice grids with guidelines for mastering hiragana stroke order',
    imageUrl: '/assets/hiragana-sheet.png',
    imageAlt: 'Hiragana empty practice sheet preview',
    kanaType: KANA_TYPES.HIRAGANA,
    sheetType: SHEET_TYPES.EMPTY,
  },
  {
    id: 'katakana-empty',
    title: 'Katakana カタカナ',
    badge: 'Empty Practice Grid',
    badgeColor: 'sakura',
    description: 'Blank practice grids with guidelines for mastering katakana stroke order',
    imageUrl: '/assets/katakana-sheet.png',
    imageAlt: 'Katakana empty practice sheet preview',
    kanaType: KANA_TYPES.KATAKANA,
    sheetType: SHEET_TYPES.EMPTY,
  },
  {
    id: 'hiragana-stroke-order',
    title: 'Hiragana ひらがな',
    badge: 'Stroke Order Reference',
    badgeColor: 'coral',
    description: 'Complete character reference with romaji and stroke sequences for proper writing',
    imageUrl: '/assets/hiragana-completed-sheet.png',
    imageAlt: 'Hiragana stroke order reference preview',
    kanaType: KANA_TYPES.HIRAGANA,
    sheetType: SHEET_TYPES.STROKE_ORDER,
    includeRomaji: true,
  },
  {
    id: 'katakana-stroke-order',
    title: 'Katakana カタカナ',
    badge: 'Stroke Order Reference',
    badgeColor: 'coral',
    description: 'Complete character reference with romaji and stroke sequences for proper writing',
    imageUrl: '/assets/katakana-completed-sheet.png',
    imageAlt: 'Katakana stroke order reference preview',
    kanaType: KANA_TYPES.KATAKANA,
    sheetType: SHEET_TYPES.STROKE_ORDER,
    includeRomaji: true,
  },
];
