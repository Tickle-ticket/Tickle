'use client';

import React from 'react';

export type LoadMetricTone = 'green' | 'orange' | 'red';

export interface LoadMetricThreshold {
  value: number;
  color: string;
}

export interface LoadMetricGauge {
  id: string;
  label: string;
  value: number;
  unit: string;
  max: number;
  tone?: LoadMetricTone;
  decimals?: number;
  thresholds?: LoadMetricThreshold[];
}

export interface PrometheusInstantVectorResponse {
  status: 'success' | 'error';
  data?: {
    resultType: 'vector';
    result: Array<{
      metric: Record<string, string>;
      value: [number, string];
    }>;
  };
}

export interface LoadMetricGaugePanelProps {
  metrics: LoadMetricGauge[];
  backgroundColor?: string;
  panelBackgroundColor?: string;
  textColor?: string;
  mutedTextColor?: string;
  trackColor?: string;
  height?: number;
}

const toneColor: Record<LoadMetricTone, string> = {
  green: '#16a34a',
  orange: '#f97316',
  red: '#dc2626',
};

const defaultThresholdColors = ['#22c55e', '#f97316', '#dc2626'];

function formatMetricValue(value: number, decimals = 0) {
  return new Intl.NumberFormat('ko-KR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

function getTone(metric: LoadMetricGauge): LoadMetricTone {
  if (metric.tone) {
    return metric.tone;
  }

  const ratio = metric.max > 0 ? metric.value / metric.max : 0;

  if (ratio >= 0.8) {
    return 'red';
  }

  if (ratio >= 0.6) {
    return 'orange';
  }

  return 'green';
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getPointOnGauge(ratio: number, radius: number) {
  const angle = Math.PI + clamp(ratio, 0, 1) * Math.PI;

  return {
    x: 100 + radius * Math.cos(angle),
    y: 108 + radius * Math.sin(angle),
  };
}

function getGaugeArc(startRatio: number, endRatio: number, radius = 82) {
  const start = getPointOnGauge(startRatio, radius);
  const end = getPointOnGauge(endRatio, radius);
  const largeArcFlag = 0;

  return `M ${start.x.toFixed(3)} ${start.y.toFixed(3)} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x.toFixed(
    3,
  )} ${end.y.toFixed(3)}`;
}

function getThresholds(metric: LoadMetricGauge) {
  const safeMax = Math.max(metric.max, 1);
  const thresholds =
    metric.thresholds && metric.thresholds.length > 0
      ? metric.thresholds
      : [
          { value: 0, color: defaultThresholdColors[0] },
          { value: safeMax * 0.6, color: defaultThresholdColors[1] },
          { value: safeMax * 0.82, color: defaultThresholdColors[2] },
        ];

  const sorted = [...thresholds]
    .filter((threshold) => Number.isFinite(threshold.value))
    .sort((a, b) => a.value - b.value);

  if (sorted[0]?.value !== 0) {
    sorted.unshift({ value: 0, color: sorted[0]?.color ?? defaultThresholdColors[0] });
  }

  return sorted.map((threshold, index) => {
    const nextValue = sorted[index + 1]?.value ?? safeMax;

    return {
      color: threshold.color,
      startRatio: clamp(threshold.value / safeMax, 0, 1),
      endRatio: clamp(nextValue / safeMax, 0, 1),
    };
  });
}

export function mapPrometheusInstantToLoadMetrics(
  response: PrometheusInstantVectorResponse,
  metricConfig: Array<Omit<LoadMetricGauge, 'value'> & { prometheusName: string }>,
): LoadMetricGauge[] {
  return metricConfig.map((config) => {
    const result = response.data?.result.find((item) => item.metric.__name__ === config.prometheusName);
    const value = Number(result?.value[1] ?? 0);

    return {
      id: config.id,
      label: config.label,
      value,
      unit: config.unit,
      max: config.max,
      tone: config.tone,
      decimals: config.decimals,
      thresholds: config.thresholds,
    };
  });
}

function GaugeSvg({
  metric,
  color,
  textColor,
  mutedTextColor,
  trackColor,
}: {
  metric: LoadMetricGauge;
  color: string;
  textColor: string;
  mutedTextColor: string;
  trackColor: string;
}) {
  const safeMax = Math.max(metric.max, 1);
  const valueRatio = clamp(metric.value / safeMax, 0, 1);
  const marker = getPointOnGauge(valueRatio, 82);
  const thresholds = getThresholds(metric);

  return (
    <svg role="img" aria-label={`${metric.label} ${metric.value}${metric.unit}`} viewBox="0 0 200 136" className="h-full w-full">
      <path d={getGaugeArc(0, 1)} fill="none" stroke={trackColor} strokeLinecap="round" strokeWidth="18" />

      {thresholds.map((segment) =>
        segment.endRatio > segment.startRatio ? (
          <path
            key={`${segment.startRatio}-${segment.endRatio}-${segment.color}`}
            d={getGaugeArc(segment.startRatio, segment.endRatio)}
            fill="none"
            stroke={segment.color}
            strokeLinecap="butt"
            strokeOpacity="0.28"
            strokeWidth="18"
          />
        ) : null,
      )}

      {valueRatio > 0 ? (
        <path d={getGaugeArc(0, valueRatio)} fill="none" stroke={color} strokeLinecap="round" strokeWidth="10" />
      ) : null}

      <circle cx={marker.x} cy={marker.y} r="5.5" fill={color} stroke="#ffffff" strokeWidth="2" />

      <text x="100" y="88" textAnchor="middle" fill={color} fontSize="26" fontWeight="800">
        {formatMetricValue(metric.value, metric.decimals)}
      </text>
      <text x="100" y="107" textAnchor="middle" fill={mutedTextColor} fontSize="12" fontWeight="700">
        {metric.unit}
      </text>
      <text x="24" y="128" fill={mutedTextColor} fontSize="10" fontWeight="700">
        0
      </text>
      <text x="176" y="128" textAnchor="end" fill={mutedTextColor} fontSize="10" fontWeight="700">
        {formatMetricValue(safeMax)}
      </text>
      <circle cx="100" cy="108" r="3" fill={textColor} opacity="0.16" />
    </svg>
  );
}

function LoadMetricGaugeCard({
  metric,
  panelBackgroundColor,
  textColor,
  mutedTextColor,
  trackColor,
  height,
}: {
  metric: LoadMetricGauge;
  panelBackgroundColor: string;
  textColor: string;
  mutedTextColor: string;
  trackColor: string;
  height: number;
}) {
  const tone = getTone(metric);
  const color = toneColor[tone];

  return (
    <article
      className="min-w-[230px] flex-1 rounded-sm border border-line px-4 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
      style={{ backgroundColor: panelBackgroundColor, height }}
    >
      <header className="flex items-center gap-2">
        <h3 className="truncate text-[13px] font-black leading-5 tracking-normal" style={{ color: textColor }}>
          {metric.label}
        </h3>
        <span
          className="flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-full border text-[10px] font-black"
          style={{ borderColor: mutedTextColor, color: mutedTextColor }}
          aria-hidden="true"
        >
          i
        </span>
      </header>

      <div className="mt-1 h-[136px]">
        <GaugeSvg
          metric={metric}
          color={color}
          textColor={textColor}
          mutedTextColor={mutedTextColor}
          trackColor={trackColor}
        />
      </div>
    </article>
  );
}

export function LoadMetricGaugePanel({
  metrics,
  backgroundColor = '#ffffff',
  panelBackgroundColor = '#ffffff',
  textColor = '#111827',
  mutedTextColor = '#64748b',
  trackColor = '#f1f5f9',
  height = 196,
}: LoadMetricGaugePanelProps) {
  return (
    <section className="w-full overflow-x-auto rounded-md border border-line p-1 shadow-[0_18px_46px_rgba(15,23,42,0.08)]" style={{ backgroundColor }}>
      <div className="flex min-w-max gap-1">
        {metrics.map((metric) => (
          <LoadMetricGaugeCard
            key={metric.id}
            metric={metric}
            panelBackgroundColor={panelBackgroundColor}
            textColor={textColor}
            mutedTextColor={mutedTextColor}
            trackColor={trackColor}
            height={height}
          />
        ))}
      </div>
    </section>
  );
}

export default LoadMetricGaugePanel;
