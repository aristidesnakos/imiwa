'use client';

import { useEffect, useState } from 'react';
import { initializeAnalytics, setupConsentListener } from '@/lib/analytics';

export function AnalyticsProvider(): null {
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

  return null; // This component doesn't render anything
}