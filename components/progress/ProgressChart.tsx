'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

type TimePeriod = '24h' | '7d' | '30d' | '12m';

interface ProgressData {
  name: string;
  daily: number;
}

interface TooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

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
  description = "Daily kanji learned over the selected time period",
  className = ""
}: ProgressChartProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>(initialPeriod);
  
  const currentPeriod = externalSelectedPeriod || selectedPeriod;
  const data = getProgressData(currentPeriod);

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
    </>
  );
}