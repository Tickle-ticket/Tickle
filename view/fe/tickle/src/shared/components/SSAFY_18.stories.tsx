import type { Meta, StoryObj } from '@storybook/react';
import { SSAFY_18 } from './SSAFY_18';
import type { SeatColor, SeatStatus } from './types';
import { useState } from 'react';

const meta = {
  title: 'Shared/SSAFY_18',
  component: SSAFY_18,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof SSAFY_18>;

export default meta;
type Story = StoryObj<typeof meta>;

// 예시 데이터 맵핑 (간단한 색상 시각화를 위해 A열만 다르게 칠해봄)
const generateMockSeatsData = () => {
  const data: Record<string, { color: SeatColor; status: SeatStatus }> = {};
  
  // A열은 보라색
  ['A1','A2','A3','A4','A5','A6','A7','A8','A9','A10'].forEach(id => {
    data[id] = { color: 'purple', status: 'selectable' };
  });

  // B, C열은 노란색
  ['B1','B2','B3','B4','B5','C1','C2','C3','C4','C5'].forEach(id => {
    data[id] = { color: 'yellow', status: 'selectable' };
  });

  // G열의 1,2는 시야제한 (회색 비활성화)
  ['G1', 'G2', 'K1', 'L1', 'M1', 'P1', 'P2'].forEach(id => {
    data[id] = { color: 'gray', status: 'disabled' };
  });

  return data;
};

const InteractiveSSAFY_18 = () => {
  const [selectedSeats, setSelectedSeats] = useState<Set<string>>(new Set());
  const baseData = generateMockSeatsData();

  // 선택된 좌석 상태를 baseData에 오버라이드
  const seatsData = { ...baseData };
  Array.from(selectedSeats).forEach(id => {
    if (!seatsData[id]) {
      seatsData[id] = { color: 'blue', status: 'selectable' };
    }
    seatsData[id] = { ...seatsData[id], isSelected: true };
  });

  const handleSeatClick = (id: string) => {
    setSelectedSeats(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="w-full h-screen bg-gray-100 overflow-auto flex items-start justify-center p-8">
      <SSAFY_18 
        seatsData={seatsData} 
        onSeatClick={handleSeatClick} 
      />
    </div>
  );
};

export const Default: Story = {
  render: () => <InteractiveSSAFY_18 />,
};
