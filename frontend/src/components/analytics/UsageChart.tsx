'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { format } from 'date-fns';

import type { TimeSeriesDataPoint } from '@/types';

interface UsageChartProps {
  data: TimeSeriesDataPoint[];
  label?: string;
  color?: string;
  height?: number;
}

export function UsageChart({
  data,
  label = 'Queries',
  color = '#4f46e5',
  height = 200,
}: UsageChartProps) {
  const formatted = data.map((d) => ({
    ...d,
    date: format(new Date(d.date), 'MMM d'),
  }));

  return (
    <ResponsiveContainer height={height} width="100%">
      <AreaChart data={formatted} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
        <defs>
          <linearGradient id="usageGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.15} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" vertical={false} />
        <XAxis
          axisLine={false}
          dataKey="date"
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          tickLine={false}
        />
        <YAxis
          axisLine={false}
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
            fontSize: '12px',
          }}
          formatter={(value: number) => [value.toLocaleString(), label]}
          labelStyle={{ color: '#334155', fontWeight: 600 }}
        />
        <Area
          dataKey="value"
          fill="url(#usageGradient)"
          name={label}
          stroke={color}
          strokeWidth={2}
          type="monotone"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
