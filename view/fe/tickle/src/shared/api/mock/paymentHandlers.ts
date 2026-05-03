import { http, HttpResponse } from 'msw';

const API_BASE_URL = '/api/v1';

export const paymentHandlers = [
  // 1. 결제 수단 선택 (무통장 입금)
  http.post(`${API_BASE_URL}/events/:eventId/schedules/:scheduleId/payments/select-method`, async ({ request }) => {
    const requestBody = (await request.json()) as any;
    
    if (requestBody.paymentMethod !== 'BANK_TRANSFER') {
      return HttpResponse.json({ status: 400, message: '지원하지 않는 결제수단입니다.' }, { status: 400 });
    }

    // 명세서 기반 예제 데이터
    return HttpResponse.json({
      status: 200,
      code: 'OK',
      message: '성공',
      data: {
        paymentMethod: 'BANK_TRANSFER',
        bankTransfer: {
          paymentId: 1,
          bookingId: requestBody.bookingId,
          bookingNo: 'BK-17484F8CF0074271',
          paymentStatus: 'PENDING',
          bookingStatus: 'PENDING_PAYMENT',
          orderAmount: 186300,
          currencyCode: 'KRW',
          bankAccount: '110-482-129438',
          accountHolder: 'tickle',
          depositDeadline: '2026-05-03T14:59:59Z', // KST 변환 시 자정
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
        kakaoPay: null,
      },
    });
  }),

  // 2. 결제 상태 재조회
  http.get(`${API_BASE_URL}/payments/:paymentId`, () => {
    return HttpResponse.json({
      status: 200,
      code: 'OK',
      message: '성공',
      data: {
        paymentId: 1,
        bookingId: 5001,
        bookingNo: 'BK-17484F8CF0074271',
        paymentMethodType: 'BANK_TRANSFER',
        paymentStatus: 'PENDING',
        bookingStatus: 'PENDING_PAYMENT',
        orderAmount: 186300,
        currencyCode: 'KRW',
        depositDeadline: '2026-05-03T14:59:59Z',
        bankAccount: '110-482-129438',
        accountHolder: 'tickle',
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
