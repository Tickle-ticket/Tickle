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
      message: 'success',
      data: {
        items: mockReservations,
        totalElements: mockReservations.length,
      }
    });
  }),

  // 예매 상세 조회
  http.get(`${API_BASE_URL}/reservations/:reservationId`, async ({ params }) => {
    await delay(300);
    const { reservationId } = params;
    const reservation = mockReservations.find((r) => String(r.bookingId) === reservationId);

    if (!reservation) {
      return HttpResponse.json({
        status: 404,
        message: '예매 내역을 찾을 수 없습니다.',
        data: null,
      }, { status: 404 });
    }

    return HttpResponse.json({
      status: 200,
      message: 'success',
      data: reservation,
    });
  }),

  // 예매 취소
  http.delete(`${API_BASE_URL}/reservations/:reservationId`, async ({ params }) => {
    await delay(500);
    const { reservationId } = params;
    mockReservations = mockReservations.filter((r) => String(r.bookingId) !== reservationId);

    return HttpResponse.json({
      status: 200,
      message: 'success',
      data: null,
    });
  }),
];
