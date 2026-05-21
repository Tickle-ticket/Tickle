import type { Meta, StoryObj } from '@storybook/react';
import { TimelineNav } from './TimelineNav';
import { useState } from 'react';

const meta = {
  title: 'Shared/TimelineNav',
  component: TimelineNav,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    items: {
      control: 'object',
      description: '네비게이션 항목 배열 [{ id, title }]',
    },
    color: {
      control: 'radio',
      options: ['black', 'blue', 'primary'],
      description: '활성화된 상태의 컬러 테마',
    },
    size: {
      control: 'radio',
      options: ['small', 'medium'],
      description: '크기 설정',
    },
    lineStyle: {
      control: 'radio',
      options: ['solid', 'dashed'],
      description: '배경 연결 선 스타일',
    },
  },
} satisfies Meta<typeof TimelineNav>;

export default meta;
type Story = StoryObj<typeof meta>;

const navItems = [
  { id: 'info', title: '공연 정보' },
  { id: 'price', title: '가격 정보' },
  { id: 'schedule', title: '공연 일정' },
  { id: 'details', title: '상세 정보' },
];

const InteractiveTimelineNav = (args: any) => {
  const [activeIndex, setActiveIndex] = useState(0);
  return (
    <div className="w-[300px] h-[300px] p-8 border border-dashed border-line-strong rounded-lg bg-surface overflow-y-auto">
      <TimelineNav 
        activeIndex={activeIndex} 
        onItemClick={(_, index) => setActiveIndex(index)} 
        {...args}
      />
    </div>
  );
};

export const Default: Story = {
  render: (args) => <InteractiveTimelineNav {...args} />,
  args: {
    items: navItems,
    color: 'black',
    size: 'medium',
    lineStyle: 'solid',
  },
};

export const BlueSmallDashed: Story = {
  render: (args) => <InteractiveTimelineNav {...args} />,
  args: {
    items: navItems,
    color: 'blue',
    size: 'small',
    lineStyle: 'dashed',
  },
};

export const StaticSelection: Story = {
  args: {
    items: navItems,
    activeIndex: 2,
    onItemClick: () => {},
  },
};

export const Loading: Story = {
  args: {
    items: navItems,
    activeIndex: 0,
    onItemClick: () => {},
    isLoading: true,
  },
};
