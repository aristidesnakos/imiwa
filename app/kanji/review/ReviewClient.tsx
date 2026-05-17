'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, RotateCcw, BookOpen, CheckCircle, Brain } from 'lucide-react';
import Header from '@/components/sections/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useKanjiProgress } from '@/hooks/useKanjiProgress';
import { useKanjiSRS } from '@/hooks/useKanjiSRS';
import { previewNextInterval } from '@/lib/srs';
import type { ReviewQuality, SRSCard } from '@/lib/srs';
import { N5_KANJI } from '@/lib/constants/n5-kanji';
import { N4_KANJI } from '@/lib/constants/n4-kanji';
import { N3_KANJI } from '@/lib/constants/n3-kanji';
import { N2_KANJI } from '@/lib/constants/n2-kanji';
import { N1_KANJI } from '@/lib/constants/n1-kanji';

interface KanjiInfo {
  kanji: string;
  onyomi: string;
  kunyomi: string;
  meaning: string;
  level: string;
}

// Build a lookup map once
const KANJI_MAP = new Map<string, KanjiInfo>([
  ...N1_KANJI.map((k) => [k.kanji, { ...k, level: 'N1' }] as [string, KanjiInfo]),
  ...N2_KANJI.map((k) => [k.kanji, { ...k, level: 'N2' }] as [string, KanjiInfo]),
  ...N3_KANJI.map((k) => [k.kanji, { ...k, level: 'N3' }] as [string, KanjiInfo]),
  ...N4_KANJI.map((k) => [k.kanji, { ...k, level: 'N4' }] as [string, KanjiInfo]),
  ...N5_KANJI.map((k) => [k.kanji, { ...k, level: 'N5' }] as [string, KanjiInfo]),
]);

type SessionState = 'loading' | 'empty' | 'reviewing' | 'finished';

interface ReviewResult {
  kanji: string;
  quality: ReviewQuality;
}

export function ReviewClient() {
  const { learnedKanji } = useKanjiProgress();
  const { getDueKanji, initCardsForLearned, submitReview, getCard } = useKanjiSRS();

  const [sessionState, setSessionState] = useState<SessionState>('loading');
  const [queue, setQueue] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [results, setResults] = useState<ReviewResult[]>([]);

  // Initialise the session once learnedKanji is available from localStorage
  useEffect(() => {
    if (learnedKanji.length === 0) {
      // Wait a tick – the hook is still hydrating from localStorage
      const timer = setTimeout(() => {
        setSessionState('empty');
      }, 300);
      return () => clearTimeout(timer);
    }

    initCardsForLearned(learnedKanji);

    // Small delay to allow SRS state to settle after init
    const timer = setTimeout(() => {
      const due = getDueKanji(learnedKanji);
      if (due.length === 0) {
        setSessionState('empty');
      } else {
        setQueue(shuffle(due));
        setCurrentIndex(0);
        setIsFlipped(false);
        setResults([]);
        setSessionState('reviewing');
      }
    }, 100);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [learnedKanji]);

  const currentKanji = queue[currentIndex];
  const kanjiInfo = currentKanji ? KANJI_MAP.get(currentKanji) : undefined;
  const card: SRSCard | undefined = currentKanji ? getCard(currentKanji) : undefined;

  const handleRate = useCallback(
    (quality: ReviewQuality) => {
      if (!currentKanji) return;
      submitReview(currentKanji, quality);
      setResults((prev) => [...prev, { kanji: currentKanji, quality }]);

      const next = currentIndex + 1;
      if (next >= queue.length) {
        setSessionState('finished');
      } else {
        setCurrentIndex(next);
        setIsFlipped(false);
      }
    },
    [currentKanji, currentIndex, queue.length, submitReview],
  );

  // ─── Empty / No-due State ──────────────────────────────────────────────────
  if (sessionState === 'loading') {
    return (
      <>
        <Header />
        <div className="container mx-auto p-8 max-w-2xl text-center py-24">
          <div className="text-gray-400 text-lg">Loading your review session…</div>
        </div>
      </>
    );
  }

  if (sessionState === 'empty') {
    const hasDue = learnedKanji.length > 0 && getDueKanji(learnedKanji).length > 0;
    return (
      <>
        <Header />
        <div className="container mx-auto p-4 md:p-8 max-w-2xl">
          <nav className="text-sm text-gray-600 mb-6">
            <Link href="/kanji" className="hover:text-blue-600 flex items-center">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Kanji Dictionary
            </Link>
          </nav>

          <div className="text-center py-16">
            <CheckCircle className="w-16 h-16 mx-auto text-emerald-400 mb-4" />
            {learnedKanji.length === 0 ? (
              <>
                <h1 className="text-3xl font-bold mb-3">No Kanji to Review</h1>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  You haven&apos;t marked any kanji as learned yet. Start by browsing the
                  dictionary and checking off kanji as you learn them.
                </p>
                <Link href="/kanji">
                  <Button size="lg">
                    <BookOpen className="w-4 h-4 mr-2" />
                    Browse Kanji
                  </Button>
                </Link>
              </>
            ) : !hasDue ? (
              <>
                <h1 className="text-3xl font-bold mb-3">All Caught Up! 🎉</h1>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  You&apos;ve reviewed all {learnedKanji.length} learned kanji. Check back later
                  when more cards are due.
                </p>
                <Link href="/kanji">
                  <Button size="lg">
                    <BookOpen className="w-4 h-4 mr-2" />
                    Continue Learning
                  </Button>
                </Link>
              </>
            ) : null}
          </div>
        </div>
      </>
    );
  }

  // ─── Finished State ────────────────────────────────────────────────────────
  if (sessionState === 'finished') {
    const passed = results.filter((r) => r.quality >= 3).length;
    const failed = results.length - passed;

    return (
      <>
        <Header />
        <div className="container mx-auto p-4 md:p-8 max-w-2xl">
          <nav className="text-sm text-gray-600 mb-6">
            <Link href="/kanji" className="hover:text-blue-600 flex items-center">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Kanji Dictionary
            </Link>
          </nav>

          <div className="text-center py-8">
            <div className="text-5xl mb-4">🎌</div>
            <h1 className="text-3xl font-bold mb-2">Session Complete!</h1>
            <p className="text-gray-600 mb-8">
              You reviewed {results.length} kanji
            </p>

            <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto mb-8">
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-emerald-600">{passed}</div>
                  <div className="text-sm text-gray-600 mt-1">Remembered</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-red-500">{failed}</div>
                  <div className="text-sm text-gray-600 mt-1">Needs work</div>
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                size="lg"
                onClick={() => {
                  // Restart with any newly-due cards (failed ones come back at interval=1)
                  const due = getDueKanji(learnedKanji);
                  if (due.length > 0) {
                    setQueue(shuffle(due));
                    setCurrentIndex(0);
                    setIsFlipped(false);
                    setResults([]);
                    setSessionState('reviewing');
                  } else {
                    setSessionState('empty');
                  }
                }}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Review Again
              </Button>
              <Link href="/kanji">
                <Button variant="outline" size="lg">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Back to Dictionary
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ─── Reviewing State ───────────────────────────────────────────────────────
  const progress = Math.round(((currentIndex) / queue.length) * 100);

  return (
    <>
      <Header />
      <div className="container mx-auto p-4 md:p-8 max-w-2xl">
        {/* Nav */}
        <nav className="text-sm text-gray-600 mb-4">
          <Link href="/kanji" className="hover:text-blue-600 flex items-center">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Kanji Dictionary
          </Link>
        </nav>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span className="flex items-center gap-1">
              <Brain className="w-4 h-4" />
              SRS Review
            </span>
            <span>
              {currentIndex}/{queue.length}
            </span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Flashcard */}
        <Card className="min-h-64 mb-6 shadow-md">
          <CardContent className="flex flex-col items-center justify-center p-8 min-h-64">
            {/* Always show kanji */}
            <div className="text-8xl font-bold mb-4">{currentKanji}</div>

            {kanjiInfo && (
              <Badge variant="outline" className="mb-4">
                JLPT {kanjiInfo.level}
              </Badge>
            )}

            {!isFlipped ? (
              <Button
                size="lg"
                variant="outline"
                className="mt-4"
                onClick={() => setIsFlipped(true)}
              >
                Show Answer
              </Button>
            ) : (
              <div className="w-full text-center space-y-3 mt-2">
                {kanjiInfo && (
                  <div className="space-y-2">
                    <p className="text-xl font-semibold text-gray-800">{kanjiInfo.meaning}</p>
                    <p className="text-sm text-gray-500">
                      <span className="font-medium">Onyomi:</span> {kanjiInfo.onyomi || '—'}
                    </p>
                    <p className="text-sm text-gray-500">
                      <span className="font-medium">Kunyomi:</span> {kanjiInfo.kunyomi || '—'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rating buttons (only after flip) */}
        {isFlipped && (
          <div className="grid grid-cols-4 gap-2">
            {(
              [
                { quality: 1 as ReviewQuality, label: 'Again', color: 'bg-red-100 hover:bg-red-200 text-red-700 border-red-200' },
                { quality: 3 as ReviewQuality, label: 'Hard', color: 'bg-orange-100 hover:bg-orange-200 text-orange-700 border-orange-200' },
                { quality: 4 as ReviewQuality, label: 'Good', color: 'bg-blue-100 hover:bg-blue-200 text-blue-700 border-blue-200' },
                { quality: 5 as ReviewQuality, label: 'Easy', color: 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700 border-emerald-200' },
              ] as const
            ).map(({ quality, label, color }) => (
              <button
                key={quality}
                onClick={() => handleRate(quality)}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-colors ${color}`}
              >
                <span className="font-semibold text-sm">{label}</span>
                <span className="text-xs mt-1 opacity-75">
                  {card ? previewNextInterval(card, quality) : '—'}
                </span>
              </button>
            ))}
          </div>
        )}

        <p className="text-xs text-center text-gray-400 mt-4">
          Rate how well you recalled this kanji. Intervals adjust automatically.
        </p>
      </div>
    </>
  );
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
