import type { Meta, StoryObj } from '@storybook/react';
import { BookingCard } from './BookingCard';
import { BookingData } from '../../features/mypage/api/useMyPageData';

const meta = {
  title: 'Shared/BookingCard',
  component: BookingCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-full min-w-[340px] max-w-xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BookingCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockBooking: BookingData = {
  id: 'BKG-1234',
  eventId: 'EVT-1',
  title: '티클 콘서트 2026',
  venue: '티클 아레나',
  status: 'CONFIRMED',
  performanceDate: '2026-06-23T16:30:00Z',
  bookingDate: '2026-05-15T12:00:00Z',
  bookingNo: 'BN-0001',
  totalPaymentAmount: 150000,
  ticketCount: 2,
  seatInfo: 'D구역 F열 14번 외 1매',
  imageUrl: 'https://images.unsplash.com/photo-1540039155732-d6f74b52b310?auto=format&fit=crop&q=80',
  paymentId: 999
};

export const Confirmed: Story = {
  name: '예매 완료',
  args: {
    item: mockBooking,
    onOpenPayment: () => console.log('onOpenPayment'),
    onOpenCancel: () => console.log('onOpenCancel'),
    onOpenDetail: () => console.log('onOpenDetail'),
    onOpenBarcode: () => console.log('onOpenBarcode'),
  },
};

export const PendingPayment: Story = {
  name: '결제 대기',
  args: {
    item: {
      ...mockBooking,
      status: 'PENDING_PAYMENT',
    },
    onOpenPayment: () => console.log('onOpenPayment'),
    onOpenCancel: () => console.log('onOpenCancel'),
    onOpenDetail: () => console.log('onOpenDetail'),
    onOpenBarcode: () => console.log('onOpenBarcode'),
  },
};

export const Cancelled: Story = {
  name: '예매 취소',
  args: {
    item: {
      ...mockBooking,
      status: 'CANCELLED',
    },
    onOpenPayment: () => console.log('onOpenPayment'),
    onOpenCancel: () => console.log('onOpenCancel'),
    onOpenDetail: () => console.log('onOpenDetail'),
    onOpenBarcode: () => console.log('onOpenBarcode'),
  },
};
