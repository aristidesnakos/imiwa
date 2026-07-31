'use client';

import { useState, useEffect, useCallback } from 'react';

interface KanjiProgressData {
  learnedKanji: string[];
  timestamps: Record<string, number>;
}

type TimePeriod = '24h' | '7d' | '30d' | '12m';

interface TimeBucket {
  start: number;
  label: string;
}

const STORAGE_KEY = 'kanji-progress';

// Labels are display-only. They are never used as bucket identity: two buckets
// may legitimately render the same label, and a label built from a timestamp
// would not match a pre-seeded one anyway.
function getBucketLabel(date: Date, period: TimePeriod): string {
  switch (period) {
    case '24h':
      return date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
    case '7d':
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    case '30d':
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    case '12m':
      return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    default:
      return date.toISOString().split('T')[0];
  }
}

// Ordered bucket boundaries for a period, oldest first, ending with the bucket
// that contains `now`. Boundaries are floored so a timestamp anywhere inside the
// hour/day/month lands in the bucket that represents it.
function buildBuckets(period: TimePeriod, now: Date): TimeBucket[] {
  const buckets: TimeBucket[] = [];

  if (period === '24h') {
    const anchor = new Date(now);
    anchor.setMinutes(0, 0, 0);
    for (let i = 23; i >= 0; i--) {
      const start = new Date(anchor);
      start.setHours(anchor.getHours() - i);
      buckets.push({ start: start.getTime(), label: getBucketLabel(start, period) });
    }
    return buckets;
  }

  if (period === '12m') {
    // Built from (year, month) arithmetic rather than setMonth() on `now`: on the
    // 29th-31st, stepping a month from Jul 31 lands on Oct 1 and September vanishes.
    for (let i = 11; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({ start: start.getTime(), label: getBucketLabel(start, period) });
    }
    return buckets;
  }

  const days = period === '7d' ? 7 : 30;
  const anchor = new Date(now);
  anchor.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const start = new Date(anchor);
    start.setDate(anchor.getDate() - i);
    buckets.push({ start: start.getTime(), label: getBucketLabel(start, period) });
  }
  return buckets;
}

// Stored progress drives `learnedKanji.includes(...)` all over the app, so a blob
// of the wrong shape white-screens the review and progress pages. Reject it rather
// than trusting JSON.parse — but never delete it: an unrecognised shape may still
// be recoverable, and destroying someone's progress is worse than an empty chart.
function normaliseStoredProgress(value: unknown): KanjiProgressData | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;

  const candidate = value as Partial<KanjiProgressData>;
  if (!Array.isArray(candidate.learnedKanji)) return null;

  const hasTimestamps =
    typeof candidate.timestamps === 'object' &&
    candidate.timestamps !== null &&
    !Array.isArray(candidate.timestamps);

  return {
    learnedKanji: candidate.learnedKanji,
    // A missing timestamps map only costs us the chart, not the learned list
    timestamps: hasTimestamps ? (candidate.timestamps as Record<string, number>) : {},
  };
}

export function useKanjiProgress() {
  const [progressData, setProgressData] = useState<KanjiProgressData>({
    learnedKanji: [],
    timestamps: {},
  });

  // Load progress data from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const normalised = normaliseStoredProgress(JSON.parse(stored));
          if (normalised) {
            setProgressData(normalised);
          } else {
            console.warn('Ignoring stored kanji progress data: unexpected shape.');
          }
        } catch (error) {
          console.error('Failed to parse kanji progress data:', error);
        }
      }
    }
  }, []);

  // Save progress data to localStorage
  const saveProgressData = useCallback((data: KanjiProgressData) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setProgressData(data);
    }
  }, []);

  // Toggle a kanji as learned/unlearned
  const toggleKanjiLearned = useCallback((kanji: string) => {
    const now = Date.now();
    
    setProgressData(prev => {
      let newLearnedKanji: string[];
      let newTimestamps = { ...prev.timestamps };
      
      if (prev.learnedKanji.includes(kanji)) {
        // Remove from learned
        newLearnedKanji = prev.learnedKanji.filter(k => k !== kanji);
        delete newTimestamps[kanji];
      } else {
        // Add to learned
        newLearnedKanji = [...prev.learnedKanji, kanji];
        newTimestamps[kanji] = now;
      }

      const newData = {
        learnedKanji: newLearnedKanji,
        timestamps: newTimestamps,
      };

      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
      }

      return newData;
    });
  }, []);

  // Check if a kanji is learned
  const isKanjiLearned = useCallback((kanji: string) => {
    return progressData.learnedKanji.includes(kanji);
  }, [progressData.learnedKanji]);

  // Get learned count for a specific JLPT level
  const getLearnedCountForLevel = useCallback((kanjiList: string[]) => {
    return kanjiList.filter(kanji => progressData.learnedKanji.includes(kanji)).length;
  }, [progressData.learnedKanji]);

  // Get progress over time for chart with period filtering
  const getProgressOverTime = useCallback((period: TimePeriod = '30d') => {
    const buckets = buildBuckets(period, new Date());
    const counts = new Array<number>(buckets.length).fill(0);

    const sorted = Object.values(progressData.timestamps)
      .filter(timestamp => typeof timestamp === 'number' && Number.isFinite(timestamp))
      .sort((a, b) => a - b);

    // Anything older than the first bucket is the starting height of the curve —
    // without it a returning user's chart flatlines at zero and looks broken.
    let baseline = 0;
    let index = 0;

    for (const timestamp of sorted) {
      if (timestamp < buckets[0].start) {
        baseline++;
        continue;
      }
      // Entries are sorted, so the cursor only ever moves forward
      while (index + 1 < buckets.length && buckets[index + 1].start <= timestamp) {
        index++;
      }
      counts[index]++;
    }

    let cumulative = baseline;
    return buckets.map((bucket, i) => {
      cumulative += counts[i];
      return {
        name: bucket.label,
        daily: counts[i],
        cumulative,
        date: bucket.label,
      };
    });
  }, [progressData.timestamps]);

  // Reset all progress
  const resetProgress = useCallback(() => {
    const emptyData: KanjiProgressData = {
      learnedKanji: [],
      timestamps: {},
    };
    saveProgressData(emptyData);
  }, [saveProgressData]);

  return {
    // Data
    learnedKanji: progressData.learnedKanji,
    totalLearned: progressData.learnedKanji.length,
    
    // Functions
    toggleKanjiLearned,
    isKanjiLearned,
    getLearnedCountForLevel,
    getProgressOverTime,
    resetProgress,
  };
}