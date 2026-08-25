/**
 * lib/sentences/ruby.ts
 *
 * Works out **which part of a token the reading is actually for**, so ruby sits
 * over the kanji and nowhere else.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE DEFECT THIS REPLACES
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The renderer used to span the whole reading across the whole surface. A token
 * is `{ surface, reading }` and nothing tells you where inside the surface the
 * reading applies, so the old rule was simply "if it has kanji, put the kana on
 * top of all of it". For 「日本」/「にほん」 that is right. For anything with kana
 * already visible in the surface it is not:
 *
 *   フランス語《ふらんすご》   ふらんす set over katakana that reads itself
 *   東アジア《ひがしあじあ》   あじあ set over アジア
 *   東京ドーム《とうきょうどーむ》
 *   書き《かき》              okurigana き annotated with き
 *
 * Nothing crashes on any of these. They are the *most* dangerous kind of wrong,
 * because a learner reading フランス語 with ふらんす floating over フランス is
 * being taught that those four characters are the ones spelled ふらんす — which
 * happens to be true here and is nonsense in the general case (東 is not ひがし
 * あじあ). The page looks finished. It just teaches the wrong thing.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY EDGE TRIMMING, AND ONLY EDGE TRIMMING
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Kana that is visible in the surface and repeated at the same edge of the
 * reading is not an annotation, it is the same characters twice. Removing it is
 * a *deduction*, not a guess: the leading フランス of the surface and the
 * leading ふらんす of the reading are the same four morae under a katakana fold,
 * so the reading that remains — ご — belongs to what remains of the surface.
 *
 * That deduction is safe from the two ends inward and stops being safe the
 * moment it reaches the middle. 「打ち合わせ」/「うちあわせ」 has interior kana
 * ち and わ, and splitting the remaining reading across 打 and 合 requires
 * knowing that 打 is う and 合 is あ — a dictionary lookup, not a string
 * operation, and one that goes silently wrong on the jukugo where the split is
 * not one-to-one. So 打ち合わせ deliberately stays a single span,
 * 打ち合《うちあ》わせ: a wider annotation than ideal, but never a false one.
 * Multi-span alignment is a different and much harder problem. This module does
 * not attempt it, and the boundary is the point rather than an omission.
 *
 * The comparison folds katakana to hiragana because our readings are hiragana
 * and the surface is not. `scripts/sentences/select.ts` holds the tokenizer-side
 * twin of `foldKana` (`katakanaToHiragana`); the two are intentionally separate
 * copies, because this one ships in the client bundle and select.ts does not.
 * ー (U+30FC) and ・ (U+30FB) pass through unshifted — the long-vowel mark is
 * written in hiragana too, and shifting it would break どーむ ↔ ドーム.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE RECONSTRUCTION INVARIANT
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *   lead + base + tail === surface,  ALWAYS.
 *
 * This is not tidiness. The surface is verbatim licensed source text: Tatoeba's
 * sentences are contributors' work under CC BY, and our position is that we
 * republish them unmodified with attribution. A trim that dropped a character
 * on the floor would edit someone else's sentence on the page while still
 * crediting them for it — which is both a licence problem and a lie about what
 * the corpus says. Every character removed from the *annotation* is therefore
 * re-emitted as plain text either side of the ruby, and the validator asserts
 * the join over the whole committed corpus rather than trusting the code.
 *
 * Dependency-free by design apart from the `Token` type: this is imported by a
 * rendering component and /kanji runs against a hard Lighthouse byte budget.
 */

import type { Token } from './types';

/** CJK ideographs, extension A, and the compatibility block. */
export const HAS_KANJI = /[㐀-䶿一-鿿豈-﫿]/;

/**
 * Kana, both syllabaries, plus the iteration marks, the long-vowel mark and the
 * katakana middle dot. Only characters matching this may ever be trimmed.
 */
const IS_KANA = /[ぁ-ゖゝゞァ-ヺ・ーヽヾ]/;

/**
 * Fold katakana to hiragana so a surface and a reading can be compared.
 *
 * U+30A1..U+30F6 is the katakana range with a one-to-one hiragana counterpart,
 * 0x60 below it. Everything else — ー, ・, the iteration marks, kanji, digits,
 * punctuation — passes through untouched. `scripts/sentences/select.ts` carries
 * the tokenizer-side twin of this function; do not merge them.
 */
export function foldKana(s: string): string {
  let out = '';
  for (const ch of s) {
    const code = ch.codePointAt(0)!;
    out += code >= 0x30a1 && code <= 0x30f6 ? String.fromCodePoint(code - 0x60) : ch;
  }
  return out;
}

/**
 * A token split into the part that carries ruby and the plain text either side.
 * `lead + base + tail` reconstructs the original surface exactly; `reading` is
 * the reading with the matched edges removed, and annotates `base` alone.
 */
export interface RubySegments {
  lead: string;
  base: string;
  reading: string;
  tail: string;
}

/**
 * Split a surface and its reading into `lead + base《reading》+ tail`.
 *
 * Returns `null` when there is nothing worth annotating: no reading, no kanji
 * in the surface, or a trim that consumed everything it could have annotated.
 * A `null` here means "render this token as plain text", never "render it
 * wrong".
 */
export function rubySegments(surface: string, reading: string | undefined): RubySegments | null {
  if (!reading) return null;
  if (!HAS_KANJI.test(surface)) return null;

  const s = Array.from(surface);
  const r = Array.from(foldKana(reading));
  const raw = Array.from(reading);

  // Trim the front while the surface character is kana and matches the reading.
  let sHead = 0;
  let rHead = 0;
  while (sHead < s.length && rHead < r.length && IS_KANA.test(s[sHead]) && foldKana(s[sHead]) === r[rHead]) {
    sHead += 1;
    rHead += 1;
  }

  // Then the back, never crossing what the front already took.
  let sTail = s.length;
  let rTail = r.length;
  while (sTail > sHead && rTail > rHead && IS_KANA.test(s[sTail - 1]) && foldKana(s[sTail - 1]) === r[rTail - 1]) {
    sTail -= 1;
    rTail -= 1;
  }

  const base = s.slice(sHead, sTail).join('');
  const trimmed = raw.slice(rHead, rTail).join('');

  if (!base || !trimmed) return null;
  if (!HAS_KANJI.test(base)) return null;

  return {
    lead: s.slice(0, sHead).join(''),
    base,
    reading: trimmed,
    tail: s.slice(sTail).join(''),
  };
}

/** True when a token should carry ruby at all. */
export function rendersAsRuby(token: Token): boolean {
  if (token.readingUnknown) return false;
  return rubySegments(token.surface, token.reading) !== null;
}
