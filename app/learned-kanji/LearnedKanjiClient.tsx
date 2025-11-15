'use client';

import Link from 'next/link';
import Header from '@/components/sections/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CTASection } from '@/components/CTASection';
import { ProgressChart } from '@/components/progress/ProgressChart';
import { useKanjiProgress } from '@/hooks/useKanjiProgress';
import { ArrowLeft, BookOpen, TrendingUp } from 'lucide-react';

export function LearnedKanjiClient() {
  const { totalLearned, getProgressOverTime, resetProgress } = useKanjiProgress();

  const periodLabels = {
    '24h': 'Last 24 Hours',
    '7d': 'Last 7 Days', 
    '30d': 'Last 30 Days',
    '12m': 'Last 12 Months'
  };

  // Get data for the default period to show in stats
  const selectedPeriod = '30d';
  const periodData = getProgressOverTime(selectedPeriod);
  const totalInPeriod = periodData.reduce((sum, day) => sum + day.daily, 0);

  // If no kanji learned yet, show CTA
  if (totalLearned === 0) {
    return (
      <>
        <Header />
        <div className="container mx-auto p-4 md:p-8 max-w-4xl">
          {/* Breadcrumbs */}
          <nav className="text-sm text-gray-600 mb-6">
            <Link href="/kanji" className="hover:text-blue-600 flex items-center">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Kanji Dictionary
            </Link>
          </nav>

          {/* Empty State */}
          <div className="text-center py-8 md:py-16">
            <div className="mb-6 md:mb-8">
              <BookOpen className="w-12 h-12 md:w-16 md:h-16 mx-auto text-gray-400 mb-4" />
              <h1 className="text-2xl md:text-4xl font-bold mb-4">Start Your Kanji Journey</h1>
              <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-6 md:mb-8 px-4">
                Begin learning Japanese kanji and track your progress over time. 
                Check off kanji as you learn them to see your growth!
              </p>
            </div>

            <div className="bg-blue-50 p-6 md:p-8 rounded-lg max-w-md mx-auto">
              <h3 className="font-semibold mb-4 text-base md:text-lg">Ready to start learning?</h3>
              <p className="text-sm md:text-base text-gray-600 mb-6">
                Browse our comprehensive kanji dictionary and start checking off characters as you master them.
              </p>
              <Link href="/kanji">
                <Button size="lg" className="w-full">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Browse Kanji Dictionary
                </Button>
              </Link>
            </div>

            {/* Tips */}
            <div className="mt-8 md:mt-12 max-w-4xl mx-auto px-4">
              <h3 className="font-semibold mb-6 text-base md:text-lg text-center">How it works:</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                <div className="bg-gray-50 p-4 md:p-6 rounded-lg text-center">
                  <div className="font-medium mb-2 text-sm md:text-base">1. Browse Kanji</div>
                  <p className="text-gray-600 text-xs md:text-sm">Explore kanji organized by JLPT levels N5-N1</p>
                </div>
                <div className="bg-gray-50 p-4 md:p-6 rounded-lg text-center">
                  <div className="font-medium mb-2 text-sm md:text-base">2. Check Off Learned</div>
                  <p className="text-gray-600 text-xs md:text-sm">Click the checkmark button when you master a character</p>
                </div>
                <div className="bg-gray-50 p-4 md:p-6 rounded-lg text-center sm:col-span-2 lg:col-span-1">
                  <div className="font-medium mb-2 text-sm md:text-base">3. Track Progress</div>
                  <p className="text-gray-600 text-xs md:text-sm">Watch your learning progress grow over time</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="container mx-auto p-4 md:p-8 max-w-6xl">
        {/* Breadcrumbs */}
        <nav className="text-sm text-gray-600 mb-6">
          <Link href="/kanji" className="hover:text-blue-600 flex items-center">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Kanji Dictionary
          </Link>
        </nav>

        {/* Header */}
        <div className="text-center mb-6 md:mb-8">
          <h1 className="text-2xl md:text-4xl font-bold mb-3 md:mb-4">Your Kanji Progress</h1>
          <p className="text-lg md:text-xl text-gray-600 px-4">
            Track your Japanese kanji learning journey over time
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Learned</CardTitle>
              <BookOpen className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{totalLearned}</div>
              <p className="text-sm text-gray-600">kanji mastered</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In {periodLabels[selectedPeriod]}</CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">
                {totalInPeriod}
              </div>
              <p className="text-sm text-gray-600">kanji learned</p>
            </CardContent>
          </Card>
        </div>

        <div className="mb-8">
          <ProgressChart
            getProgressData={getProgressOverTime}
            initialPeriod="30d"
          />
        </div>

        {/* CTA Section */}
        <CTASection variant="with-image" />


        {/* Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto">
          <Link href="/kanji" className="w-full">
            <Button variant="default" size="lg" className="w-full">
              <BookOpen className="w-4 h-4 mr-2" />
              Continue Learning
            </Button>
          </Link>
          
          <Button 
            variant="outline" 
            size="lg"
            className="w-full"
            onClick={() => {
              if (confirm('Are you sure you want to reset all progress? This cannot be undone.')) {
                resetProgress();
              }
            }}
          >
            Reset Progress
          </Button>
        </div>

        {/* Additional Info */}
        <div className="mt-8 md:mt-12 text-center px-4">
          <p className="text-xs md:text-sm text-gray-600 max-w-2xl mx-auto">
            Your progress is saved locally in this browser. If you clear your history you will lose your progress. Keep learning consistently 
            to build a strong foundation in Japanese kanji recognition and writing.
          </p>
        </div>
      </div>
    </>
  );
}