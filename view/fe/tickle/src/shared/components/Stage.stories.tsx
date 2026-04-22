import type { Meta, StoryObj } from '@storybook/react';
import { Stage } from './Stage';
import React from 'react';

const meta = {
  title: 'Shared/Stage',
  component: Stage,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    label: { control: 'text', description: '스테이지 텍스트' },
    isLoading: { control: 'boolean', description: '로딩 상태' },
    width: { control: 'number', description: '캔버스 너비' },
    height: { control: 'number', description: '캔버스 높이' },
  },
} satisfies Meta<typeof Stage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'STAGE',
    width: 320,
    height: 56,
  },
  render: (args) => (
    <div className="p-4 flex items-center justify-center">
      <Stage {...args} />
    </div>
  )
};

export const CustomLabel: Story = {
  args: {
    label: 'MAIN STAGE',
    width: 400,
    height: 60,
  },
  render: (args) => (
    <div className="p-4 flex items-center justify-center">
      <Stage {...args} />
    </div>
  )
};

export const LoadingState: Story = {
  args: {
    isLoading: true,
    width: 320,
    height: 56,
  },
  render: (args) => (
    <div className="p-4 flex items-center justify-center">
      <Stage {...args} />
    </div>
  )
};

export const FullWidth: Story = {
  args: {
    label: 'STAGE',
    width: 800,
    height: 56,
  },
  render: (args) => (
    <div className="p-4 border border-dashed border-gray-300 rounded-lg overflow-x-auto">
      <Stage {...args} />
    </div>
  )
};
