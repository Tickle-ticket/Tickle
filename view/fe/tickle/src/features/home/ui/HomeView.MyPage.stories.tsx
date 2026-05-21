import type { Meta, StoryObj } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HomeView } from './HomeView';
import { useEffect } from 'react';
import { useSearchStore } from '@/src/shared/store/useSearchStore';
import { useMypageStore } from '@/src/shared/store/useMypageStore';

const mockUserProfile = {
  userId: 1,
  name: '홍길동',
  nickname: '티클마스터',
  phoneNumber: '010-1234-5678',
  avatarUrl: 'https://picsum.photos/200/200',
};

const mockMyBookings = [
  {
    id: 'b1',
    eventId: '1',
    imageUrl: 'https://picsum.photos/400/600',
    title: '[Mock] 아이유 콘서트',
    venue: '올림픽주경기장',
    performanceDate: '2026-09-17T18:00:00',
    bookingDate: '2026-05-10T10:00:00',
    seatInfo: 'VIP석 1층 1열 1번',
    ticketCount: 1,
    status: 'CONFIRMED',
    bookingNo: 'TKK-20260510-001',
    totalPaymentAmount: 150000,
  }
];

const mockWaitlist = [
  {
    id: 'w1',
    eventId: '2',
    imageUrl: 'https://picsum.photos/400/601',
    title: '[Mock] 싸이 흠뻑쇼',
    performanceDate: '2026-07-15T18:00:00',
    seats: [
      { id: 's1', info: 'R석 2층 10열 15번', waitlistNumber: 3 },
      { id: 's2', info: 'R석 2층 10열 16번', waitlistNumber: 0 }
    ]
  }
];

const mockUpcomingWishlist = [
  {
    id: '3',
    title: '[Mock] 콜드플레이 내한공연',
    imageUrl: 'https://picsum.photos/400/602',
    venue: '잠실종합운동장',
    date: '2026.12.01 ~ 2026.12.02',
    badges: ['단독'],
    openDate: '2026-10-01T14:00:00',
    isWishlisted: true,
  }
];

const mockBookingDetail1 = {
  bookingId: 'b1',
  bookingNo: 'TKK-20260401-001',
  eventTitle: '[Mock] 임영웅 콘서트 IM HERO',
  createdAt: '2026-04-01T10:00:00',
  totalPaymentAmount: 165000,
  bookingStatus: 'CONFIRMED',
  tickets: [
    { ticketNo: 1, rowLabel: '10', seatNumber: 15, seatLabel: 'VIP석' }
  ]
};

const mockBookingDetail2 = {
  bookingId: 'b2',
  bookingNo: 'TKK-20260410-002',
  eventTitle: '[Mock] 뮤지컬 시카고',
  createdAt: '2026-04-10T14:00:00',
  totalPaymentAmount: 300000,
  bookingStatus: 'PENDING_PAYMENT',
  tickets: [
    { ticketNo: 2, rowLabel: '5', seatNumber: 12, seatLabel: 'R석' },
    { ticketNo: 3, rowLabel: '5', seatNumber: 13, seatLabel: 'R석' }
  ]
};

const createQueryClient = (withData: boolean) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  if (withData) {
    client.setQueryData(['userProfile'], mockUserProfile);
    client.setQueryData(['myBookings'], mockMyBookings);
    client.setQueryData(['bookingDetail', 'b1'], mockBookingDetail1);
    client.setQueryData(['bookingDetail', 'b2'], mockBookingDetail2);
    client.setQueryData(['waitlistBookings'], mockWaitlist);
    client.setQueryData(['myUpcomingWishlist'], mockUpcomingWishlist);
  } else {
    // 빈 화면 테스트를 위해 프로필 제외한 모든 데이터 빈 배열 처리
    client.setQueryData(['userProfile'], mockUserProfile); 
    client.setQueryData(['myBookings'], []);
    client.setQueryData(['waitlistBookings'], []);
    client.setQueryData(['myUpcomingWishlist'], []);
  }
  return client;
};

const queryClientWithData = createQueryClient(true);
const queryClientEmpty = createQueryClient(false);

const meta: Meta<typeof HomeView> = {
  title: 'user/HomeView/MyPage',
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
        useMypageStore.getState().openMypage();
      }, []);
      return (
        <QueryClientProvider client={queryClientWithData}>
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
        useMypageStore.getState().openMypage();
      }, []);
      return (
        <QueryClientProvider client={queryClientEmpty}>
          <Story />
        </QueryClientProvider>
      );
    }
  ]
};
