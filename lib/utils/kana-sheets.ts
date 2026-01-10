import { SheetConfig, KanaType, SheetType } from '@/types/kana-sheets';

/**
 * Utility functions for kana sheets
 */

/**
 * Builds a download URL for a kana practice sheet
 *
 * @param kanaType - Type of kana (hiragana or katakana)
 * @param sheetType - Type of sheet (empty or stroke-order)
 * @param includeRomaji - Whether to include romaji (only for stroke-order sheets)
 * @returns The download URL for the sheet
 */
export function buildDownloadUrl(
  kanaType: KanaType,
  sheetType: SheetType,
  includeRomaji?: boolean
): string {
  const params = new URLSearchParams({
    type: kanaType,
    format: sheetType,
  });

  if (includeRomaji && sheetType === 'stroke-order') {
    params.append('romaji', 'true');
  }

  return `/api/kana-sheets?${params.toString()}`;
}

/**
 * Builds an ARIA label for a sheet download button
 *
 * @param config - Sheet configuration
 * @returns Accessible label for the download button
 */
export function buildAriaLabel(config: SheetConfig): string {
  const kanaName = config.kanaType.charAt(0).toUpperCase() + config.kanaType.slice(1);
  const sheetTypeLabel = config.sheetType === 'empty'
    ? 'empty practice sheet'
    : 'stroke order reference sheet';

  return `Download ${kanaName} ${sheetTypeLabel}`;
}
