import { http, HttpResponse } from 'msw';
import { getMockSeatsForSchedule } from './seatHandlers';

const SEAT_PRICE_BY_GRADE: Record<string, number> = {
  VIP: 170000,
  R: 140000,
  S: 110000,
  A: 80000,
};

const buildWaitlistSections = (scheduleId: string) => {
  const currentMockSeats = getMockSeatsForSchedule(scheduleId);
  const sectionsRecord: Record<string, unknown[]> = {};

  Object.entries(currentMockSeats).forEach(([seatLabel, info], index) => {
    const rowLabel = seatLabel.match(/^[a-zA-Z]+/)?.[0] || 'A';
    const seatNumber = seatLabel.replace(/^[a-zA-Z]+/, '');

    if (!sectionsRecord[info.grade]) {
      sectionsRecord[info.grade] = [];
    }

    const isAvailable = info.isAvailable;
    sectionsRecord[info.grade].push({
      sessionSeatId: 1000 + index,
      eventSeatId: 2000 + index,
      rowLabel,
      seatNumber,
      seatLabel,
      saleStatus: isAvailable ? 'AVAILABLE' : 'HELD',
      price: SEAT_PRICE_BY_GRADE[info.grade] ?? 80000,
      waitable: !isAvailable,
      waitingCount: isAvailable ? 0 : Math.floor(Math.random() * 5),
    });
  });

  return Object.entries(sectionsRecord).map(([grade, seats], idx) => ({
    sectionId: idx + 1,
    sectionName: `${grade}석`,
    displayOrder: idx + 1,
    seats,
  }));
};

export const cancellationWaitHandlers = [
  // 예매 대기 좌석 정보 전체 조회
  http.get(
    '*/api/v1/events/:eventId/schedules/:scheduleId/cancellation-wait/seats',
    ({ params }) => {
      const { scheduleId } = params;
      return HttpResponse.json({
        status: 200,
        message: 'success',
        data: {
          venueId: 4001,
          sections: buildWaitlistSections(String(scheduleId)),
        },
      });
    }
  ),

  // 예매 대기 좌석 상태 실시간 업데이트 (SSE)
  http.get(
    '*/api/v1/events/:eventId/schedules/:scheduleId/cancellation-wait/seats/stream',
    ({ params }) => {
      const { scheduleId } = params;
      const currentMockSeats = getMockSeatsForSchedule(String(scheduleId));

      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          let isClosed = false;

          const send = (data: unknown) => {
            if (isClosed) return;
            try {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
            } catch (e) {
              console.error('Cancellation-wait SSE enqueue error', e);
            }
          };

          const interval = setInterval(() => {
            if (isClosed) return;
            const seatIds = Object.keys(currentMockSeats);
            if (seatIds.length === 0) return;
            const randomSeat = seatIds[Math.floor(Math.random() * seatIds.length)];
            currentMockSeats[randomSeat].isAvailable = !currentMockSeats[randomSeat].isAvailable;
            const isAvailable = currentMockSeats[randomSeat].isAvailable;
            send({
              seatLabel: randomSeat,
              saleStatus: isAvailable ? 'AVAILABLE' : 'HELD',
              waitable: !isAvailable,
              waitingCount: isAvailable ? 0 : Math.floor(Math.random() * 5),
            });
          }, 1500);

          return () => {
            isClosed = true;
            clearInterval(interval);
          };
        },
      });

      return new HttpResponse(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }
  ),

  // 예매 대기 후보 생성
  http.post(
    '*/api/v1/events/:eventId/schedules/:scheduleId/cancellation-wait/candidates',
    async ({ request }) => {
      const body = (await request.json().catch(() => ({}))) as {
        sessionSeatIds?: number[];
      };
      const sessionSeatIds = Array.isArray(body?.sessionSeatIds) ? body.sessionSeatIds : [];

      return HttpResponse.json({
        status: 200,
        message: 'success',
        data: {
          seats: sessionSeatIds.map((sessionSeatId, idx) => ({
            cancellationCandidateId: 9000 + idx,
            sessionSeatId,
            waitingRank: idx + 1,
            status: 'WAITING',
          })),
        },
      });
    }
  ),
];
