import type { Meta, StoryObj } from '@storybook/react';
import { BannerNavigation } from './BannerNavigation';

const meta = {
  title: 'Shared/BannerNavigation',
  component: BannerNavigation,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onNext: { action: 'onNext' },
    onPrev: { action: 'onPrev' },
    current: { control: 'number', description: '현재 포스터 인덱스' },
    total: { control: 'number', description: '전체 포스터 개수' },
    variant: { 
      control: 'select', 
      options: ['arrow', 'scroll-down', 'dots', 'badge'],
      description: '내비게이션 형태 선택'
    },
    className: { control: 'text' },
  },
} satisfies Meta<typeof BannerNavigation>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DefaultArrows: Story = {
  args: {
    variant: 'arrow',
    current: 1,
    total: 5,
  },
};

export const Dots: Story = {
  args: {
    variant: 'dots',
    current: 2,
    total: 5,
  },
  render: (args) => (
    <div className="bg-surface-inverse p-8 rounded-xl inline-block">
      <BannerNavigation {...args} />
    </div>
  ),
};

export const Badge: Story = {
  args: {
    variant: 'badge',
    current: 3,
    total: 10,
  },
  render: (args) => (
    <div className="bg-surface-inverse p-10 rounded-xl inline-block">
      <BannerNavigation {...args} />
    </div>
  ),
};

export const ScrollDown: Story = {
  args: {
    variant: 'scroll-down',
  },
};
