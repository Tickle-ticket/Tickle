import type { Meta, StoryObj } from '@storybook/react';
import { BannerPlace } from './BannerPlace';

const meta = {
  title: 'Shared/BannerPlace',
  component: BannerPlace,
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
} satisfies Meta<typeof BannerPlace>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    place: '블루스퀘어 신한카드홀',
  },
};

export const CustomColor: Story = {
  args: {
    place: '예술의전당 오페라극장',
    color: '#fef08a',
  },
};

export const LoadingState: Story = {
  args: {
    place: '로딩중...',
    isLoading: true,
  },
};
