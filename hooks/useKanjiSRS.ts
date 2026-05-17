'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  SRSCard,
  KanjiSRSData,
  ReviewQuality,
  createNewCard,
  applyReview,
  isDue,
} from '@/lib/srs';

const SRS_STORAGE_KEY = 'kanji-srs';

function loadSRSData(): KanjiSRSData {
  if (typeof window === 'undefined') return { cards: {} };
  try {
    const stored = localStorage.getItem(SRS_STORAGE_KEY);
    if (stored) return JSON.parse(stored) as KanjiSRSData;
  } catch {
    // ignore parse errors
  }
  return { cards: {} };
}

function saveSRSData(data: KanjiSRSData): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SRS_STORAGE_KEY, JSON.stringify(data));
  }
}

export function useKanjiSRS() {
  const [srsData, setSRSData] = useState<KanjiSRSData>({ cards: {} });

  // Load from localStorage on mount
  useEffect(() => {
    setSRSData(loadSRSData());
  }, []);

  /** Ensure a card exists for the given kanji (idempotent). */
  const ensureCard = useCallback((kanji: string): void => {
    setSRSData((prev) => {
      if (prev.cards[kanji]) return prev; // already exists
      const next: KanjiSRSData = {
        cards: { ...prev.cards, [kanji]: createNewCard() },
      };
      saveSRSData(next);
      return next;
    });
  }, []);

  /**
   * Initialise SRS cards for every learned kanji that doesn't have one yet.
   * Call this when entering the review session with the full learned list.
   */
  const initCardsForLearned = useCallback((learnedKanji: string[]): void => {
    setSRSData((prev) => {
      const newCards = { ...prev.cards };
      let changed = false;
      for (const kanji of learnedKanji) {
        if (!newCards[kanji]) {
          newCards[kanji] = createNewCard();
          changed = true;
        }
      }
      if (!changed) return prev;
      const next: KanjiSRSData = { cards: newCards };
      saveSRSData(next);
      return next;
    });
  }, []);

  /** Submit a review result for a single kanji. */
  const submitReview = useCallback(
    (kanji: string, quality: ReviewQuality): void => {
      setSRSData((prev) => {
        const existing = prev.cards[kanji] ?? createNewCard();
        const updated = applyReview(existing, quality);
        const next: KanjiSRSData = {
          cards: { ...prev.cards, [kanji]: updated },
        };
        saveSRSData(next);
        return next;
      });
    },
    [],
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
