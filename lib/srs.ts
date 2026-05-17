/**
 * Spaced Repetition System (SRS) based on the SM-2 algorithm.
 * Reference: https://www.supermemo.com/en/archives1990-2015/english/ol/sm2
 */

export interface SRSCard {
  /** Days between reviews (fractional values allow minute/hour-level steps) */
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
  const MINUTES_10 = 10 / (24 * 60);
  const HOUR_1 = 1 / 24;
  const DAYS_1 = 1;
  const DAYS_4 = 4;

  let { interval, repetitions, easeFactor } = card;

  if (repetitions === 0) {
    // Learning step for new cards: distinct, simple, and proven in practice.
    if (quality <= 1) {
      interval = MINUTES_10; // Again
      repetitions = 0;
    } else if (quality <= 3) {
      interval = HOUR_1; // Hard
      repetitions = 0;
    } else if (quality === 4) {
      interval = DAYS_1; // Good
      repetitions = 1;
    } else {
      interval = DAYS_4; // Easy
      repetitions = 1;
    }

    easeFactor =
      easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (easeFactor < 1.3) easeFactor = 1.3;
  } else if (quality < 3) {
    // Lapse for reviewed cards: re-enter short relearning step.
    repetitions = 0;
    interval = MINUTES_10;
  } else {
    // Passed
    if (repetitions === 1) {
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
  if (days < 1 / 24) {
    const minutes = Math.max(1, Math.round(days * 24 * 60));
    return minutes === 1 ? '1 min' : `${minutes} min`;
  }
  if (days < 1) {
    const hours = Math.max(1, Math.round(days * 24));
    return hours === 1 ? '1 hour' : `${hours} hours`;
  }
  if (Math.round(days) === 1) return '1 day';
  if (days < 30) return `${days} days`;
  const months = Math.round(days / 30);
  return months === 1 ? '1 month' : `${months} months`;
}
