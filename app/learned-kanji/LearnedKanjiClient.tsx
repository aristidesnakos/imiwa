'use client';

import { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/sections/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CTASection } from '@/components/CTASection';
import { useKanjiProgress } from '@/hooks/useKanjiProgress';
import { ArrowLeft, BookOpen, TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

type TimePeriod = '24h' | '7d' | '30d' | '12m';

interface TooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.[0]) return null;
  
  return (
    <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
      <p className="text-sm font-medium text-gray-900 mb-1">{label}</p>
      <div className="space-y-1">
        <p className="text-sm text-emerald-600">
          Daily: {payload[0].value} kanji
        </p>
      </div>
    </div>
  );
}

export function LearnedKanjiClient() {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('30d');
  const { totalLearned, getProgressOverTime, resetProgress } = useKanjiProgress();
  const progressData = getProgressOverTime(selectedPeriod);

  const periodLabels = {
    '24h': 'Last 24 Hours',
    '7d': 'Last 7 Days', 
    '30d': 'Last 30 Days',
    '12m': 'Last 12 Months'
  };

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
            <div className="mt-8 md:mt-12 max-w-2xl mx-auto px-4">
              <h3 className="font-semibold mb-4 text-base md:text-lg">How it works:</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
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
                {progressData.reduce((sum, day) => sum + day.daily, 0)}
              </div>
              <p className="text-sm text-gray-600">kanji learned</p>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <CTASection />

        {/* Progress Chart */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex flex-col gap-4">
              <div>
                <CardTitle className="text-lg md:text-xl">Learning Progress - {periodLabels[selectedPeriod]}</CardTitle>
                <CardDescription className="text-sm">
                  Daily kanji learned over the selected time period
                </CardDescription>
              </div>
              
              {/* Period Selector */}
              <div className="grid grid-cols-2 sm:flex gap-2">
                {(Object.keys(periodLabels) as TimePeriod[]).map((period) => (
                  <Button
                    key={period}
                    variant={selectedPeriod === period ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedPeriod(period)}
                    className="text-xs sm:text-sm"
                  >
                    {period.toUpperCase()}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart 
                  data={progressData} 
                  margin={{ 
                    top: 20, 
                    right: 10, 
                    bottom: selectedPeriod === '24h' ? 80 : 60, 
                    left: 10 
                  }}
                >
                  <defs>
                    <linearGradient id="kanjiGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="name"
                    tick={{ fontSize: 10 }}
                    angle={selectedPeriod === '24h' ? -45 : 0}
                    textAnchor={selectedPeriod === '24h' ? 'end' : 'middle'}
                    stroke="#9ca3af"
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    tick={{ fontSize: 10 }}
                    stroke="#9ca3af"
                    width={30}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="daily" 
                    stroke="#10B981"
                    strokeWidth={2} 
                    fill="url(#kanjiGradient)"
                    name="Daily Kanji"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center">
          <Link href="/kanji" className="w-full sm:w-auto">
            <Button variant="default" size="lg" className="w-full sm:w-auto">
              <BookOpen className="w-4 h-4 mr-2" />
              Continue Learning
            </Button>
          </Link>
          
          <Button 
            variant="outline" 
            size="lg"
            className="w-full sm:w-auto"
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