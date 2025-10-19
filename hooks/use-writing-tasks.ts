/**
 * Custom Hook for Writing Tasks
 * Simplified implementation with improved performance
 */

"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { WritingTask, WritingTasksData, LanguageConfig } from '@/types/journal';
import { WritingTasksStorage } from '@/lib/writing-tasks/storage';
import { generateWritingTasks } from '@/lib/writing-tasks/api';
import { DEFAULT_WRITING_TASKS, DEFAULT_GOALS } from '@/lib/writing-tasks/constants';

interface UseWritingTasksOptions {
  autoLoad?: boolean;
  defaultGoals?: string;
}

interface UseWritingTasksReturn {
  tasks: WritingTask[];
  goals: string;
  isLoading: boolean;
  error: string | null;
  progress: number;
  completedCount: number;
  toggleTask: (taskId: string) => void;
  generateTasks: (goals: string, language?: LanguageConfig, useCorrections?: boolean) => Promise<void>;
  clearTasks: () => void;
  loadTasks: () => void;
}

// Memoized task cache for performance
const taskCache = new Map<string, string[]>();

function getCacheKey(goals: string, language?: LanguageConfig): string {
  return `${goals}-${language?.learning || ''}-${language?.native || ''}`;
}

export function useWritingTasks(options: UseWritingTasksOptions = {}): UseWritingTasksReturn {
  const { autoLoad = true, defaultGoals = DEFAULT_GOALS } = options;
  
  const [tasks, setTasks] = useState<WritingTask[]>([]);
  const [goals, setGoals] = useState<string>(defaultGoals);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (autoLoad) {
      loadTasks();
    }
  }, [autoLoad]);
  
  const loadTasks = useCallback(() => {
    try {
      const storedData = WritingTasksStorage.load();
      
      if (storedData) {
        setGoals(storedData.goals || defaultGoals);
        setTasks(
          storedData.tasks.map((text, index) => ({
            id: `task-${index}`,
            text,
            completed: false
          }))
        );
      } else {
        setDefaultTasks();
      }
    } catch (err) {
      console.error('Error loading tasks:', err);
      setError('Failed to load tasks');
      setDefaultTasks();
    }
  }, [defaultGoals]);
  
  const setDefaultTasks = useCallback(() => {
    setGoals(defaultGoals);
    setTasks(
      DEFAULT_WRITING_TASKS.map((text, index) => ({
        id: `task-${index}`,
        text,
        completed: false
      }))
    );
  }, [defaultGoals]);
  
  const generateTasks = useCallback(async (goalsText: string, language?: LanguageConfig, useCorrections?: boolean) => {
    setIsLoading(true);
    setError(null);

    const cacheKey = getCacheKey(goalsText, language) + (useCorrections ? '-corrections' : '');

    try {
      let generatedTasks: string[];

      // Check cache first (skip cache for corrections-based tasks)
      if (!useCorrections && taskCache.has(cacheKey)) {
        generatedTasks = taskCache.get(cacheKey)!;
      } else {
        generatedTasks = await generateWritingTasks(goalsText, language, useCorrections);
        // Cache the result (except for corrections-based tasks)
        if (!useCorrections) {
          taskCache.set(cacheKey, generatedTasks);
        }
      }
      
      const taskData: WritingTasksData = {
        goals: goalsText.trim() || defaultGoals,
        tasks: generatedTasks,
        createdAt: new Date().toISOString()
      };
      
      WritingTasksStorage.save(taskData);
      
      setGoals(taskData.goals);
      setTasks(
        generatedTasks.map((text, index) => ({
          id: `task-${index}`,
          text,
          completed: false
        }))
      );
    } catch (err) {
      console.error('Failed to generate tasks:', err);
      setError('Failed to generate tasks. Using defaults.');
      
      // Fallback to defaults
      const fallbackData: WritingTasksData = {
        goals: goalsText.trim() || defaultGoals,
        tasks: DEFAULT_WRITING_TASKS,
        createdAt: new Date().toISOString()
      };
      
      WritingTasksStorage.save(fallbackData);
      setDefaultTasks();
    } finally {
      setIsLoading(false);
    }
  }, [defaultGoals, setDefaultTasks]);
  
  const toggleTask = useCallback((taskId: string) => {
    setTasks(prev =>
      prev.map(task =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      )
    );
  }, []);
  
  const clearTasks = useCallback(() => {
    WritingTasksStorage.clear();
    setTasks([]);
    setGoals(defaultGoals);
  }, [defaultGoals]);
  
  // Memoized computed values
  const completedCount = useMemo(() => tasks.filter(t => t.completed).length, [tasks]);
  const progress = useMemo(() => tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0, [tasks, completedCount]);
  
  return {
    tasks,
    goals,
    isLoading,
    error,
    progress,
    completedCount,
    toggleTask,
    generateTasks,
    clearTasks,
    loadTasks
  };
}