import type { Meta, StoryObj } from '@storybook/react';
import { BookingDetailCard } from './BookingDetailCard';

const meta = {
  title: 'Pages/PaymentSuccessMock',
  component: BookingDetailCard,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="min-h-screen bg-[#f8f8f8] flex flex-col font-sans p-6">
        <div className="flex-1 flex items-center justify-center py-12 px-4">
          <div className="bg-white p-8 rounded-3xl shadow-xl max-w-lg w-full space-y-6">
            <div className="w-full text-left">
              <h1 className="text-2xl font-extrabold text-gray-900 text-center mb-6">
                예매가 완료되었습니다!
              </h1>
              <Story />
            </div>
            <div className="flex gap-4 pt-4">
              <button className="flex-1 py-4 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors">
                내 예매
              </button>
              <button className="flex-1 py-4 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 hover:bg-blue-700 transition-colors">
                홈으로
              </button>
            </div>
          </div>
        </div>
      </div>
    ),
  ],
} satisfies Meta<typeof BookingDetailCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockBookingDetail = {
  bookingId: 12345,
  bookingNo: 'BK-1234567890',
  userId: 1,
  sessionId: 101,
  eventTitle: '2026 넬(NELL) 정규 10집 앨범 발매 기념 콘서트',
  performanceDate: new Date(Date.now() + 86400000 * 5).toISOString(),
  bookingStatus: 'CONFIRMED',
  totalPaymentAmount: 154000,
  createdAt: new Date().toISOString(),
  paymentId: 999,
  tickets: [
    { ticketNo: 'T-1', sectionName: 'VIP', rowLabel: 'A', seatNumber: '1', seatLabel: 'A열 1번' },
    { ticketNo: 'T-2', sectionName: 'VIP', rowLabel: 'A', seatNumber: '2', seatLabel: 'A열 2번' }
  ]
};

export const Confirmed: Story = {
  args: {
    bookingDetail: mockBookingDetail,
  },
};

export const BankTransferPending: Story = {
  args: {
    bookingDetail: {
      ...mockBookingDetail,
      bookingStatus: 'PENDING_PAYMENT'
    },
    paymentDetail: {
      paymentId: 999,
      bookingId: 12345,
      bookingNo: 'BK-1234567890',
      paymentMethodType: 'BANK_TRANSFER',
      paymentStatus: 'WAITING_FOR_DEPOSIT',
      bookingStatus: 'PENDING_PAYMENT',
      orderAmount: 154000,
      currencyCode: 'KRW',
      depositDeadline: new Date(Date.now() + 86400000).toISOString(),
      bankAccount: 'KB국민은행 123456-00-123456',
      accountHolder: '티클주식회사',
      seats: []
    }
  },
};
