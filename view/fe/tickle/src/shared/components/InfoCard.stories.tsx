import type { Meta, StoryObj } from '@storybook/react';
import { InfoCard } from './InfoCard';

const meta = {
  title: 'Shared/InfoCard',
  component: InfoCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    src: { control: 'text' },
    title: { control: 'text' },
    place: { control: 'text' },
    day: { control: 'text' },
    badges: { control: 'object' },
    rank: { control: 'number' },
    showRank: { control: 'boolean' },
    targetDate: { control: 'date' },
    showTime: { control: 'boolean' },
    disabled: { control: 'boolean' },
    isLoading: { control: 'boolean' },
  },
} satisfies Meta<typeof InfoCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// 사진과 동일한 모습의 데이터
export const Default: Story = {
  args: {
    src: 'https://images.unsplash.com/photo-1543807535-eceef0bc6599?q=80&w=1000&auto=format&fit=crop',
    title: '뮤지컬 〈빌리 엘리어트〉',
    place: '블루스퀘어 우리은행홀',
    day: '2026.04.12 - 2026.07.26',
    badges: [
      { text: '단독판매', color: 'red', variant: 'outline' },
      { text: '매진임박', color: 'blue', variant: 'fill' },
      '추가할인'
    ],
    rank: 1,
    showRank: true,
    targetDate: new Date(Date.now() + 2 * 3600 * 1000 + 45 * 60 * 1000).getTime(), // 2시간 45분 뒤
    showTime: true,
    disabled: false,
    isLoading: false,
  },
};

export const Inactive: Story = {
  args: {
    src: 'https://images.unsplash.com/photo-1543807535-eceef0bc6599?q=80&w=1000&auto=format&fit=crop',
    title: '뮤지컬 〈빌리 엘리어트〉',
    place: '블루스퀘어 우리은행홀',
    day: '2026.04.12 - 2026.07.26',
    badges: ['단독판매'],
    rank: 2,
    showRank: false,
    targetDate: new Date(Date.now() - 10000).getTime(), // 이미 지난 시간
    showTime: false,
    disabled: true,
  },
};

export const LoadingState: Story = {
  args: {
    src: '',
    title: '',
    isLoading: true,
  },
};
