'use client';

import { useState, useEffect, useCallback } from 'react';

interface KanjiProgressData {
  learnedKanji: string[];
  timestamps: Record<string, number>;
}

const STORAGE_KEY = 'kanji-progress';

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

  // Get progress over time for chart
  const getProgressOverTime = useCallback(() => {
    const sortedEntries = Object.entries(progressData.timestamps)
      .sort(([, a], [, b]) => a - b);
    
    const result = [];
    for (let i = 0; i < sortedEntries.length; i++) {
      const [, timestamp] = sortedEntries[i];
      const date = new Date(timestamp).toISOString().split('T')[0];
      result.push({
        date,
        count: i + 1,
      });
    }
    
    return result;
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