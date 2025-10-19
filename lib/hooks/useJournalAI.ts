import { useState, useCallback, useMemo } from 'react';
import { useToast } from '@/lib/hooks/use-toast';
import { useUser } from '@/context/user';
import { SentenceCorrection } from '@/types/journal';
import { validateContentForAnalysis } from '@/lib/utils/contentValidation';

export type FeedbackType = 'sentence';

export interface AIFeedback {
  type: FeedbackType;
  sentenceCorrections?: SentenceCorrection[];
}

interface UseJournalAIProps {
  content: string;
  sessionId?: string;
  onSessionCreated?: (sessionId: string) => void;
  onContentChange: (newContent: string) => void;
}

export function useJournalAI({ 
  content, 
  sessionId,
  onSessionCreated,
  onContentChange
}: UseJournalAIProps) {
  const [feedback, setFeedback] = useState<AIFeedback | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [originalContent, setOriginalContent] = useState('');
  const [showFeedbackPanel, setShowFeedbackPanel] = useState(false);
  const [totalCorrectionsApplied, setTotalCorrectionsApplied] = useState(0);

  const { toast } = useToast();
  const { user, profile } = useUser();

  // Ensure session exists
  const ensureSession = useCallback(async (): Promise<string> => {
    if (sessionId) return sessionId;

    const createResponse = await fetch('/api/writing-sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });

    if (!createResponse.ok) {
      throw new Error('Failed to create session for analysis');
    }
    
    const session = await createResponse.json();
    if (onSessionCreated) {
      onSessionCreated(session.id);
    }
    return session.id;
  }, [sessionId, content, onSessionCreated]);

  // Review full text (sentence-by-sentence)
  const reviewFullText = useCallback(async () => {
    if (!content.trim() || !user) return;
    
    if (content.length > 5000) {
      toast({
        title: "Content too long",
        description: "Content too long for analysis (max 5000 characters)",
        variant: "destructive"
      });
      return;
    }
    
    if (content.trim().length < 10) {
      toast({
        title: "Content too short",
        description: "Content too short for meaningful analysis (min 10 characters)",
        variant: "destructive"
      });
      return;
    }
    
    setIsAnalyzing(true);
    setOriginalContent(content);
    
    try {
      const currentSessionId = await ensureSession();

      const response = await fetch(`/api/writing-sessions/${currentSessionId}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: content,
          useSentenceMode: true,
          learningLanguage: profile?.learning_language
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle insufficient credits specifically
        if (response.status === 402) {
          throw new Error(`Insufficient credits. Required: ${errorData.required}, Available: ${errorData.available}`);
        }
        
        throw new Error(errorData.details || errorData.error || 'Analysis failed');
      }

      const { sentenceCorrections } = await response.json();
      
      setFeedback({
        type: 'sentence',
        sentenceCorrections: sentenceCorrections || []
      });
      setShowFeedbackPanel(true);
      
      if (sentenceCorrections.length === 0) {
        toast({
          title: "Your writing looks great! ✨",
          description: "No corrections needed. Well done!",
        });
      } else {
        toast({
          title: "Ready to review",
          description: `Let's improve ${sentenceCorrections.length} sentence${sentenceCorrections.length > 1 ? 's' : ''} together.`,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      toast({
        title: "Analysis Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  }, [content, user, profile, toast, ensureSession]);

  // Apply sentence corrections with metrics tracking
  const applySentenceCorrections = useCallback((acceptedCorrections: SentenceCorrection[]) => {
    if (!feedback || feedback.type !== 'sentence') return;
    
    let newContent = content;
    
    for (const correction of acceptedCorrections) {
      if (correction.accepted) {
        newContent = newContent.replace(correction.original, correction.corrected);
      }
    }
    
    const acceptedCount = acceptedCorrections.filter(c => c.accepted).length;
    
    if (acceptedCount > 0) {
      onContentChange(newContent);
      setTotalCorrectionsApplied(prev => prev + acceptedCount);
      toast({
        title: `Great progress! 🎯`,
        description: `You've improved ${acceptedCount} sentence${acceptedCount > 1 ? 's' : ''}. Keep writing!`,
      });
    } else {
      toast({
        title: "No changes made",
        description: "You kept your original text.",
      });
    }
    
    setShowFeedbackPanel(false);
    setFeedback(null);
  }, [feedback, content, onContentChange, toast]);

  // Close feedback panel
  const closeFeedbackPanel = useCallback(() => {
    setShowFeedbackPanel(false);
  }, []);

  // Reset feedback
  const resetFeedback = useCallback(() => {
    setFeedback(null);
    setShowFeedbackPanel(false);
    setOriginalContent('');
  }, []);

  return {
    feedback,
    isAnalyzing,
    showFeedbackPanel,
    originalContent,
    totalCorrectionsApplied,
    
    // Actions
    reviewFullText,
    applySentenceCorrections,
    closeFeedbackPanel,
    resetFeedback
  };
}