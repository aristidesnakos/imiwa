/**
 * app/kanji/n5/quiz/jlpt-format.ts
 *
 * Pure helpers and constants shared by the server page (copy, counts) and the client
 * quiz (sets, scoring). It imports types only, never the data: the data file is read by
 * lib/jlpt/published.ts, which only server modules import, and page.tsx hands the items
 * down, so nothing here can pull the items into a bundle by itself.
 */

/**
 * The official free material. Verified to resolve with a HEAD request on 2026-10-05; the
 * bare /e/samples/ index answers 403, so do not link it. We link out and never copy a
 * question: those pages are the JLPT's own and the right place to see real ones.
 */
export const JLPT_SAMPLE_QUESTIONS_URL = 'https://www.jlpt.jp/e/samples/forlearners.html';
export const JLPT_SAMPLE_INDEX_URL = 'https://www.jlpt.jp/e/samples/sampleindex.html';

// The set grouping lives in lib/jlpt/sets.ts, where pages outside this route can count
// sets with the same function the quiz plays them with. Re-exported so the quiz's own
// imports did not have to move.
export { groupSets, largestSet, type JlptSet } from '@/lib/jlpt/sets';
