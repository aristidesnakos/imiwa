'use client';

import Link from 'next/link';
import Header from '@/components/sections/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useKanjiProgress } from '@/hooks/useKanjiProgress';
import { ArrowLeft, BookOpen, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function LearnedKanjiClient() {
  const { totalLearned, getProgressOverTime, resetProgress } = useKanjiProgress();
  const progressData = getProgressOverTime();

  // If no kanji learned yet, show CTA
  if (totalLearned === 0) {
    return (
      <>
        <Header />
        <div className="container mx-auto p-8 max-w-4xl">
          {/* Breadcrumbs */}
          <nav className="text-sm text-gray-600 mb-6">
            <Link href="/kanji" className="hover:text-blue-600 flex items-center">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Kanji Dictionary
            </Link>
          </nav>

          {/* Empty State */}
          <div className="text-center py-16">
            <div className="mb-8">
              <BookOpen className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h1 className="text-4xl font-bold mb-4">Start Your Kanji Journey</h1>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
                Begin learning Japanese kanji and track your progress over time. 
                Check off kanji as you learn them to see your growth!
              </p>
            </div>

            <div className="bg-blue-50 p-8 rounded-lg max-w-md mx-auto">
              <h3 className="font-semibold mb-4">Ready to start learning?</h3>
              <p className="text-sm text-gray-600 mb-6">
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
            <div className="mt-12 max-w-2xl mx-auto">
              <h3 className="font-semibold mb-4">How it works:</h3>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="font-medium mb-2">1. Browse Kanji</div>
                  <p className="text-gray-600">Explore kanji organized by JLPT levels N5-N1</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="font-medium mb-2">2. Check Off Learned</div>
                  <p className="text-gray-600">Click the checkmark button when you master a character</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="font-medium mb-2">3. Track Progress</div>
                  <p className="text-gray-600">Watch your learning progress grow over time</p>
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
      <div className="container mx-auto p-8 max-w-6xl">
        {/* Breadcrumbs */}
        <nav className="text-sm text-gray-600 mb-6">
          <Link href="/kanji" className="hover:text-blue-600 flex items-center">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Kanji Dictionary
          </Link>
        </nav>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Your Kanji Progress</h1>
          <p className="text-xl text-gray-600">
            Track your Japanese kanji learning journey over time
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Learned</CardTitle>
              <BookOpen className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{totalLearned}</div>
              <p className="text-xs text-gray-600">kanji mastered</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Learning Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {progressData.length > 1 
                  ? Math.round((totalLearned / progressData.length) * 10) / 10
                  : totalLearned
                }
              </div>
              <p className="text-xs text-gray-600">avg per learning session</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Progress Percentage</CardTitle>
              <div className="h-4 w-4 bg-purple-600 rounded-full" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {Math.round((totalLearned / 2136) * 100)}%
              </div>
              <p className="text-xs text-gray-600">of all JLPT kanji</p>
            </CardContent>
          </Card>
        </div>

        {/* Progress Chart */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Learning Progress Over Time</CardTitle>
            <CardDescription>
              Your kanji learning journey visualized by cumulative count
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={progressData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    formatter={(value) => [value, 'Kanji Learned']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/kanji">
            <Button variant="default" size="lg">
              <BookOpen className="w-4 h-4 mr-2" />
              Continue Learning
            </Button>
          </Link>
          
          <Button 
            variant="outline" 
            size="lg"
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
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-600 max-w-2xl mx-auto">
            Your progress is saved locally in your browser. Keep learning consistently 
            to build a strong foundation in Japanese kanji recognition and writing.
          </p>
        </div>
      </div>
    </>
  );
}