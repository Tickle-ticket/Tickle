'use client';

import { useMemo, useState } from 'react';
import { Badge } from '@/src/shared/components/Badge';
import { Box } from '@/src/shared/components/Box';
import { Button } from '@/src/shared/components/Button';
import { SearchBar } from '@/src/shared/components/SearchBar';
import { SegmentedControl } from '@/src/shared/components/SegmentedControl';
import { Table } from '@/src/shared/components/Table';
import type { TableColumn } from '@/src/shared/components/types';

type SettlementStatus = '정산 완료' | '검수 중' | '지급 대기';

interface SettlementRow {
  id: number;
  performance: string;
  settlementPeriod: string;
  grossSales: string;
  platformFee: string;
  payoutAmount: string;
  payoutDate: string;
  status: SettlementStatus;
}

const settlementRows: SettlementRow[] = [
  {
    id: 1,
    performance: '뮤지컬 Tikkle Original',
    settlementPeriod: '2026.04.01 - 2026.04.30',
    grossSales: '₩184,200,000',
    platformFee: '₩12,894,000',
    payoutAmount: '₩171,306,000',
    payoutDate: '2026.05.07',
    status: '정산 완료',
  },
  {
    id: 2,
    performance: 'SSAFY Concert Encore',
    settlementPeriod: '2026.04.15 - 2026.04.30',
    grossSales: '₩96,800,000',
    platformFee: '₩6,776,000',
    payoutAmount: '₩90,024,000',
    payoutDate: '2026.05.10',
    status: '검수 중',
  },
  {
    id: 3,
    performance: 'Spring Festival Stage',
    settlementPeriod: '2026.03.20 - 2026.03.31',
    grossSales: '₩248,000,000',
    platformFee: '₩17,360,000',
    payoutAmount: '₩230,640,000',
    payoutDate: '2026.04.12',
    status: '정산 완료',
  },
  {
    id: 4,
    performance: 'Developer Meetup Live',
    settlementPeriod: '2026.04.25 - 2026.04.30',
    grossSales: '₩42,500,000',
    platformFee: '₩2,975,000',
    payoutAmount: '₩39,525,000',
    payoutDate: '2026.05.14',
    status: '지급 대기',
  },
];

const settlementFilterOptions = [
  { label: '이번 달', value: 'current' },
  { label: '지난 달', value: 'previous' },
  { label: '분기 기준', value: 'quarter' },
];

const statusColorMap: Record<SettlementStatus, 'green' | 'blue' | 'grey'> = {
  '정산 완료': 'green',
  '검수 중': 'blue',
  '지급 대기': 'grey',
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

export default function AgencySettlementsPage() {
  const [searchValue, setSearchValue] = useState('');
  const [rangeFilter, setRangeFilter] = useState('current');

  const filteredRows = useMemo(() => {
    const normalizedQuery = searchValue.trim().toLowerCase();

    return settlementRows.filter((row) => {
      if (!normalizedQuery) {
        return true;
      }

      return row.performance.toLowerCase().includes(normalizedQuery);
    });
  }, [searchValue, rangeFilter]);

  const columns: TableColumn<SettlementRow>[] = [
    {
      key: 'performance',
      header: '공연',
      render: (row) => (
        <div>
          <p className="font-black text-slate-900">{row.performance}</p>
          <p className="mt-1 text-sm font-medium text-slate-500">{row.settlementPeriod}</p>
        </div>
      ),
    },
    { key: 'grossSales', header: '총매출', align: 'right' },
    { key: 'platformFee', header: '플랫폼 수수료', align: 'right' },
    { key: 'payoutAmount', header: '지급 예정 금액', align: 'right' },
    {
      key: 'payoutDate',
      header: '지급일',
      align: 'center',
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
  ];

  return (
    <div className="space-y-6 p-5 sm:p-8">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-sm font-bold text-blue-600">공연 정산</p>
          <h1 className="mt-1 text-2xl font-black tracking-normal text-slate-950">
            공연 정산 조회
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button color="dark" variant="weak" size="medium">
            정산서 다운로드
          </Button>
          <Button color="primary" size="medium">
            지급 일정 문의
          </Button>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="이번 달 지급 예정" value="₩301.9M" caption="검수 완료 기준 합산" />
        <SummaryCard label="검수 중 정산서" value="03건" caption="운영팀 확인이 필요한 문서" />
        <SummaryCard label="다음 지급일" value="05.10" caption="예정 지급 건 자동 반영" />
      </section>

      <Box variant="shadow" className="space-y-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="w-full xl:max-w-[380px]">
            <SearchBar
              fullWidth
              size="small"
              placeholder="공연명 검색"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              onClear={() => setSearchValue('')}
            />
          </div>

          <div className="w-full xl:w-[420px]">
            <SegmentedControl
              options={settlementFilterOptions}
              value={rangeFilter}
              onChange={setRangeFilter}
            />
          </div>
        </div>

        <Table columns={columns} data={filteredRows} />
      </Box>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
        <Box variant="outline" className="space-y-4">
          <div>
            <h2 className="text-[18px] font-black text-slate-950">지급 일정 메모</h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              정산 페이지 하단에는 운영팀과 자주 맞추는 체크포인트를 카드형으로 붙였습니다.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 px-4 py-4">
              <p className="text-sm font-black text-slate-900">05.07 지급</p>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                4월 마감 공연 중 검수 완료 건 우선 송금
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-4">
              <p className="text-sm font-black text-slate-900">05.10 지급</p>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                콘서트 카테고리 수수료 재검토 반영 예정
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-4">
              <p className="text-sm font-black text-slate-900">계좌 검증</p>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                지급 대기 건은 계좌 인증 완료 후 자동 전환
              </p>
            </div>
          </div>
        </Box>

        <Box variant="gray" className="space-y-4">
          <div>
            <h2 className="text-[18px] font-black text-slate-950">등록 계좌</h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              운영팀 문의 전 자주 확인하는 정산 계좌 정보를 요약했습니다.
            </p>
          </div>

          <div className="rounded-2xl bg-white/80 px-4 py-4 ring-1 ring-black/5">
            <p className="text-sm font-bold text-slate-500">예금주</p>
            <p className="mt-1 text-lg font-black text-slate-950">주식회사 티클엔터테인먼트</p>
          </div>
          <div className="rounded-2xl bg-white/80 px-4 py-4 ring-1 ring-black/5">
            <p className="text-sm font-bold text-slate-500">정산 계좌</p>
            <p className="mt-1 text-lg font-black text-slate-950">신한은행 110-483-920184</p>
          </div>

          <Button color="dark" variant="weak" display="block" size="medium">
            계좌 정보 수정
          </Button>
        </Box>
      </section>
    </div>
  );
}
