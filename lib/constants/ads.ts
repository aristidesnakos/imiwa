export interface AdConfig {
  /** Unique identifier for this ad booking (e.g. "acme-may-2025"). */
  id: string;
  /** Advertiser display name shown in the "Ad by …" attribution line. */
  advertiser: string;
  headline: string;
  description: string;
  ctaText: string;
  ctaUrl: string;
  /** Optional pill label displayed in the top-right corner (e.g. "Travel", "Language"). */
  badge?: string;
  /**
   * ISO-8601 date string for when the campaign starts (inclusive).
   * Example: "2025-06-01"
   */
  startDate: string;
  /**
   * ISO-8601 date string for when the campaign ends (inclusive).
   * Example: "2025-06-30"
   */
  endDate: string;
  /**
   * Set to false to manually pause an ad before its endDate, e.g. if the
   * advertiser cancels early. Set to true to allow date-range logic to control
   * visibility.
   */
  active: boolean;
}

/**
 * All ad bookings — past, present, and future.
 *
 * HOW TO ADD A NEW ADVERTISER:
 *   1. Collect payment (see docs/advertising-setup.md for payment options).
 *   2. Append a new AdConfig entry below.
 *   3. Set startDate / endDate to the agreed campaign window.
 *   4. Set active: true.
 *   5. Deploy. The banner will appear automatically on the start date and
 *      disappear automatically the day after endDate — no further changes needed.
 *
 * HOW TO PAUSE AN AD EARLY:
 *   Set active: false on the relevant entry and deploy.
 */
export const ADS: AdConfig[] = [
  // Example (inactive — for reference only):
  // {
  //   id: 'acme-jun-2025',
  //   advertiser: 'Acme Japan Tours',
  //   headline: 'Explore Japan with a local guide',
  //   description: 'Curated small-group tours for Japanese language learners.',
  //   ctaText: 'See tours',
  //   ctaUrl: 'https://acmejapantours.com',
  //   badge: 'Travel',
  //   startDate: '2025-06-01',
  //   endDate: '2025-06-30',
  //   active: false,
  // },
];

/**
 * Returns the first ad whose active flag is true AND whose campaign window
 * includes today's UTC date. Returns null when no such ad exists (the banner
 * will show the "Advertise here" fallback CTA instead).
 */
export function getActiveAd(): AdConfig | null {
  const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
  return (
    ADS.find(
      (ad) => ad.active && ad.startDate <= today && ad.endDate >= today
    ) ?? null
  );
}

/**
 * Returns a human-readable status string for a given ad. Useful for
 * quickly auditing the ADS array.
 */
export function getAdStatus(ad: AdConfig): 'upcoming' | 'active' | 'expired' | 'paused' {
  if (!ad.active) return 'paused';
  const today = new Date().toISOString().slice(0, 10);
  if (ad.startDate > today) return 'upcoming';
  if (ad.endDate < today) return 'expired';
  return 'active';
}
