'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, RotateCcw, BookOpen, CheckCircle, Brain, TrendingUp } from 'lucide-react';
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

/**
 * Maximum cards in a single review session.
 *
 * Every learned kanji starts life due (a new card's nextReview is "now"), so a
 * returning user who checked off 400 kanji and never reviewed would otherwise
 * open a 400-card session with a "1/400" progress bar. Nobody finishes that —
 * they bounce and conclude the feature is broken. Capping keeps a session to a
 * few minutes; the rest of the backlog is drained by tapping "Review Again".
 */
const SESSION_CAP = 20;

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
  // Full due count at the moment the session was built, so the UI can stay
  // honest about a backlog that the cap is deliberately hiding from the queue.
  const [totalDue, setTotalDue] = useState(0);

  /** Build a capped, randomised session from the given due list. */
  const startSession = useCallback((due: string[]) => {
    if (due.length === 0) {
      // Nothing left to show — never enter 'reviewing' with an empty queue.
      setSessionState('empty');
      return;
    }
    setTotalDue(due.length);
    // Shuffle FIRST, then slice: slicing first would hand back the same 20
    // kanji in stored insertion order every single time, so cards 21+ of a
    // large backlog would never come up. Shuffling first makes each session a
    // random sample of the whole backlog.
    setQueue(shuffle(due).slice(0, SESSION_CAP));
    setCurrentIndex(0);
    setIsFlipped(false);
    setResults([]);
    setSessionState('reviewing');
  }, []);

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
        startSession(due);
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
    const dueNow = learnedKanji.length > 0 ? getDueKanji(learnedKanji) : [];
    const hasDue = dueNow.length > 0;
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
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link href="/kanji">
                    <Button size="lg">
                      <BookOpen className="w-4 h-4 mr-2" />
                      Continue Learning
                    </Button>
                  </Link>
                  <Link href="/kanji/progress">
                    <Button variant="outline" size="lg">
                      <TrendingUp className="w-4 h-4 mr-2" />
                      See Your Progress
                    </Button>
                  </Link>
                </div>
              </>
            ) : (
              // Reachable only if the due count changes between the state being
              // set to 'empty' and this render. Rare, but it must never be a
              // bare checkmark on a blank page — there IS something to review,
              // so offer to build the session again.
              <>
                <h1 className="text-3xl font-bold mb-3">Your Reviews Are Ready</h1>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  You have {dueNow.length} kanji due for review. Something interrupted the
                  session before it started — start it again below.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    size="lg"
                    className="bg-purple-600 hover:bg-purple-700"
                    onClick={() => startSession(getDueKanji(learnedKanji))}
                  >
                    <Brain className="w-4 h-4 mr-2" />
                    Start Review
                  </Button>
                  <Link href="/kanji">
                    <Button variant="outline" size="lg">
                      <BookOpen className="w-4 h-4 mr-2" />
                      Back to Dictionary
                    </Button>
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </>
    );
  }

  // ─── Finished State ────────────────────────────────────────────────────────
  if (sessionState === 'finished') {
    const passed = results.filter((r) => r.quality >= 3).length;
    const failed = results.length - passed;
    // Cards just reviewed are pushed at least 10 minutes out, so whatever is
    // still due here is genuinely the leftover backlog the cap held back.
    const remainingDue = getDueKanji(learnedKanji).length;

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
            <p className="text-gray-600 mb-2">
              You reviewed {results.length} kanji
            </p>
            <p className="text-sm text-gray-500 mb-8">
              {remainingDue > 0
                ? `${remainingDue} more still due — another round takes about the same time.`
                : 'That clears your queue. Nothing else is due right now.'}
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
                // Purple = SRS throughout the app. With a backlog left this is
                // the obvious next step, so give it the accent treatment.
                className={remainingDue > 0 ? 'bg-purple-600 hover:bg-purple-700' : undefined}
                variant={remainingDue > 0 ? 'default' : 'outline'}
                onClick={() => startSession(getDueKanji(learnedKanji))}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                {remainingDue > 0
                  ? `Review Next ${Math.min(remainingDue, SESSION_CAP)}`
                  : 'Review Again'}
              </Button>
              <Link href="/kanji/progress">
                <Button variant="outline" size="lg">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  See Your Progress
                </Button>
              </Link>
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
  const progress = Math.round(((currentIndex + 1) / queue.length) * 100);

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
              {currentIndex + 1}/{queue.length}
            </span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          {/* Be honest about the backlog the cap is holding back — a user who
              finishes 20/20 and then sees a "137 due" badge on the dictionary
              would otherwise assume the review page is broken. */}
          {totalDue > queue.length && (
            <p className="text-xs text-gray-400 mt-1.5">
              {queue.length} of {totalDue} due — the rest are waiting for you.
            </p>
          )}
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
