import type { Meta, StoryObj } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BookView } from './BookView';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const mockedEventDetail = {
  eventId: '1',
  title: '[Mock] 임영웅 콘서트 IM HERO - 서울',
  venue: 'KSPO DOME',
  date: '2026.05.15 ~ 2026.05.17',
  zonePrices: [
    { priceGrade: 'VIP', price: 150000 },
    { priceGrade: 'R', price: 120000 },
    { priceGrade: 'S', price: 90000 },
  ],
  schedules: [
    {
      date: '2026.05.15',
      times: [{ scheduleId: '1', sessionNo: 1, time: '19:30', startAt: '2026-05-15T19:30:00Z', remainingSeats: [] }],
    },
  ],
  notice: '이것은 Storybook을 위한 목데이터입니다.',
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

queryClient.setQueryData(['eventDetail', '1'], mockedEventDetail);
// Mock seat data as well so it doesn't crash on seat fetching
queryClient.setQueryData(['seatData', '1', '1', false, 'BOOKING', null], {});
queryClient.setQueryData(['seatData', '1', '1', false, 'WAITLIST', null], {});
queryClient.setQueryData(['userProfile'], mockedUserProfile);

const meta: Meta<typeof BookView> = {
  title: 'user/BookView',
  component: BookView,
  parameters: {
    layout: 'fullscreen',
    nextjs: {
      appDirectory: true,
    },
  },
  decorators: [
    (Story) => (
      <QueryClientProvider client={queryClient}>
        <Story />
      </QueryClientProvider>
    ),
  ],
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof BookView>;

export const Default: Story = {
  args: {
    onClose: () => {},
    eventId: '1',
    mode: 'BOOK',
    storyMode: true,
  },
};

export const NotFound: Story = {
  args: {
    onClose: () => {},
    eventId: 'invalid-id',
    mode: 'BOOK',
    storyMode: true,
  },
};

export const CancellationWait: Story = {
  args: {
    onClose: () => {},
    eventId: '1',
    mode: 'WAITLIST',
    storyMode: true,
  },
};

export const Mobile: Story = {
  args: {
    onClose: () => {},
    eventId: '1',
    mode: 'BOOK',
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
    onClose: () => {},
    eventId: '1',
    mode: 'BOOK',
    storyMode: true,
  },
  parameters: {
    viewport: {
      defaultViewport: 'ipad',
    },
  },
};
