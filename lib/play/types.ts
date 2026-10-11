/**
 * The data Tan Dash plays on: one record per N5 kanji and the ordered worlds.
 *
 * Built on the server by lib/play/build.ts and handed to the client island as
 * a prop, so the island never imports the kanji lists (CLAUDE.md, "Printable
 * sheets": the builder island takes the same approach). ~10 kB of JSON.
 */

export interface PlayKanji {
  /** The character, one code point. */
  c: string;
  /** One-word English for the meaning sign (lib/play/signs.ts). */
  en: string;
  /** The reading the kana sign asks for, in hiragana (lib/play/signs.ts). */
  kana: string;
  /** Every meaning in the dictionary entry, lowercased and trimmed. */
  meanings: string[];
  /** Every reading, hiragana, as stem and as whole word, deduped. */
  readings: string[];
}

export interface PlayWorld {
  /** 1-based, in play order. */
  n: number;
  title: string;
  titleJa: string;
  /** The kanji this world adds to the pool. Disjoint across worlds; all 82 in total. */
  kanji: string[];
  /** The episode this world is, or null for a game-only world. */
  episodeSlug: string | null;
}

export interface PlayData {
  kanji: PlayKanji[];
  worlds: PlayWorld[];
}
