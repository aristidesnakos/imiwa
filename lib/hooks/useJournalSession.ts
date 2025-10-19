import { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '@/lib/hooks/use-toast';
import { useUser } from '@/context/user';
import { debounce } from '@/lib/utils';

export type SessionStatus = 'draft' | 'published';
export type AutoSaveStatus = 'saved' | 'saving' | 'error';

export interface JournalSession {
  id: string;
  content: string;
  title?: string;
  status: SessionStatus;
  image_url?: string;
  created_at: string;
  updated_at: string;
  published_at?: string;
  user_id: string;
  learning_language?: string;
}

interface UseJournalSessionProps {
  sessionId?: string;
  mode: 'write' | 'edit' | 'view';
}

export function useJournalSession({ sessionId, mode }: UseJournalSessionProps) {
  const [session, setSession] = useState<JournalSession | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>('saved');
  const [isLoading, setIsLoading] = useState(true);
  
  const { toast } = useToast();
  const { user, profile } = useUser();

  // Create a new session
  const createNewSession = useCallback(async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to create a journal entry.",
        variant: "destructive"
      });
      return null;
    }

    try {
      const response = await fetch('/api/writing-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: '',
          status: 'draft',
          learning_language: profile?.learning_language
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create session');
      }

      const newSession = await response.json();
      setSession(newSession);
      return newSession;
    } catch (error) {
      console.error('Error creating session:', error);
      toast({
        title: "Failed to create session",
        description: "Please try again.",
        variant: "destructive"
      });
      return null;
    }
  }, [user, profile, toast]);

  // Load existing session
  const loadSession = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/writing-sessions/${id}`);
      
      if (!response.ok) {
        throw new Error('Failed to load session');
      }

      const sessionData = await response.json();
      setSession(sessionData);
      return sessionData;
    } catch (error) {
      console.error('Error loading session:', error);
      toast({
        title: "Failed to load session",
        description: "The session could not be found.",
        variant: "destructive"
      });
      return null;
    }
  }, [toast]);

  // Initialize session based on mode
  useEffect(() => {
    const initializeSession = async () => {
      setIsLoading(true);
      
      if (mode === 'write' && !sessionId) {
        // Create new session immediately for write mode
        await createNewSession();
      } else if (sessionId) {
        // Load existing session for edit/view modes
        await loadSession(sessionId);
      }
      
      setIsLoading(false);
    };

    initializeSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, sessionId]); // Dependencies intentionally limited to prevent loops

  // Auto-save functionality with debouncing
  const autoSave = useMemo(
    () => debounce(async (updates: Partial<JournalSession>) => {
      if (!session) return;
      
      setAutoSaveStatus('saving');
      
      try {
        const response = await fetch(`/api/writing-sessions/${session.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });

        if (!response.ok) {
          throw new Error('Failed to save');
        }

        const updatedSession = await response.json();
        setSession(updatedSession);
        setAutoSaveStatus('saved');
      } catch (error) {
        console.error('Auto-save error:', error);
        setAutoSaveStatus('error');
        
        // Retry after 5 seconds if error
        setTimeout(() => {
          if (session) {
            autoSave(updates);
          }
        }, 5000);
      }
    }, 1000),
    [session]
  );

  // Update content with auto-save
  const updateContent = useCallback((content: string) => {
    if (!session) return;
    
    // Update local state immediately for responsiveness
    setSession(prev => prev ? { ...prev, content } : null);
    
    // Trigger auto-save
    autoSave({ content });
  }, [session, autoSave]);

  // Update image URL
  const updateImage = useCallback(async (imageUrl: string) => {
    if (!session) return;
    
    setSession(prev => prev ? { ...prev, image_url: imageUrl } : null);
    autoSave({ image_url: imageUrl });
  }, [session, autoSave]);

  // Publish session (change from draft to published)
  const publishSession = useCallback(async () => {
    if (!session) return;
    
    try {
      const response = await fetch(`/api/writing-sessions/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'published',
          published_at: new Date().toISOString(),
          is_submitted: true
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to publish');
      }

      const updatedSession = await response.json();
      setSession(updatedSession);
      
      toast({
        title: "Entry published! ✅",
        description: "Your journal entry has been published.",
      });
      
      return updatedSession;
    } catch (error) {
      console.error('Error publishing session:', error);
      toast({
        title: "Failed to publish",
        description: "Please try again.",
        variant: "destructive"
      });
      return null;
    }
  }, [session, toast]);

  // Save as draft (explicit save without publishing)
  const saveDraft = useCallback(async () => {
    if (!session) return;
    
    setAutoSaveStatus('saving');
    
    try {
      const response = await fetch(`/api/writing-sessions/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: session.content,
          status: 'draft'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save draft');
      }

      setAutoSaveStatus('saved');
      
      toast({
        title: "Draft saved",
        description: "Your draft has been saved.",
      });
    } catch (error) {
      console.error('Error saving draft:', error);
      setAutoSaveStatus('error');
      toast({
        title: "Failed to save draft",
        description: "Please try again.",
        variant: "destructive"
      });
    }
  }, [session, toast]);

  // Delete session
  const deleteSession = useCallback(async () => {
    if (!session) return;
    
    try {
      const response = await fetch(`/api/writing-sessions/${session.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete');
      }

      setSession(null);
      
      toast({
        title: "Entry deleted",
        description: "Your journal entry has been deleted.",
      });
      
      return true;
    } catch (error) {
      console.error('Error deleting session:', error);
      toast({
        title: "Failed to delete",
        description: "Please try again.",
        variant: "destructive"
      });
      return false;
    }
  }, [session, toast]);

  return {
    session,
    isLoading,
    autoSaveStatus,
    
    // Actions
    updateContent,
    updateImage,
    publishSession,
    saveDraft,
    deleteSession,
    
    // Direct setters for special cases
    setSession
  };
}