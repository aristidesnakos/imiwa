"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SessionType, Correction, SentenceCorrection } from '@/types/journal';
import { calculateStats } from '@/lib/writing-analysis';
import { useUser } from '@/context/user';

export const useNewJournalPage = (setSessionId?: ((id: string) => void) | undefined, initialSessionId?: string) => {
  const router = useRouter();
  const { profile } = useUser();
  const [sessionType, setSessionType] = useState<SessionType>('writing');
  const [isSaving, setIsSaving] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(initialSessionId);

  // Update currentSessionId when setSessionId is called
  const handleSessionIdUpdate = (id: string) => {
    console.log('📝 handleSessionIdUpdate called with:', id);
    console.log('📝 Previous currentSessionId:', currentSessionId);
    setCurrentSessionId(id);
    if (setSessionId) {
      setSessionId(id);
    }
  };

  const handleSave = async (content: string, sessionData?: {
    title?: string;
    original_content: string;
    corrections: Correction[];
    sentence_corrections?: SentenceCorrection[];
    is_submitted?: boolean;
    image_url?: string;
    writing_tasks?: string[];
  }) => {
    if (!content.trim()) return;

    console.log('🔥 handleSave called:', {
      contentLength: content.length,
      currentSessionId,
      sessionData: sessionData ? {
        ...sessionData,
        original_content: sessionData.original_content?.substring(0, 50) + '...',
      } : null
    });

    setIsSaving(true);
    try {
      let sessionId = currentSessionId;
      
      // Only create a new session if we don't have one already
      if (!sessionId) {
        console.log('⚠️ No session ID found, creating new session');
        const response = await fetch('/api/writing-sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: sessionData?.title,
            content: content,
            image_url: sessionData?.image_url,
          }),
        });

        if (!response.ok) throw new Error('Failed to save session');
        
        const session = await response.json();
        sessionId = session.id;
        
        // Set session ID for AI analysis
        handleSessionIdUpdate(sessionId);
      } else {
        console.log('✅ Updating existing session:', sessionId);
        // Update existing session with current content
        // Don't calculate stats client-side if we have sentence corrections
        // Let the server calculate accurate stats with word counts
        const stats = sessionData?.sentence_corrections ? undefined : 
          (sessionData ? calculateStats(
            sessionData.original_content,
            content,
            sessionData.corrections
          ) : {});

        const updateResponse = await fetch(`/api/writing-sessions/${sessionId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: sessionData?.title,
            content,
            original_content: sessionData?.original_content || content,
            corrections: sessionData?.corrections || [],
            session_stats: stats,
            sentence_analysis: sessionData?.sentence_corrections,  // Pass sentence corrections for accurate stats
            analyzed_at: sessionData ? new Date().toISOString() : undefined,
            is_submitted: sessionData?.is_submitted,
            image_url: sessionData?.image_url,
            writing_tasks: sessionData?.writing_tasks,
            learningLanguage: profile?.learning_language
          }),
        });

        if (!updateResponse.ok) throw new Error('Failed to update session');
      }
      
      router.push(`/journal/${sessionId}`);
    } catch (error) {
      console.error('Save error:', error);
      throw error; // Let the component handle the error display
    } finally {
      setIsSaving(false);
    }
  };

  return {
    sessionType,
    isSaving,
    handleSave,
    handleSessionTypeChange: setSessionType,
    handleSessionIdUpdate,
  };
};
