'use client'

import { ReactNode } from 'react'
import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'
import { UserProvider } from '@/context/user'

const POSTHOG_CONFIG = {
  key: process.env.NEXT_PUBLIC_POSTHOG_KEY || '',
  host: process.env.NEXT_PUBLIC_POSTHOG_HOST || '',
  options: {
    person_profiles: 'identified_only' as const,
  },
} as const

if (typeof window !== 'undefined' && POSTHOG_CONFIG.key) {
  posthog.init(POSTHOG_CONFIG.key, {
    api_host: POSTHOG_CONFIG.host,
    ...POSTHOG_CONFIG.options,
  })
}

interface ProvidersProps {
  children: ReactNode
}

function PostHogProviderWrapper({ children }: ProvidersProps) {
  return (
    <PostHogProvider client={posthog}>
      {children}
    </PostHogProvider>
  )
}

export function AppProviders({ children }: ProvidersProps) {
  return (
    <PostHogProviderWrapper>
      <UserProvider>
        {children}
      </UserProvider>
    </PostHogProviderWrapper>
  )
}
