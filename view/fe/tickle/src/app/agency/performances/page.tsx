'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { http } from '@/src/shared/api/http';
import type { ApiResponse } from '@/src/shared/api/types';
import { Badge } from '@/src/shared/components/Badge';
import { Box } from '@/src/shared/components/Box';
import { Button } from '@/src/shared/components/Button';
import { SearchBar } from '@/src/shared/components/SearchBar';
import { SegmentedControl } from '@/src/shared/components/SegmentedControl';
import { Table } from '@/src/shared/components/Table';
import type { TableColumn } from '@/src/shared/components/types';

const LIST_FETCH_SIZE = 100;
const performancesQueryKey = ['agencyPerformances'] as const;

type PerformanceStatusKey = 'selling' | 'upcoming' | 'ended';
type StatusFilterValue = 'all' | PerformanceStatusKey;
type FeedbackTone = 'success' | 'error';

interface AgencyEventListItem {
  eventId: number;
  eventName: string;
  venueName: string;
  eventStartAt: string;
  eventEndAt: string;
  salesStartAt: string | null;
  reservationRate: number;
}

interface AgencyEventListResponseData {
  items: AgencyEventListItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
}

interface PerformanceRow {
  id: number;
  title: string;
  venue: string;
  schedule: string;
  ticketOpenAt: string;
  status: PerformanceStatusKey;
  salesRate: string;
}

interface FeedbackState {
  tone: FeedbackTone;
  message: string;
}

const statusFilterOptions: Array<{ label: string; value: StatusFilterValue }> = [
  { label: '전체', value: 'all' },
  { label: '판매중', value: 'selling' },
  { label: '판매 예정', value: 'upcoming' },
  { label: '종료', value: 'ended' },
];

const statusLabelMap: Record<PerformanceStatusKey, string> = {
  selling: '판매중',
  upcoming: '판매 예정',
  ended: '종료',
};

const statusColorMap: Record<PerformanceStatusKey, 'blue' | 'green' | 'grey'> = {
  selling: 'green',
  upcoming: 'blue',
  ended: 'grey',
};

const formatDate = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}.${month}.${day}`;
};

const formatDateTime = (value: string | null) => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${formatDate(value)} ${hours}:${minutes}`;
};

const formatSchedule = (startAt: string, endAt: string) => {
  const startDate = formatDate(startAt);
  const endDate = formatDate(endAt);

  return startDate === endDate ? startDate : `${startDate} - ${endDate}`;
};

const formatSalesRate = (value: number | null | undefined) => {
  const rate = Number(value ?? 0);

  if (!Number.isFinite(rate)) {
    return '-';
  }

  const formattedRate = `${rate.toFixed(2)}%`;

  return formattedRate === '0.00%' ? '-' : formattedRate;
};

const getPerformanceStatus = (salesStartAt: string | null, eventEndAt: string): PerformanceStatusKey => {
  const now = Date.now();
  const salesStartTime = salesStartAt ? new Date(salesStartAt).getTime() : Number.NEGATIVE_INFINITY;
  const eventEndTime = new Date(eventEndAt).getTime();

  if (!Number.isNaN(eventEndTime) && eventEndTime < now) {
    return 'ended';
  }

  if (!Number.isNaN(salesStartTime) && salesStartTime > now) {
    return 'upcoming';
  }

  return 'selling';
};

function SummaryCard({
  label,
  value,
  caption,
}: {
  label: string;
  value: string;
  caption: string;
}) {
  return (
    <Box variant="outline" className="h-full">
      <p className="text-sm font-bold text-content-tertiary">{label}</p>
      <p className="mt-3 text-3xl font-black text-slate-950">{value}</p>
      <p className="mt-2 text-xs font-bold text-content-tertiary">{caption}</p>
    </Box>
  );
}

export default function AgencyPerformancesPage() {
  const queryClient = useQueryClient();
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>('all');
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [deletingEventId, setDeletingEventId] = useState<number | null>(null);

  const {
    data: performanceList,
    isLoading,
    error,
  } = useQuery({
    queryKey: performancesQueryKey,
    queryFn: async () => {
      const response = await http.get<ApiResponse<AgencyEventListResponseData>>('/api/v1/agency/events', {
        params: {
          page: 0,
          size: LIST_FETCH_SIZE,
        },
      });

      return response.data;
    },
    staleTime: 60 * 1000,
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (eventId: number) => {
      const response = await http.delete<ApiResponse<null>>(`/api/v1/agency/events/${eventId}`);
      return response.data;
    },
    onMutate: (eventId) => {
      setDeletingEventId(eventId);
      setFeedback(null);
    },
    onSuccess: async () => {
      setFeedback({ tone: 'success', message: '공연을 삭제했습니다.' });
      await queryClient.invalidateQueries({ queryKey: performancesQueryKey });
    },
    onError: (mutationError) => {
      const message = mutationError instanceof Error ? mutationError.message : '알 수 없는 오류가 발생했습니다.';
      setFeedback({ tone: 'error', message: `공연 삭제에 실패했습니다. ${message}` });
    },
    onSettled: () => {
      setDeletingEventId(null);
    },
  });

  const performanceRows = useMemo<PerformanceRow[]>(
    () =>
      (performanceList?.items ?? []).map((item) => ({
        id: item.eventId,
        title: item.eventName,
        venue: item.venueName,
        schedule: formatSchedule(item.eventStartAt, item.eventEndAt),
        ticketOpenAt: formatDateTime(item.salesStartAt),
        status: getPerformanceStatus(item.salesStartAt, item.eventEndAt),
        salesRate: formatSalesRate(item.reservationRate),
      })),
    [performanceList],
  );

  const filteredRows = useMemo(() => {
    const normalizedQuery = searchValue.trim().toLowerCase();

    return performanceRows.filter((row) => {
      const matchesStatus = statusFilter === 'all' || row.status === statusFilter;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        row.title.toLowerCase().includes(normalizedQuery) ||
        row.venue.toLowerCase().includes(normalizedQuery);

      return matchesStatus && matchesQuery;
    });
  }, [performanceRows, searchValue, statusFilter]);

  const summaryCounts = useMemo(
    () => ({
      total: performanceList?.totalElements ?? 0,
      loaded: performanceRows.length,
      selling: performanceRows.filter((row) => row.status === 'selling').length,
      upcoming: performanceRows.filter((row) => row.status === 'upcoming').length,
      ended: performanceRows.filter((row) => row.status === 'ended').length,
    }),
    [performanceList, performanceRows],
  );

  const summaryCaption = performanceList?.hasNext
    ? `최근 ${summaryCounts.loaded}건 기준`
    : '조회된 전체 공연 기준';

  const handleDeleteClick = (row: PerformanceRow) => {
    if (row.status === 'ended' || deletingEventId !== null) {
      return;
    }

    const shouldDelete = window.confirm(`"${row.title}" 공연을 삭제할까요?`);

    if (!shouldDelete) {
      return;
    }

    deleteEventMutation.mutate(row.id);
  };

  const columns: TableColumn<PerformanceRow>[] = [
    {
      key: 'title',
      header: '공연',
      render: (row) => (
        <div>
          <p className="font-black text-content">{row.title}</p>
          <p className="mt-1 text-sm font-medium text-content-tertiary">{row.venue}</p>
        </div>
      ),
    },
    {
      key: 'schedule',
      header: '공연 일정',
    },
    {
      key: 'ticketOpenAt',
      header: '예매 오픈',
    },
    {
      key: 'status',
      header: '상태',
      align: 'center',
      render: (row) => (
        <Badge color={statusColorMap[row.status]} maxLength={10}>
          {statusLabelMap[row.status]}
        </Badge>
      ),
    },
    {
      key: 'salesRate',
      header: '예매율',
      align: 'center',
    },
    {
      key: 'actions',
      header: '관리',
      align: 'center',
      width: 112,
      render: (row) => {
        if (row.status === 'ended') {
          return <span className="text-sm font-medium text-content-muted">-</span>;
        }

        return (
          <Button
            color="danger"
            variant="weak"
            size="small"
            isLoading={deletingEventId === row.id}
            disabled={deletingEventId !== null && deletingEventId !== row.id}
            onClick={() => handleDeleteClick(row)}
          >
            삭제
          </Button>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 p-5 sm:p-8">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-sm font-bold text-primary">공연 목록</p>
          <h1 className="mt-1 text-2xl font-black tracking-normal text-slate-950">등록한 공연 목록</h1>
        </div>

        <Button as="a" href="/agency" color="primary" size="medium">
          신규 공연 등록
        </Button>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        <SummaryCard label="전체 공연" value={`${summaryCounts.total}건`} caption="등록된 공연 수" />
        <SummaryCard label="판매중" value={`${summaryCounts.selling}건`} caption={summaryCaption} />
        <SummaryCard label="판매 예정" value={`${summaryCounts.upcoming}건`} caption={summaryCaption} />
        <SummaryCard label="종료" value={`${summaryCounts.ended}건`} caption={summaryCaption} />
      </section>

      <Box variant="shadow" className="space-y-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="w-full xl:max-w-[380px]">
            <SearchBar
              fullWidth
              size="small"
              placeholder="공연명 또는 공연장 검색"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              onClear={() => setSearchValue('')}
            />
          </div>

          <div className="w-full xl:w-[420px]">
            <SegmentedControl
              options={statusFilterOptions}
              value={statusFilter}
              onChange={(value) => setStatusFilter(value as StatusFilterValue)}
            />
          </div>
        </div>

        {error instanceof Error ? (
          <div className="rounded-2xl border border-danger-light bg-danger-subtle px-4 py-3 text-sm font-medium text-danger">
            공연 목록을 불러오지 못했습니다. {error.message}
          </div>
        ) : null}

        {feedback ? (
          <div
            className={
              feedback.tone === 'success'
                ? 'rounded-2xl border border-success-light bg-success-subtle px-4 py-3 text-sm font-medium text-success-hover'
                : 'rounded-2xl border border-danger-light bg-danger-subtle px-4 py-3 text-sm font-medium text-danger'
            }
          >
            {feedback.message}
          </div>
        ) : null}

        {performanceList?.hasNext ? (
          <div className="rounded-2xl border border-warning-light bg-warning-subtle px-4 py-3 text-sm font-medium text-warning-hover">
            최근 {performanceRows.length}건만 표시 중입니다. 추가 페이지 데이터는 아직 연결하지 않았습니다.
          </div>
        ) : null}

        <Table columns={columns} data={filteredRows} isLoading={isLoading} />
      </Box>
    </div>
  );
}
