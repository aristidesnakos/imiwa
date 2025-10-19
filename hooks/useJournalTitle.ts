import { useState, useEffect, useCallback } from 'react';
import { WritingSession } from '@/types/journal';

const TITLE_STORAGE_KEY = 'journal-title-new';
const TITLE_SAVE_DEBOUNCE_MS = 500;

/**
 * Custom hook for managing journal title state and persistence
 * Handles localStorage drafts and session title synchronization
 */
export function useJournalTitle(
  existingSessionId: string | null,
  existingSession: WritingSession | null
) {
  const [title, setTitle] = useState<string>('');

  // Load saved title from localStorage for new sessions
  useEffect(() => {
    if (!existingSessionId) {
      const savedTitle = localStorage.getItem(TITLE_STORAGE_KEY);
      if (savedTitle) setTitle(savedTitle);
    }
  }, [existingSessionId]);

  // Sync with existing session title
  useEffect(() => {
    if (existingSession?.title) {
      setTitle(existingSession.title);
    }
  }, [existingSession]);

  // Auto-save title to localStorage with debouncing
  useEffect(() => {
    if (!existingSessionId && title) {
      const timeoutId = setTimeout(() => {
        localStorage.setItem(TITLE_STORAGE_KEY, title);
      }, TITLE_SAVE_DEBOUNCE_MS);

      return () => clearTimeout(timeoutId);
    }
  }, [title, existingSessionId]);

  const clearTitleDraft = useCallback(() => {
    if (!existingSessionId) {
      localStorage.removeItem(TITLE_STORAGE_KEY);
    }
  }, [existingSessionId]);

  return { title, setTitle, clearTitleDraft };
}