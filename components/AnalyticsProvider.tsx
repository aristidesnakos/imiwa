'use client';

import { ReactNode, useEffect, useState } from 'react';
import { initializeAnalytics, setupConsentListener } from '@/lib/analytics';

interface AnalyticsProviderProps {
  children: ReactNode;
}

export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Initialize analytics if consent already given
    initializeAnalytics();

    // Setup listener for future consent changes
    setupConsentListener();
  }, [mounted]);

  return <>{children}</>;
}