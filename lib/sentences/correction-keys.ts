/**
 * lib/sentences/correction-keys.ts
 *
 * How a reviewer's reading correction names the token it corrects.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT THE INDEX FORMAT PROMISED, AND WHY IT COULD NOT KEEP THE PROMISE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * `ReviewDecision.readingCorrections` used to be `Record<number, string>` —
 * keyed by the token's POSITION in `candidate.tokens`. That is a perfectly good
 * key for as long as the token array is immutable, and the token array is not.
 *
 * The essay at the top of types.ts states the design constraint plainly: the
 * queue is REGENERABLE and a reviewer's few hundred judgements must survive
 * being regenerated. Decisions are keyed by the stable Tatoeba pair id for
 * exactly that reason. But a correction is keyed WITHIN a decision, against the
 * token array — and `lib/sentences/reading-corrections.ts` MERGES tokens:
 *
 *   八《はち》 日《にち》   →   八日《ようか》
 *
 * A merge removes a token, so every index after it shifts down by one. Growing
 * the irregular-counter table by a single row — which that module is explicitly
 * designed to invite — silently renumbers the tokens of every sentence the new
 * row touches. The pair id is unchanged, the decision still loads, and
 * publish.ts's `applyCorrections` (positional, by construction) then writes the
 * reviewer's kana onto a DIFFERENT token: an unrelated word, rendered with
 * confident, plausible, wrong furigana. That is the precise failure mode the
 * whole sentences subsystem is built to make impossible.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SURFACE + OCCURRENCE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * A durable key names the token by what it IS rather than where it sits: its
 * surface form, plus which occurrence of that surface it is within the
 * sentence, 1-based.
 *
 *   `書き#1`   the first 書き in this sentence
 *   `日#2`     the second 日
 *
 * Surface is the right coordinate because `Token.surface` is derived from
 * verbatim source text that nobody — reviewer included — is permitted to edit,
 * and because the hard invariant (`tokens.map(t => t.surface).join('')` equals
 * `japanese`) means re-segmentation can only move the boundaries between
 * surfaces, never the characters. The occurrence number disambiguates the
 * repeats, which are common: 日 appears twice in a date, は everywhere.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * IT FAILS LOUDLY, AND THAT IS THE POINT
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * A surface key is not merge-proof either — after the 八日 merge, a correction
 * that named `日#1` names nothing, because there is no bare 日 token any more.
 * The difference, and the entire reason for the change, is the FAILURE MODE.
 * An index that has drifted still resolves; it just resolves to the wrong
 * token, and nothing anywhere can tell. A surface key that has drifted resolves
 * to nothing at all, and every caller here is built to say so:
 *
 *   - `resolveCorrectionKey` returns -1, never a nearest match
 *   - `toIndexed` RETURNS the unresolved keys rather than dropping them
 *   - `record-decision.ts` refuses a key that names no token
 *   - `publish.ts` refuses to publish the sentence at all
 *
 * There is deliberately no best-effort remap — no "the reviewer probably meant
 * the merged token", no fuzzy surface containment. A remap would be a guess
 * about a human judgement, dressed as a recovered one, and it would ship as
 * furigana. When a key stops resolving, the correct answer is a human looking
 * at the sentence again; the job of this module is to make sure someone is
 * asked.
 *
 * Dependency-free on purpose: the reviewer UI imports it in the BROWSER and the
 * publish script imports it in Node. No `fs`, no Node builtins.
 */

import type { Token } from './types';

/** Separates the surface from its occurrence number. Always the LAST one. */
const SEPARATOR = '#';

/**
 * The durable key for `tokens[index]`.
 *
 * Throws on an index that is not in the array — a caller building a key for a
 * token it does not have is a programming error, not a data condition, and the
 * silent alternative is `undefined#1` reaching the decision log.
 */
export function correctionKey(tokens: Token[], index: number): string {
  const token = tokens[index];
  if (!token) {
    throw new RangeError(
      `correctionKey: index ${index} is out of range (${tokens.length} tokens)`
    );
  }

  let occurrence = 0;
  for (let i = 0; i <= index; i += 1) {
    if (tokens[i].surface === token.surface) occurrence += 1;
  }

  return `${token.surface}${SEPARATOR}${occurrence}`;
}

/**
 * The index of the token `key` names, or -1 when this array has no such token.
 *
 * -1 is a real answer, not an error signal to be swallowed: it means the token
 * this correction was written against no longer exists, which is a fact the
 * caller has to act on. See the header.
 *
 * The occurrence number is parsed off the END, at the LAST separator, so a
 * surface that itself contains `#` round-trips. Tatoeba text is arbitrary —
 * `#1` is an ordinary thing to write in a sentence — and a key like `##1` must
 * mean "the first `#` token", not "a surface of empty string".
 */
export function resolveCorrectionKey(tokens: Token[], key: string): number {
  const cut = key.lastIndexOf(SEPARATOR);
  if (cut <= 0) return -1; // no separator, or nothing before it to be a surface

  const surface = key.slice(0, cut);
  const suffix = key.slice(cut + 1);
  if (!/^[1-9][0-9]*$/.test(suffix)) return -1;
  const wanted = Number(suffix);

  let occurrence = 0;
  for (let i = 0; i < tokens.length; i += 1) {
    if (tokens[i].surface !== surface) continue;
    occurrence += 1;
    if (occurrence === wanted) return i;
  }
  return -1;
}

/**
 * Index-form → key-form, for writing a decision.
 *
 * An index with no token behind it is dropped rather than thrown on: this runs
 * at the reviewer's save boundary, where transient editing state can outlive
 * the token array it was typed against, and losing an empty draft entry is
 * better than losing the whole decision to an exception.
 */
export function toKeyed(
  tokens: Token[],
  byIndex: Record<number, string>
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [rawIndex, value] of Object.entries(byIndex)) {
    const index = Number(rawIndex);
    if (!Number.isInteger(index) || !tokens[index]) continue;
    out[correctionKey(tokens, index)] = value;
  }
  return out;
}

/**
 * Key-form → index-form, for rendering and for publishing.
 *
 * `unresolved` carries every key that names no token in `tokens`. It is
 * RETURNED rather than logged-and-forgotten because each caller owes the
 * reviewer a different response — the UI shows the corrections it could not
 * place, publish refuses to write the sentence — and neither of those is
 * possible if this function quietly returns the resolvable subset.
 */
export function toIndexed(
  tokens: Token[],
  byKey: Record<string, string>
): { corrections: Record<number, string>; unresolved: string[] } {
  const corrections: Record<number, string> = {};
  const unresolved: string[] = [];

  for (const [key, value] of Object.entries(byKey)) {
    const index = resolveCorrectionKey(tokens, key);
    if (index < 0) {
      unresolved.push(key);
      continue;
    }
    corrections[index] = value;
  }

  return { corrections, unresolved };
}

/**
 * What a key would have had to match, phrased for a human. Shared by every
 * refusal path so the reviewer reads the same sentence in the terminal and in
 * the browser.
 */
export function describeUnresolvedKey(key: string): string {
  const cut = key.lastIndexOf(SEPARATOR);
  if (cut <= 0 || !/^[1-9][0-9]*$/.test(key.slice(cut + 1))) {
    return `"${key}" is not a correction key — the format is <surface>#<occurrence>, e.g. 日#2`;
  }
  const surface = key.slice(0, cut);
  const occurrence = key.slice(cut + 1);
  return `"${key}" names occurrence ${occurrence} of the token 「${surface}」, and this sentence has no such token`;
}
