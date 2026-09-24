import type { ReactNode } from 'react';

/**
 * Hiragana, katakana and the CJK ideograph blocks (Extension A, the unified
 * block, and compatibility ideographs), plus the iteration mark 々 (U+3005).
 * Written as escapes on purpose: a character class of literal glyphs is
 * unreadable in review, and an editor that normalises one of them silently
 * changes the range.
 */
const JAPANESE_RUN = /([\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\u3005]+)/;

/**
 * Wrap each run of Japanese in English prose in `lang="ja"`.
 *
 * Our editorial copy quotes a character or two ("the two kanji that write 日本,
 * Japan"), and every document here is lang="en": without the switch a screen
 * reader hands those characters to an English voice, which skips or mangles
 * them. `split()` with a capture group alternates text and match, so every odd
 * index is a Japanese run.
 */
export function withJapanese(text: string): ReactNode[] {
  return text.split(JAPANESE_RUN).map((part, index) =>
    index % 2 === 1 ? (
      <span key={index} lang="ja">
        {part}
      </span>
    ) : (
      part
    ),
  );
}
