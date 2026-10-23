/**
 * A character page's own link card: one 1200x630 PNG per kanji, drawn on
 * demand by `app/kanji/[character]/share-card.png/route.tsx`.
 *
 * Its address, size and alt text live here because four places must agree on
 * them: the route that draws the card, the page's og:image (which twitter
 * inherits), the page's Article JSON-LD, and `scripts/validate-schema.ts`. So
 * does what the card says (the headline's lines and size, the reading chips),
 * which the route only draws: the alt text can then only name the readings the
 * card shows, and the fitting rules can be replayed over every kanji under tsx
 * without a server.
 *
 * Relative imports only, so scripts under tsx can import it, and nothing from
 * npm: the drawing (next/og, the fonts, Tan) stays in the route.
 */

import { SITE_URL } from './site';
import { kanjiReadings, type Reading, type ReadingSource } from '../romaji/readings';

/** The card's pixel size, the size og:image:width/height and the JSON-LD claim. */
export const KANJI_SHARE_CARD_SIZE = { width: 1200, height: 630 } as const;

/**
 * Root-relative path of a character's card, encoded exactly as its page URL is
 * (`/kanji/${encodeURIComponent(kanji)}`), like `strokeOrderImagePath()`.
 */
export function kanjiShareCardPath(kanji: string): string {
  return `/kanji/${encodeURIComponent(kanji)}/share-card.png`;
}

/** The card's absolute URL, on the canonical www host. */
export function kanjiShareCardUrl(kanji: string): string {
  return `${SITE_URL}${kanjiShareCardPath(kanji)}`;
}

// ─── Measuring ──────────────────────────────────────────────────────────────

/**
 * Advance widths, in thousandths of an em, read from the hmtx tables of the
 * Google Fonts files on 2026-10-23: a-z, A-Z and 0-9 in Noto Serif JP 900 (the
 * headline), a-z in Noto Sans JP 500 (the romaji). A macron vowel has its base
 * letter's width. Kana are a full em. Any character not listed counts as a full
 * em, so something unexpected can only make text measure wider than it draws.
 */
const SERIF_900_LOWER = [599, 689, 579, 673, 586, 409, 612, 700, 358, 347, 673, 366, 1025, 697, 637, 689, 657, 520, 512, 406, 691, 593, 893, 617, 598, 526];
const SERIF_900_UPPER = [761, 727, 708, 799, 674, 657, 766, 870, 437, 442, 786, 651, 1014, 825, 795, 690, 795, 770, 612, 714, 829, 744, 1111, 739, 708, 638];
const SERIF_900_DIGIT = [612, 463, 613, 612, 612, 613, 613, 608, 613, 614];
const SERIF_900_OTHER: Record<string, number> = {
  ' ': 247, "'": 255, '(': 418, ')': 418, '-': 382, '.': 340, ',': 340, ';': 340, ':': 340,
  '?': 494, '!': 380, '/': 425, '^': 615, '&': 815, '"': 484,
};
const SANS_500_LOWER = [575, 629, 517, 630, 566, 346, 578, 621, 288, 289, 575, 298, 943, 624, 615, 630, 630, 409, 480, 396, 620, 545, 829, 526, 544, 491];
const SANS_500_OTHER: Record<string, number> = { '-': 357, "'": 298 };

function emWidth(text: string, lower: number[], upper: number[] | null, digit: number[] | null, other: Record<string, number>): number {
  let em = 0;
  for (const ch of text.normalize('NFD').replace(/\p{M}/gu, '')) {
    const c = ch.charCodeAt(0);
    const w =
      c >= 97 && c <= 122 ? lower[c - 97]
      : upper && c >= 65 && c <= 90 ? upper[c - 65]
      : digit && c >= 48 && c <= 57 ? digit[c - 48]
      : other[ch] ?? 1000;
    em += w / 1000;
  }
  return em;
}

// ─── The headline ───────────────────────────────────────────────────────────

/**
 * The headline's column and its sizes, in px. The column stops short of the
 * rotated tile (its left edge is at x 617-640); two lines at the largest
 * two-line size still leave the chips, the tag line and the address their room,
 * as on the quiz card.
 */
export const HEADLINE = {
  width: 540,
  oneLineSize: 96,
  twoLineSizes: [76, 68, 60, 54, 48, 42, 36],
  /** Below this, a trailing gloss in brackets goes before the size does. */
  comfortableSize: 48,
  lineHeight: 1.04,
} as const;

/** Measured width at `size`, with 2% for rounding and anything the renderer adds. */
function headlineWidth(text: string, size: number): number {
  return emWidth(text, SERIF_900_LOWER, SERIF_900_UPPER, SERIF_900_DIGIT, SERIF_900_OTHER) * size * 1.02;
}

/**
 * Greedy word wrap at `size`, breaking only at spaces. Null when one word is
 * wider than the column. The route draws each line as its own element, so the
 * renderer never wraps differently from this.
 */
function wrap(text: string, size: number): string[] | null {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (headlineWidth(word, size) > HEADLINE.width) return null;
    const next = line ? `${line} ${word}` : word;
    if (line && headlineWidth(next, size) > HEADLINE.width) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * `piece(s) of firewood (esp. chopped or split from logs)` -> `piece(s) of
 * firewood`. Also drops an unclosed trailing bracket, which getPrimaryMeaning's
 * cut at the first comma leaves on a few glosses (`acidic drink made from
 * fermented milk (cow`).
 */
function withoutTrailingGloss(text: string): string {
  let out = text;
  for (let prev = ''; prev !== out; ) {
    prev = out;
    out = out.replace(/\s+\([^()]*\)?\s*$/, '');
  }
  return out || text;
}

/**
 * The headline: the primary meaning (`getPrimaryMeaning()`), at the largest
 * size that keeps it to two lines inside the column, so it can never run into
 * the tile or push the chips onto the address line. One line at the full size
 * if it fits; otherwise two, stepping down. A long meaning first loses size
 * down to `comfortableSize`, then its trailing bracketed gloss (the page still
 * has it), and only past the smallest size is it cut at a word, ending in
 * "...". The longest primary meanings are N1 glosses of 50-100 characters.
 */
export function kanjiShareCardHeadline(meaning: string): { lines: string[]; size: number } {
  const bare = withoutTrailingGloss(meaning);
  const { oneLineSize, twoLineSizes, comfortableSize } = HEADLINE;
  const attempts: [string, readonly number[]][] = [
    [meaning, [oneLineSize, ...twoLineSizes.filter(s => s >= comfortableSize)]],
    [bare, [oneLineSize, ...twoLineSizes]],
    [meaning, twoLineSizes.filter(s => s < comfortableSize)],
  ];
  for (const [text, sizes] of attempts) {
    for (const size of sizes) {
      const lines = wrap(text, size);
      if (lines && lines.length <= (size === oneLineSize ? 1 : 2)) return { lines, size };
    }
  }

  const size = HEADLINE.twoLineSizes[HEADLINE.twoLineSizes.length - 1];
  const words = bare.split(/\s+/).filter(Boolean);
  for (let n = words.length - 1; n > 0; n--) {
    const lines = wrap(`${words.slice(0, n).join(' ')}...`, size);
    if (lines && lines.length <= 2) return { lines, size };
  }
  return { lines: [words[0] ?? meaning], size };
}

// ─── Reading chips ──────────────────────────────────────────────────────────

/**
 * One chip's geometry, in px. The route draws with exactly these numbers, and
 * `kanjiShareCardChips()` packs with them, so a row it accepts is a row that
 * fits the headline's column.
 */
export const CHIP = {
  kanaSize: 30,
  romajiSize: 20,
  /** Space between the kana and the romaji. */
  innerGap: 10,
  padX: 18,
  border: 3,
  /** Between chips in a row, and between the two rows. */
  gap: 14,
  rowWidth: HEADLINE.width,
  /** Two rows of two, like the quiz card's 2x2 grid. */
  perRow: 2,
  maxRows: 2,
} as const;

export interface ShareCardChip {
  /** Kana as drawn: kunyomi in hiragana with okurigana, onyomi in katakana. */
  kana: string;
  /** Modified Hepburn with macrons, the whole word. */
  romaji: string;
  /** Measured width in px, border to border. */
  width: number;
}

function toKatakana(hiragana: string): string {
  return hiragana.replace(/[ぁ-ゖ]/g, ch => String.fromCharCode(ch.charCodeAt(0) + 0x60));
}

function chipFor(r: Reading): ShareCardChip {
  const word = r.kind === 'onyomi' ? toKatakana(r.kanaFull) : r.kanaFull;
  // A bound form keeps its hyphen on both sides, as the page's reading list
  // does, so `-たち -tachi` still reads as something that attaches.
  const kana = r.affix === 'suffix' ? `-${word}` : r.affix === 'prefix' ? `${word}-` : word;
  const romaji = r.affix === 'suffix' ? `-${r.romajiFull}` : r.affix === 'prefix' ? `${r.romajiFull}-` : r.romajiFull;
  let kanaEm = 0;
  for (const ch of kana) kanaEm += ch === '-' ? 0.4 : 1;
  const width = Math.ceil(
    2 * CHIP.border +
      2 * CHIP.padX +
      kanaEm * CHIP.kanaSize +
      CHIP.innerGap +
      emWidth(romaji, SANS_500_LOWER, null, null, SANS_500_OTHER) * CHIP.romajiSize +
      4,
  );
  return { kana, romaji, width };
}

/**
 * Free-standing readings only, unless a kind has none: 日's ひ shows and its
 * bound -び and -か do not, while 達, whose one kunyomi is -たち, keeps it.
 */
function freeUnlessNone(readings: Reading[]): Reading[] {
  const free = readings.filter(r => r.affix === 'none');
  return free.length > 0 ? free : readings;
}

/**
 * The reading chips on a character's card, as rows: at most two rows of two.
 * Empty for an entry with no readings.
 *
 * Kunyomi first, then onyomi, through `kanjiReadings()`, never the raw fields.
 * Kunyomi take the first places but leave two for the onyomi when there are
 * that many, so a kanji with four kunyomi (生, 上, 下) still shows the onyomi
 * a learner meets in compounds. Rows fill in order; a chip too wide for the
 * space left in either row is skipped rather than allowed to run toward the
 * tile, and the next one is tried.
 */
export function kanjiShareCardChips(source: ReadingSource): ShareCardChip[][] {
  const { kunyomi, onyomi } = kanjiReadings(source);
  const kun = freeUnlessNone(kunyomi);
  const on = freeUnlessNone(onyomi);
  const max = CHIP.perRow * CHIP.maxRows;
  const kunCount = Math.min(kun.length, Math.max(max - on.length, max / 2));
  const onCount = Math.min(on.length, max - kunCount);
  const candidates = [...kun.slice(0, kunCount), ...on.slice(0, onCount)].map(chipFor);

  const rows = Array.from({ length: CHIP.maxRows }, (): ShareCardChip[] => []);
  const used = rows.map(() => 0);
  for (const chip of candidates) {
    for (let row = 0; row < rows.length; row++) {
      const needed = (rows[row].length ? CHIP.gap : 0) + chip.width;
      if (rows[row].length < CHIP.perRow && used[row] + needed <= CHIP.rowWidth) {
        rows[row].push(chip);
        used[row] += needed;
        break;
      }
    }
  }
  return rows.filter(row => row.length > 0);
}

// ─── The image ──────────────────────────────────────────────────────────────

function listJoin(items: string[]): string {
  return items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/**
 * The card's text alternative. It says what the picture shows, in the order a
 * reader meets it: the character and its meaning, the readings on the card,
 * and Tan.
 */
export function kanjiShareCardAlt(kanji: string, meaning: string, chips: ShareCardChip[][]): string {
  const flat = chips.flat();
  const readings = flat.length
    ? `, with its reading${flat.length > 1 ? 's' : ''} ${listJoin(flat.map(c => `${c.kana} ${c.romaji}`))},`
    : ',';
  return `${kanji} (${meaning}): the kanji in a tile${readings} and Tan the tanuki pointing at it.`;
}

/**
 * The character's card as an og:image entry and the Article JSON-LD's second
 * image. `meaning` is the primary meaning (`getPrimaryMeaning()`), the one the
 * card's headline is drawn from.
 */
export function kanjiShareCardImage(
  kanji: string,
  meaning: string,
  readings: ReadingSource,
): { url: string; width: number; height: number; alt: string } {
  return {
    url: kanjiShareCardUrl(kanji),
    width: KANJI_SHARE_CARD_SIZE.width,
    height: KANJI_SHARE_CARD_SIZE.height,
    alt: kanjiShareCardAlt(kanji, meaning, kanjiShareCardChips(readings)),
  };
}
