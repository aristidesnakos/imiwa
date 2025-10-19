export * from "./config";

export type LanguagePair = {
  nativeLanguage: string;
  targetLanguage: string;
};

export type GoalType = 'vocabulary' | 'grammar' | 'fluency' | 'comprehension';

export type Goal = {
  id: string;
  title: string;
  description: string;
  languagePair: LanguagePair;
  goalType: GoalType;
  targetWordCount?: number;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
};

export type GoalFormData = Omit<Goal, 'id' | 'createdAt' | 'updatedAt' | 'completedAt'>;

export type StorageKey = string;

export type Session = {
  id: string;
  goalId: string;
  nativeText: string;
  targetText: string;
  startedAt: number;
  lastUpdatedAt: number;
  completedAt?: number;
  keystrokes?: KeystrokeData[];
};

export type KeystrokeData = {
  timestamp: number;
  key: string;
  position: number;
  language: 'native' | 'target';
};
