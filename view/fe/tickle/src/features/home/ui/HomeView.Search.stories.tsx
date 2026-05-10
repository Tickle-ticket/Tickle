import type { Meta, StoryObj } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HomeView } from './HomeView';
import { useEffect } from 'react';
import { useSearchStore } from '@/src/shared/store/useSearchStore';
import { useMypageStore } from '@/src/shared/store/useMypageStore';

const mockSearchResults = [
  {
    id: '1',
    title: '[Mock] 임영웅 콘서트',
    imageUrl: 'https://picsum.photos/400/600',
    venue: 'KSPO DOME',
    date: '2026.05.15 ~ 2026.05.17',
    badges: ['단독', '콘서트'],
  }
];

const createQueryClient = (withData: boolean) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  if (withData) {
    client.setQueryData(['search', '임영웅'], mockSearchResults);
  } else {
    client.setQueryData(['search', '임영웅'], []);
  }
  return client;
};

const meta: Meta<typeof HomeView> = {
  title: 'user/HomeView/Search',
  component: HomeView,
  parameters: { layout: 'fullscreen', nextjs: { appDirectory: true } },
};
export default meta;
type Story = StoryObj<typeof HomeView>;

export const WithData: Story = {
  decorators: [
    (Story) => {
      useEffect(() => {
        useSearchStore.getState().setSearchValue('임영웅');
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
        useSearchStore.getState().setSearchValue('임영웅');
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
