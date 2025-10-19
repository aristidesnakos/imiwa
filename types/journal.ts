/**
 * Type definitions for the Plain Text AI Writing Copilot MVP
 */

// Learning point representing an error or improvement opportunity (legacy)
export interface LearningPoint {
  issue: string;          // e.g. "wrong tense"
  correction: string;     // e.g. "went → go"
  explanation?: string;   // Optional explanation for the error
}

// AI-generated correction with user feedback
export interface Correction {
  id: string;
  type: 'grammar' | 'spelling' | 'word_choice' | 'style';
  original: string;
  suggested: string;
  position: { start: number; end: number };
  explanation: string;
  confidence: number;                 // LLM confidence 0-1
  accepted: boolean;                  // User's choice
  applied_at?: string;                // When user accepted it
  severity?: 'error' | 'warning' | 'suggestion';  // Severity level
}

// Session analytics and statistics
export interface SessionStats {
  words_written: number;
  words_final: number;
  corrections_suggested: number;
  corrections_accepted: number;
  error_categories: { [key: string]: number };
}

// Enhanced Writing session with AI feedback support
export interface WritingSession {
  id: string;                    // UUID
  user_id: string;              // Supabase auth ID
  title?: string;               // User-defined title
  content: string;              // Final content (after corrections)
  original_content?: string;    // Content before any corrections
  corrections: Correction[];    // LLM suggestions + user choices  
  session_stats: SessionStats;  // Auto-calculated analytics
  summary: LearningPoint[];     // Keep existing field for backward compatibility
  analyzed_at?: string;         // When analysis was performed
  created_at: string;           // When the session was created
  updated_at?: string;          // When the session was last updated
  is_submitted?: boolean;       // Whether the entry is completed or still a draft
  image_url?: string;           // Lorem Picsum image URL for visual tile
  writing_tasks?: string[];     // Writing task prompts that guided this session
}

// Parameters for creating a new writing session
export interface CreateWritingSessionParams {
  title?: string;                     // Optional title field
  content: string;                    // User's written content
  original_content?: string;          // Original content before corrections
  corrections?: Correction[];         // Initial corrections
  session_stats?: SessionStats;       // Initial stats
  summary?: LearningPoint[];          // Optional initial summary (legacy)
  is_submitted?: boolean;             // Whether the entry is completed or still a draft
  image_url?: string;                 // Lorem Picsum image URL
}

// Individual error in a sentence
export interface SentenceError {
  type: 'particle' | 'tense' | 'vocabulary' | 'grammar' | 'spelling' | 'punctuation';
  errorText: string;        // The exact text that's wrong
  correctionText: string;   // What it should be
  explanation: string;      // Why this change is needed
}

// Sentence-based correction for simplified copilot
export interface SentenceCorrection {
  original: string;
  corrected: string;
  markedOriginal?: string; // Original with [[error parts]] marked for display
  explanation: string;     // Combined explanation for backward compatibility
  accepted: boolean;
  wordCount?: number;      // LLM-counted words for this sentence
  hasErrors?: boolean;     // Whether this sentence has any errors
  errors?: SentenceError[]; // Structured error data
  errorSummary?: {         // Concise error summary for storage
    types: string[];       // All error types found
    mainType: string;      // Primary error type
    count: number;         // Number of errors
    changes: string[];     // Array of "error → correction" strings
  } | null;
}

// Parameters for updating a writing session
export interface UpdateWritingSessionParams {
  title?: string;                     // Title updates
  content?: string;                   // Updated content
  original_content?: string;          // Original content
  corrections?: Correction[];         // Updated corrections
  session_stats?: SessionStats;       // Updated stats
  analyzed_at?: string;               // Analysis timestamp
  summary?: LearningPoint[];          // Update the learning points (legacy)
  is_submitted?: boolean;             // Whether the entry is completed
  image_url?: string;                 // Lorem Picsum image URL
  sentence_analysis?: SentenceCorrection[]; // Sentence-based analysis data for accurate word counting
  writing_tasks?: string[];           // Writing task prompts that guided this session
}

// Session type for backward compatibility (simplified to writing only)
export type SessionType = 'writing';

// Writing task for guided journal prompts
export interface WritingTask {
  id: string;
  text: string;
  completed: boolean;
}

// Writing tasks data stored in session storage
export interface WritingTasksData {
  goals: string;
  tasks: string[];
  createdAt: string;
}

// Language configuration for writing tasks
export interface LanguageConfig {
  learning?: string;
  native?: string;
}

// Social media posting types
export interface SocialMediaPost {
  id: string;
  writing_session_id: string;
  user_id: string;
  social_media_platform: string;
  posted_at: string;
  post_url?: string;
  metadata?: {
    subreddit?: string;
    [key: string]: any;
  };
  created_at: string;
}

export interface CreateSocialMediaPostParams {
  writing_session_id: string;
  social_media_platform: string;
  post_url?: string;
  metadata?: {
    subreddit?: string;
    [key: string]: any;
  };
}
