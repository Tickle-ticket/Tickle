'use client';

import { useMemo, useState } from 'react';
import { Badge } from '@/src/shared/components/Badge';
import { Box } from '@/src/shared/components/Box';
import { Button } from '@/src/shared/components/Button';
import { SearchBar } from '@/src/shared/components/SearchBar';
import { SegmentedControl } from '@/src/shared/components/SegmentedControl';
import { Table } from '@/src/shared/components/Table';
import type { TableColumn } from '@/src/shared/components/types';

type PerformanceStatus = '판매중' | '심사중' | '준비중' | '정산대기';

interface PerformanceRow {
  id: number;
  title: string;
  venue: string;
  schedule: string;
  ticketOpenAt: string;
  status: PerformanceStatus;
  salesRate: string;
  settlementStatus: string;
}

const performanceRows: PerformanceRow[] = [
  {
    id: 1,
    title: '뮤지컬 Tikkle Original',
    venue: '블루스퀘어 마스터카드홀',
    schedule: '2026.05.08 - 2026.06.21',
    ticketOpenAt: '2026.05.01 14:00',
    status: '판매중',
    salesRate: '82%',
    settlementStatus: '5월 2주차 예정',
  },
  {
    id: 2,
    title: 'SSAFY Concert Encore',
    venue: 'KSPO DOME',
    schedule: '2026.05.15 - 2026.05.16',
    ticketOpenAt: '2026.05.03 20:00',
    status: '심사중',
    salesRate: '검수 전',
    settlementStatus: '정산 대기',
  },
  {
    id: 3,
    title: 'Developer Meetup Live',
    venue: '코엑스 오디토리움',
    schedule: '2026.05.28',
    ticketOpenAt: '2026.05.10 11:00',
    status: '준비중',
    salesRate: '오픈 전',
    settlementStatus: '계좌 확인 필요',
  },
  {
    id: 4,
    title: 'Spring Festival Stage',
    venue: '올림픽공원 88잔디마당',
    schedule: '2026.06.04 - 2026.06.06',
    ticketOpenAt: '2026.05.12 18:00',
    status: '정산대기',
    salesRate: '100%',
    settlementStatus: '정산서 확정 중',
  },
];

const statusFilterOptions = [
  { label: '전체', value: 'all' },
  { label: '판매중', value: '판매중' },
  { label: '심사중', value: '심사중' },
  { label: '준비중', value: '준비중' },
  { label: '정산대기', value: '정산대기' },
];

const statusColorMap: Record<PerformanceStatus, 'blue' | 'green' | 'grey' | 'red'> = {
  판매중: 'green',
  심사중: 'blue',
  준비중: 'grey',
  정산대기: 'red',
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
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-black text-slate-950">{value}</p>
      <p className="mt-2 text-xs font-bold text-slate-500">{caption}</p>
    </Box>
  );
}

export default function AgencyPerformancesPage() {
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredRows = useMemo(() => {
    return performanceRows.filter((row) => {
      const matchesStatus = statusFilter === 'all' || row.status === statusFilter;
      const normalizedQuery = searchValue.trim().toLowerCase();
      const matchesQuery =
        normalizedQuery.length === 0 ||
        row.title.toLowerCase().includes(normalizedQuery) ||
        row.venue.toLowerCase().includes(normalizedQuery);

      return matchesStatus && matchesQuery;
    });
  }, [searchValue, statusFilter]);

  const columns: TableColumn<PerformanceRow>[] = [
    {
      key: 'title',
      header: '공연',
      render: (row) => (
        <div>
          <p className="font-black text-slate-900">{row.title}</p>
          <p className="mt-1 text-sm font-medium text-slate-500">{row.venue}</p>
        </div>
      ),
    },
    {
      key: 'schedule',
      header: '공연 일정',
    },
    {
      key: 'ticketOpenAt',
      header: '티켓 오픈',
    },
    {
      key: 'status',
      header: '상태',
      align: 'center',
      render: (row) => (
        <Badge color={statusColorMap[row.status]} maxLength={10}>
          {row.status}
        </Badge>
      ),
    },
    {
      key: 'salesRate',
      header: '판매율',
      align: 'center',
    },
    {
      key: 'settlementStatus',
      header: '정산 상태',
    },
    {
      key: 'action',
      header: '관리',
      align: 'right',
      render: () => (
        <Button color="dark" variant="weak" size="small">
          상세 보기
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-5 sm:p-8">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-sm font-bold text-blue-600">Agency workspace</p>
          <h1 className="mt-1 text-2xl font-black tracking-normal text-slate-950">
            등록한 공연 목록
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-500">
            SearchBar, SegmentedControl, Table 조합으로 기획사 운영 화면의 기본 관리 패턴을 구성했습니다.
          </p>
        </div>

        <Button color="primary" size="medium">
          신규 공연 등록
        </Button>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        <SummaryCard label="전체 공연" value="18건" caption="이번 시즌 운영 중인 공연 기준" />
        <SummaryCard label="판매중" value="07건" caption="현재 예매 가능한 공연" />
        <SummaryCard label="심사중" value="03건" caption="운영 검수 및 정책 확인 단계" />
        <SummaryCard label="정산 대기" value="04건" caption="매출 마감 후 정산서 생성 예정" />
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

          <div className="w-full xl:w-[540px]">
            <SegmentedControl
              options={statusFilterOptions}
              value={statusFilter}
              onChange={setStatusFilter}
            />
          </div>
        </div>

        <Table columns={columns} data={filteredRows} />
      </Box>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_340px]">
        <Box variant="outline" className="space-y-4">
          <div>
            <h2 className="text-[18px] font-black text-slate-950">운영 메모</h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              목록 화면에서 바로 확인하면 좋은 액션과 체크 포인트를 우측 박스 대신 하단 카드로 정리했습니다.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 px-4 py-4">
              <p className="text-sm font-black text-slate-900">이번 주 오픈 예정</p>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                SSAFY Concert Encore와 Spring Festival Stage의 검수 완료 여부를 확인해야 합니다.
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-4">
              <p className="text-sm font-black text-slate-900">정산 확인 필요</p>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                계좌 검증이 끝나지 않은 공연은 판매 오픈 후 정산서 생성이 지연될 수 있습니다.
              </p>
            </div>
          </div>
        </Box>

        <Box variant="gray" className="space-y-4">
          <div>
            <h2 className="text-[18px] font-black text-slate-950">빠른 실행</h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              자주 쓰는 액션을 버튼으로 묶어두면 운영 동선이 더 짧아집니다.
            </p>
          </div>

          <Button color="primary" display="block" size="medium">
            검수 요청 목록 열기
          </Button>
          <Button color="dark" variant="weak" display="block" size="medium">
            정산 계좌 점검
          </Button>
        </Box>
      </section>
    </div>
  );
}
