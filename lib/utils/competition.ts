export function getCompetitionWindow() {
  const now = new Date();
  const start = new Date(now);
  
  // Calculate days to subtract to get to the most recent Monday
  const daysToSubtract = (now.getDay() + 6) % 7; // Fix: Proper Monday calculation
  start.setDate(now.getDate() - daysToSubtract);
  start.setUTCHours(18, 0, 0, 0);

  // Handle case where current time is still before Monday 6pm GMT
  if (now < start) {
    start.setDate(start.getDate() - 7);
  }

  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  
  return { start, end };
}

export function formatCompetitionTime(date: Date): string {
  return date.toISOString().replace('T', ' ').substring(0, 16);
}

export function formatCountdown(targetDate: Date): string {
  const now = new Date();
  
  // Always get fresh competition window in case we crossed the threshold
  const { end } = getCompetitionWindow();
  const difference = end.getTime() - now.getTime();

  if (difference <= 0) {
    return 'New competition starting soon';
  }

  const days = Math.floor(difference / (1000 * 60 * 60 * 24));
  const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((difference % (1000 * 60)) / 1000);

  return days > 0 
    ? `${days}d ${hours}h`
    : `${hours}h ${minutes}m ${seconds}s`;
}
