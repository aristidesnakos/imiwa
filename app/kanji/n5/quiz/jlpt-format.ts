/**
 * app/kanji/n5/quiz/jlpt-format.ts
 *
 * Pure helpers and constants shared by the server page (copy, counts) and the client
 * quiz (sets, scoring). It imports types only, never the data: the data file is read in
 * page.tsx and handed down, so nothing here can pull the items into a bundle by itself.
 */

import type { JlptItem } from '@/lib/jlpt/types';

/**
 * The official free material. Verified to resolve with a HEAD request on 2026-10-05; the
 * bare /e/samples/ index answers 403, so do not link it. We link out and never copy a
 * question: those pages are the JLPT's own and the right place to see real ones.
 */
export const JLPT_SAMPLE_QUESTIONS_URL = 'https://www.jlpt.jp/e/samples/forlearners.html';
export const JLPT_SAMPLE_INDEX_URL = 'https://www.jlpt.jp/e/samples/sampleindex.html';

export interface JlptSet {
  set: number;
  mondai1: JlptItem[];
  mondai2: JlptItem[];
  /** Mondai 1 first, then Mondai 2: the order they are played in. */
  all: JlptItem[];
}

/** Group published items into playable sets, in set order. A set with no items is absent. */
export function groupSets(items: readonly JlptItem[]): JlptSet[] {
  const bySet = new Map<number, JlptItem[]>();
  for (const item of items) {
    const list = bySet.get(item.set);
    if (list) list.push(item);
    else bySet.set(item.set, [item]);
  }
  return [...bySet.keys()]
    .sort((a, b) => a - b)
    .map(set => {
      const list = bySet.get(set) as JlptItem[];
      const mondai1 = list.filter(i => i.mondai === 1);
      const mondai2 = list.filter(i => i.mondai === 2);
      return { set, mondai1, mondai2, all: [...mondai1, ...mondai2] };
    });
}

/** "7 + 5" style shape of the fullest set, for copy that states it. */
export function largestSet(sets: readonly JlptSet[]): JlptSet | null {
  return sets.reduce<JlptSet | null>((best, s) => (!best || s.all.length > best.all.length ? s : best), null);
}
