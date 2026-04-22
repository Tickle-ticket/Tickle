'use client';

import React from 'react';

export type MetricLogLevel = 'info' | 'success' | 'warning' | 'critical';
export type MetricLogStatus = 'normal' | 'warning' | 'critical' | 'recovered';

export interface MetricLogItem {
  id: string;
  timestamp: string;
  metricId: string;
  metricLabel: string;
  level: MetricLogLevel;
  status: MetricLogStatus;
  value: number;
  unit: string;
  threshold?: number;
  max?: number;
  message: string;
  source: string;
  scenario?: string;
  testRunId?: string;
  serviceName?: string;
}

export interface MetricLogItemRowProps {
  log: MetricLogItem;
  panelBackgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  mutedTextColor?: string;
}

const levelStyle: Record<MetricLogLevel, { color: string; background: string; border: string }> = {
  info: {
    color: '#2563eb',
    background: 'rgba(37, 99, 235, 0.08)',
    border: 'rgba(37, 99, 235, 0.22)',
  },
  success: {
    color: '#16a34a',
    background: 'rgba(34, 197, 94, 0.1)',
    border: 'rgba(34, 197, 94, 0.28)',
  },
  warning: {
    color: '#f97316',
    background: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.34)',
  },
  critical: {
    color: '#ef4444',
    background: 'rgba(239, 68, 68, 0.12)',
    border: 'rgba(239, 68, 68, 0.34)',
  },
};

export function formatMetricLogValue(value: number, unit: string) {
  const maximumFractionDigits = unit === '%' ? 1 : 0;

  return `${new Intl.NumberFormat('ko-KR', {
    maximumFractionDigits,
  }).format(value)}${unit}`;
}

export function formatMetricLogTimestamp(timestamp: string) {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  return new Intl.DateTimeFormat('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

export function MetricLogItemRow({
  log,
  panelBackgroundColor = '#fff7ed',
  borderColor = '#e5e7eb',
  textColor = '#111827',
  mutedTextColor = '#64748b',
}: MetricLogItemRowProps) {
  const style = levelStyle[log.level];
  const thresholdLabel = log.threshold === undefined ? null : formatMetricLogValue(log.threshold, log.unit);

  return (
    <li className="grid gap-3 py-3 lg:grid-cols-[150px_180px_150px_1fr_180px] lg:items-center">
      <time className="text-[12px] font-black tabular-nums" style={{ color: mutedTextColor }}>
        {formatMetricLogTimestamp(log.timestamp)}
      </time>

      <div className="min-w-0">
        <p className="truncate text-[13px] font-black leading-5">{log.metricLabel}</p>
        <p className="truncate text-[11px] font-bold leading-4" style={{ color: mutedTextColor }}>
          {log.source}
          {log.serviceName ? ` / ${log.serviceName}` : ''}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <span
          className="inline-flex h-[24px] items-center rounded-full border px-2 text-[10px] font-black uppercase"
          style={{ backgroundColor: style.background, borderColor: style.border, color: style.color }}
        >
          {log.level}
        </span>
        <span className="text-[13px] font-black tabular-nums" style={{ color: style.color }}>
          {formatMetricLogValue(log.value, log.unit)}
        </span>
      </div>

      <p className="min-w-0 text-[12px] font-semibold leading-5" style={{ color: textColor }}>
        {log.message}
        {thresholdLabel ? (
          <span className="ml-2 whitespace-nowrap" style={{ color: mutedTextColor }}>
            threshold {thresholdLabel}
          </span>
        ) : null}
      </p>

      <div
        className="min-w-0 rounded-sm border px-3 py-2 text-[11px] font-bold"
        style={{ backgroundColor: panelBackgroundColor, borderColor, color: mutedTextColor }}
      >
        <p className="truncate">{log.scenario ?? 'load-test'}</p>
        <p className="truncate tabular-nums">{log.testRunId ?? log.status}</p>
      </div>
    </li>
  );
}

export default MetricLogItemRow;
