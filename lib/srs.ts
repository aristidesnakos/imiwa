/**
 * Spaced Repetition System (SRS) based on the SM-2 algorithm.
 * Reference: https://www.supermemo.com/en/archives1990-2015/english/ol/sm2
 */

export interface SRSCard {
  /** Days between reviews */
  interval: number;
  /** Number of consecutive successful reviews */
  repetitions: number;
  /** Ease factor (difficulty multiplier), min 1.3, starts at 2.5 */
  easeFactor: number;
  /** Timestamp (ms) when the card is next due for review */
  nextReview: number;
  /** Timestamp (ms) of the last review */
  lastReview: number;
}

export type ReviewQuality =
  | 0  // Complete blackout
  | 1  // Incorrect, but remembered on seeing answer
  | 2  // Incorrect, but easy to recall correct answer
  | 3  // Correct with serious difficulty (Hard)
  | 4  // Correct after a hesitation (Good)
  | 5; // Perfect recall (Easy)

export interface KanjiSRSData {
  cards: Record<string, SRSCard>;
}

/** Create a brand-new SRS card (never reviewed) */
export function createNewCard(): SRSCard {
  return {
    interval: 0,
    repetitions: 0,
    easeFactor: 2.5,
    nextReview: Date.now(),
    lastReview: 0,
  };
}

/**
 * Apply the SM-2 algorithm and return the updated card.
 * quality: 0-5 where <3 = fail, >=3 = pass (3=Hard, 4=Good, 5=Easy)
 */
export function applyReview(card: SRSCard, quality: ReviewQuality): SRSCard {
  const now = Date.now();
  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  let { interval, repetitions, easeFactor } = card;

  if (quality < 3) {
    // Failed — restart from the beginning
    repetitions = 0;
    interval = 1;
  } else {
    // Passed
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions += 1;

    // Update ease factor (never below 1.3)
    easeFactor =
      easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (easeFactor < 1.3) easeFactor = 1.3;
  }

  return {
    interval,
    repetitions,
    easeFactor,
    nextReview: now + interval * MS_PER_DAY,
    lastReview: now,
  };
}

/** Returns true if a card is due for review right now */
export function isDue(card: SRSCard): boolean {
  return card.nextReview <= Date.now();
}

/** Human-readable label for the next review interval after choosing a quality */
export function previewNextInterval(
  card: SRSCard,
  quality: ReviewQuality,
): string {
  const updated = applyReview(card, quality);
  const days = updated.interval;
  if (days === 0) return 'now';
  if (days === 1) return '1 day';
  if (days < 30) return `${days} days`;
  const months = Math.round(days / 30);
  return months === 1 ? '1 month' : `${months} months`;
}
