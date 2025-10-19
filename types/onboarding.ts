export interface OnboardingData {
  name: string | null;
  nativeLanguage: string | null;
  learningLanguage: string | null;
  proficiencyLevel: "beginner" | "intermediate" | "advanced" | null;
  learningReason: "certificate" | "job" | "school" | "heritage" | "pure_interest" | "other" | null;
  learningGoals: string | null;
}
