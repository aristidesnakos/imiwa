import { Metadata } from 'next';
import { LearnedKanjiClient } from './LearnedKanjiClient';

// Personal, localStorage-backed progress view — nothing here is useful in search
// results, and without a canonical of its own it would inherit the homepage's.
export const metadata: Metadata = {
  title: 'Learned Kanji Progress | Japanese Kanji Tracker',
  description: 'Track your Japanese kanji learning progress over time with visual charts and statistics.',
  robots: { index: false, follow: true },
  alternates: { canonical: 'https://www.michikanji.com/kanji/progress' },
};

export default function LearnedKanjiPage() {
  return <LearnedKanjiClient />;
}