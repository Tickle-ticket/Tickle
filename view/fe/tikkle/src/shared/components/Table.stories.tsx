import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Table } from './Table';
import type { TableColumn } from './types';
import { Badge } from './Badge';

const meta: Meta<typeof Table> = {
  title: 'Shared/Table',
  component: Table,
  tags: ['autodocs'],
  argTypes: {
    isLoading: { control: 'boolean', description: '데이터 로딩 중(스켈레톤) 표출 여부' },
    tableLayout: { control: 'select', options: ['auto', 'fixed'], description: '테이블 전체 열맞춤 방식 (auto: 내용에 맞게 늘어남, fixed: 지정한 폭대로 고정)' },
    textAlign: { control: 'select', options: ['left', 'center', 'right'], description: '표 전체의 기본 가로 정렬 방향' },
    verticalAlign: { control: 'select', options: ['top', 'middle', 'bottom'], description: '표 전체의 기본 세로 정렬 방향' },
  },
};

export default meta;
type Story = StoryObj<typeof Table>;

interface UserData {
  id: number;
  name: string;
  role: string;
  status: string;
  amount: string;
}

const advancedColumns: TableColumn<UserData>[] = [
  { key: 'id', header: 'No.', width: '70px', align: 'center' },
  { key: 'name', header: '고객명', width: '120px' },
  { 
    key: 'status', 
    header: '상태', 
    width: '100px',
    align: 'center',
    render: (row) => (
      <Badge color={row.status === '정상' ? 'blue' : 'red'}>
        {row.status}
      </Badge>
    )
  },
  { key: 'role', header: '구분' },
  { key: 'amount', header: '송금액', align: 'right' },
];

const mockData: UserData[] = [
  { id: 1, name: '김토스', status: '정상', role: '개인 고객', amount: '1,500,000 원' },
  { id: 2, name: '이페이', status: '정지', role: '기업 고객', amount: '0 원' },
  { id: 3, name: '박뱅크', status: '정상', role: '개인 고객', amount: '50,000 원' },
];

/** 
 * 토스 테크 블로그의 철학을 반영하여, 
 * td, tr을 더럽게 조립하는 방식이 아닌 배열 데이터(Data-Driven)을 넘겨서 렌더링하는 기본 표입니다. 
 */
export const Default: Story = {
  args: {
    columns: [
      { key: 'col1', header: '테이블 헤더' },
      { key: 'col2', header: '테이블 헤더' },
      { key: 'col3', header: '테이블 헤더' }
    ],
    data: [
      { col1: '테이블 셀', col2: '테이블 셀', col3: '테이블 셀' },
    ],
  },
};

/** 
 * render 함수를 통해 특정 셀에 뱃지(Badge) 형태의 컴포넌트나 커스텀한 디자인을 적용한 실전 예시입니다. 
 * width, align(좌/우/가운데 정렬) 역시 원격에서 컬럼 속성으로 쉽게 통제할 수 있습니다.
 */
export const Advanced: Story = {
  name: '복합 데이터 및 커스텀 셀 적용',
  args: {
    columns: advancedColumns,
    data: mockData,
  },
};

/** 
 * 데이터를 서버에서 불러오는 동안 isLoading 속성을 키면 
 * 컬럼 비율과 정렬(Align)을 그대로 물려받은 똑똑한 스켈레톤 로딩 바가 나타납니다. 
 */
export const LoadingState: Story = {
  name: '로딩 및 스켈레톤 상태',
  args: {
    columns: advancedColumns,
    data: [], // 로딩 중에는 빈 배열이어도 됩니다.
    isLoading: true,
  },
};

/** data가 텅 비었을 때(길이가 0일 때) 대응하는 Empty 상태입니다. */
export const EmptyState: Story = {
  name: '데이터 없음 상태',
  args: {
    columns: advancedColumns,
    data: [],
  },
};
