/**
 * lib/sentences/published.ts
 *
 * The site's read path for layer 4. This is the ONLY module the kanji page
 * touches — `store.ts` is the review tool's path and uses `fs`, which has no
 * business in a rendered page.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY STATIC IMPORTS AND NOT `fs`
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * `/kanji/[character]` is prerendered for all ~1,896 characters, but it also
 * sets `revalidate` and `dynamicParams`, so it can render on demand at runtime
 * too. A runtime `fs.readFileSync(process.cwd() + …)` would work at build time
 * and then fail in a serverless function, because Next's file tracing cannot
 * see a path it never resolved statically. A plain JSON import is traced,
 * bundled, and correct in both.
 *
 * The cost is that every level's file is in the server bundle. That is fine and
 * stays fine: the full five-level set is a few MB of JSON server-side, none of
 * it crosses to the client — the page is a Server Component and passes only one
 * kanji's two or three sentences into the tree.
 *
 * Each level's file is committed, and an empty `[]` is a valid, expected state.
 * Adding a level here means committing its file first; the build should fail
 * loudly on a missing import rather than silently rendering no sentences.
 */

import type { ExampleSentence } from './types';

import N5 from '../../data/sentences/published/N5.json';

/**
 * Every published sentence, indexed by `reviewedFor` — the kanji a human
 * actually adjudicated it against.
 *
 * NOT indexed by `kanji` or `targets`. Those would be larger and free: a
 * sentence containing 日 and 今 would appear on both pages after one review.
 * But `target-kanji-unused` is a real reject reason — a sentence can be
 * natural, well translated, and still a poor demonstration of one of the
 * characters in it — so that shortcut publishes a judgement nobody made. See
 * `ExampleSentence.reviewedFor`.
 *
 * Order within a kanji is publish order, which is rank order after the
 * sense-spread pass.
 */
const BY_KANJI: ReadonlyMap<string, ExampleSentence[]> = (() => {
  const map = new Map<string, ExampleSentence[]>();
  for (const sentence of N5 as unknown as ExampleSentence[]) {
    for (const kanji of sentence.reviewedFor) {
      const bucket = map.get(kanji) ?? [];
      bucket.push(sentence);
      map.set(kanji, bucket);
    }
  }
  return map;
})();

/**
 * Sentences to show on one kanji's page. Empty is normal and common — 160 kanji
 * have no usable candidate in the entire corpus, and every level beyond N5 is
 * unreviewed. The caller omits the section entirely rather than rendering an
 * empty one.
 */
export function sentencesForKanji(kanji: string, limit = 3): ExampleSentence[] {
  const all = BY_KANJI.get(kanji);
  if (!all) return [];
  return all.slice(0, limit);
}
