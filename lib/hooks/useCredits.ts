import { useState, useCallback } from 'react';
import { useUser } from '@/context/user';
import { useToast } from '@/lib/hooks/use-toast';
import { CREDIT_COSTS, type CreditOperation } from '@/lib/credits';

export interface UseCreditsReturn {
  credits: number;
  isLoading: boolean;
  checkCredits: (operation: CreditOperation) => boolean;
  getCreditCost: (operation: CreditOperation) => number;
  refreshCredits: () => Promise<void>;
  showInsufficientCreditsToast: (operation: CreditOperation) => void;
}

export function useCredits(): UseCreditsReturn {
  const { profile, profileLoading, refreshProfile } = useUser();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const credits = profile?.credits || 0;

  const checkCredits = useCallback((operation: CreditOperation): boolean => {
    const cost = CREDIT_COSTS[operation];
    return credits >= cost;
  }, [credits]);

  const getCreditCost = useCallback((operation: CreditOperation): number => {
    return CREDIT_COSTS[operation];
  }, []);

  const refreshCredits = useCallback(async () => {
    setIsLoading(true);
    try {
      await refreshProfile();
    } finally {
      setIsLoading(false);
    }
  }, [refreshProfile]);

  const showInsufficientCreditsToast = useCallback((operation: CreditOperation) => {
    const cost = CREDIT_COSTS[operation];
    const operationName = operation.toLowerCase().replace(/_/g, ' ');
    
    toast({
      title: "Insufficient Credits",
      description: `You need ${cost} credits for ${operationName}. You have ${credits} credits.`,
      variant: "destructive"
    });
  }, [credits, toast]);

  return {
    credits,
    isLoading: profileLoading || isLoading,
    checkCredits,
    getCreditCost,
    refreshCredits,
    showInsufficientCreditsToast
  };
}