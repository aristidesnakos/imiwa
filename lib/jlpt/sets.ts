/**
 * lib/jlpt/sets.ts
 *
 * How published JLPT-format items group into playable sets. Pure functions over types
 * only, so the client quiz can import them without pulling in any data: the items reach
 * the browser as a prop from the server page, never through this file.
 *
 * Moved here from app/kanji/n5/quiz/jlpt-format.ts (which re-exports them) so that
 * lib/jlpt/published.ts can count sets for pages outside the quiz route with the same
 * function the quiz plays them with.
 */

import type { JlptItem } from './types';

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
