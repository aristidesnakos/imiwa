'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

type TimePeriod = '24h' | '7d' | '30d' | '12m';

interface ProgressData {
  name: string;
  daily: number;
  // Optional so callers that only produce daily deltas keep working
  cumulative?: number;
}

interface TooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  period?: TimePeriod;
}

const DELTA_NOUN: Record<TimePeriod, string> = {
  '24h': 'that hour',
  '7d': 'that day',
  '30d': 'that day',
  '12m': 'that month',
};

interface ProgressChartProps {
  getProgressData: (period: TimePeriod) => ProgressData[];
  periodLabels?: Record<TimePeriod, string>;
  initialPeriod?: TimePeriod;
  selectedPeriod?: TimePeriod;
  showPeriodSelector?: boolean;
  title?: string;
  description?: string;
  className?: string;
}

function CustomTooltip({ active, payload, label, period = '30d' }: TooltipProps) {
  if (!active || !payload?.[0]) return null;

  const point = payload[0].payload as ProgressData | undefined;
  const total = point?.cumulative ?? payload[0].value;

  return (
    <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
      <p className="text-sm font-medium text-gray-900 mb-1">{label}</p>
      <div className="space-y-1">
        <p className="text-sm text-emerald-600">
          {total} kanji learned
        </p>
        {point && (
          <p className="text-xs text-gray-500">
            +{point.daily} {DELTA_NOUN[period]}
          </p>
        )}
      </div>
    </div>
  );
}

export function ProgressChart({
  getProgressData,
  periodLabels = {
    '24h': 'Last 24 Hours',
    '7d': 'Last 7 Days', 
    '30d': 'Last 30 Days',
    '12m': 'Last 12 Months'
  },
  initialPeriod = '30d',
  selectedPeriod: externalSelectedPeriod,
  showPeriodSelector = true,
  title,
  description = "Total kanji learned over the selected time period",
  className = ""
}: ProgressChartProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>(initialPeriod);

  const currentPeriod = externalSelectedPeriod || selectedPeriod;
  const data = getProgressData(currentPeriod);

  // Older callers may not supply a running total; the deltas still plot
  const hasCumulative = data.some(point => typeof point.cumulative === 'number');
  const areaKey = hasCumulative ? 'cumulative' : 'daily';

  // A flat non-zero line (earlier progress, nothing new this period) is true and
  // worth drawing. Only a chart with nothing behind it at all is worth replacing.
  const highestCumulative = Math.max(0, ...data.map(point => point.cumulative ?? 0));
  const isEmpty = data.every(point => point.daily === 0) && highestCumulative === 0;

  return (
    <>
      {/* Progress Chart */}
      <Card className={className}>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div>
              <CardTitle className="text-lg md:text-xl">
                {title || `Learning Progress`}
              </CardTitle>
              <CardDescription className="text-sm">
                {description}
              </CardDescription>
            </div>
            
            {/* Period Selector */}
            {showPeriodSelector && (
              <div className="grid grid-cols-2 sm:flex gap-2">
                {(Object.keys(periodLabels) as TimePeriod[]).map((period) => (
                  <Button
                    key={period}
                    variant={currentPeriod === period ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedPeriod(period)}
                    className="text-xs sm:text-sm"
                  >
                    {period.toUpperCase()}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isEmpty ? (
            <div className="h-64 sm:h-80 flex flex-col items-center justify-center text-center px-4">
              <TrendingUp className="w-8 h-8 text-gray-300 mb-3" />
              <p className="text-sm font-medium text-gray-700">
                No kanji learned in this period.
              </p>
              <p className="text-sm text-gray-500 mt-1">
                <Link href="/kanji" className="text-emerald-600 hover:underline">
                  Browse the kanji dictionary
                </Link>{' '}
                and check off characters as you master them.
              </p>
            </div>
          ) : (
            <div className="h-64 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart 
                  data={data} 
                  margin={{ 
                    top: 20, 
                    right: 10, 
                    bottom: currentPeriod === '24h' ? 80 : 60, 
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
                    angle={currentPeriod === '24h' ? -45 : 0}
                    textAnchor={currentPeriod === '24h' ? 'end' : 'middle'}
                    stroke="#9ca3af"
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    tick={{ fontSize: 10 }}
                    stroke="#9ca3af"
                    width={30}
                  />
                  <Tooltip content={<CustomTooltip period={currentPeriod} />} />
                  <Area
                    type="monotone"
                    dataKey={areaKey}
                    stroke="#10B981"
                    strokeWidth={2}
                    fill="url(#kanjiGradient)"
                    name="Kanji Learned"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}