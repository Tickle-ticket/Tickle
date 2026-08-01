import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HomeView } from './HomeView';
import { useEffect } from 'react';
import { useMypageStore } from '@/src/shared/store/useMypageStore';

/**
 * 검색 모드 스토리입니다.
 *
 * HomeView는 검색어를 스토어가 아니라 URL 쿼리(`?q=`)에서 읽는다(HomeView#rawQ).
 * 따라서 스토리도 nextjs 애드온의 라우터 파라미터로 검색어를 주입한다.
 */

const SEARCH_KEYWORD = '임영웅';

const mockSearchResults = [
  {
    id: '1',
    title: '[Mock] 임영웅 콘서트',
    imageUrl: 'https://picsum.photos/400/600',
    venue: 'KSPO DOME',
    date: '2026.05.15 ~ 2026.05.17',
    badges: ['단독', '콘서트'],
  },
];

const createQueryClient = (results: typeof mockSearchResults) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(['search', SEARCH_KEYWORD], results);
  return client;
};

const meta: Meta<typeof HomeView> = {
  title: 'user/HomeView/Search',
  component: HomeView,
  parameters: {
    layout: 'fullscreen',
    nextjs: {
      appDirectory: true,
      // HomeView가 useSearchParams로 읽는 검색어를 여기서 주입한다.
      navigation: { query: { q: SEARCH_KEYWORD } },
    },
  },
};
export default meta;
type Story = StoryObj<typeof HomeView>;

/** 검색 결과가 있는 상태. */
export const WithData: Story = {
  decorators: [
    (Story) => {
      useEffect(() => {
        useMypageStore.getState().closeMypage();
      }, []);
      return (
        <QueryClientProvider client={createQueryClient(mockSearchResults)}>
          <Story />
        </QueryClientProvider>
      );
    },
  ],
};

/** 검색 결과가 없는 상태(빈 화면 UI 확인용). */
export const Empty: Story = {
  decorators: [
    (Story) => {
      useEffect(() => {
        useMypageStore.getState().closeMypage();
      }, []);
      return (
        <QueryClientProvider client={createQueryClient([])}>
          <Story />
        </QueryClientProvider>
      );
    },
  ],
};
