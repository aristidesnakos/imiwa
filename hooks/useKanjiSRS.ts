'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  SRSCard,
  KanjiSRSData,
  ReviewQuality,
  createNewCard,
  applyReview,
  isDue,
} from '@/lib/srs';

const SRS_STORAGE_KEY = 'kanji-srs';

// Shape-checked, never trusted: every consumer indexes `cards[kanji]`, so a
// stored blob without a `cards` object would throw on the review page. Rejected
// rather than deleted — the same rule useKanjiProgress follows — because an
// unrecognised blob may still be someone's recoverable review history.
function normaliseStoredSRS(value: unknown): KanjiSRSData | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const cards = (value as { cards?: unknown }).cards;
  if (typeof cards !== 'object' || cards === null || Array.isArray(cards)) return null;
  return { cards: cards as KanjiSRSData['cards'] };
}

/** What is stored right now; `raw` tells "nothing" apart from "unreadable". */
function readStoredSRS(): { data: KanjiSRSData | null; raw: string | null } {
  const raw = localStorage.getItem(SRS_STORAGE_KEY);
  if (raw === null) return { data: null, raw: null };
  try {
    return { data: normaliseStoredSRS(JSON.parse(raw)), raw };
  } catch {
    return { data: null, raw };
  }
}

export function useKanjiSRS() {
  const [srsData, setSRSData] = useState<KanjiSRSData>({ cards: {} });

  // Load from localStorage on mount
  useEffect(() => {
    const { data, raw } = readStoredSRS();
    if (data) setSRSData(data);
    else if (raw !== null) console.warn('Ignoring stored SRS data: unexpected shape.');
  }, []);

  const srsRef = useRef(srsData);
  useEffect(() => {
    srsRef.current = srsData;
  }, [srsData]);

  /**
   * Every write starts from what is stored NOW, not from this tab's copy from
   * mount: that used to write stale cards over reviews another tab had just
   * saved. `raw` travels with it so `write` can tell an unreadable blob from
   * an empty slot. Runs in the handler, not a setState updater, because React
   * may run an updater twice.
   */
  const readForWrite = useCallback((): { base: KanjiSRSData; unreadable: string | null } => {
    const { data, raw } = readStoredSRS();
    return { base: data ?? srsRef.current, unreadable: data === null ? raw : null };
  }, []);

  /** Store `next`, first keeping any unreadable blob under a key of its own. */
  const write = useCallback((next: KanjiSRSData, unreadable: string | null): void => {
    if (unreadable !== null) {
      localStorage.setItem(`${SRS_STORAGE_KEY}.unrecognised.${Date.now()}`, unreadable);
    }
    localStorage.setItem(SRS_STORAGE_KEY, JSON.stringify(next));
    setSRSData(next);
  }, []);

  // Follow reviews saved in other tabs (the event only fires in those tabs).
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== SRS_STORAGE_KEY) return;
      if (event.newValue === null) {
        setSRSData({ cards: {} });
        return;
      }
      try {
        const normalised = normaliseStoredSRS(JSON.parse(event.newValue));
        if (normalised) setSRSData(normalised);
      } catch {
        // Unreadable: keep what we have.
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  /** Ensure a card exists for the given kanji (idempotent). */
  const ensureCard = useCallback(
    (kanji: string): void => {
      if (typeof window === 'undefined') return;
      const { base, unreadable } = readForWrite();
      if (base.cards[kanji]) return; // already exists
      write({ cards: { ...base.cards, [kanji]: createNewCard() } }, unreadable);
    },
    [readForWrite, write],
  );

  /**
   * Initialise SRS cards for every learned kanji that doesn't have one yet.
   * Call this when entering the review session with the full learned list.
   */
  const initCardsForLearned = useCallback(
    (learnedKanji: string[]): void => {
      if (typeof window === 'undefined') return;
      const { base, unreadable } = readForWrite();
      const cards = { ...base.cards };
      let changed = false;
      for (const kanji of learnedKanji) {
        if (!cards[kanji]) {
          cards[kanji] = createNewCard();
          changed = true;
        }
      }
      if (changed) write({ cards }, unreadable);
    },
    [readForWrite, write],
  );

  /** Submit a review result for a single kanji. */
  const submitReview = useCallback(
    (kanji: string, quality: ReviewQuality): void => {
      if (typeof window === 'undefined') return;
      const { base, unreadable } = readForWrite();
      const updated = applyReview(base.cards[kanji] ?? createNewCard(), quality);
      write({ cards: { ...base.cards, [kanji]: updated } }, unreadable);
    },
    [readForWrite, write],
  );

  /** Return the card for a given kanji (or undefined). */
  const getCard = useCallback(
    (kanji: string): SRSCard | undefined => {
      return srsData.cards[kanji];
    },
    [srsData],
  );

  /** Get all kanji that are currently due for review, filtered to the given list. */
  const getDueKanji = useCallback(
    (learnedKanji: string[]): string[] => {
      return learnedKanji.filter((kanji) => {
        const card = srsData.cards[kanji];
        // New card (no SRS entry yet) or due card
        return !card || isDue(card);
      });
    },
    [srsData],
  );

  /** Number of due cards from the learned list. */
  const getDueCount = useCallback(
    (learnedKanji: string[]): number => {
      return getDueKanji(learnedKanji).length;
    },
    [getDueKanji],
  );

  return {
    srsData,
    ensureCard,
    initCardsForLearned,
    submitReview,
    getCard,
    getDueKanji,
    getDueCount,
  };
}
