/**
 * The contract between an episode's dialogue and its authored readings.
 *
 * Pure, so `pnpm validate:stories` can run it on the real data and on broken
 * fixtures alike (a check nobody has seen fail is not known to work).
 *
 * The consistency test cannot prove a reading is RIGHT (only the Japanese
 * reviewer can), but it catches the mistakes a typo or a stale edit makes: a
 * reading that has lost or changed a kana the dialogue spells out, a line
 * count that drifted, a stray kanji or Latin letter.
 */
import type { Episode, EpisodeReadings } from './types';
import { READING_PUNCTUATION } from './romaji-lines';

const KANA_ONLY = new RegExp(`^[ぁ-ゖァ-ヺー\\s|${READING_PUNCTUATION}]+$`);
const KANA = /[ぁ-ゖァ-ヺー]/g;

/** Hiragana for comparison: names are katakana in one place and may not be in the other. */
function fold(text: string): string {
  return text.replace(/[ァ-ヶ]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60));
}

/** Kana the dialogue spells out: kanji, spaces and punctuation dropped. */
function kanaOf(text: string): string {
  return fold((text.match(KANA) ?? []).join(''));
}

/** The pronunciation-kana rewrites a particle makes: は read わ, へ read え, を read お. */
const PRONOUNCED: Readonly<Record<string, string>> = { は: 'わ', へ: 'え', を: 'お' };

/**
 * True when every kana of `ja` appears in `reading`, in order. The reading adds
 * the kana that kanji stand for, so it is longer; a particle may be written as
 * it is said (は~わ, へ~え, を~お).
 */
export function isKanaSubsequence(ja: string, reading: string): boolean {
  const want = kanaOf(ja);
  const have = kanaOf(reading.replace(new RegExp(`[\\s|${READING_PUNCTUATION}]`, 'g'), ''));
  let at = 0;
  for (const ch of want) {
    const accepted = [ch, PRONOUNCED[ch]];
    while (at < have.length && !accepted.includes(have[at])) at++;
    if (at === have.length) return false;
    at++;
  }
  return true;
}

export function readingProblems(episode: Episode, readings: EpisodeReadings | undefined): string[] {
  if (!readings) return [`has no readings file (data/stories/readings/ep-${String(episode.number).padStart(2, '0')}.ts)`];
  const problems: string[] = [];
  if (readings.slug !== episode.slug) {
    problems.push(`readings are for "${readings.slug}", not "${episode.slug}"`);
  }
  const panelIds = episode.panels.map(p => p.id);
  for (const id of Object.keys(readings.panels)) {
    if (!panelIds.includes(id)) problems.push(`readings have a panel ${id} the episode does not`);
  }
  for (const panel of episode.panels) {
    const lines = readings.panels[panel.id];
    if (!lines) {
      problems.push(`${panel.id} has no readings`);
      continue;
    }
    if (lines.length !== panel.lines.length) {
      problems.push(`${panel.id} has ${lines.length} reading(s) for ${panel.lines.length} line(s)`);
      continue;
    }
    panel.lines.forEach((line, i) => {
      const reading = lines[i];
      if (!reading.trim()) {
        problems.push(`${panel.id} line ${i + 1}: empty reading`);
      } else if (!KANA_ONLY.test(reading)) {
        problems.push(`${panel.id} line ${i + 1}: "${reading}" has something other than kana, ー, spaces, | and 。、！？…`);
      } else if (!isKanaSubsequence(line.ja, reading)) {
        problems.push(`${panel.id} line ${i + 1}: reading "${reading}" does not contain the kana of "${line.ja}" in order`);
      }
    });
  }
  return problems;
}
