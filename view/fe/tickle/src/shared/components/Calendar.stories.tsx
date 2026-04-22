import type { Meta, StoryObj } from '@storybook/react';
import { Calendar } from './Calendar';
import React, { useState } from 'react';

const meta = {
  title: 'Shared/Calendar',
  component: Calendar,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    isLoading: { control: 'boolean', description: '로딩 상태' },
  },
} satisfies Meta<typeof Calendar>;

export default meta;
type Story = StoryObj<typeof meta>;

// 템플릿: 선택 상태를 Storybook에서 바로 확인할 수 있도록 래퍼 제공
const InteractiveCalendar = (args: any) => {
  const [selected, setSelected] = useState<Date | string | null>(null);
  
  return (
    <Calendar 
      {...args} 
      selectedDate={selected} 
      onSelect={(date) => setSelected(date)} 
    />
  );
};

// 현재 달의 특정 날짜들만 활성화되게 설정
const today = new Date();
const currentYear = today.getFullYear();
const currentMonth = today.getMonth();

const sampleEnabledDates = [
  new Date(currentYear, currentMonth, 5),
  new Date(currentYear, currentMonth, 10),
  new Date(currentYear, currentMonth, 15),
  new Date(currentYear, currentMonth, 16),
  new Date(currentYear, currentMonth, 20),
  new Date(currentYear, currentMonth, 25),
];

export const Default: Story = {
  render: InteractiveCalendar,
  args: {
    enabledDates: sampleEnabledDates,
  },
};

export const StringDates: Story = {
  render: InteractiveCalendar,
  name: '문자열 날짜 형식 입력 예시',
  args: {
    // YYYY-MM-DD 포맷을 직접 사용할 수도 있습니다.
    enabledDates: [
      `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-02`,
      `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-08`,
      `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-14`,
      `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-28`,
    ],
  },
};

export const NoDatesAvailable: Story = {
  render: InteractiveCalendar,
  name: '활성화된 날짜가 없는 경우',
  args: {
    enabledDates: [],
  },
};

export const LoadingState: Story = {
  args: {
    isLoading: true,
  },
};
