/**
 * Formats a date to "Month Day Year" format with ordinal suffix
 * e.g., "Sep 2nd 2025"
 */
export function formatDateWithOrdinal(date: Date): string {
  const formatted = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  // Add ordinal suffix to the day
  return formatted.replace(/(\d+)/, (day) => {
    const d = parseInt(day);
    const suffix = getOrdinalSuffix(d);
    return `${d}${suffix}`;
  });
}

/**
 * Gets the ordinal suffix for a number (st, nd, rd, th)
 */
export function getOrdinalSuffix(day: number): string {
  if (day > 3 && day < 21) return 'th'; // Special case for 11-13
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

/**
 * Formats a date for journal entries
 * Can be extended with additional formatting options
 */
export function formatJournalDate(date: Date = new Date()): string {
  return formatDateWithOrdinal(date);
}