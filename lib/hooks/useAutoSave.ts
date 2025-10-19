import { useEffect, useState, useRef } from 'react';

interface UseAutoSaveOptions {
  content: string;
  storageKey: string;
  delay?: number;
  initialContent?: string;
  enabled?: boolean;
}

export function useAutoSave({
  content,
  storageKey,
  delay = 1000,
  initialContent,
  enabled = true
}: UseAutoSaveOptions) {
  const [isSaved, setIsSaved] = useState(true);
  const [draftContent, setDraftContent] = useState(() => {
    if (initialContent) return initialContent;
    if (typeof window !== 'undefined' && enabled) {
      return localStorage.getItem(storageKey) || '';
    }
    return '';
  });
  
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Save draft with debounce
  useEffect(() => {
    if (!enabled || !content || initialContent) return;
    
    setIsSaved(false);
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      localStorage.setItem(storageKey, content);
      setIsSaved(true);
    }, delay);
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [content, storageKey, delay, initialContent, enabled]);

  // Clear draft on unmount if empty
  useEffect(() => {
    return () => {
      if (!content?.trim() && enabled) {
        localStorage.removeItem(storageKey);
      }
    };
  }, [content, storageKey, enabled]);

  const clearDraft = () => {
    localStorage.removeItem(storageKey);
    setDraftContent('');
  };

  return {
    draftContent,
    isSaved,
    clearDraft
  };
}