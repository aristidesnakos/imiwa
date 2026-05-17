import { Metadata } from 'next';
import { Suspense } from 'react';
import { getSEOTags } from '@/lib/seo';
import { ReviewClient } from './ReviewClient';

export const metadata: Metadata = getSEOTags({
  title: 'Kanji SRS Review | Spaced Repetition Practice',
  description:
    'Review your learned kanji using spaced repetition (SRS). Flashcard-style sessions that automatically schedule the next review at the optimal time.',
  canonicalUrlRelative: '/kanji/review',
});

export default function ReviewPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto p-8 text-center">
          Loading review session…
        </div>
      }
    >
      <ReviewClient />
    </Suspense>
  );
}
