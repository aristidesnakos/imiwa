/**
 * The homepage search, server side.
 *
 * The /kanji search runs in the browser over all five level lists, which is
 * why /kanji carries the whole dictionary in its bundle. The homepage cannot
 * afford that, so its search asks the server instead: `/api/kanji-lookup`
 * returns the first few hits as you type, and `/search` answers a submitted
 * query with a redirect. Both rank with lib/kanji-search.ts, so a query finds
 * the same kanji in the same order here as it does on /kanji.
 *
 * Server only. Importing this from a client component would put every list in
 * that component's bundle.
 */

import type { KanjiWithLevel } from './constants/kanji-types';
import { N5_KANJI } from './constants/n5-kanji';
import { N4_KANJI } from './constants/n4-kanji';
import { N3_KANJI } from './constants/n3-kanji';
import { N2_KANJI } from './constants/n2-kanji';
import { N1_KANJI } from './constants/n1-kanji';
import { rankKanji } from './kanji-search';
import { kanjiReadings } from './romaji/readings';

// N5 first, like every other merge: within a rank, results keep list order, so
// the easier character of two equal matches comes first.
const ALL_KANJI: KanjiWithLevel[] = [
  ...N5_KANJI.map(k => ({ ...k, level: 'N5' })),
  ...N4_KANJI.map(k => ({ ...k, level: 'N4' })),
  ...N3_KANJI.map(k => ({ ...k, level: 'N3' })),
  ...N2_KANJI.map(k => ({ ...k, level: 'N2' })),
  ...N1_KANJI.map(k => ({ ...k, level: 'N1' })),
];

/** One row of the as-you-type list. */
export interface LookupHit {
  kanji: string;
  level: string;
  /** The first two meanings: "road, way". */
  meaning: string;
  /** Up to three readings in romaji, kunyomi first: "michi, dō, tō". */
  romaji: string;
  href: string;
}

export const LOOKUP_LIMIT = 6;
/** Longer than anything a person types into a kanji search. */
export const MAX_QUERY_LENGTH = 40;

export function kanjiHref(kanji: string): string {
  return `/kanji/${encodeURIComponent(kanji)}`;
}

function toHit(k: KanjiWithLevel): LookupHit {
  const readings = kanjiReadings(k);
  const romaji = Array.from(new Set([...readings.kunyomi, ...readings.onyomi].map(r => r.romajiFull)))
    .filter(Boolean)
    .slice(0, 3)
    .join(', ');
  return {
    kanji: k.kanji,
    level: k.level,
    meaning: k.meaning.split(',').map(m => m.trim()).filter(Boolean).slice(0, 2).join(', '),
    romaji,
    href: kanjiHref(k.kanji),
  };
}

export function lookupKanji(query: string, limit = LOOKUP_LIMIT): LookupHit[] {
  return rankKanji(ALL_KANJI, query.slice(0, MAX_QUERY_LENGTH))
    .slice(0, limit)
    .map(hit => toHit(hit.item));
}

/**
 * Where a submitted query goes: the character page when one kanji clearly won
 * (it ranks above every other hit), and the /kanji results otherwise. "mizu"
 * goes to 水; "michi" lists 道, 路 and 途, which all read みち.
 */
export function searchDestination(query: string): string {
  const q = query.trim().slice(0, MAX_QUERY_LENGTH);
  if (!q) return '/kanji';
  const [first, second] = rankKanji(ALL_KANJI, q);
  if (first && (!second || first.rank < second.rank)) return kanjiHref(first.item.kanji);
  return `/kanji?search=${encodeURIComponent(q)}`;
}
