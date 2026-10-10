/**
 * The /kanji search: which kanji a query finds, and in what order.
 *
 * Learners search the way they met the character, so four kinds of query match:
 *
 *   水, 日本     the character, or a word containing it: each kanji in the query
 *               is found, in the order it appears there
 *   water       an English meaning
 *   みず, スイ   a reading in kana, in either script. 137 onyomi are stored in
 *               katakana and 1,714 in hiragana with no rule behind which, so both
 *               sides are folded to hiragana before they are compared
 *   mizu, sui   a reading in romaji, through the `searchKeys` lib/romaji/readings.ts
 *               derives, so どう is found by dō, dou and do alike
 *
 * Romaji is the one learners need most. Someone who heard a word and wants its
 * character usually cannot type kana yet, which is why they are looking it up;
 * until 2026-09-29 this search told them "No kanji found" for "mizu".
 *
 * Readings come from `kanjiReadings()`, never the raw fields. Those carry two
 * annotation dialects (`た（べる）`, `た.べる`), so a substring match on them could
 * never find たべる, the whole word a learner actually types.
 *
 * ## Order
 *
 * Each kanji takes the best rank any of its matches earns, and results keep the
 * caller's order within a rank, so a level view still reads N5 first:
 *
 *   0  the query contains the character
 *   1  a reading or a meaning equals the query ("hi" puts 日 and 火 first)
 *   2  a reading, a meaning or a word of one starts with the query ("tabe": 食)
 *   3  the query appears inside a meaning or a kana reading. This is all the
 *      search did before, kept so that nothing it used to find stops matching.
 *
 * Romaji never matches mid-word, the one place rank 3 stops short: "an" would
 * otherwise find every kan, san and han in the dictionary.
 *
 * Relative imports, because scripts/validate-kanji-search.ts runs this under tsx.
 */

import { kanjiReadings } from './romaji/readings';
import { katakanaToHiragana } from './romaji/hepburn';

/** What the search reads from a kanji: fields every constants file has. */
export interface SearchableKanji {
  kanji: string;
  meaning: string;
  onyomi: string;
  kunyomi: string;
}

interface IndexEntry {
  /** The whole meaning field, lowercased, for the substring match. */
  meaning: string;
  /** Each comma-separated meaning, lowercased: "counter for days". */
  meanings: string[];
  /** Every word of every meaning: "counter", "for", "days". */
  meaningWords: string[];
  /** Every reading's stem and whole word, in hiragana: た, たべる. */
  kana: string[];
  /** `kana` joined by a character no kana query contains, for the substring match. */
  kanaText: string;
  /** Every romaji spelling of every reading, lowercased: mizu, sui, dō, dou, do. */
  romaji: string[];
}

// Built on a kanji's first search and kept: the caller's list holds the same
// objects for the life of the page, whichever level is showing.
const indexCache = new WeakMap<SearchableKanji, IndexEntry>();

function indexEntry(k: SearchableKanji): IndexEntry {
  const cached = indexCache.get(k);
  if (cached) return cached;

  const meaning = k.meaning.toLowerCase();
  const meanings = meaning.split(',').map(m => m.trim()).filter(Boolean);
  const readings = kanjiReadings(k).all;
  const kana = Array.from(new Set(readings.flatMap(r => [r.kana, r.kanaFull]).filter(Boolean)));

  const entry: IndexEntry = {
    meaning,
    meanings,
    meaningWords: meanings.flatMap(m => m.split(/[^\p{L}\p{N}']+/u).filter(Boolean)),
    kana,
    kanaText: kana.join('|'),
    romaji: Array.from(new Set(readings.flatMap(r => r.searchKeys))),
  };
  indexCache.set(k, entry);
  return entry;
}

interface Query {
  /** The kanji in the query, in the order they first appear. */
  characters: string[];
  /** Lowercased, whitespace collapsed: what meanings are compared with. */
  text: string;
  /** The query in hiragana, when it is kana and nothing else. */
  kana: string | null;
  /** The query without spaces or hyphens, when it is Latin letters and nothing else. */
  romaji: string | null;
}

const HAN = /\p{Script=Han}/gu;
const KANA_ONLY = /^[ぁ-ゟ゠-ヿ]+$/;
// Modified Hepburn's letters: ASCII, the five macron vowels, and the apostrophe
// that separates n from a vowel (shin'ichi).
const ROMAJI_ONLY = /^[a-zāīūēō']+$/;

function parseQuery(raw: string): Query | null {
  let text = raw.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!text) return null;

  // "mizu kanji" is how people search Google for a character, and some type it
  // here too. The word says nothing about which kanji they want. Only at either
  // end: taken from the middle, it would leave a phrase that is no longer a
  // substring of the meaning it was typed from. (No lookbehind in the pattern:
  // Safari before 16.4 rejects it, and a regex that does not parse takes the
  // whole module, and the page's search, down with it.)
  text = text.replace(/^kanji (?=\S)/, '');
  if (text.endsWith(' kanji')) text = text.slice(0, -' kanji'.length);

  const compact = text.replace(/[\s-]+/g, '');
  return {
    characters: Array.from(new Set(text.match(HAN) ?? [])),
    text,
    kana: KANA_ONLY.test(compact) ? katakanaToHiragana(compact) : null,
    romaji: ROMAJI_ONLY.test(compact) ? compact : null,
  };
}

/** The best rank `k` earns for `q`, or null when nothing matches. */
function rankOf(k: SearchableKanji, q: Query): number | null {
  if (q.characters.includes(k.kanji)) return 0;

  const e = indexEntry(k);
  let best: number | null = null;
  const consider = (rank: number) => {
    if (best === null || rank < best) best = rank;
  };

  if (e.meanings.includes(q.text)) consider(1);
  else if (e.meanings.some(m => m.startsWith(q.text)) || e.meaningWords.some(w => w.startsWith(q.text))) consider(2);
  else if (e.meaning.includes(q.text)) consider(3);

  const { kana, romaji } = q;
  if (kana) {
    if (e.kana.includes(kana)) consider(1);
    else if (e.kana.some(form => form.startsWith(kana))) consider(2);
    else if (e.kanaText.includes(kana)) consider(3);
  }
  if (romaji) {
    if (e.romaji.includes(romaji)) consider(1);
    else if (e.romaji.some(key => key.startsWith(romaji))) consider(2);
  }

  return best;
}

/**
 * The kanji in `list` that match `query`, best matches first, and within a
 * rank in `list`'s own order. A blank query returns `list` itself.
 */
export function searchKanji<T extends SearchableKanji>(list: T[], query: string): T[] {
  if (!parseQuery(query)) return list;
  return rankKanji(list, query).map(hit => hit.item);
}

/**
 * `searchKanji` with each hit's rank kept, for a caller that has to decide
 * whether one kanji clearly won (the homepage search jumps straight to it).
 * A blank query finds nothing.
 */
export function rankKanji<T extends SearchableKanji>(list: T[], query: string): { item: T; rank: number }[] {
  const q = parseQuery(query);
  if (!q) return [];

  const hits: { item: T; rank: number; order: number }[] = [];
  list.forEach((item, position) => {
    const rank = rankOf(item, q);
    if (rank === null) return;
    // Characters typed into the query come back in the query's order, so
    // 日本 lists 日 before 本 whatever order the list holds them in.
    hits.push({ item, rank, order: rank === 0 ? q.characters.indexOf(item.kanji) : position });
  });

  hits.sort((a, b) => a.rank - b.rank || a.order - b.order);
  return hits.map(({ item, rank }) => ({ item, rank }));
}
