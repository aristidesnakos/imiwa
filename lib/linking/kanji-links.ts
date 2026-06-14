import { findCluster, getClusterMembers } from './semantic-clusters';
import type { KanjiData } from '@/lib/constants/n5-kanji';

export interface RelatedKanji {
  kanji: string;
  meaning: string;
  level: string;
}

const RELATED_TARGET = 8;

const toRelated = (k: KanjiData & { level: string }): RelatedKanji => ({
  kanji: k.kanji,
  meaning: k.meaning,
  level: k.level,
});

/**
 * Builds the related-kanji link set for a page. Starts from the semantic
 * cluster, then backfills with same-level neighbours so that EVERY kanji page
 * links out to ~8 others (cluster-only linking left many pages with zero
 * internal links, which is what S3 fixes). Same-level backfill keeps the
 * suggestions pedagogically relevant while spreading crawl authority.
 */
export function getRelatedKanji(
  currentKanji: KanjiData & { level: string },
  allKanji: (KanjiData & { level: string })[]
): RelatedKanji[] {
  const seen = new Set<string>([currentKanji.kanji]);
  const related: RelatedKanji[] = [];

  // 1. Semantic cluster members (most relevant).
  if (findCluster(currentKanji.kanji)) {
    const clusterMembers = getClusterMembers(currentKanji.kanji);
    for (const k of allKanji) {
      if (related.length >= RELATED_TARGET) break;
      if (clusterMembers.includes(k.kanji) && !seen.has(k.kanji)) {
        seen.add(k.kanji);
        related.push(toRelated(k));
      }
    }
  }

  // 2. Backfill with same-level neighbours so the page always links out.
  if (related.length < RELATED_TARGET) {
    for (const k of allKanji) {
      if (related.length >= RELATED_TARGET) break;
      if (k.level === currentKanji.level && !seen.has(k.kanji)) {
        seen.add(k.kanji);
        related.push(toRelated(k));
      }
    }
  }

  return related;
}
