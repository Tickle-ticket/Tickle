import type { Meta, StoryObj } from '@storybook/react';
import { BannerTime } from './BannerTime';

const meta = {
  title: 'Shared/BannerTime',
  component: BannerTime,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#18181b' },
        { name: 'light', value: '#ffffff' },
      ],
    },
  },
} satisfies Meta<typeof BannerTime>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    time: '2024.03.15 ~ 2024.05.15',
  },
};

export const CustomColor: Story = {
  args: {
    time: '2026.05.01 (금) ~ 2026.08.31 (월)',
    color: '#93c5fd',
  },
};

export const LoadingState: Story = {
  args: {
    time: '로딩중...',
    isLoading: true,
  },
};
