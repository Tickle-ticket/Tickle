'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getAdminQueueEventDashboard,
  getAdminQueueEventDashboardStreamUrl,
  getAdminTopWaitingEvents,
  getAdminTopWaitingEventsStreamUrl,
} from '@/src/shared/api/adminApi';
import { apiClient } from '@/src/shared/api/client';
import type { ApiResponse } from '@/src/shared/api/types';
import type {
  QueueDashboardResponse,
  QueueEventRankResponse,
} from '@/src/shared/api/types/admin.types';
import type { EventItem } from '@/src/shared/api/types/event.types';
import { Dropdown } from '@/src/shared/components/Dropdown';
import { QueueStatusChart } from '@/src/shared/components/QueueStatusChart';
import type { QueueStatusPoint } from '@/src/shared/components/QueueStatusChart';
import { useSSE } from '@/src/shared/hooks/useSSE';

const formatNumber = (value: number) => new Intl.NumberFormat('ko-KR').format(value);

const QUEUE_CAPACITY_PER_MINUTE = 30;

const formatMinutes = (minutes: number) => `${formatNumber(minutes)}분`;

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : '대기열 통계를 불러오지 못했습니다.';
}

function formatShortDateRange(startAt: string, endAt: string) {
  const startDate = new Date(startAt);
  const endDate = new Date(endAt);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return '';
  }

  const formatter = new Intl.DateTimeFormat('ko-KR', {
    month: '2-digit',
    day: '2-digit',
  });

  return `${formatter.format(startDate)}-${formatter.format(endDate)}`;
}

const QUEUE_TAIL_FILL_INTERVAL_MINUTES = 5;

function formatChartTime(date: Date) {
  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function getDateFromChartTime(time: string, now = new Date()) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time);

  if (!match) {
    return null;
  }

  const date = new Date(now);
  date.setHours(Number(match[1]), Number(match[2]), 0, 0);

  if (date.getTime() > now.getTime()) {
    date.setDate(date.getDate() - 1);
  }

  return date;
}

function toQueueStatusPoints(data?: QueueDashboardResponse): QueueStatusPoint[] {
  if (!data) {
    return [];
  }

  const points = (data.chartData ?? []).map((point) => ({
    time: point.time,
    waitingUsers: point.waitCount,
    incomingUsers: point.inflowCount,
    admittedUsers: point.admittedCount,
    estimatedWaitMinutes: point.expectedWaitMinutes,
  }));

  const now = new Date();
  const nowLabel = formatChartTime(now);
  const currentPoint: QueueStatusPoint = {
    time: nowLabel,
    waitingUsers: data.currentWaiting,
    incomingUsers: 0,
    admittedUsers: data.admissionsPerMinute,
    estimatedWaitMinutes: data.expectedWaitMinutes,
  };
  const latestPoint = points[points.length - 1];

  if (!latestPoint) {
    return data.currentWaiting > 0 || data.admissionsPerMinute > 0 ? [currentPoint] : points;
  }

  if (latestPoint.time === nowLabel) {
    return points;
  }

  const latestDate = getDateFromChartTime(latestPoint.time, now);

  if (!latestDate) {
    return [...points, currentPoint];
  }

  if (data.currentWaiting === 0 && data.admissionsPerMinute === 0) {
    const filledPoints = [...points];
    const cursor = new Date(latestDate);
    cursor.setMinutes(cursor.getMinutes() + QUEUE_TAIL_FILL_INTERVAL_MINUTES);

    while (cursor.getTime() < now.getTime() && formatChartTime(cursor) !== nowLabel) {
      filledPoints.push({
        time: formatChartTime(cursor),
        waitingUsers: 0,
        incomingUsers: 0,
        admittedUsers: 0,
        estimatedWaitMinutes: 0,
      });
      cursor.setMinutes(cursor.getMinutes() + QUEUE_TAIL_FILL_INTERVAL_MINUTES);
    }

    return [...filledPoints, currentPoint];
  }

  return [...points, currentPoint];
}

const unwrapSseData = <T,>(payload: T | { data: T } | null) => {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return payload.data;
  }

  return payload as T | null;
};

type AdminEventListData = {
  items?: EventItem[];
};

const unwrapApiData = <T,>(payload: T | ApiResponse<T>) => {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return payload.data;
  }

  return payload as T;
};

const fetchAdminEventOptions = async () => {
  const response = await apiClient<ApiResponse<AdminEventListData> | AdminEventListData | EventItem[]>(
    '/api/v1/events',
    {
      method: 'GET',
      params: { page: 0, size: 100 },
      auth: 'optional',
    },
  );
  const data = unwrapApiData<AdminEventListData | EventItem[]>(response);

  return Array.isArray(data) ? data : data.items ?? [];
};

export default function QueueMonitoringPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventId, setEventId] = useState<number | null>(null);
  const [dashboard, setDashboard] = useState<QueueDashboardResponse | null>(null);
  const [topEvents, setTopEvents] = useState<QueueEventRankResponse[]>([]);
  const [isEventLoading, setIsEventLoading] = useState(false);
  const [isDashboardLoading, setIsDashboardLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const dashboardStreamUrl = useMemo(
    () => eventId ? getAdminQueueEventDashboardStreamUrl(eventId) : '',
    [eventId],
  );
  const topEventsStreamUrl = useMemo(() => getAdminTopWaitingEventsStreamUrl(), []);
  const { data: dashboardStreamData } = useSSE<QueueDashboardResponse | { data: QueueDashboardResponse }>(
    dashboardStreamUrl,
    { eventNames: ['queue.dashboard'] },
  );
  const { data: topEventsStreamData } = useSSE<QueueEventRankResponse[] | { data: QueueEventRankResponse[] }>(
    topEventsStreamUrl,
    { eventNames: ['queue.top'] },
  );
  const streamedDashboard = useMemo(() => unwrapSseData<QueueDashboardResponse>(dashboardStreamData), [dashboardStreamData]);
  const streamedTopEvents = useMemo(() => unwrapSseData<QueueEventRankResponse[]>(topEventsStreamData), [topEventsStreamData]);
  const visibleDashboard = streamedDashboard ?? dashboard;
  const visibleTopEvents = streamedTopEvents ?? topEvents;
  const visibleLastUpdatedAt = streamedDashboard || streamedTopEvents ? 'SSE 수신 중' : lastUpdatedAt;

  const loadRegisteredEvents = useCallback(async () => {
    setIsEventLoading(true);

    try {
      const items = await fetchAdminEventOptions();

      setEvents([...items]);

      if (items.length > 0) {
        setEventId((currentEventId) => {
          const hasCurrentEvent = currentEventId !== null
            && items.some((item) => item.eventId === currentEventId);

          return hasCurrentEvent ? currentEventId : items[0].eventId;
        });
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsEventLoading(false);
    }
  }, []);

  const loadQueueDashboard = useCallback(async () => {
    setIsDashboardLoading(true);
    setErrorMessage(null);

    try {
      const [dashboardResponse, topEventsResponse] = await Promise.all([
        eventId ? getAdminQueueEventDashboard(eventId) : Promise.resolve(null),
        getAdminTopWaitingEvents(),
      ]);

      setDashboard(dashboardResponse?.data ?? null);
      setTopEvents(topEventsResponse.data);
      setLastUpdatedAt(new Date().toLocaleString('ko-KR'));
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsDashboardLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadRegisteredEvents();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadRegisteredEvents]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadQueueDashboard();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadQueueDashboard]);

  const chartData = useMemo(() => toQueueStatusPoints(visibleDashboard ?? undefined), [visibleDashboard]);

  const eventOptions = useMemo(
    () => events.map((event) => ({
      value: String(event.eventId),
      label: event.title,
      description: formatShortDateRange(event.eventStartAt, event.eventEndAt),
    })),
    [events],
  );

  const summary = useMemo(() => {
    if (!visibleDashboard) {
      return [
        { label: '현재 대기', value: '-', caption: '이벤트 대시보드 기준' },
        { label: '최근 유입', value: '-', caption: '최근 1시간' },
        { label: '분당 입장', value: '-', caption: '최근 처리량' },
        { label: '예상 대기', value: '-', caption: '평균 예상 시간' },
      ];
    }

    return [
      {
        label: '현재 대기',
        value: `${formatNumber(visibleDashboard.currentWaiting)}명`,
        caption: `전 대비 ${formatNumber(visibleDashboard.waitingDifference)}명`,
      },
      {
        label: '최근 유입',
        value: `${formatNumber(visibleDashboard.totalInflowLastHour)}명`,
        caption: '최근 1시간',
      },
      {
        label: '분당 입장',
        value: `${formatNumber(visibleDashboard.admissionsPerMinute)}명`,
        caption: `전 대비 ${formatNumber(visibleDashboard.admissionsDifference)}명`,
      },
      {
        label: '예상 대기',
        value: formatMinutes(visibleDashboard.expectedWaitMinutes),
        caption: `피크 ${formatNumber(visibleDashboard.peakWaiting)}명`,
      },
    ];
  }, [visibleDashboard]);

  return (
    <div className="space-y-6 p-5 sm:p-8">
      <header className="flex min-h-[76px] flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-normal text-slate-950">
            공연 대기열 상태 대시보드
          </h1>
        </div>

        <div className="w-full lg:w-[360px]">
          <Dropdown
            label="공연 선택"
            options={eventOptions}
            value={eventId ? String(eventId) : undefined}
            onChange={(nextEventId) => setEventId(Number(nextEventId))}
            placeholder={events.length === 0 ? '등록된 공연 없음' : '공연 선택'}
            disabled={events.length === 0}
            isLoading={isEventLoading}
          />
        </div>
      </header>

      {errorMessage ? (
        <p className="rounded-lg bg-danger-subtle px-4 py-3 text-sm font-bold text-danger">{errorMessage}</p>
      ) : null}

      <section className="grid gap-4 md:grid-cols-4">
        {summary.map((item) => (
          <article key={item.label} className="rounded-lg border border-line bg-surface p-5">
            <p className="text-sm font-bold text-content-tertiary">{item.label}</p>
            <p className="mt-3 text-3xl font-black text-slate-950">{item.value}</p>
            <p className="mt-2 text-xs font-bold text-content-tertiary">{item.caption}</p>
          </article>
        ))}
      </section>

      <QueueStatusChart
        data={chartData}
        performanceTitle={visibleDashboard?.eventName ?? (eventId ? `이벤트 #${eventId}` : '공연을 선택해 주세요')}
        performanceMeta={visibleLastUpdatedAt ? `마지막 갱신: ${visibleLastUpdatedAt}` : '아직 갱신 전입니다.'}
        capacityPerMinute={QUEUE_CAPACITY_PER_MINUTE}
        targetWaitingUsers={visibleDashboard?.peakTarget}
      />

      <section>
        <section className="overflow-hidden rounded-lg border border-line bg-surface shadow-[0_18px_46px_rgba(15,23,42,0.08)]">
          <header className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
            <h2 className="text-[16px] font-black leading-6 tracking-normal text-slate-950">
              실시간 대기열 많은 공연 리스트
            </h2>
            <button
              className="h-10 rounded-lg border border-line-strong px-4 text-sm font-black text-content-secondary hover:bg-surface-subtle disabled:cursor-not-allowed disabled:text-content-muted"
              disabled={isDashboardLoading}
              onClick={() => void loadQueueDashboard()}
              type="button"
            >
              {isDashboardLoading ? '갱신 중' : '새로고침'}
            </button>
          </header>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-surface-subtle text-content-tertiary">
                <tr>
                  <th className="px-5 py-3 font-black">순위</th>
                  <th className="px-5 py-3 font-black">공연</th>
                  <th className="px-5 py-3 font-black">일자</th>
                  <th className="px-5 py-3 font-black">대기열 수</th>
                  <th className="px-5 py-3 font-black">예상 대기</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-subtle">
                {visibleTopEvents.map((event) => (
                  <tr key={`${event.rank}-${event.eventId}`}>
                    <td className="px-5 py-4 font-black text-primary">{event.rank}</td>
                    <td className="px-5 py-4 font-bold text-content">{event.eventName}</td>
                    <td className="px-5 py-4 font-semibold text-content-tertiary">{event.date}</td>
                    <td className="px-5 py-4 font-black text-content">{formatNumber(event.waitCount)}명</td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-warning-subtle px-2.5 py-1 text-xs font-black text-warning">
                        {formatMinutes(event.expectedWaitMinutes)}
                      </span>
                    </td>
                  </tr>
                ))}

                {!isDashboardLoading && visibleTopEvents.length === 0 ? (
                  <tr>
                    <td className="px-5 py-10 text-center text-sm font-bold text-content-tertiary" colSpan={5}>
                      대기열 랭킹 데이터가 없습니다.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </div>
  );
}
