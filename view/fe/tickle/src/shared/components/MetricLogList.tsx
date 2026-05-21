'use client';

import React from 'react';
import { MetricLogItemRow } from './MetricLogItemRow';
import type { MetricLogItem } from './MetricLogItemRow';

export type { MetricLogItem, MetricLogLevel, MetricLogStatus } from './MetricLogItemRow';

export interface MetricLogListProps {
  logs: MetricLogItem[];
  title?: string;
  subtitle?: string;
  selectedMetricId?: string;
  backgroundColor?: string;
  panelBackgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  mutedTextColor?: string;
  maxHeight?: number;
  emptyText?: string;
}

function getSortedLogs(logs: MetricLogItem[], selectedMetricId?: string) {
  return [...logs.filter((log) => !selectedMetricId || log.metricId === selectedMetricId)].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}

function getMetricSummary(logs: MetricLogItem[]) {
  const metrics = new Map<string, { id: string; label: string; count: number; criticalCount: number }>();

  logs.forEach((log) => {
    const current = metrics.get(log.metricId) ?? {
      id: log.metricId,
      label: log.metricLabel,
      count: 0,
      criticalCount: 0,
    };

    current.count += 1;
    current.criticalCount += log.level === 'critical' ? 1 : 0;
    metrics.set(log.metricId, current);
  });

  return Array.from(metrics.values());
}

export function MetricLogList({
  logs,
  title = 'Metric event logs',
  subtitle = 'Latest threshold changes and load test events',
  selectedMetricId,
  backgroundColor = '#ffffff',
  panelBackgroundColor = '#fff7ed',
  borderColor = '#e5e7eb',
  textColor = '#111827',
  mutedTextColor = '#64748b',
  maxHeight = 420,
  emptyText = 'No metric logs found.',
}: MetricLogListProps) {
  const visibleLogs = getSortedLogs(logs, selectedMetricId);
  const metricSummary = getMetricSummary(logs);

  return (
    <section
      className="w-full overflow-hidden rounded-md border p-4 shadow-[0_18px_46px_rgba(15,23,42,0.08)]"
      style={{ backgroundColor, borderColor, color: textColor }}
    >
      <header className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-start sm:justify-between" style={{ borderColor }}>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#f97316]" />
            <h2 className="truncate text-[16px] font-black leading-6 tracking-normal">{title}</h2>
          </div>
          <p className="mt-1 text-[12px] font-semibold leading-5" style={{ color: mutedTextColor }}>
            {subtitle}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {metricSummary.map((metric) => (
            <span
              key={metric.id}
              className="inline-flex h-[28px] items-center rounded-full border px-3 text-[11px] font-black"
              style={{
                borderColor: selectedMetricId === metric.id ? '#f97316' : borderColor,
                color: selectedMetricId === metric.id ? '#f97316' : mutedTextColor,
                backgroundColor: selectedMetricId === metric.id ? 'rgba(249, 115, 22, 0.09)' : '#ffffff',
              }}
            >
              {metric.label}
              <span className="ml-2 text-[10px]" style={{ color: metric.criticalCount > 0 ? '#ef4444' : mutedTextColor }}>
                {metric.count}
              </span>
            </span>
          ))}
        </div>
      </header>

      <div className="overflow-y-auto" style={{ maxHeight }}>
        {visibleLogs.length === 0 ? (
          <div className="flex h-[160px] items-center justify-center text-[13px] font-bold" style={{ color: mutedTextColor }}>
            {emptyText}
          </div>
        ) : (
          <ol className="divide-y" style={{ borderColor }}>
            {visibleLogs.map((log) => (
              <MetricLogItemRow
                key={log.id}
                log={log}
                panelBackgroundColor={panelBackgroundColor}
                borderColor={borderColor}
                textColor={textColor}
                mutedTextColor={mutedTextColor}
              />
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}

export default MetricLogList;
