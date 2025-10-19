import { useState, useCallback } from 'react';

export function useTextSelection() {
  const [selectedText, setSelectedText] = useState('');
  const [selectionRange, setSelectionRange] = useState<{start: number, end: number} | null>(null);

  const handleTextSelection = useCallback((textarea: HTMLTextAreaElement, content: string) => {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    if (start !== end) {
      const selected = content.substring(start, end);
      setSelectedText(selected);
      setSelectionRange({ start, end });
    } else {
      setSelectedText('');
      setSelectionRange(null);
    }
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedText('');
    setSelectionRange(null);
  }, []);

  return {
    selectedText,
    selectionRange,
    handleTextSelection,
    clearSelection
  };
}