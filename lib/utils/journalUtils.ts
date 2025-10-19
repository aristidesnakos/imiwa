import { WritingSession } from "@/types/journal";

/**
 * Inspirational quotes about language learning
 */
export const languageLearningQuotes = [
  "The limits of my language mean the limits of my world.",
  "One language sets you in a corridor for life. Two languages open every door along the way.",
  "Language is the road map of a culture.",
  "To have another language is to possess a second soul.",
  "Learning another language is not only learning different words for the same things, but learning another way to think about things.",
  "A different language is a different vision of life.",
  "The more languages you know, the more you are human.",
  "Language shapes the way we think, and determines what we can think about.",
  "Words are, of course, the most powerful drug used by mankind.",
  "Language is wine upon the lips."
];

/**
 * Get a random language learning quote
 * @returns A random quote from the collection
 */
export function getRandomQuote(): string {
  return languageLearningQuotes[Math.floor(Math.random() * languageLearningQuotes.length)];
}

/**
 * Calculate writing streak based on consecutive days with journal entries
 * @param sessions Array of writing sessions
 * @returns Number of consecutive days with journal entries
 */
export function calculateStreak(sessions: WritingSession[]): number {
  if (!sessions.length) return 0;

  // Sort sessions by date (most recent first)
  const sortedSessions = [...sessions].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // Get unique dates (YYYY-MM-DD format)
  const uniqueDates = Array.from(
    new Set(
      sortedSessions.map(session => {
        const date = new Date(session.created_at);
        return date.toISOString().split('T')[0];
      })
    )
  ).sort((a, b) => b.localeCompare(a)); // Most recent first

  if (!uniqueDates.length) return 0;

  // Check if streak should start from today or yesterday
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const mostRecentDate = uniqueDates[0];
  
  // If no session today or yesterday, streak is 0
  if (mostRecentDate !== todayStr && mostRecentDate !== yesterdayStr) {
    return 0;
  }

  // Calculate consecutive days
  let streak = 1;
  let currentDate = new Date(mostRecentDate);
  
  for (let i = 1; i < uniqueDates.length; i++) {
    const nextDate = new Date(uniqueDates[i]);
    const expectedDate = new Date(currentDate);
    expectedDate.setDate(expectedDate.getDate() - 1);
    
    if (nextDate.toISOString().split('T')[0] === expectedDate.toISOString().split('T')[0]) {
      streak++;
      currentDate = nextDate;
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Generate a title from journal session content
 * @param content The journal content
 * @returns A formatted title string
 */
export function generateSessionTitle(content: string): string {
  // Take first line or first meaningful chunk as title
  const firstLine = content.split('\n')[0].trim()
  if (firstLine && firstLine.length > 0) {
    // Limit title length and add ellipsis if needed
    return firstLine.length > 80 ? firstLine.substring(0, 80) + "..." : firstLine
  }
  // Fallback to content preview if no clear first line
  const preview = content.trim().substring(0, 60)
  return preview.length < content.trim().length ? preview + "..." : preview
}

/**
 * Sort writing sessions by creation date (most recent first)
 * @param sessions Array of writing sessions
 * @returns Sorted array of sessions
 */
export function sortSessionsByDate(sessions: WritingSession[]): WritingSession[] {
  return [...sessions].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
}