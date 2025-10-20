'use client';

import { createContext, useContext, ReactNode } from 'react';

interface CaptchaContextType {
  captchaToken: string | null;
}

const CaptchaContext = createContext<CaptchaContextType | undefined>(undefined);

export function CaptchaProvider({ children }: { children: ReactNode }) {
  const value: CaptchaContextType = {
    captchaToken: null, // Placeholder value
  };

  return (
    <CaptchaContext.Provider value={value}>
      {children}
    </CaptchaContext.Provider>
  );
}

export function useCaptcha() {
  const context = useContext(CaptchaContext);
  if (context === undefined) {
    throw new Error('useCaptcha must be used within a CaptchaProvider');
  }
  return context;
}

// Main layout client component
interface LayoutClientProps {
  children: ReactNode;
}

export default function LayoutClient({ children }: LayoutClientProps) {
  return (
    <CaptchaProvider>
      {children}
    </CaptchaProvider>
  );
}