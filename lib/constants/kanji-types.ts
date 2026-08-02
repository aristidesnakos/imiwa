/**
 * The canonical shapes for kanji entries.
 *
 * This file exists because `KanjiData` used to be declared seven times: six
 * byte-identical copies at the top of each `lib/constants/*-kanji.ts`, plus a
 * seventh in `lib/seo/kanji-optimization.ts` that shared the NAME but not the
 * SHAPE — it carried an extra `level`. Two different types under one name is
 * something TypeScript cannot warn about, so consumers imported whichever they
 * happened to reach for, and four files ended up rebuilding the wider shape by
 * hand as `KanjiData & { level: string }`.
 *
 * `level` is deliberately NOT part of `KanjiData`. It is not stored in the data
 * at all: which list a character lives in *is* its level, and the field is
 * attached at the call sites that merge the five level lists into one
 * collection (`app/api/kanji-sheets/route.ts`, `KanjiSearchClient`,
 * `ReviewClient`, `/kanji/[character]`). Storing it would duplicate ~1,896
 * strings into the bundle to say something the file name already says.
 *
 * Types only — never re-export the kanji DATA arrays from here. Five routes
 * import exactly one level list each, and a barrel would pull the other four
 * into their bundles and blow the Lighthouse byte budget.
 */

export interface KanjiData {
  kanji: string;
  onyomi: string;
  kunyomi: string;
  meaning: string;
}

/**
 * A `KanjiData` entry tagged with the JLPT list it was merged in from.
 *
 * One deliberate hold-out: `app/kanji/KanjiSearchClient.tsx` keeps its own
 * local declaration, because its `level` is the narrow `JLPTLevel` union rather
 * than `string` and that file filters on it. Switching it to this type would
 * widen the field and lose a real check, so it is left alone on purpose — not
 * an oversight to tidy up later.
 */
export interface KanjiWithLevel extends KanjiData {
  level: string;
}
