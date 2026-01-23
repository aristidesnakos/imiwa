import { findCluster, getClusterMembers } from './semantic-clusters';
import type { KanjiData } from '@/lib/constants/n5-kanji';

export interface RelatedKanji {
  kanji: string;
  meaning: string;
  level: string;
}

export function getRelatedKanji(
  currentKanji: KanjiData & { level: string },
  allKanji: (KanjiData & { level: string })[]
): RelatedKanji[] {
  const cluster = findCluster(currentKanji.kanji);
  if (!cluster) return [];

  const clusterMembers = getClusterMembers(currentKanji.kanji);

  return allKanji
    .filter(k => clusterMembers.includes(k.kanji))
    .slice(0, 5)
    .map(k => ({
      kanji: k.kanji,
      meaning: k.meaning,
      level: k.level
    }));
}
