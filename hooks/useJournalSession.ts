import { useState, useEffect, useRef } from 'react';
import { WritingSession } from '@/types/journal';
import { useNewJournalPage } from '@/hooks/useNewJournalPage';

/**
 * Custom hook for managing journal session state and operations
 * Follows separation of concerns - business logic extracted from UI components
 */
export function useJournalSession(existingSessionId: string | null) {
  const [sessionId, setSessionId] = useState<string | undefined>(existingSessionId || undefined);
  const [existingSession, setExistingSession] = useState<WritingSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const hasInitialized = useRef(false);
  const lastSessionId = useRef(existingSessionId);

  const { handleSave, handleSessionIdUpdate } = useNewJournalPage(setSessionId, existingSessionId || undefined);

  // Handle session ID updates
  useEffect(() => {
    if (!hasInitialized.current || lastSessionId.current !== existingSessionId) {
      hasInitialized.current = true;
      lastSessionId.current = existingSessionId;

      if (existingSessionId && sessionId !== existingSessionId) {
        handleSessionIdUpdate(existingSessionId);
        setSessionId(existingSessionId);
      }
    }
  }, [existingSessionId, handleSessionIdUpdate, sessionId]);

  // Fetch existing session data
  useEffect(() => {
    if (!existingSessionId || existingSession?.id === existingSessionId) return;

    let cancelled = false;
    setIsLoading(true);

    const fetchSession = async () => {
      try {
        const response = await fetch(`/api/writing-sessions/${existingSessionId}`);
        if (!cancelled && response.ok) {
          const session = await response.json();
          setExistingSession(session);
        }
      } catch (error) {
        console.error('Error fetching session:', error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchSession();
    return () => { cancelled = true; };
  }, [existingSessionId, existingSession?.id]);

  return {
    sessionId,
    existingSession,
    isLoading,
    handleSave,
    handleSessionIdUpdate
  };
}