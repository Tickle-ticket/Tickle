import type { Meta, StoryObj } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HomeView } from './HomeView';
import { useEffect } from 'react';
import { useSearchStore } from '@/src/shared/store/useSearchStore';
import { useMypageStore } from '@/src/shared/store/useMypageStore';

const mockCategories = [
  { categoryId: 1, categoryName: '콘서트' },
  { categoryId: 2, categoryName: '뮤지컬' },
  { categoryId: 3, categoryName: '스포츠' },
];

const mockBanners = [
  {
    id: '1',
    title: '[Mock] 임영웅 콘서트 IM HERO',
    subtitle: '전체 랭킹 1위',
    imageUrl: 'https://picsum.photos/800/400',
    venue: 'KSPO DOME',
    date: '2026.05.15 ~ 2026.05.17',
  },
  {
    id: '2',
    title: '[Mock] 뮤지컬 시카고',
    subtitle: '뮤지컬 랭킹 1위',
    imageUrl: 'https://picsum.photos/800/401',
    venue: '디큐브 링크아트센터',
    date: '2026.06.01 ~ 2026.08.31',
  }
];

const mockRankings = [
  {
    id: '1',
    title: '[Mock] 임영웅 콘서트 IM HERO',
    imageUrl: 'https://picsum.photos/400/600',
    venue: 'KSPO DOME',
    date: '2026.05.15 ~ 2026.05.17',
    badges: ['단독', '콘서트'],
  },
  {
    id: '2',
    title: '[Mock] 아이유 콘서트 The Golden Hour',
    imageUrl: 'https://picsum.photos/400/601',
    venue: '올림픽주경기장',
    date: '2026.09.17 ~ 2026.09.18',
    badges: ['콘서트'],
  },
  {
    id: '3',
    title: '[Mock] 싸이 흠뻑쇼 SUMMERSWAG',
    imageUrl: 'https://picsum.photos/400/602',
    venue: '잠실종합운동장',
    date: '2026.07.15 ~ 2026.08.15',
    badges: ['콘서트', '단독'],
  }
];

const mockUpcoming = [
  {
    id: '4',
    title: '[Mock] 블랙핑크 BORN PINK',
    imageUrl: 'https://picsum.photos/400/603',
    venue: '고척스카이돔',
    date: '2026.10.15 ~ 2026.10.16',
    badges: ['콘서트'],
    openDate: '2026-06-01T14:00:00',
  },
  {
    id: '5',
    title: '[Mock] 세븐틴 FOLLOW TO SEOUL',
    imageUrl: 'https://picsum.photos/400/604',
    venue: '서울월드컵경기장',
    date: '2026.11.20 ~ 2026.11.21',
    badges: ['콘서트', '단독'],
    openDate: '2026-07-01T20:00:00',
  }
];

const createQueryClient = (withData: boolean) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  if (withData) {
    client.setQueryData(['homeCategories'], mockCategories);
    client.setQueryData(['homeBanners'], mockBanners);
    client.setQueryData(['homeRanking', undefined], mockRankings);
    client.setQueryData(['homeUpcoming'], mockUpcoming);
  } else {
    client.setQueryData(['homeCategories'], mockCategories); // 빈 화면에서도 카테고리는 유지 (보통 카테고리마저 없진 않음)
    client.setQueryData(['homeBanners'], []);
    client.setQueryData(['homeRanking', undefined], []);
    client.setQueryData(['homeUpcoming'], []);
  }
  return client;
};

const meta: Meta<typeof HomeView> = {
  title: 'user/HomeView/Home',
  component: HomeView,
  parameters: { layout: 'fullscreen', nextjs: { appDirectory: true } },
};
export default meta;
type Story = StoryObj<typeof HomeView>;

export const WithData: Story = {
  decorators: [
    (Story) => {
      useEffect(() => {
        useSearchStore.getState().clearSearch();
        useMypageStore.getState().closeMypage();
      }, []);
      return (
        <QueryClientProvider client={createQueryClient(true)}>
          <Story />
        </QueryClientProvider>
      );
    }
  ]
};

export const Empty: Story = {
  decorators: [
    (Story) => {
      useEffect(() => {
        useSearchStore.getState().clearSearch();
        useMypageStore.getState().closeMypage();
      }, []);
      return (
        <QueryClientProvider client={createQueryClient(false)}>
          <Story />
        </QueryClientProvider>
      );
    }
  ]
};
