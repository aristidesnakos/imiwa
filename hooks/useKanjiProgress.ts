'use client';

import { useState, useEffect, useCallback } from 'react';

interface KanjiProgressData {
  learnedKanji: string[];
  timestamps: Record<string, number>;
}

const STORAGE_KEY = 'kanji-progress';

// Helper function to generate date keys for different periods
function getDateKey(date: Date, period: '24h' | '7d' | '30d' | '12m'): string {
  switch (period) {
    case '24h':
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
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
          const parsed = JSON.parse(stored);
          setProgressData(parsed);
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
  const getProgressOverTime = useCallback((period: '24h' | '7d' | '30d' | '12m' = '30d') => {
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '12m':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
    }
    
    // Filter timestamps within the period
    const filteredEntries = Object.entries(progressData.timestamps)
      .filter(([, timestamp]) => timestamp >= startDate.getTime())
      .sort(([, a], [, b]) => a - b);
    
    // Create time buckets based on period
    const buckets = new Map<string, number>();
    let currentDate = new Date(startDate);
    
    // Initialize buckets
    while (currentDate <= now) {
      const key = getDateKey(currentDate, period);
      buckets.set(key, 0);
      
      // Increment by appropriate interval
      switch (period) {
        case '24h':
          currentDate.setHours(currentDate.getHours() + 1);
          break;
        case '7d':
        case '30d':
          currentDate.setDate(currentDate.getDate() + 1);
          break;
        case '12m':
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
      }
    }
    
    // Fill buckets with actual data
    filteredEntries.forEach(([, timestamp]) => {
      const date = new Date(timestamp);
      const key = getDateKey(date, period);
      buckets.set(key, (buckets.get(key) || 0) + 1);
    });
    
    // Convert to chart data
    return Array.from(buckets.entries()).map(([dateKey, daily]) => ({
      name: dateKey,
      daily,
      date: dateKey
    }));
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