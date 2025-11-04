'use client';

import { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/sections/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
              <CardTitle className="text-sm font-medium">In {periodLabels[selectedPeriod]}</CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">
                {progressData.reduce((sum, day) => sum + day.daily, 0)}
              </div>
              <p className="text-xs text-gray-600">kanji learned</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Daily Average</CardTitle>
              <div className="h-4 w-4 bg-purple-600 rounded-full" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {progressData.length > 0 
                  ? Math.round((progressData.reduce((sum, day) => sum + day.daily, 0) / progressData.length) * 10) / 10
                  : 0
                }
              </div>
              <p className="text-xs text-gray-600">kanji per day</p>
            </CardContent>
          </Card>
        </div>

        {/* Progress Chart */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>Learning Progress - {periodLabels[selectedPeriod]}</CardTitle>
                <CardDescription>
                  Daily kanji learned over the selected time period
                </CardDescription>
              </div>
              
              {/* Period Selector */}
              <div className="flex gap-2">
                {(Object.keys(periodLabels) as TimePeriod[]).map((period) => (
                  <Button
                    key={period}
                    variant={selectedPeriod === period ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedPeriod(period)}
                  >
                    {period.toUpperCase()}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={progressData} margin={{ top: 20, right: 20, bottom: 60, left: 20 }}>
                  <defs>
                    <linearGradient id="kanjiGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    angle={selectedPeriod === '24h' ? -45 : 0}
                    textAnchor={selectedPeriod === '24h' ? 'end' : 'middle'}
                    stroke="#9ca3af"
                    height={selectedPeriod === '24h' ? 80 : 60}
                  />
                  <YAxis 
                    tick={{ fontSize: 11 }}
                    stroke="#9ca3af"
                    width={40}
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

        {/* CTA Section */}
        <div className="mb-8">
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="font-semibold mb-3">Ready to Start Your Language Learning Journey?</h3>
            <p className="mb-4">
              Practice Japanese with AI-powered feedback tailored to your learning goals.
            </p>
            <a 
              href="https://llanai.com" 
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors inline-block"
            >
              Start Japanese Practice
            </a>
          </div>
        </div>

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