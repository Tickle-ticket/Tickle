import { http, HttpResponse } from 'msw';
import type {
  PaymentMethodSelectionRequest,
  BankTransferPrepareRequest,
} from '@/src/shared/api/types/payment.types';

const API_BASE_URL = '*/api/v1';

export const paymentHandlers = [
  // 1. 결제 수단 선택
  http.post(`${API_BASE_URL}/events/:eventId/schedules/:scheduleId/payments/select-method`, async ({ request }) => {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const requestBody = (await request.json()) as PaymentMethodSelectionRequest;
    
    if (!userId) {
      return HttpResponse.json({ status: 400, code: 'INVALID_REQUEST', message: 'userId가 필요합니다.' }, { status: 400 });
    }

    const isKakao = requestBody.paymentMethod === 'KAKAOPAY';

    return HttpResponse.json({
      status: 200,
      code: 'OK',
      message: '성공',
      data: {
        bookingId: requestBody.bookingId,
        paymentMethod: requestBody.paymentMethod,
        nextAction: isKakao ? 'PREPARE_KAKAOPAY' : 'PREPARE_BANK_TRANSFER',
      },
    });
  }),

  // 2. 무통장 입금 확정
  http.post(`${API_BASE_URL}/events/:eventId/schedules/:scheduleId/payments/bank-transfer`, async ({ request }) => {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const requestBody = (await request.json()) as BankTransferPrepareRequest;

    if (!userId) {
      return HttpResponse.json({ status: 400, code: 'INVALID_REQUEST', message: 'userId가 필요합니다.' }, { status: 400 });
    }

    return HttpResponse.json({
      status: 200,
      code: 'OK',
      message: '성공',
      data: {
        paymentId: 1,
        bookingId: requestBody.bookingId,
        bookingNo: 'BK-17484F8CF0074271',
        paymentStatus: 'PENDING',
        bookingStatus: 'PENDING_PAYMENT',
        orderAmount: 186300,
        currencyCode: 'KRW',
        bankAccount: '110-482-129438',
        accountHolder: 'tickle',
        depositDeadline: '2026-05-03T14:59:59Z',
        seats: [
          {
            sessionSeatId: 3401,
            seatLabel: 'A-1',
            rowLabel: 'A',
            seatNumber: '1',
            ticketPriceAmount: 90000,
            serviceFeeAmount: 4500,
            finalPriceAmount: 94500,
          },
          {
            sessionSeatId: 3402,
            seatLabel: 'A-2',
            rowLabel: 'A',
            seatNumber: '2',
            ticketPriceAmount: 81000,
            serviceFeeAmount: 4050,
            finalPriceAmount: 85050,
          }
        ],
      },
    });
  }),

  // 3. 카카오페이 준비
  http.post(`${API_BASE_URL}/events/:eventId/schedules/:scheduleId/payments/kakaopay/ready`, async ({ request }) => {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    
    if (!userId) {
      return HttpResponse.json({ status: 400, code: 'INVALID_REQUEST', message: 'userId가 필요합니다.' }, { status: 400 });
    }

    return HttpResponse.json({
      status: 200,
      code: 'OK',
      message: '성공',
      data: {
        // 결제 상태 폴링이 이 값으로 조회하므로 아래 리다이렉트 주소와 같아야 한다.
        paymentId: 2,
        tid: 'T1234567890123456789',
        nextRedirectPcUrl: '/payment/success?paymentId=2&method=kakaopay',
        createdAt: new Date().toISOString(),
      },
    });
  }),

  http.get(`${API_BASE_URL}/payments/:paymentId`, ({ params }) => {
    const { paymentId } = params;
    const isKakao = String(paymentId) === '2';
    
    return HttpResponse.json({
      status: 200,
      code: 'OK',
      message: '성공',
      data: {
        paymentId: Number(paymentId) || 1,
        bookingId: 5001,
        bookingNo: 'BK-17484F8CF0074271',
        paymentMethodType: isKakao ? 'KAKAOPAY' : 'BANK_TRANSFER',
        paymentStatus: isKakao ? 'COMPLETED' : 'PENDING',
        bookingStatus: isKakao ? 'BOOKED' : 'PENDING_PAYMENT',
        orderAmount: 186300,
        currencyCode: 'KRW',
        depositDeadline: '2026-05-03T14:59:59Z',
        bankAccount: isKakao ? null : '110-482-129438',
        accountHolder: isKakao ? null : 'tickle',
        seats: [
          {
            sessionSeatId: 3401,
            seatLabel: 'A-1',
            rowLabel: 'A',
            seatNumber: '1',
            ticketPriceAmount: 90000,
            serviceFeeAmount: 4500,
            finalPriceAmount: 94500,
          },
          {
            sessionSeatId: 3402,
            seatLabel: 'A-2',
            rowLabel: 'A',
            seatNumber: '2',
            ticketPriceAmount: 81000,
            serviceFeeAmount: 4050,
            finalPriceAmount: 85050,
          }
        ],
      },
    });
  }),
];
