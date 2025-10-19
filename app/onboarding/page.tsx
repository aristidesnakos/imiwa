"use client"

import { OnboardingContainer } from "@/components/onboarding/OnboardingContainer"

export default function OnboardingPage() {
  const handleOnboardingComplete = () => {
    // Use window.location for a hard redirect to ensure server components 
    // fetch the updated profile data with onboarding_complete = true
    window.location.href = "/journal"
  }

  return <OnboardingContainer onComplete={handleOnboardingComplete} />
}
