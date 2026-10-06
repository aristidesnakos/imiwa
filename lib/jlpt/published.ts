/**
 * lib/jlpt/published.ts
 *
 * The one place the published JLPT-format items are read, and what the rest of the site
 * may say about them.
 *
 * SERVER MODULES ONLY. This file imports data/jlpt/published/N5.json, so a client
 * component that imported it would ship every item in its bundle. The quiz page hands the
 * items to its client quiz as a prop; every other page imports only the summary below and
 * renders text from it. Static import, never `fs`: a runtime read works at build time and
 * then fails in a serverless function, because Next's file tracing never saw the path
 * (the same reason as lib/sentences/published.ts).
 *
 * The file is `items: []` until the owner approves items (scripts/jlpt/publish-items.ts
 * publishes approved items only), and an empty file is a valid state: the summary is then
 * null, the quiz page shows no JLPT tab, and every link to the mode falls back to the
 * plain kanji quiz or to nothing. So any copy built on the summary has to be true in both
 * states, and has to stop claiming sets the moment the file empties again.
 */

import type { JlptItem, PublishedFile } from './types';
import { groupSets, largestSet, type JlptSet } from './sets';
import published from '@/data/jlpt/published/N5.json';

/** Every approved N5 item, in set order. Empty until some are approved. */
export const PUBLISHED_JLPT_ITEMS: JlptItem[] = (published as unknown as PublishedFile).items;

/** The playable sets, in set order. */
export const PUBLISHED_JLPT_SETS: JlptSet[] = groupSets(PUBLISHED_JLPT_ITEMS);

/** The fullest set, for copy that states a set's shape; null when nothing is published. */
export const PUBLISHED_JLPT_SHAPE: JlptSet | null = largestSet(PUBLISHED_JLPT_SETS);

export interface JlptFormatSummary {
  /** How many sets can be played. Always at least 1. */
  sets: number;
  /** Questions in every set, or null when the sets are not all the same size. */
  perSet: number | null;
  /** Questions across all sets. */
  questions: number;
}

/**
 * What a link to the JLPT-format mode may claim, or null when there is nothing to link
 * to. `items` exists for checking copy against a fixture; pages call it bare.
 */
export function jlptFormatSummary(items: readonly JlptItem[] = PUBLISHED_JLPT_ITEMS): JlptFormatSummary | null {
  const sets = items === PUBLISHED_JLPT_ITEMS ? PUBLISHED_JLPT_SETS : groupSets(items);
  if (sets.length === 0) return null;
  const sizes = new Set(sets.map(s => s.all.length));
  return {
    sets: sets.length,
    perSet: sizes.size === 1 ? sets[0].all.length : null,
    questions: sets.reduce((n, s) => n + s.all.length, 0),
  };
}
