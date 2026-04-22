import type { Meta, StoryObj } from '@storybook/react';
import { BannerSubtitle } from './BannerSubtitle';

const meta = {
  title: 'Shared/BannerSubtitle',
  component: BannerSubtitle,
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
} satisfies Meta<typeof BannerSubtitle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    subtitle: '단독판매',
  },
};

export const CustomColor: Story = {
  args: {
    subtitle: '내한공연',
    color: '#a7f3d0',
  },
};

export const LoadingState: Story = {
  args: {
    subtitle: '로딩중...',
    isLoading: true,
  },
};
