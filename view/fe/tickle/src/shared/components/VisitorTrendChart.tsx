'use client';

import React from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export interface VisitorTrendPoint {
  time: string;
  visitors: number;
}

export type PrometheusMatrixValue = [number, string];

export interface PrometheusQueryRangeResponse {
  status: 'success' | 'error';
  data?: {
    resultType: 'matrix';
    result: Array<{
      metric: Record<string, string>;
      values: PrometheusMatrixValue[];
    }>;
  };
}

export interface VisitorTrendChartProps {
  data: VisitorTrendPoint[];
  title?: string;
  subtitle?: string;
  currentVisitors?: number;
  peakVisitors?: number;
  unitLabel?: string;
  lineColor?: string;
  fillColor?: string;
  backgroundColor?: string;
  chartBackgroundColor?: string;
  textColor?: string;
  mutedTextColor?: string;
  gridColor?: string;
  height?: number;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('ko-KR').format(value);
}

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

function formatPrometheusTime(timestampSeconds: number) {
  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(timestampSeconds * 1000));
}

export function mapPrometheusVisitorsToTrendPoints(
  response: PrometheusQueryRangeResponse,
  seriesIndex = 0,
): VisitorTrendPoint[] {
  const values = response.data?.result[seriesIndex]?.values ?? [];

  return values.map(([timestamp, value]) => ({
    time: formatPrometheusTime(timestamp),
    visitors: Number(value),
  }));
}

export function VisitorTrendChart({
  data,
  title = 'Realtime visitors',
  subtitle = 'Last 30 minutes',
  currentVisitors,
  peakVisitors,
  unitLabel = 'users',
  lineColor = '#16a34a',
  fillColor = 'gradient',
  backgroundColor = '#ffffff',
  chartBackgroundColor = '#f0fdf4',
  textColor = '#111827',
  mutedTextColor = '#64748b',
  gridColor = '#bbf7d0',
  height = 260,
}: VisitorTrendChartProps) {
  const latestVisitors = currentVisitors ?? data[data.length - 1]?.visitors ?? 0;
  const maxVisitors = peakVisitors ?? Math.max(0, ...data.map((point) => point.visitors));
  const peakRatio = maxVisitors > 0 ? (latestVisitors / maxVisitors) * 100 : 0;
  const previousVisitors = data.length > 1 ? data[data.length - 2].visitors : latestVisitors;
  const visitorDiff = latestVisitors - previousVisitors;
  const diffLabel = visitorDiff >= 0 ? `+${formatNumber(visitorDiff)}` : formatNumber(visitorDiff);

  return (
    <section
      className="w-full overflow-hidden rounded-lg border border-slate-200 p-5 shadow-[0_18px_46px_rgba(15,23,42,0.08)]"
      style={{ backgroundColor, color: textColor }}
    >
      <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: lineColor }} />
            <h2 className="truncate text-[16px] font-bold leading-6 tracking-normal">{title}</h2>
            <span
              className="inline-flex h-[20px] items-center rounded-full px-2 text-[10px] font-black leading-none"
              style={{ backgroundColor: `${lineColor}1A`, color: lineColor }}
            >
              LIVE
            </span>
          </div>
          <p className="mt-1 text-[12px] font-medium leading-5" style={{ color: mutedTextColor }}>
            {subtitle}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:min-w-[250px]">
          <div className="rounded-lg border border-emerald-100 bg-emerald-50/70 px-4 py-3">
            <p className="text-[11px] font-semibold" style={{ color: mutedTextColor }}>
              Current visitors
            </p>
            <p className="mt-1 text-[26px] font-bold leading-8" style={{ color: lineColor }}>
              {formatNumber(latestVisitors)}
              <span className="ml-1 text-[12px] font-semibold" style={{ color: mutedTextColor }}>
                {unitLabel}
              </span>
            </p>
            <p className="mt-1 text-[11px] font-bold" style={{ color: visitorDiff >= 0 ? lineColor : '#dc2626' }}>
              {diffLabel} from previous
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
            <p className="text-[11px] font-semibold" style={{ color: mutedTextColor }}>
              Peak
            </p>
            <p className="mt-1 text-[26px] font-bold leading-8">
              {formatNumber(maxVisitors)}
              <span className="ml-1 text-[12px] font-semibold" style={{ color: mutedTextColor }}>
                {unitLabel}
              </span>
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full" style={{ width: `${Math.min(100, peakRatio)}%`, backgroundColor: lineColor }} />
            </div>
            <p className="mt-1 text-[11px] font-semibold" style={{ color: mutedTextColor }}>
              {formatPercent(peakRatio)} of peak
            </p>
          </div>
        </div>
      </header>

      <div
        className="rounded-lg border border-emerald-100 p-4"
        style={{ width: '100%', height, backgroundColor: chartBackgroundColor }}
      >
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="visitorTrendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={lineColor} stopOpacity={0.32} />
                <stop offset="95%" stopColor={lineColor} stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={gridColor} strokeDasharray="4 8" vertical={false} opacity={0.7} />
            <XAxis
              dataKey="time"
              axisLine={false}
              tickLine={false}
              tick={{ fill: mutedTextColor, fontSize: 11, fontWeight: 600 }}
              minTickGap={26}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              width={44}
              tick={{ fill: mutedTextColor, fontSize: 11, fontWeight: 600 }}
              tickFormatter={(value) => formatNumber(Number(value))}
            />
            <Tooltip
              cursor={{ stroke: lineColor, strokeOpacity: 0.35 }}
              contentStyle={{
                backgroundColor: '#ffffff',
                border: `1px solid ${gridColor}`,
                borderRadius: 8,
                color: textColor,
                boxShadow: '0 16px 40px rgba(15,23,42,0.12)',
              }}
              labelStyle={{ color: mutedTextColor, fontWeight: 700 }}
              formatter={(value) => [`${formatNumber(Number(value))}${unitLabel}`, 'Visitors']}
            />
            <Area
              type="monotone"
              dataKey="visitors"
              stroke={lineColor}
              strokeWidth={2.5}
              fill={fillColor === 'gradient' ? 'url(#visitorTrendFill)' : fillColor}
              dot={false}
              activeDot={{ r: 4, fill: lineColor, stroke: backgroundColor, strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export default VisitorTrendChart;
