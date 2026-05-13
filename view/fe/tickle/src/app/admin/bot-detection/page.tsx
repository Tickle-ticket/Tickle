'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getAdminBlacklistDashboard,
  getAdminBotStats,
} from '@/src/shared/api/adminApi';
import type {
  BlacklistDashboardResponse,
  BotDetectionStatsResponse,
} from '@/src/shared/api/types/admin.types';
import { BotDetectionChart } from '@/src/shared/components/BotDetectionChart';
import type { BotDetectionPoint } from '@/src/shared/components/BotDetectionChart';

const reasonLabels: Record<string, string> = {
  BOT_DETECTED: '봇 자동 탐지',
  MACRO_DETECTED_FE: '프론트 매크로 탐지',
  IP_RATE_LIMIT: 'IP 요청 제한 초과',
  SUSPICIOUS_PATTERN: '의심 패턴 탐지',
  MANUAL_BLOCK: '관리자 수동 차단',
};

const formatNumber = (value: number) => new Intl.NumberFormat('ko-KR').format(value);

const formatDateTime = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : '봇 탐지 통계를 불러오지 못했습니다.';
}

function toBotDetectionPoints(data?: BlacklistDashboardResponse): BotDetectionPoint[] {
  return (data?.chartData ?? []).map((point) => ({
    time: point.hour,
    macroAttempts: point.macroCount,
    queueBypassAttempts: point.bypassCount,
    abnormalRequests: point.abnormalCount,
    blockedBots: point.sectionBlocked,
  }));
}

export default function BotDetectionPage() {
  const [dashboard, setDashboard] = useState<BlacklistDashboardResponse | null>(null);
  const [stats, setStats] = useState<BotDetectionStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [dashboardResponse, statsResponse] = await Promise.all([
        getAdminBlacklistDashboard(),
        getAdminBotStats(),
      ]);

      setDashboard(dashboardResponse.data);
      setStats(statsResponse.data);
      setLastUpdatedAt(new Date().toLocaleString('ko-KR'));
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadStats();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadStats]);

  const chartData = useMemo(() => toBotDetectionPoints(dashboard ?? undefined), [dashboard]);

  const summaryItems = useMemo(() => {
    if (!dashboard) {
      return [
        { label: '총 접속자 수', value: '-', caption: '오늘 00:00부터 현재까지' },
        { label: '봇 탐지 수', value: '-', caption: '매크로/우회/비정상 요청' },
        { label: '차단 수', value: '-', caption: '정책 차단 완료' },
      ];
    }

    return [
      {
        label: '총 접속자 수',
        value: formatNumber(dashboard.totalConnectionsToday),
        caption: '오늘 00:00부터 현재까지',
      },
      {
        label: '봇 탐지 수',
        value: formatNumber(dashboard.botDetectionCount),
        caption: `피크 ${dashboard.peakTime || '-'} / ${formatNumber(dashboard.peakDetectionCount)}건`,
      },
      {
        label: '차단 수',
        value: `${formatNumber(dashboard.blockedCount)}건`,
        caption: '정책 차단 완료',
      },
    ];
  }, [dashboard]);

  return (
    <div className="space-y-6 p-5 sm:p-8">
      <header className="flex min-h-[76px] flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-normal text-slate-950">
            오늘 탐지된 봇/매크로 대시보드
          </h1>
        </div>

        <button
          className="h-11 rounded-lg border border-line-strong bg-surface px-5 text-sm font-black text-content-secondary hover:bg-surface-subtle disabled:cursor-not-allowed disabled:text-content-muted"
          disabled={isLoading}
          onClick={() => void loadStats()}
          type="button"
        >
          {isLoading ? '갱신 중' : '새로고침'}
        </button>
      </header>

      {errorMessage ? (
        <p className="rounded-lg bg-danger-subtle px-4 py-3 text-sm font-bold text-danger">{errorMessage}</p>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        {summaryItems.map((item) => (
          <article key={item.label} className="rounded-lg border border-line bg-surface p-5">
            <p className="text-sm font-bold text-content-tertiary">{item.label}</p>
            <p className="mt-3 text-3xl font-black text-slate-950">{item.value}</p>
            <p className="mt-2 text-xs font-bold text-content-tertiary">{item.caption}</p>
          </article>
        ))}
      </section>

      <BotDetectionChart
        data={chartData}
        title="탐지된 봇 그래프"
        subtitle={lastUpdatedAt ? `오늘 시간대별 탐지 유형과 누적 탐지 건수 / 마지막 갱신: ${lastUpdatedAt}` : '오늘 시간대별 탐지 유형과 누적 탐지 건수'}
      />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="overflow-hidden rounded-lg border border-line bg-surface shadow-[0_18px_46px_rgba(15,23,42,0.08)]">
          <header className="border-b border-line px-5 py-4">
            <h2 className="text-[16px] font-black leading-6 tracking-normal text-slate-950">
              최근 차단 내역
            </h2>
          </header>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-surface-subtle text-content-tertiary">
                <tr>
                  <th className="px-5 py-3 font-black">블랙리스트 ID</th>
                  <th className="px-5 py-3 font-black">사용자 ID</th>
                  <th className="px-5 py-3 font-black">사유</th>
                  <th className="px-5 py-3 font-black">등록 관리자</th>
                  <th className="px-5 py-3 font-black">등록일</th>
                  <th className="px-5 py-3 font-black">상세</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-subtle">
                {(stats?.recentItems ?? []).map((item) => (
                  <tr key={item.blacklistId} className="align-top">
                    <td className="px-5 py-4 font-black text-content">{item.blacklistId}</td>
                    <td className="px-5 py-4 font-bold text-content-secondary">{item.userId}</td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-danger-subtle px-2.5 py-1 text-xs font-black text-danger">
                        {reasonLabels[item.reason] ?? item.reason}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-semibold text-content-tertiary">{item.blockedBy ?? '-'}</td>
                    <td className="px-5 py-4 font-semibold text-content-tertiary">{formatDateTime(item.createdAt)}</td>
                    <td className="max-w-[360px] px-5 py-4 font-medium leading-6 text-content-secondary">
                      {item.detail || '-'}
                    </td>
                  </tr>
                ))}

                {!isLoading && (stats?.recentItems.length ?? 0) === 0 ? (
                  <tr>
                    <td className="px-5 py-10 text-center text-sm font-bold text-content-tertiary" colSpan={6}>
                      최근 차단 내역이 없습니다.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="rounded-lg border border-line bg-surface p-5 shadow-sm">
          <p className="text-sm font-bold text-danger">Distribution</p>
          <h2 className="mt-1 text-lg font-black text-slate-950">탐지 사유와 AI 점수</h2>

          <div className="mt-5 space-y-5">
            <div>
              <h3 className="text-sm font-black text-content">사유별 통계</h3>
              <div className="mt-3 space-y-3">
                {(stats?.byReason ?? []).map((item) => (
                  <div key={item.reason} className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-bold text-content-tertiary">{reasonLabels[item.reason] ?? item.reason}</span>
                    <span className="font-black text-content">{formatNumber(item.count)}건</span>
                  </div>
                ))}
                {!isLoading && (stats?.byReason.length ?? 0) === 0 ? (
                  <p className="text-sm font-bold text-content-tertiary">통계가 없습니다.</p>
                ) : null}
              </div>
            </div>

            <div className="border-t border-line pt-5">
              <h3 className="text-sm font-black text-content">AI 점수 구간</h3>
              <div className="mt-3 space-y-3">
                {(stats?.scoreDistribution ?? []).map((item) => (
                  <div key={item.scoreRange} className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-bold text-content-tertiary">{item.scoreRange}</span>
                    <span className="font-black text-content">{formatNumber(item.count)}건</span>
                  </div>
                ))}
                {!isLoading && (stats?.scoreDistribution.length ?? 0) === 0 ? (
                  <p className="text-sm font-bold text-content-tertiary">통계가 없습니다.</p>
                ) : null}
              </div>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
