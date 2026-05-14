'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getAdminUserStats, getAdminUserStatsStreamUrl } from '@/src/shared/api/adminApi';
import type { ActiveUserStatsResponse } from '@/src/shared/api/types/admin.types';
import { useSSE } from '@/src/shared/hooks/useSSE';

type ActiveUserPoint = ActiveUserStatsResponse & {
  time: string;
};

const MAX_HISTORY_POINTS = 36;

const formatNumber = (value: number) => new Intl.NumberFormat('ko-KR').format(value);

const formatTime = () =>
  new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date());

const unwrapSseData = <T,>(payload: T | { data: T } | null) => {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return payload.data;
  }

  return payload as T | null;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : '접속자 통계를 불러오지 못했습니다.';
}

function getStatusLabel(stats: ActiveUserStatsResponse | null) {
  if (!stats || stats.peakCount === 0) {
    return { label: '대기', className: 'bg-surface-subtle text-content-tertiary' };
  }

  const ratio = stats.currentCount / stats.peakCount;

  if (ratio >= 0.9) {
    return { label: '피크 근접', className: 'bg-warning-subtle text-warning' };
  }

  if (ratio >= 0.7) {
    return { label: '상승', className: 'bg-primary-subtle text-primary' };
  }

  return { label: '정상', className: 'bg-success-subtle text-success' };
}

function toMetricCards(stats: ActiveUserStatsResponse | null, previous: ActiveUserStatsResponse | null) {
  const currentDiff = stats && previous ? stats.currentCount - previous.currentCount : 0;

  return [
    {
      label: '현재 접속',
      value: stats ? `${formatNumber(stats.currentCount)}명` : '-',
      caption: stats ? `${currentDiff >= 0 ? '+' : ''}${formatNumber(currentDiff)}명` : 'SSE 수신 대기',
      tone: currentDiff >= 0 ? 'text-primary' : 'text-success',
    },
    {
      label: '오늘 피크',
      value: stats ? `${formatNumber(stats.peakCount)}명` : '-',
      caption: '일간 최고 동시 접속',
      tone: 'text-slate-950',
    },
    {
      label: '오늘 평균',
      value: stats ? `${formatNumber(stats.averageCount)}명` : '-',
      caption: '5분 스냅샷 평균',
      tone: 'text-success',
    },
  ];
}

export default function AdminServerMonitoringPage() {
  const [stats, setStats] = useState<ActiveUserStatsResponse | null>(null);
  const [history, setHistory] = useState<ActiveUserPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const streamUrl = useMemo(() => getAdminUserStatsStreamUrl(), []);
  const { data: streamData, isConnected } = useSSE<ActiveUserStatsResponse | { data: ActiveUserStatsResponse }>(
    streamUrl,
    { eventNames: ['users.stats'] },
  );
  const streamedStats = useMemo(() => unwrapSseData<ActiveUserStatsResponse>(streamData), [streamData]);

  const appendStatsPoint = useCallback((nextStats: ActiveUserStatsResponse) => {
    const nowLabel = formatTime();

    setStats(nextStats);
    setLastUpdatedAt(new Date().toLocaleString('ko-KR'));

    if (nextStats.chartData?.length) {
      setHistory(nextStats.chartData.map((point) => ({
        time: point.time,
        currentCount: point.currentCount,
        peakCount: nextStats.peakCount,
        averageCount: point.averageCount,
      })).slice(-MAX_HISTORY_POINTS));
      return;
    }

    setHistory((current) => [
      ...current,
      {
        time: nowLabel,
        currentCount: nextStats.currentCount,
        peakCount: nextStats.peakCount,
        averageCount: nextStats.averageCount,
      },
    ].slice(-MAX_HISTORY_POINTS));
  }, []);

  const loadStats = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await getAdminUserStats();

      if (response.data) {
        appendStatsPoint(response.data);
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [appendStatsPoint]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadStats();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadStats]);

  useEffect(() => {
    if (!streamedStats) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      appendStatsPoint(streamedStats);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [appendStatsPoint, streamedStats]);

  const latestStats = stats;
  const previousStats = history.length >= 2 ? history[history.length - 2] : null;
  const metricCards = useMemo(() => toMetricCards(latestStats, previousStats), [latestStats, previousStats]);
  const status = getStatusLabel(latestStats);
  return (
    <div className="space-y-6 p-5 sm:p-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-normal text-slate-950">서버 모니터링 대시보드</h1>
          <p className="mt-2 text-sm font-semibold text-content-tertiary">
            일반 사용자 접속 통계를 SSE로 수신합니다.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className={`rounded-full px-3 py-1.5 text-xs font-black ${status.className}`}>{status.label}</span>
          <span className={`rounded-full px-3 py-1.5 text-xs font-black ${isConnected ? 'bg-success-subtle text-success' : 'bg-surface-subtle text-content-tertiary'}`}>
            {isConnected ? 'SSE 연결됨' : 'SSE 대기'}
          </span>
          <button
            className="h-10 rounded-lg border border-line-strong px-4 text-sm font-black text-content-secondary hover:bg-surface-subtle disabled:cursor-not-allowed disabled:text-content-muted"
            disabled={isLoading}
            onClick={() => void loadStats()}
            type="button"
          >
            {isLoading ? '갱신 중' : '새로고침'}
          </button>
        </div>
      </header>

      {errorMessage ? (
        <p className="rounded-lg bg-danger-subtle px-4 py-3 text-sm font-bold text-danger">{errorMessage}</p>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        {metricCards.map((item) => (
          <article key={item.label} className="rounded-lg border border-line bg-surface p-5">
            <p className="text-sm font-bold text-content-tertiary">{item.label}</p>
            <p className={`mt-3 text-3xl font-black ${item.tone}`}>{item.value}</p>
            <p className="mt-2 text-xs font-bold text-content-tertiary">{item.caption}</p>
          </article>
        ))}
      </section>

      <section>
        <section className="overflow-hidden rounded-lg border border-line bg-surface shadow-[0_18px_46px_rgba(15,23,42,0.08)]">
          <header className="border-b border-line p-5">
            <p className="text-[12px] font-bold text-primary">User traffic</p>
            <h2 className="mt-1 text-[20px] font-black leading-7 tracking-normal text-slate-950">
              실시간 접속자 수
            </h2>
            <p className="mt-1 text-[12px] font-semibold leading-5 text-content-tertiary">
              {lastUpdatedAt ? `마지막 갱신: ${lastUpdatedAt}` : '아직 갱신 전입니다.'}
            </p>
          </header>

          <div className="p-5">
            <div className="rounded-lg border border-line bg-surface-subtle p-4" style={{ height: 380 }}>
              <ResponsiveContainer>
                <AreaChart data={history} margin={{ top: 12, right: 8, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="activeUserFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.04} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 8" vertical={false} />
                  <XAxis
                    dataKey="time"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }}
                    minTickGap={24}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }}
                    tickFormatter={(value) => formatNumber(Number(value))}
                    width={56}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                      boxShadow: '0 16px 40px rgba(15,23,42,0.12)',
                    }}
                    formatter={(value, name) => [`${formatNumber(Number(value))}명`, name]}
                    labelStyle={{ color: '#475569', fontWeight: 800 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, fontWeight: 800, paddingTop: 12 }} />
                  {latestStats?.peakCount ? (
                    <ReferenceLine
                      y={latestStats.peakCount}
                      stroke="#f97316"
                      strokeDasharray="6 6"
                      strokeOpacity={0.75}
                    />
                  ) : null}
                  <Area
                    dataKey="currentCount"
                    fill="url(#activeUserFill)"
                    name="현재 접속"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    type="monotone"
                    dot={false}
                    activeDot={{ r: 4, fill: '#2563eb', stroke: '#ffffff', strokeWidth: 2 }}
                    isAnimationActive={false}
                  />
                  <Line
                    dataKey="averageCount"
                    name="오늘 평균"
                    stroke="#22c55e"
                    strokeWidth={2}
                    type="monotone"
                    dot={false}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      </section>
    </div>
  );
}
