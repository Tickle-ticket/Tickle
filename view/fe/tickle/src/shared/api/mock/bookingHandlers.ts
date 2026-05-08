import { http, HttpResponse } from 'msw';

const API_BASE_URL = '*/api/v1';

export const bookingHandlers = [
  // 1. 예약 옵션 조회
  http.post(`${API_BASE_URL}/bookings/options`, async ({ request }) => {
    const requestBody = (await request.json()) as any;
    
    // 명세서 예제 응답 반환
    return HttpResponse.json({
      status: 200,
      code: 'OK',
      message: '성공',
      data: {
        eventId: requestBody.eventId || 3001,
        sessionId: requestBody.sessionId || 3001,
        userId: requestBody.userId || 1001,
        currencyCode: 'KRW',
        totalTicketPriceAmount: 180000,
        seats: [
          {
            sessionSeatId: 3401,
            seatLabel: 'A-1',
            rowLabel: 'A',
            seatNumber: '1',
            eventPricePolicyId: 11,
            grade: 'VIP',
            priceAmount: 90000,
            discountInfo: [
              {
                discountName: '조기예매',
                discountRate: 0.1,
                ticketPriceAmount: 81000,
              },
              {
                discountName: '청소년할인',
                discountRate: 0.2,
                ticketPriceAmount: 72000,
              }
            ],
          },
          {
            sessionSeatId: 3402,
            seatLabel: 'A-2',
            rowLabel: 'A',
            seatNumber: '2',
            eventPricePolicyId: 11,
            grade: 'VIP',
            priceAmount: 90000,
            discountInfo: [
              {
                discountName: '조기예매',
                discountRate: 0.1,
                ticketPriceAmount: 81000,
              },
            ],
          }
        ],
      },
    });
  }),

  // 2. 예매 초안 생성
  http.post(`${API_BASE_URL}/bookings/preorder`, async ({ request }) => {
    const requestBody = (await request.json()) as any;
    const optionSelections = requestBody.optionSelections || [];
    
    // 선택된 옵션 기반으로 응답 동적 생성 (기본 90000, 할인 81000)
    const seats = optionSelections.map((opt: any, index: number) => {
      const isDiscount = opt.discountName !== null;
      const ticketPriceAmount = isDiscount ? 81000 : 90000;
      const serviceFeeAmount = ticketPriceAmount * 0.05;

      return {
        sessionSeatId: opt.sessionSeatId,
        seatLabel: `A-${index + 1}`,
        discountName: opt.discountName,
        ticketPriceAmount,
        serviceFeeAmount,
        finalPriceAmount: ticketPriceAmount + serviceFeeAmount,
      };
    });

    const totalPaymentAmount = seats.reduce((acc: number, seat: any) => acc + seat.finalPriceAmount, 0);

    return HttpResponse.json({
      status: 200,
      code: 'OK',
      message: '성공',
      data: {
        bookingId: 5001,
        bookingNo: 'BK-17484F8CF0074271',
        bookingStatus: 'DRAFT',
        currencyCode: 'KRW',
        totalPaymentAmount,
        holdExpiresAt: '2026-05-02T10:15:00Z', // 임시 만료 시간
        seats,
      },
    });
  }),
];
