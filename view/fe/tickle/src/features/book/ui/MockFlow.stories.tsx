import type { Meta, StoryObj } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BookView } from './BookView';
import { MOCK_BOOKING_COMPLETE_EVENT_ID } from '../../../shared/config/mockEventConfig';

// Mock Data for the event and user so BookView can render properly
const mockedEventDetail = {
  eventId: MOCK_BOOKING_COMPLETE_EVENT_ID || '6025',
  title: '[Mock] 커피 쿠폰 당첨 이벤트',
  venue: '가상 이벤트 홀',
  date: '2026.05.15',
  zonePrices: [
    { priceGrade: 'VIP', price: 90000 },
  ],
  schedules: [
    {
      date: '2026.05.15',
      times: [{ scheduleId: '1', sessionNo: 1, time: '19:30', startAt: '2026-05-15T19:30:00Z', remainingSeats: [] }],
    },
  ],
  notice: '이것은 커피쿠폰 테스트를 위한 목데이터입니다.',
};

const mockedUserProfile = {
  userId: 1,
  name: '테스터',
  nickname: '테스터',
  realName: '테스터',
  email: 'test@tickle.com',
  phoneNumber: '010-1234-5678',
};

const meta: Meta<typeof BookView> = {
  title: 'Mock/MockFlow',
  component: BookView,
  parameters: {
    layout: 'fullscreen',
    nextjs: {
      appDirectory: true,
    },
  },
  decorators: [
    (Story, context) => {
      const isWin = context.parameters?.mockWin !== false;

      // Store original fetch
      const originalFetch = window.fetch;

      // Override fetch to intercept the mock API call
      window.fetch = async (input, init) => {
        const url = typeof input === 'string' ? input : (input instanceof Request ? input.url : '');

        if (url.includes('/api/v1/bookings/preorder/mock')) {
          return new Response(
            JSON.stringify({
              status: 200,
              code: 'OK',
              message: '성공',
              data: {
                bookingId: 9999,
                bookingNo: 'TEST-MOCK',
                bookingStatus: 'CONFIRMED',
                currencyCode: 'KRW',
                totalPaymentAmount: 90000,
                holdExpiresAt: new Date(Date.now() + 600000).toISOString(),
                seats: [],
                win: isWin,
                winNumber: isWin ? 1 : 0
              }
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        return originalFetch(input, init);
      };

      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      const eventId = MOCK_BOOKING_COMPLETE_EVENT_ID || '6025';

      queryClient.setQueryData(['eventDetail', eventId], mockedEventDetail);
      queryClient.setQueryData(['seatData', eventId, '1', false, 'BOOKING', null], {});
      queryClient.setQueryData(['userProfile'], mockedUserProfile);

      return (
        <QueryClientProvider client={queryClient}>
          <Story />
        </QueryClientProvider>
      );
    }
  ],
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof BookView>;

export const SuccessMockFlow: Story = {
  args: {
    onClose: () => { },
    eventId: MOCK_BOOKING_COMPLETE_EVENT_ID || '6025',
    mode: 'BOOK',
    storyMode: true,
  },
  parameters: {
    mockWin: true,
  }
};

export const FailMockFlow: Story = {
  args: {
    onClose: () => { },
    eventId: MOCK_BOOKING_COMPLETE_EVENT_ID || '6025',
    mode: 'BOOK',
    storyMode: true,
  },
  parameters: {
    mockWin: false,
  }
};
