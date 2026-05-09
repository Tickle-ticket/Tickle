import React from 'react';
import { Text } from '@/src/shared/components/Text';
import { Badge } from '@/src/shared/components/Badge';
import { Box } from '@/src/shared/components/Box';
import { Table } from '@/src/shared/components/Table';
import type { ReservationDetail } from '@/src/shared/api/types/reservation.types';
import type { PaymentStatusResponse } from '@/src/shared/api/types/payment.types';

export interface BookingDetailCardProps {
  bookingDetail: ReservationDetail;
  paymentDetail?: PaymentStatusResponse;
}

export const BookingDetailCard = ({ bookingDetail, paymentDetail }: BookingDetailCardProps) => {
  return (
    <div className="flex flex-col gap-4 w-full">
      {/* 예매 요약 정보 */}
      <Box variant="outline" className="p-0 sm:p-0 mb-6 overflow-hidden bg-white">
        <div className="bg-gray-50/80 border-b border-gray-200 px-5 py-4 flex items-center justify-between">
          <Text typography="t5" fontWeight="bold" className="text-center text-gray-800 break-keep">{bookingDetail.eventTitle}</Text>
        </div>
        <div className="p-1">
          <Table
            columns={[
              { key: 'label', header: '', align: 'left', width: '70px', render: (row) => row.label },
              { key: 'value', header: '', align: 'right', render: (row) => row.value }
            ]}
            data={[
              { label: <Text typography="t6" color="secondary" fontWeight="medium" className="whitespace-nowrap">예매 번호</Text>, value: <Text typography="t6" color="primary" fontWeight="bold">{bookingDetail.bookingNo}</Text> },
              { label: <Text typography="t6" color="secondary" fontWeight="medium" className="whitespace-nowrap">예매 일시</Text>, value: <Text typography="t6" color="primary" fontWeight="bold">{new Date(bookingDetail.createdAt).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</Text> },
              { label: <Text typography="t6" color="secondary" fontWeight="medium" className="whitespace-nowrap">총 결제액</Text>, value: <Text typography="t5" color="blue" fontWeight="extrabold">{bookingDetail.totalPaymentAmount.toLocaleString()}원</Text> }
            ]}
            className="[&_thead]:hidden [&_tbody_tr]:!bg-transparent hover:[&_tbody_tr]:!bg-gray-50/50 [&_td]:!py-3 [&_td]:!px-2 [&_td]:!border-b-0 [&_tr:not(:last-child)_td]:border-b [&_tr:not(:last-child)_td]:border-gray-100"
          />
          {bookingDetail.bookingStatus === 'PENDING_PAYMENT' && paymentDetail?.depositDeadline && (
            <div className="bg-red-50/80 p-4 flex flex-col items-center justify-center gap-1.5 border-t border-red-100 mt-2">
              <Text typography="t7" color="red" fontWeight="medium">입금 기한</Text>
              <Text typography="t6" color="red" fontWeight="extrabold">
                {new Date(paymentDetail.depositDeadline).toLocaleString('ko-KR', {
                  year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                })}
              </Text>
            </div>
          )}
        </div>
      </Box>

      {/* 티켓 목록 (결제 완료시에만 노출) */}
      {bookingDetail.bookingStatus !== 'PENDING_PAYMENT' && (
        <div>
          <Text typography="t6" fontWeight="bold" className="block mb-5 text-left text-gray-900">티켓 목록 ({bookingDetail.tickets?.length || 0}매)</Text>
          <div className="flex flex-row flex-wrap justify-start gap-2">
            {bookingDetail.tickets?.map((ticket) => {
              return (
                <Badge key={ticket.ticketNo} color="blue" variant="outline" size="medium" className="font-extrabold px-4 py-2 bg-white shadow-sm">
                  {ticket.rowLabel ? `${ticket.rowLabel}열 ` : ''}{ticket.seatNumber ? `${ticket.seatNumber}번` : ticket.seatLabel}
                </Badge>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
