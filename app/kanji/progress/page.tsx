import { Metadata } from 'next';
import { LearnedKanjiClient } from './LearnedKanjiClient';

export const metadata: Metadata = {
  title: 'Learned Kanji Progress | Japanese Kanji Tracker',
  description: 'Track your Japanese kanji learning progress over time with visual charts and statistics.',
};

export default function LearnedKanjiPage() {
  return <LearnedKanjiClient />;
}