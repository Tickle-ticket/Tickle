'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getAdminBotStats } from '@/src/shared/api/adminApi';
import type { BotDetectionStatsResponse } from '@/src/shared/api/types/admin.types';

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

export default function BotDetectionPage() {
  const [stats, setStats] = useState<BotDetectionStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await getAdminBotStats();
      setStats(response.data);
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

  const cards = useMemo(() => {
    if (!stats) {
      return [
        { label: '전체 차단', value: '-', caption: 'blacklists 전체' },
        { label: '최근 1시간', value: '-', caption: '신규 탐지' },
        { label: '차단 IP', value: '-', caption: '고유 IP 수' },
        { label: '최근 항목', value: '-', caption: '최근 10건' },
      ];
    }

    return [
      { label: '전체 차단', value: `${formatNumber(stats.totalBlacklisted)}건`, caption: 'blacklists 전체' },
      { label: '최근 1시간', value: `${formatNumber(stats.recentOneHourCount)}건`, caption: '신규 탐지' },
      { label: '차단 IP', value: `${formatNumber(stats.blockedIpCount)}개`, caption: '고유 IP 수' },
      { label: '최근 항목', value: `${formatNumber(stats.recentItems.length)}건`, caption: '최근 등록 목록' },
    ];
  }, [stats]);

  const maxReasonCount = Math.max(1, ...(stats?.byReason.map((item) => item.count) ?? [0]));
  const maxScoreCount = Math.max(1, ...(stats?.scoreDistribution.map((item) => item.count) ?? [0]));

  return (
    <div className="space-y-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold text-red-600">Admin API</p>
          <h1 className="mt-1 text-2xl font-black tracking-normal text-slate-950">봇 탐지 현황</h1>
          <p className="mt-2 text-sm font-medium text-slate-500">
            `/api/v1/admin/bot/stats` 응답 기준으로 차단 통계를 표시합니다.
          </p>
        </div>

        <button
          className="h-11 rounded-lg border border-slate-300 bg-white px-5 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
          disabled={isLoading}
          onClick={() => void loadStats()}
          type="button"
        >
          {isLoading ? '갱신 중' : '새로고침'}
        </button>
      </header>

      {errorMessage ? (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{errorMessage}</p>
      ) : null}

      <section className="grid gap-4 md:grid-cols-4">
        {cards.map((item) => (
          <article key={item.label} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">{item.label}</p>
            <p className="mt-3 text-3xl font-black text-slate-950">{item.value}</p>
            <p className="mt-2 text-xs font-bold text-slate-500">{item.caption}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-950">탐지 사유별 분포</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                {lastUpdatedAt ? `마지막 갱신: ${lastUpdatedAt}` : '아직 갱신 전입니다.'}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {(stats?.byReason ?? []).map((item) => {
              const width = (item.count / maxReasonCount) * 100;

              return (
                <div key={item.reason}>
                  <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                    <span className="font-bold text-slate-700">{reasonLabels[item.reason] ?? item.reason}</span>
                    <span className="font-black text-slate-950">{formatNumber(item.count)}건</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-red-500" style={{ width: `${width}%` }} />
                  </div>
                </div>
              );
            })}

            {!isLoading && (stats?.byReason.length ?? 0) === 0 ? (
              <p className="rounded-lg bg-slate-50 px-4 py-8 text-center text-sm font-bold text-slate-500">
                사유별 통계가 없습니다.
              </p>
            ) : null}
          </div>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-slate-950">AI 점수 구간</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">scoreDistribution 응답을 그대로 표시합니다.</p>

          <div className="mt-5 space-y-4">
            {(stats?.scoreDistribution ?? []).map((item) => {
              const width = (item.count / maxScoreCount) * 100;

              return (
                <div key={item.scoreRange}>
                  <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                    <span className="font-bold text-slate-700">{item.scoreRange}</span>
                    <span className="font-black text-slate-950">{formatNumber(item.count)}건</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-blue-500" style={{ width: `${width}%` }} />
                  </div>
                </div>
              );
            })}

            {!isLoading && (stats?.scoreDistribution.length ?? 0) === 0 ? (
              <p className="rounded-lg bg-slate-50 px-4 py-8 text-center text-sm font-bold text-slate-500">
                점수 구간 통계가 없습니다.
              </p>
            ) : null}
          </div>
        </article>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-black text-slate-950">최근 차단 항목</h2>
        </header>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-5 py-3 font-black">블랙리스트 ID</th>
                <th className="px-5 py-3 font-black">사용자 ID</th>
                <th className="px-5 py-3 font-black">사유</th>
                <th className="px-5 py-3 font-black">등록 관리자</th>
                <th className="px-5 py-3 font-black">등록일</th>
                <th className="px-5 py-3 font-black">상세</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(stats?.recentItems ?? []).map((item) => (
                <tr key={item.blacklistId} className="align-top">
                  <td className="px-5 py-4 font-black text-slate-900">{item.blacklistId}</td>
                  <td className="px-5 py-4 font-bold text-slate-700">{item.userId}</td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-black text-red-600">
                      {reasonLabels[item.reason] ?? item.reason}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-semibold text-slate-500">{item.blockedBy ?? '-'}</td>
                  <td className="px-5 py-4 font-semibold text-slate-500">{formatDateTime(item.createdAt)}</td>
                  <td className="max-w-[360px] px-5 py-4 font-medium leading-6 text-slate-600">
                    {item.detail || '-'}
                  </td>
                </tr>
              ))}

              {!isLoading && (stats?.recentItems.length ?? 0) === 0 ? (
                <tr>
                  <td className="px-5 py-10 text-center text-sm font-bold text-slate-500" colSpan={6}>
                    최근 차단 항목이 없습니다.
                  </td>
                </tr>
              ) : null}

              {isLoading ? (
                <tr>
                  <td className="px-5 py-10 text-center text-sm font-bold text-slate-500" colSpan={6}>
                    불러오는 중입니다.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
