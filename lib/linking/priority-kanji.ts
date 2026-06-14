/**
 * Priority Kanji — internal-linking target set (Phase 0, task S3)
 *
 * These are the pages we most want to pass authority to: kanji that already
 * earn impressions in Google Search Console but convert poorly (high
 * impressions, CTR < 1.5%, avg position 4–15). Linking to them from hub and
 * resource pages is the lever for the ranking lift those positions need.
 *
 * SOURCE OF TRUTH: this list should be regenerated from the GSC performance
 * export (Pages report → filter impressions desc, CTR < 1.5%, position 4–15)
 * rather than hand-curated long term. Until that export is wired in, this seeds
 * the set from the known top-impression characters
 * (docs/marketing/immediate-optimization-opportunities.md) plus the fundamental
 * beginner kanji that drive the bulk of "how to write / [meaning] kanji"
 * search demand. Replace, don't append, when the real export lands.
 *
 * Ordered by priority (highest-impression first).
 */
export const PRIORITY_KANJI: readonly string[] = [
  // Confirmed top-impression pages from GSC analysis
  '止', '死', '大', '日', '出',
  // Numbers — highest-volume beginner searches
  '一', '二', '三', '四', '五', '六', '七', '八', '九', '十',
  // Nature / elements
  '水', '火', '木', '土', '金', '山', '川', '天', '空',
  // People / family
  '人', '男', '女', '子', '父', '母', '愛',
  // Body
  '手', '足', '目', '口', '耳', '心',
  // Time
  '月', '年', '時', '今', '本',
  // Directions / position
  '上', '下', '中', '左', '右', '東', '西', '南', '北',
  // High-search verbs / concepts
  '見', '行', '来', '食', '愛', '力', '気', '神', '夢', '王',
] as const;

/**
 * De-duplicated priority list (a couple of high-value characters appear in
 * more than one conceptual group above).
 */
export const PRIORITY_KANJI_UNIQUE: readonly string[] = Array.from(
  new Set(PRIORITY_KANJI)
);
