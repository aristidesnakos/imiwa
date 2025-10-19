/**
 * Type definitions for Writing Tasks and Comprehensible Input
 * Following codebase conventions: centralized types in types/ directory
 */

export interface ErrorPattern {
  type: string;
  description: string;
  count: number;
  examples: string[];
}

export interface RecentCorrectionsResponse {
  hasData: boolean;
  sessionCount: number;
  recentCorrections: any[]; // Using any[] to match existing Correction type
  errorPatterns: ErrorPattern[];
  summary: {
    totalCorrections: number;
    mostCommonError: string;
    sessionsAnalyzed: number;
  };
}

export interface WritingTasksRequest {
  goals: string;
  learningLanguage?: string;
  nativeLanguage?: string;
  useCorrections?: boolean;
}

export interface WritingTasksResponse {
  tasks: string[];
  fallback?: boolean;
}