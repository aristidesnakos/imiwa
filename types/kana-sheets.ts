/**
 * Type definitions for Kana Practice Sheets
 */

export const SHEET_TYPES = {
  EMPTY: 'empty',
  STROKE_ORDER: 'stroke-order'
} as const;

export const KANA_TYPES = {
  HIRAGANA: 'hiragana',
  KATAKANA: 'katakana'
} as const;

export type SheetType = typeof SHEET_TYPES[keyof typeof SHEET_TYPES];
export type KanaType = typeof KANA_TYPES[keyof typeof KANA_TYPES];

export type BadgeColorVariant = 'sakura' | 'coral';

export interface SheetCardProps {
  title: string;
  badge: string;
  badgeColor: BadgeColorVariant;
  description: string;
  imageUrl: string;
  imageAlt: string;
  downloadUrl: string;
  ariaLabel: string;
}

export interface SheetConfig {
  id: string;
  title: string;
  badge: string;
  badgeColor: BadgeColorVariant;
  description: string;
  imageUrl: string;
  imageAlt: string;
  kanaType: KanaType;
  sheetType: SheetType;
  includeRomaji?: boolean;
}
