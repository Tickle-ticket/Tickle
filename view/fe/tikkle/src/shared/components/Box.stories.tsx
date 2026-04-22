import type { Meta, StoryObj } from '@storybook/react';
import { Box } from './Box';
import React from 'react';

const meta = {
  title: 'Shared/Box',
  component: Box,
  parameters: {
    layout: 'padded',
    backgrounds: { 
      // 토스 스타일 앱의 바탕은 대개 회색(#F2F4F6)이므로 박스(흰색)가 예쁘게 보이기 위해 회색 배경 세팅
      default: 'app-background',
      values: [{ name: 'app-background', value: '#F2F4F6' }]
    } 
  },
  tags: ['autodocs'],
  argTypes: {
    padding: { control: 'radio', options: ['none', 'small', 'medium', 'large'] },
    variant: { control: 'radio', options: ['flat', 'outline', 'shadow', 'gray'] },
    isLoading: { control: 'boolean' },
  },
} satisfies Meta<typeof Box>;

export default meta;
type Story = StoryObj<typeof meta>;

// 빈 박스 형태를 보여주기 위한 기본 임의 높이
const EmptyContent = () => (
  <div className="h-40 w-full flex items-center justify-center text-gray-400">
    박스 내부 영역 (children)
  </div>
);

export const Default: Story = {
  args: {
    variant: 'shadow',
    padding: 'medium',
    children: <EmptyContent />,
  },
};

export const FlatGrayBox: Story = {
  args: {
    variant: 'gray',
    padding: 'medium',
    children: <div className="h-20 w-full flex items-center justify-center text-gray-600 font-semibold">회색 내부 영역</div>,
  },
};

export const LoadingState: Story = {
  args: {
    variant: 'shadow',
    padding: 'medium',
    isLoading: true,
    children: <EmptyContent />,
  },
};
