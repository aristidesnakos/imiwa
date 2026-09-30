/**
 * Romaji for an episode's dialogue, derived from its authored readings.
 *
 * Pure and `fs`-free: it reads the static registry in lib/stories/readings.ts
 * and the kana layer in lib/romaji/hepburn.ts, so the email renderer and the
 * page (which shows the same line behind a toggle) cannot disagree.
 *
 * Output is modified Hepburn with macrons (どう is dō), one string per line:
 * word spacing kept, the first letter capitalised, names (written in katakana)
 * capitalised, and Japanese punctuation turned into its Latin form.
 */
import { toRomaji } from '../romaji/hepburn';
import { readingsForSlug } from './readings';

const PUNCTUATION: Readonly<Record<string, string>> = {
  '。': '.',
  '、': ',',
  '！': '!',
  '？': '?',
  '…': '...',
};

/** The punctuation a reading may contain besides kana: see readings.ts. */
export const READING_PUNCTUATION = Object.keys(PUNCTUATION).join('');

const PUNCTUATION_SPLIT = new RegExp(`([${READING_PUNCTUATION}])`);

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * One reading line as romaji. Hepburn's kana layer passes non-kana through
 * unchanged, which would leave 。in the output, so punctuation is split out and
 * mapped here; everything between is handed to `toRomaji` whole, so gemination
 * and long vowels are decided by the same code the dictionary uses.
 */
export function romajiFromReading(reading: string): string {
  const words = reading
    .split(/[\s|]+/)
    .filter(Boolean)
    .map(word => {
      const romaji = word
        .split(PUNCTUATION_SPLIT)
        .map(part => PUNCTUATION[part] ?? toRomaji(part, 'macron'))
        .join('');
      // A word that opens in katakana is a name (タン, チュン).
      return /^[ァ-ヺ]/.test(word) ? capitalise(romaji) : romaji;
    });
  // The Japanese may run punctuation straight into the next word (はい、せんせい),
  // which Latin text does not.
  return capitalise(words.join(' ').replace(/([,.!?])(?=[A-Za-zĀĪŪĒŌāīūēō])/g, '$1 '));
}

/** The romaji for each line of a panel, or null if the episode has no readings. */
export function panelRomaji(slug: string, panelId: string): string[] | null {
  const lines = readingsForSlug(slug)?.panels[panelId];
  return lines ? lines.map(romajiFromReading) : null;
}
