import { useEffect } from 'react';
import { KEYBOARD_SHORTCUTS } from '@/lib/constants/journal';

interface UseKeyboardShortcutsProps {
  content: string;
  isAnalyzing: boolean;
  showSuggestions: boolean;
  onSave: () => void;
  onAnalyze: () => void;
  onCloseSuggestions: () => void;
}

export function useKeyboardShortcuts({
  content,
  isAnalyzing,
  showSuggestions,
  onSave,
  onAnalyze,
  onCloseSuggestions
}: UseKeyboardShortcutsProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === KEYBOARD_SHORTCUTS.SAVE) {
        e.preventDefault();
        if (content.trim()) onSave();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === KEYBOARD_SHORTCUTS.ANALYZE) {
        e.preventDefault();
        if (content.trim() && !isAnalyzing) onAnalyze();
      }
      if (e.key === KEYBOARD_SHORTCUTS.ESCAPE && showSuggestions) {
        onCloseSuggestions();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [content, isAnalyzing, showSuggestions, onSave, onAnalyze, onCloseSuggestions]);
}