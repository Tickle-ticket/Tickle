import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { BookingCard } from './BookingCard';
import { Modal } from './Modal';
import { Text } from './Text';
import { Box } from './Box';
import { Badge } from './Badge';
import { Table } from './Table';
import { BookingDetailCard } from './BookingDetailCard';
import { BookingData } from '../../features/mypage/api/useMyPageData';

const meta = {
  title: 'Components/BookingCard',
  component: BookingCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  args: {
    onOpenPayment: () => {},
    onOpenCancel: () => {},
    onOpenDetail: () => {},
    onOpenBarcode: () => {},
  },
  argTypes: {
    onOpenPayment: { action: 'onOpenPayment clicked' },
    onOpenCancel: { action: 'onOpenCancel clicked' },
    onOpenDetail: { action: 'onOpenDetail clicked' },
    onOpenBarcode: { action: 'onOpenBarcode clicked' },
  },
} satisfies Meta<typeof BookingCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const baseBookingData: BookingData = {
  id: 'BKG-TEST-1234',
  eventId: '1',
  imageUrl: 'https://images.unsplash.com/photo-1540039155732-6761b54cbaca?w=500&h=750&fit=crop',
  title: '2026 넬(NELL) 정규 10집 앨범 발매 기념 콘서트',
  venue: '올림픽공원 올림픽홀',
  performanceDate: new Date(Date.now() + 86400000 * 5).toISOString(), // 5일 뒤
  bookingDate: new Date().toISOString(),
  seatInfo: 'VIP석 A구역 1열 1번',
  ticketCount: 1,
  status: 'CONFIRMED',
  bookingNo: 'BK-1234567890',
  totalPaymentAmount: 154000,
  paymentId: 101,
};

// 1. 예매 완료 상태
export const Confirmed: Story = {
  args: {
    item: {
      ...baseBookingData,
      status: 'CONFIRMED',
    },
  },
};

// 2. 결제 대기 (무통장 입금) 상태
export const PendingPayment: Story = {
  args: {
    item: {
      ...baseBookingData,
      status: 'PENDING_PAYMENT',
    },
  },
};

// 3. 당일 공연 (바코드 활성화) 상태
export const TodayPerformance: Story = {
  args: {
    item: {
      ...baseBookingData,
      status: 'CONFIRMED',
      performanceDate: new Date().toISOString(), // 오늘 날짜로 설정하여 바코드 활성화
    },
  },
};

// 4. 예매 취소 상태
export const Cancelled: Story = {
  args: {
    item: {
      ...baseBookingData,
      status: 'CANCELLED',
    },
  },
};

// 5. 상세 정보 모달 인터랙션 확인용
const WithModalWrapper = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [modalType, setModalType] = useState<'detail' | 'payment' | null>(null);

  const bookingDetail = {
    eventTitle: baseBookingData.title,
    bookingNo: baseBookingData.bookingNo,
    createdAt: baseBookingData.bookingDate,
    bookingStatus: 'CONFIRMED',
    totalPaymentAmount: baseBookingData.totalPaymentAmount,
    tickets: [
      { ticketNo: 'T1', sectionName: 'A', rowLabel: '1', seatNumber: '1', seatLabel: '1열 1번', seatGrade: 'VIP석', finalPriceAmount: 154000, ticketStatus: 'CONFIRMED' }
    ]
  };

  const paymentDetail = {
    paymentMethodType: '무통장 입금',
    bankAccount: 'KB국민은행 123456-00-123456',
    accountHolder: '티클주식회사',
    orderAmount: 154000,
    depositDeadline: new Date(Date.now() + 86400000).toISOString()
  };

  return (
    <div className="flex gap-4 p-4 bg-gray-50 rounded-2xl">
      <BookingCard 
        item={{ ...baseBookingData, status: 'PENDING_PAYMENT' }} 
        onOpenDetail={() => { setModalType('detail'); setIsOpen(true); }}
        onOpenPayment={() => { setModalType('payment'); setIsOpen(true); }}
        onOpenCancel={() => {}}
        onOpenBarcode={() => {}}
      />
      <BookingCard 
        item={{ ...baseBookingData, status: 'CONFIRMED' }} 
        onOpenDetail={() => { setModalType('detail'); setIsOpen(true); }}
        onOpenPayment={() => { setModalType('payment'); setIsOpen(true); }}
        onOpenCancel={() => {}}
        onOpenBarcode={() => {}}
      />

      {modalType === 'detail' && (
        <Modal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title="예매 상세 내역"
          confirmText="예매 취소하기"
          cancelText="닫기"
          onConfirm={() => setIsOpen(false)}
          onCancel={() => setIsOpen(false)}
          className="!max-w-[400px] sm:!max-w-[450px]"
        >
          <div className="flex flex-col gap-4 mt-2 w-full max-h-[60vh] overflow-y-auto">
            <BookingDetailCard bookingDetail={bookingDetail} />
          </div>
        </Modal>
      )}

      {modalType === 'payment' && (
        <Modal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title="무통장 입금 정보"
          showCancelButton={false}
          confirmText="닫기"
          onConfirm={() => setIsOpen(false)}
        >
          <Box variant="outlined" className="p-0 sm:p-0 mb-2 overflow-hidden bg-white mt-4 w-full">
            <Table
              columns={[
                { key: 'label', header: '', align: 'left', width: '70px', render: (row) => row.label },
                { key: 'value', header: '', align: 'right', render: (row) => row.value }
              ]}
              data={[
                { label: <Text typography="t6" color="secondary" fontWeight="medium" className="whitespace-nowrap">결제 수단</Text>, value: <Text typography="t6" color="primary" fontWeight="bold">{paymentDetail.paymentMethodType}</Text> },
                { label: <Text typography="t6" color="secondary" fontWeight="medium" className="whitespace-nowrap">입금 은행</Text>, value: <Text typography="t6" color="primary" fontWeight="bold">KB국민은행</Text> },
                { label: <Text typography="t6" color="secondary" fontWeight="medium" className="whitespace-nowrap">계좌번호</Text>, value: <Text typography="t6" color="primary" fontWeight="bold">123456-00-123456</Text> },
                { label: <Text typography="t6" color="secondary" fontWeight="medium" className="whitespace-nowrap">결제 금액</Text>, value: <Text typography="t5" color="blue" fontWeight="extrabold">{paymentDetail.orderAmount.toLocaleString()}원</Text> }
              ]}
              className="[&_thead]:hidden [&_tbody_tr]:!bg-transparent hover:[&_tbody_tr]:!bg-gray-50/50 [&_td]:!py-3.5 [&_td]:!px-4 [&_td]:!border-b-0 [&_tr:not(:last-child)_td]:border-b [&_tr:not(:last-child)_td]:border-gray-100"
            />
            <div className="bg-red-50/80 p-4 flex flex-col items-center justify-center gap-1.5 border-t border-red-100">
              <Text typography="t7" color="red" fontWeight="medium">입금 기한</Text>
              <Text typography="t6" color="red" fontWeight="extrabold">
                {new Date(paymentDetail.depositDeadline).toLocaleString('ko-KR', {
                  year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                })}
              </Text>
            </div>
          </Box>
        </Modal>
      )}
    </div>
  );
};

export const InteractiveModals: Story = {
  render: () => <WithModalWrapper />,
};
