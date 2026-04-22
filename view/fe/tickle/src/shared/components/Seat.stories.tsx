import type { Meta, StoryObj } from '@storybook/react';
import { Seat } from './Seat';
import type { SeatColor } from './types';
import React from 'react';
import { useState } from 'react';

const meta = {
  title: 'Shared/Seat',
  component: Seat,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    status: {
      control: 'radio',
      options: ['selectable', 'disabled'],
      description: '좌석 상태',
    },
    color: {
      control: 'select',
      options: ['pink', 'yellow', 'mint', 'red', 'green', 'blue'],
      description: '좌석 컬러 (selectable 상태일 경우)',
    },
    isSelected: { control: 'boolean', description: '선택 여부' },
    isLoading: { control: 'boolean', description: '로딩 상태' },
    width: { control: 'number' },
    height: { control: 'number' },
  },
} satisfies Meta<typeof Seat>;

export default meta;
type Story = StoryObj<typeof meta>;

// 템플릿: Interactive Seat
const InteractiveSeat = (args: any) => {
  const [selected, setSelected] = useState(args.isSelected || false);
  return (
    <Seat
      {...args}
      isSelected={selected}
      onClick={() => {
        if (args.status === 'selectable') setSelected(!selected);
      }}
    />
  );
};

export const Default: Story = {
  render: InteractiveSeat,
  args: {
    status: 'selectable',
    color: 'blue',
    isSelected: false,
  },
};

/**
 * 활성 상태 좌석 색상별 모음
 */
export const Colors: Story = {
  name: '컬러 팔레트',
  render: () => {
    const colors1: SeatColor[] = ['pink', 'yellow', 'mint'];
    const colors2: SeatColor[] = ['red', 'green', 'blue'];

    return (
      <div className="flex flex-col gap-6">
        <div>
          <h4 className="text-sm font-semibold mb-3 text-gray-500">Group 1: Pink, Yellow, Mint</h4>
          <div className="flex gap-4">
            {colors1.map((c) => (
              <InteractiveSeat key={c} color={c} status="selectable" />
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-sm font-semibold mb-3 text-gray-500">Group 2: Red, Green, Blue</h4>
          <div className="flex gap-4">
            {colors2.map((c) => (
              <InteractiveSeat key={c} color={c} status="selectable" />
            ))}
          </div>
        </div>
      </div>
    );
  },
};

/**
 * 비활성화(회색) 상태
 */
export const DisabledState: Story = {
  name: '비활성화 좌석',
  render: () => (
    <div className="flex gap-4">
      <Seat status="disabled" />
      <Seat status="disabled" isSelected />
    </div>
  ),
};

export const LoadingState: Story = {
  args: {
    isLoading: true,
  },
};
