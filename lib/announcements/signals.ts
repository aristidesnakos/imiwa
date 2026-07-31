/**
 * lib/announcements/signals.ts
 *
 * Reads the three localStorage keys the banner targets on, once, and hands
 * back a plain value.
 *
 * We read the raw keys rather than call `useKanjiProgress()` / `useKanjiSRS()`
 * on purpose. Those hooks hydrate in an effect, so a consumer would have to
 * wait a render for a truthful answer and would re-render on every progress
 * change — for a component whose whole job is one boolean decision taken once
 * on mount. Reading the keys directly makes the decision synchronous, and
 * makes `LearnerSignals` constructible in a test without React at all.
 *
 * The key names are duplicated from `hooks/useKanjiProgress.ts` and
 * `hooks/useKanjiSRS.ts` (both keep theirs private). If either moves, the
 * banner silently stops targeting — which is why
 * `scripts/announcements/validate.ts` asserts these strings still appear in
 * those hooks.
 */

import type { LearnerSignals } from './types';

export const PROGRESS_STORAGE_KEY = 'kanji-progress';
export const SRS_STORAGE_KEY = 'kanji-srs';
export const CONSENT_STORAGE_KEY = 'cookie-consent';

/** A visitor we know nothing about. Fails every audience gate, which is the
 *  right default for SSR and for storage-denied browsers. */
export const NO_SIGNALS: LearnerSignals = {
  learnedCount: 0,
  srsCardCount: 0,
  hasResolvedConsent: false,
};

function readJson(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function countArray(value: unknown, field: string): number {
  if (!value || typeof value !== 'object') return 0;
  const list = (value as Record<string, unknown>)[field];
  return Array.isArray(list) ? list.length : 0;
}

function countKeys(value: unknown, field: string): number {
  if (!value || typeof value !== 'object') return 0;
  const map = (value as Record<string, unknown>)[field];
  if (!map || typeof map !== 'object') return 0;
  return Object.keys(map).length;
}

export function readSignals(): LearnerSignals {
  if (typeof window === 'undefined') return NO_SIGNALS;

  return {
    // Evidence of actual use, not merely "has visited before". Someone who
    // arrived from search, read one kanji page and left has learned nothing
    // and gets told nothing.
    learnedCount: countArray(readJson(PROGRESS_STORAGE_KEY), 'learnedKanji'),
    srsCardCount: countKeys(readJson(SRS_STORAGE_KEY), 'cards'),
    // Presence, not the value: an answered consent bar is gone from the
    // screen, which is all we need before adding a second bar.
    hasResolvedConsent: readJson(CONSENT_STORAGE_KEY) !== null,
  };
}
