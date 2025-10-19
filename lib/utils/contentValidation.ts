import { CONTENT_LIMITS } from '@/lib/constants/journal';

export function validateContentForAnalysis(content: string, selectedText?: string) {
  const textToCheck = selectedText || content;
  
  return {
    isContentTooShort: textToCheck.trim().length < CONTENT_LIMITS.MIN_ANALYSIS_LENGTH,
    isContentTooLong: content.length > CONTENT_LIMITS.MAX_ANALYSIS_LENGTH,
    isSelectionTooShort: selectedText ? selectedText.trim().length < CONTENT_LIMITS.MIN_SELECTION_LENGTH : false
  };
}

export function calculateWordCount(content: string): number {
  return content.trim().split(/\s+/).filter(w => w.length > 0).length;
}