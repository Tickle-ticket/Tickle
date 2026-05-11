import type { Meta, StoryObj } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DetailView } from './DetailView';
import { MobileBottomNav } from '@/src/shared/components/MobileBottomNav';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const mockedDetailData = {
  eventId: '1',
  title: '[Mock] 임영웅 콘서트 IM HERO - 서울',
  subTitle: '콘서트',
  imageUrl: 'https://picsum.photos/400/600',
  startDate: '2026.05.15',
  endDate: '2026.05.17',
  venue: 'KSPO DOME',
  venueAddress: '서울특별시 송파구 올림픽로 424',
  notice: '이것은 Storybook을 위한 목데이터입니다.',
  zonePrices: [
    { priceGrade: 'VIP', price: 150000 },
    { priceGrade: 'R', price: 120000 },
    { priceGrade: 'S', price: 90000 },
  ],
  schedules: [
    {
      date: '2026.05.15',
      times: [{ time: '19:30', remainingSeats: [] }],
    },
  ],
  detailImageUrl: 'https://picsum.photos/800/1200',
  isFavorite: false,
  tags: ['임영웅', '콘서트', '단독'],
};

const mockedUserProfile = {
  userId: 1,
  avatarUrl: 'https://picsum.photos/200',
  name: '홍길동',
  nickname: '길동이',
  realName: '홍길동',
  email: 'test@tickle.com',
  phoneNumber: '010-1234-5678',
};

queryClient.setQueryData(['detailData', '1'], mockedDetailData);
queryClient.setQueryData(['userProfile'], mockedUserProfile);

const meta: Meta<typeof DetailView> = {
  title: 'user/DetailView',
  component: DetailView,
  parameters: {
    layout: 'fullscreen',
    nextjs: {
      appDirectory: true,
      navigation: {
        query: { id: '1' },
      },
    },
  },
  decorators: [
    (Story) => (
      <QueryClientProvider client={queryClient}>
        <Story />
        <MobileBottomNav />
      </QueryClientProvider>
    ),
  ],
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof DetailView>;

export const Default: Story = {
  args: {
    storyMode: true,
  },
};

export const Mobile: Story = {
  args: {
    storyMode: true,
  },
  parameters: {
    viewport: {
      defaultViewport: 'iphone14',
    },
  },
};

export const Tablet: Story = {
  args: {
    storyMode: true,
  },
  parameters: {
    viewport: {
      defaultViewport: 'ipad',
    },
  },
};

export const NotFound: Story = {
  parameters: {
    nextjs: {
      navigation: {
        query: { id: 'invalid-id' },
      },
    },
  },
};

export const InvalidAccess: Story = {
  parameters: {
    nextjs: {
      navigation: {
        query: { id: '1', step: 'seat' },
      },
    },
  },
};
