'use client';

import { ReactNode } from 'react';

interface AnalyticsProviderProps {
  children: ReactNode;
}

export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  // Simple placeholder for analytics
  return <>{children}</>;
}