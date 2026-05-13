'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  addAdminBlacklist,
  getAdminBlacklist,
  getAdminBlacklistDashboard,
  removeAdminBlacklist,
} from '@/src/shared/api/adminApi';
import type {
  BlacklistDashboardResponse,
  BlacklistItem,
  BlacklistPageResponse,
  BlacklistReason,
} from '@/src/shared/api/types/admin.types';

const reasonOptions: { value: BlacklistReason; label: string }[] = [
  { value: 'BOT_DETECTED', label: '봇 자동 탐지' },
  { value: 'MACRO_DETECTED_FE', label: '프론트 매크로 탐지' },
  { value: 'IP_RATE_LIMIT', label: 'IP 요청 제한 초과' },
  { value: 'SUSPICIOUS_PATTERN', label: '의심 패턴 탐지' },
  { value: 'MANUAL_BLOCK', label: '관리자 수동 차단' },
];

const reasonLabels = reasonOptions.reduce<Record<string, string>>((acc, option) => {
  acc[option.value] = option.label;
  return acc;
}, {});

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
  return error instanceof Error ? error.message : '요청 처리 중 오류가 발생했습니다.';
}

export default function AdminBlacklistPage() {
  const [dashboard, setDashboard] = useState<BlacklistDashboardResponse | null>(null);
  const [pageData, setPageData] = useState<BlacklistPageResponse | null>(null);
  const [page, setPage] = useState(0);
  const [size] = useState(20);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [adminUserId, setAdminUserId] = useState('');
  const [targetUserId, setTargetUserId] = useState('');
  const [reason, setReason] = useState<BlacklistReason>('MANUAL_BLOCK');
  const [detail, setDetail] = useState('');

  const items = useMemo(() => pageData?.items ?? [], [pageData]);
  const totalPages = pageData?.totalPages ?? 0;

  const summary = useMemo(() => {
    if (!dashboard) {
      return [
        { label: '총 접속자 수', value: '-', caption: '오늘 기준' },
        { label: '봇 탐지 수', value: '-', caption: '오늘 기준' },
        { label: '차단 수', value: '-', caption: '정책 차단 완료' },
        { label: '피크 시간', value: '-', caption: '최다 탐지 구간' },
      ];
    }

    return [
      {
        label: '총 접속자 수',
        value: formatNumber(dashboard.totalConnectionsToday),
        caption: '오늘 기준',
      },
      {
        label: '봇 탐지 수',
        value: `${formatNumber(dashboard.botDetectionCount)}건`,
        caption: '오늘 기준',
      },
      {
        label: '차단 수',
        value: `${formatNumber(dashboard.blockedCount)}건`,
        caption: '정책 차단 완료',
      },
      {
        label: '피크 시간',
        value: dashboard.peakTime || '-',
        caption: `${formatNumber(dashboard.peakDetectionCount)}건 탐지`,
      },
    ];
  }, [dashboard]);

  const loadBlacklist = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [dashboardResponse, blacklistResponse] = await Promise.all([
        getAdminBlacklistDashboard(),
        getAdminBlacklist(page, size),
      ]);

      setDashboard(dashboardResponse.data);
      setPageData(blacklistResponse.data);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [page, size]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadBlacklist();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadBlacklist]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const parsedUserId = Number(targetUserId);
      const parsedAdminUserId = adminUserId ? Number(adminUserId) : undefined;

      if (!Number.isInteger(parsedUserId) || parsedUserId <= 0) {
        throw new Error('차단할 사용자 ID를 숫자로 입력해 주세요.');
      }

      if (parsedAdminUserId !== undefined && (!Number.isInteger(parsedAdminUserId) || parsedAdminUserId <= 0)) {
        throw new Error('관리자 ID를 숫자로 입력해 주세요.');
      }

      await addAdminBlacklist({
        userId: parsedUserId,
        reason,
        detail: detail.trim() || undefined,
        adminUserId: parsedAdminUserId,
      });

      setTargetUserId('');
      setDetail('');
      setSuccessMessage('블랙리스트에 등록했습니다.');
      await loadBlacklist();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (item: BlacklistItem) => {
    const confirmed = window.confirm(`사용자 ${item.userId}의 차단을 해제할까요?`);

    if (!confirmed) {
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await removeAdminBlacklist(item.blacklistId);
      setSuccessMessage('블랙리스트 항목을 삭제했습니다.');
      await loadBlacklist();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  };

  return (
    <div className="space-y-6 p-5 sm:p-8">
      <header className="flex min-h-[76px] flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="text-2xl font-black tracking-normal text-slate-950">블랙리스트 관리</h1>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        {summary.map((item) => (
          <article key={item.label} className="rounded-lg border border-line bg-surface p-5 shadow-sm">
            <p className="text-sm font-bold text-content-tertiary">{item.label}</p>
            <p className="mt-3 text-3xl font-black text-slate-950">{item.value}</p>
            <p className="mt-2 text-xs font-bold text-content-tertiary">{item.caption}</p>
          </article>
        ))}
      </section>

      <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
        <h2 className="text-lg font-black text-slate-950">수동 차단 등록</h2>
        <form className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr_1fr_2fr_auto]" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-2">
            <span className="text-xs font-bold text-content-tertiary">사용자 ID</span>
            <input
              className="h-11 rounded-lg border border-line-strong px-3 text-sm font-bold outline-none focus:border-primary focus:ring-2 focus:ring-primary-light"
              inputMode="numeric"
              onChange={(event) => setTargetUserId(event.target.value)}
              placeholder="예: 1001"
              value={targetUserId}
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs font-bold text-content-tertiary">사유</span>
            <select
              className="h-11 rounded-lg border border-line-strong px-3 text-sm font-bold outline-none focus:border-primary focus:ring-2 focus:ring-primary-light"
              onChange={(event) => setReason(event.target.value as BlacklistReason)}
              value={reason}
            >
              {reasonOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs font-bold text-content-tertiary">관리자 ID</span>
            <input
              className="h-11 rounded-lg border border-line-strong px-3 text-sm font-bold outline-none focus:border-primary focus:ring-2 focus:ring-primary-light"
              inputMode="numeric"
              onChange={(event) => setAdminUserId(event.target.value)}
              placeholder="토큰에서 자동 추출"
              value={adminUserId}
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs font-bold text-content-tertiary">상세 사유</span>
            <input
              className="h-11 rounded-lg border border-line-strong px-3 text-sm font-bold outline-none focus:border-primary focus:ring-2 focus:ring-primary-light"
              onChange={(event) => setDetail(event.target.value)}
              placeholder="운영 메모"
              value={detail}
            />
          </label>

          <button
            className="h-11 self-end rounded-lg bg-slate-950 px-5 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-surface-active"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? '등록 중' : '등록'}
          </button>
        </form>

        {errorMessage ? (
          <p className="mt-4 rounded-lg bg-danger-subtle px-4 py-3 text-sm font-bold text-danger">{errorMessage}</p>
        ) : null}
        {successMessage ? (
          <p className="mt-4 rounded-lg bg-success-subtle px-4 py-3 text-sm font-bold text-success-hover">{successMessage}</p>
        ) : null}
      </section>

      <section className="overflow-hidden rounded-lg border border-line bg-surface shadow-sm">
        <header className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-950">차단 목록</h2>
            <p className="mt-1 text-sm font-medium text-content-tertiary">페이지 크기 {size}건</p>
          </div>
          <button
            className="h-10 rounded-lg border border-line-strong px-4 text-sm font-black text-content-secondary hover:bg-surface-subtle"
            onClick={() => void loadBlacklist()}
            type="button"
          >
            새로고침
          </button>
        </header>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-surface-subtle text-content-tertiary">
              <tr>
                <th className="px-5 py-3 font-black">ID</th>
                <th className="px-5 py-3 font-black">사용자</th>
                <th className="px-5 py-3 font-black">사유</th>
                <th className="px-5 py-3 font-black">등록 관리자</th>
                <th className="px-5 py-3 font-black">등록일</th>
                <th className="px-5 py-3 font-black">상세</th>
                <th className="px-5 py-3 font-black">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-subtle">
              {items.map((item) => (
                <tr key={item.blacklistId} className="align-top">
                  <td className="px-5 py-4 font-black text-content">{item.blacklistId}</td>
                  <td className="px-5 py-4 font-bold text-content-secondary">{item.userId}</td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-black text-content-secondary">
                      {reasonLabels[item.reason] ?? item.reason}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-semibold text-content-tertiary">{item.blockedBy ?? '-'}</td>
                  <td className="px-5 py-4 font-semibold text-content-tertiary">{formatDateTime(item.createdAt)}</td>
                  <td className="max-w-[320px] px-5 py-4 font-medium leading-6 text-content-secondary">
                    {item.detail || '-'}
                  </td>
                  <td className="px-5 py-4">
                    <button
                      className="rounded-lg bg-danger-subtle px-3 py-2 text-xs font-black text-danger hover:bg-danger-light"
                      onClick={() => void handleRemove(item)}
                      type="button"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
              {!isLoading && items.length === 0 ? (
                <tr>
                  <td className="px-5 py-10 text-center text-sm font-bold text-content-tertiary" colSpan={7}>
                    등록된 블랙리스트 항목이 없습니다.
                  </td>
                </tr>
              ) : null}
              {isLoading ? (
                <tr>
                  <td className="px-5 py-10 text-center text-sm font-bold text-content-tertiary" colSpan={7}>
                    불러오는 중입니다.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <footer className="flex items-center justify-between border-t border-line px-5 py-4">
          <button
            className="rounded-lg border border-line-strong px-4 py-2 text-sm font-black text-content-secondary disabled:cursor-not-allowed disabled:text-content-muted"
            disabled={page <= 0}
            onClick={() => setPage((current) => Math.max(0, current - 1))}
            type="button"
          >
            이전
          </button>
          <span className="text-sm font-bold text-content-tertiary">
            {page + 1} / {Math.max(totalPages, 1)}
          </span>
          <button
            className="rounded-lg border border-line-strong px-4 py-2 text-sm font-black text-content-secondary disabled:cursor-not-allowed disabled:text-content-muted"
            disabled={!pageData?.hasNext}
            onClick={() => setPage((current) => current + 1)}
            type="button"
          >
            다음
          </button>
        </footer>
      </section>
    </div>
  );
}
