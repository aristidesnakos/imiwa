export interface AdConfig {
  id: string;
  advertiser: string;
  headline: string;
  description: string;
  ctaText: string;
  ctaUrl: string;
  badge?: string;
  active: boolean;
}

/**
 * Active sponsor ads displayed on kanji pages.
 * To add a new advertiser, append an entry here with active: true.
 * Only the first active ad is displayed.
 */
export const ADS: AdConfig[] = [];

export function getActiveAd(): AdConfig | null {
  return ADS.find((ad) => ad.active) ?? null;
}
