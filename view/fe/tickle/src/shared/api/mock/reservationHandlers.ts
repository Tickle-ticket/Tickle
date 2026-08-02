import { http, HttpResponse, delay } from 'msw';

const API_BASE_URL = '*/api/v1';

let mockReservations = [
  {
    bookingId: 1,
    bookingNo: 'BK-123456',
    eventId: 1,
    eventName: '맘마미아',
    venueName: 'LG아트센터 서울',
    eventStartAt: '2025-09-15T19:30:00Z',
    totalPaymentAmount: 340000,
    status: 'COMPLETED',
    seats: [
      { sessionSeatId: 101, seatLabel: 'VIP석 1층 B구역 12열 14번' },
      { sessionSeatId: 102, seatLabel: 'VIP석 1층 B구역 12열 15번' }
    ],
    createdAt: '2025-03-20T10:00:00Z',
    thumbnailUrl: 'https://picsum.photos/seed/poster45/800/1200',
  },
  {
    bookingId: 2,
    bookingNo: 'BK-654321',
    eventId: 2,
    eventName: '오페라의 유령',
    venueName: '샤롯데씨어터',
    eventStartAt: '2025-08-20T14:00:00Z',
    totalPaymentAmount: 140000,
    status: 'COMPLETED',
    seats: [
      { sessionSeatId: 201, seatLabel: 'R석 2층 A구역 5열 2번' }
    ],
    createdAt: '2025-04-01T15:30:00Z',
    thumbnailUrl: 'https://picsum.photos/seed/poster46/800/1200',
  }
];

export const reservationHandlers = [
  // 예매 내역 목록 조회
  http.get(`${API_BASE_URL}/reservations`, async () => {
    await delay(300);
    return HttpResponse.json({
      status: 200,
      code: 'OK',
      message: 'success',
      data: {
        items: mockReservations,
        totalElements: mockReservations.length,
      }
    });
  }),

  // 1인당 보유 수량 조회
  //
  // 회차를 고르면 useSeatStep이 이 값을 물어보고, 그것으로 선택 가능한 좌석 수를
  // 정한다. 핸들러가 없으면 MSW가 실제 네트워크로 흘려보내(onUnhandledRequest:
  // 'bypass') 404가 나고, 회차 선택이 실패한 것처럼 보인다.
  //
  // ':reservationId' 핸들러보다 먼저 와야 한다. 뒤에 두면 'ownership-count'를
  // 예매 번호로 보고 상세 조회가 가로챈다.
  http.get(`${API_BASE_URL}/reservations/ownership-count`, async ({ request }) => {
    await delay(150);
    const url = new URL(request.url);

    return HttpResponse.json({
      status: 200,
      code: 'OK',
      message: 'success',
      data: {
        eventId: Number(url.searchParams.get('eventId')) || 0,
        sessionId: Number(url.searchParams.get('scheduleId')) || 0,
        // 아직 아무것도 예매하지 않은 상태로 둔다. 값이 있으면 선택 가능
        // 수량이 줄어 로컬에서 좌석을 여러 장 골라 볼 수 없다.
        ownedTicketCount: 0,
        cancellationWaitSeatCount: 0,
        totalCount: 0,
      },
    });
  }),

  // 예매 상세 조회
  // 예매 상세 조회
  //
  // 예매 초안(preorder)이 만드는 bookingId는 목록 데이터에 없다. 그때 404를
  // 주면 결제 완료 화면이 예매를 못 찾는다. 목록에 없으면 그 번호로 하나
  // 만들어 돌려준다.
  http.get(`${API_BASE_URL}/reservations/:reservationId`, async ({ params }) => {
    await delay(300);
    const bookingId = Number(params.reservationId);
    const known = mockReservations.find((r) => r.bookingId === bookingId);

    const ticketCount = known?.seats.length ?? 2;
    const ticketPriceAmount = 90000;
    const serviceFeeAmount = Math.floor(ticketPriceAmount * 0.05);

    return HttpResponse.json({
      status: 200,
      code: 'OK',
      message: 'success',
      data: {
        bookingId,
        paymentId: null,
        bookingNo: known?.bookingNo ?? `BK-${bookingId}`,
        bookingStatus: 'CONFIRMED',
        eventTitle: known?.eventName ?? '오페라의 유령',
        sessionNo: 1,
        sessionStartAt: known?.eventStartAt ?? '2026-09-15T19:30:00Z',
        venueName: known?.venueName ?? '샤롯데씨어터',
        ticketCount,
        totalPaymentAmount:
          known?.totalPaymentAmount ?? (ticketPriceAmount + serviceFeeAmount) * ticketCount,
        createdAt: known?.createdAt ?? new Date().toISOString(),
        tickets: Array.from({ length: ticketCount }, (_, index) => ({
          ticketId: bookingId * 100 + index,
          ticketNo: `TK-${bookingId}-${index + 1}`,
          ticketStatus: 'ISSUED',
          sectionName: 'VIP석',
          rowLabel: 'A',
          seatNumber: String(index + 1),
          seatLabel: `A-${index + 1}`,
          ticketPriceAmount,
          serviceFeeAmount,
          finalPriceAmount: ticketPriceAmount + serviceFeeAmount,
        })),
      },
    });
  }),

  // 예매 취소
  http.delete(`${API_BASE_URL}/reservations/:reservationId`, async ({ params }) => {
    await delay(500);
    const { reservationId } = params;
    mockReservations = mockReservations.filter((r) => String(r.bookingId) !== reservationId);

    return HttpResponse.json({
      status: 200,
      code: 'OK',
      message: 'success',
      data: null,
    });
  }),
];
