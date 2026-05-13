'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { getAdminQueueStats } from '@/src/shared/api/adminApi';
import type { QueueStatsResponse } from '@/src/shared/api/types/admin.types';

const formatNumber = (value: number) => new Intl.NumberFormat('ko-KR').format(value);

const formatSeconds = (seconds: number) => {
  if (seconds < 60) {
    return `${formatNumber(seconds)}초`;
  }

  const minutes = Math.floor(seconds / 60);
  const restSeconds = seconds % 60;

  return restSeconds > 0
    ? `${formatNumber(minutes)}분 ${formatNumber(restSeconds)}초`
    : `${formatNumber(minutes)}분`;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : '대기열 통계를 불러오지 못했습니다.';
}

export default function QueueMonitoringPage() {
  const [scheduleIdInput, setScheduleIdInput] = useState('1');
  const [scheduleId, setScheduleId] = useState(1);
  const [stats, setStats] = useState<QueueStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

  const loadQueueStats = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await getAdminQueueStats(scheduleId);
      setStats(response.data);
      setLastUpdatedAt(new Date().toLocaleString('ko-KR'));
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [scheduleId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadQueueStats();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadQueueStats]);

  const cards = useMemo(() => {
    if (!stats) {
      return [
        { label: '현재 대기', value: '-', caption: 'WAITING 상태' },
        { label: '처리 중', value: '-', caption: 'ADMITTED 상태' },
        { label: '평균 대기', value: '-', caption: '예상 평균 시간' },
        { label: '동시 입장 한도', value: '-', caption: 'slotLimit' },
      ];
    }

    return [
      { label: '현재 대기', value: `${formatNumber(stats.totalWaiting)}명`, caption: 'WAITING 상태' },
      { label: '처리 중', value: `${formatNumber(stats.processingCount)}명`, caption: 'ADMITTED 상태' },
      { label: '평균 대기', value: formatSeconds(stats.averageWaitSeconds), caption: '예상 평균 시간' },
      { label: '동시 입장 한도', value: `${formatNumber(stats.slotLimit)}명`, caption: 'slotLimit' },
    ];
  }, [stats]);

  const usageRate = stats && stats.slotLimit > 0
    ? Math.min(100, (stats.processingCount / stats.slotLimit) * 100)
    : 0;
  const pressureRate = stats && stats.slotLimit > 0
    ? Math.min(100, (stats.totalWaiting / stats.slotLimit) * 100)
    : 0;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedScheduleId = Number(scheduleIdInput);

    if (!Number.isInteger(parsedScheduleId) || parsedScheduleId <= 0) {
      setErrorMessage('스케줄 ID는 1 이상의 숫자로 입력해 주세요.');
      return;
    }

    setScheduleId(parsedScheduleId);
  };

  return (
    <div className="space-y-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold text-primary">Admin API</p>
          <h1 className="mt-1 text-2xl font-black tracking-normal text-slate-950">대기열 상태</h1>
          <p className="mt-2 text-sm font-medium text-content-tertiary">
            `/api/v1/admin/queues/{'{scheduleId}'}/stats` 응답 기준의 현재 상태입니다.
          </p>
        </div>

        <form className="flex w-full gap-2 sm:w-auto" onSubmit={handleSubmit}>
          <label className="min-w-0 flex-1 sm:w-[220px]">
            <span className="sr-only">스케줄 ID</span>
            <input
              className="h-11 w-full rounded-lg border border-line-strong bg-surface px-3 text-sm font-bold text-content outline-none focus:border-primary focus:ring-2 focus:ring-primary-light"
              inputMode="numeric"
              onChange={(event) => setScheduleIdInput(event.target.value)}
              placeholder="scheduleId"
              value={scheduleIdInput}
            />
          </label>
          <button className="h-11 rounded-lg bg-slate-950 px-5 text-sm font-black text-white" type="submit">
            조회
          </button>
        </form>
      </header>

      {errorMessage ? (
        <p className="rounded-lg bg-danger-subtle px-4 py-3 text-sm font-bold text-danger">{errorMessage}</p>
      ) : null}

      <section className="grid gap-4 md:grid-cols-4">
        {cards.map((item) => (
          <article key={item.label} className="rounded-lg border border-line bg-surface p-5 shadow-sm">
            <p className="text-sm font-bold text-content-tertiary">{item.label}</p>
            <p className="mt-3 text-3xl font-black text-slate-950">{item.value}</p>
            <p className="mt-2 text-xs font-bold text-content-tertiary">{item.caption}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <article className="rounded-lg border border-line bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-950">스케줄 #{stats?.scheduleId ?? scheduleId}</h2>
              <p className="mt-1 text-sm font-medium text-content-tertiary">
                {lastUpdatedAt ? `마지막 갱신: ${lastUpdatedAt}` : '아직 갱신 전입니다.'}
              </p>
            </div>
            <button
              className="h-10 rounded-lg border border-line-strong px-4 text-sm font-black text-content-secondary hover:bg-surface-subtle disabled:cursor-not-allowed disabled:text-content-muted"
              disabled={isLoading}
              onClick={() => void loadQueueStats()}
              type="button"
            >
              {isLoading ? '갱신 중' : '새로고침'}
            </button>
          </div>

          <div className="mt-8 space-y-6">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm font-bold text-content-secondary">
                <span>동시 입장 사용률</span>
                <span>{usageRate.toFixed(1)}%</span>
              </div>
              <div className="h-4 overflow-hidden rounded-full bg-surface-muted">
                <div className="h-full rounded-full bg-success" style={{ width: `${usageRate}%` }} />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-sm font-bold text-content-secondary">
                <span>대기 압력</span>
                <span>{pressureRate.toFixed(1)}%</span>
              </div>
              <div className="h-4 overflow-hidden rounded-full bg-surface-muted">
                <div className="h-full rounded-full bg-warning" style={{ width: `${pressureRate}%` }} />
              </div>
            </div>
          </div>
        </article>

        <aside className="rounded-lg border border-line bg-surface p-5 shadow-sm">
          <h2 className="text-lg font-black text-slate-950">응답 필드</h2>
          <dl className="mt-4 space-y-4 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="font-bold text-content-tertiary">scheduleId</dt>
              <dd className="font-black text-content">{stats?.scheduleId ?? '-'}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="font-bold text-content-tertiary">totalWaiting</dt>
              <dd className="font-black text-content">{stats ? formatNumber(stats.totalWaiting) : '-'}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="font-bold text-content-tertiary">processingCount</dt>
              <dd className="font-black text-content">{stats ? formatNumber(stats.processingCount) : '-'}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="font-bold text-content-tertiary">averageWaitSeconds</dt>
              <dd className="font-black text-content">{stats ? formatNumber(stats.averageWaitSeconds) : '-'}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="font-bold text-content-tertiary">slotLimit</dt>
              <dd className="font-black text-content">{stats ? formatNumber(stats.slotLimit) : '-'}</dd>
            </div>
          </dl>
        </aside>
      </section>
    </div>
  );
}
