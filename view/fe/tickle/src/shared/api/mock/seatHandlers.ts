import { ws, http, HttpResponse } from 'msw';

const seatSocket = ws.link('wss://api.tickle.com/topic/seats/*');

const SEAT_GRADE_MAP: Record<string, string> = {
  // VIP석
  'A1': 'VIP', 'A2': 'VIP', 'A3': 'VIP', 'A4': 'VIP', 'A5': 'VIP', 'A6': 'VIP', 'A7': 'VIP', 'A8': 'VIP', 'A9': 'VIP', 'A10': 'VIP',
  'B1': 'VIP', 'B2': 'VIP', 'B3': 'VIP', 'B4': 'VIP', 'B5': 'VIP', 'B6': 'VIP', 'B7': 'VIP', 'B8': 'VIP', 'B9': 'VIP', 'B10': 'VIP',
  'C1': 'VIP', 'C2': 'VIP', 'C3': 'VIP', 'C4': 'VIP', 'C5': 'VIP', 'C6': 'VIP', 'C7': 'VIP', 'C8': 'VIP', 'C9': 'VIP', 'C10': 'VIP',

  // R석
  'G4': 'R', 'G5': 'R', 'G6': 'R', 'G7': 'R', 'G8': 'R', 'G9': 'R', 'G10': 'R', 'G11': 'R',
  'H4': 'R', 'H5': 'R', 'H6': 'R', 'H7': 'R', 'H8': 'R', 'H9': 'R', 'H10': 'R', 'H11': 'R',
  'I4': 'R', 'I5': 'R', 'I6': 'R', 'I7': 'R', 'I8': 'R', 'I9': 'R', 'I10': 'R', 'I11': 'R',
  'J4': 'R', 'J5': 'R', 'J6': 'R', 'J7': 'R', 'J8': 'R', 'J9': 'R', 'J10': 'R', 'J11': 'R',
  'K5': 'R', 'K6': 'R', 'K7': 'R', 'K8': 'R', 'K9': 'R', 'K10': 'R', 'K11': 'R', 'K12': 'R',

  // S석
  'G1': 'S', 'G2': 'S', 'G3': 'S', 'G12': 'S', 'G13': 'S', 'G14': 'S',
  'H1': 'S', 'H2': 'S', 'H3': 'S', 'H12': 'S', 'H13': 'S', 'H14': 'S',
  'I1': 'S', 'I2': 'S', 'I3': 'S', 'I12': 'S', 'I13': 'S', 'I14': 'S',
  'J1': 'S', 'J2': 'S', 'J3': 'S', 'J12': 'S', 'J13': 'S', 'J14': 'S',
  'K1': 'S', 'K2': 'S', 'K3': 'S', 'K4': 'S', 'K13': 'S', 'K14': 'S', 'K15': 'S', 'K16': 'S',

  // A석
  'L1': 'A', 'L2': 'A', 'L3': 'A', 'L4': 'A', 'L5': 'A', 'L6': 'A', 'L7': 'A', 'L8': 'A', 'L9': 'A', 'L10': 'A', 'L11': 'A', 'L12': 'A', 'L13': 'A', 'L14': 'A', 'L15': 'A', 'L16': 'A',
  'M1': 'A', 'M2': 'A', 'M3': 'A', 'M4': 'A', 'M5': 'A', 'M6': 'A', 'M7': 'A', 'M8': 'A', 'M9': 'A', 'M10': 'A', 'M11': 'A', 'M12': 'A', 'M13': 'A', 'M14': 'A', 'M15': 'A', 'M16': 'A',
  'N1': 'A', 'N2': 'A', 'N3': 'A', 'N4': 'A', 'N5': 'A', 'N6': 'A', 'N7': 'A', 'N8': 'A', 'N9': 'A', 'N10': 'A', 'N11': 'A', 'N12': 'A', 'N13': 'A', 'N14': 'A', 'N15': 'A', 'N16': 'A',
  'O1': 'A', 'O2': 'A', 'O3': 'A', 'O4': 'A', 'O5': 'A', 'O6': 'A', 'O7': 'A', 'O8': 'A', 'O9': 'A', 'O10': 'A', 'O11': 'A', 'O12': 'A', 'O13': 'A', 'O14': 'A', 'O15': 'A', 'O16': 'A',
  'P1': 'A', 'P2': 'A', 'P3': 'A', 'P4': 'A', 'P5': 'A', 'P6': 'A', 'P7': 'A', 'P8': 'A', 'P9': 'A', 'P10': 'A', 'P11': 'A', 'P12': 'A', 'P13': 'A', 'P14': 'A', 'P15': 'A', 'P16': 'A',
};

// 회차별 좌석 상태를 저장하는 메모리 저장소
export const scheduleMockSeats: Record<string, Record<string, { priceGrade: string; isAvailable: boolean }>> = {};

export const getMockSeatsForSchedule = (scheduleId: string) => {
  if (!scheduleMockSeats[scheduleId]) {
    const mockSeats: Record<string, { priceGrade: string; isAvailable: boolean }> = {};
    // 회차마다 다른 예약 확률을 적용하여 다르게 보이도록 함 (20% ~ 60% 랜덤)
    const bookedRatio = 0.2 + Math.random() * 0.4;
    
    Object.entries(SEAT_GRADE_MAP).forEach(([seatId, priceGrade]) => {
      mockSeats[seatId] = { priceGrade, isAvailable: Math.random() > bookedRatio };
    });
    scheduleMockSeats[scheduleId] = mockSeats;
  }
  return scheduleMockSeats[scheduleId];
};

const PRICE_BY_GRADE: Record<string, number> = { VIP: 170000, R: 140000, S: 110000, A: 80000 };

/**
 * 회차 좌석 상태를 서버 응답 형태(SeatMapResponse)로 변환합니다.
 *
 * 예매(BOOKING)와 취소표 대기(WAITLIST)가 같은 좌석 데이터를 쓰되,
 * 대기 모드에서는 매진 좌석에 대기 인원·신청 가능 여부를 덧붙인다.
 *
 * @param scheduleId 회차 식별자
 * @param mode       예매 화면인지 대기 신청 화면인지
 */
const buildSeatMap = (scheduleId: string, mode: 'BOOKING' | 'WAITLIST') => {
  const currentMockSeats = getMockSeatsForSchedule(scheduleId);
  const sectionsRecord: Record<string, unknown[]> = {};

  Object.entries(currentMockSeats).forEach(([seatLabel, info], index) => {
    const rowLabel = seatLabel.match(/^[a-zA-Z]+/)?.[0] || 'A';
    const seatNumber = seatLabel.replace(/^[a-zA-Z]+/, '');

    if (!sectionsRecord[info.priceGrade]) {
      sectionsRecord[info.priceGrade] = [];
    }

    sectionsRecord[info.priceGrade].push({
      sessionSeatId: 1000 + index,
      eventSeatId: 2000 + index,
      rowLabel,
      seatNumber,
      seatLabel,
      // SeatItemResponseSchema가 허용하는 값만 쓸 수 있다. 'RESERVED'는 목록에
      // 없어 스키마 검증에서 좌석 응답 전체가 거부된다.
      saleStatus: info.isAvailable ? 'AVAILABLE' : 'CONFIRMED',
      priceGrade: info.priceGrade,
      price: PRICE_BY_GRADE[info.priceGrade] ?? 80000,
      // 대기 신청은 이미 팔린 좌석에만 가능하다.
      ...(mode === 'WAITLIST' && {
        waitable: !info.isAvailable,
        waitingCount: info.isAvailable ? 0 : (index % 13),
      }),
    });
  });

  const sections = Object.entries(sectionsRecord).map(([priceGrade, seats], idx) => ({
    sectionId: idx + 1,
    sectionName: `${priceGrade}석`,
    displayOrder: idx + 1,
    seats,
  }));

  // SeatMapPanel이 venueId로 좌석 도면 컴포넌트(Stage_4001)를 고르므로
  // 이 값이 없으면 "공연장 정보를 불러오는 중"에서 멈춘다.
  return { venueId: 4001, sections };
};

export const seatHandlers = [
  seatSocket.addEventListener('connection', ({ client }) => {
    let interval: NodeJS.Timeout;

    // In MSW ws connection event, request is not available directly.
    // We will just use a global mock schedule for simulation.
    const scheduleId = 'mock-schedule';
    
    const currentMockSeats = getMockSeatsForSchedule(scheduleId);

    // 1초마다 랜덤하게 누군가 예매하거나 취소하는 상황 시뮬레이션
    interval = setInterval(() => {
      const seatIds = Object.keys(currentMockSeats);
      const randomSeat = seatIds[Math.floor(Math.random() * seatIds.length)];
      
      // 상태 반전 (토글)
      currentMockSeats[randomSeat].isAvailable = !currentMockSeats[randomSeat].isAvailable;
      
      client.send(JSON.stringify({ 
        seatLabel: randomSeat, 
        saleStatus: currentMockSeats[randomSeat].isAvailable ? 'AVAILABLE' : 'RESERVED'
      }));
    }, 1000);

    // 클라이언트로부터 메시지를 수신했을 때의 더미 핸들러 (현재 FE는 안 보냄)
    client.addEventListener('message', (event) => {
      console.log('Received message from client:', event.data);
    });

    // 연결 종료 시 인터벌 정리
    client.addEventListener('close', () => {
      if (interval) clearInterval(interval);
    });
  }),
  
  // 최초 좌석 정보 전체 조회 API
  http.get('*/api/v1/events/:eventId/schedules/:scheduleId/seats', async ({ params }) => {
    return HttpResponse.json({
      status: 200,
      code: 'OK',
      message: 'success',
      data: buildSeatMap(String(params.scheduleId), 'BOOKING'),
    });
  }),

  // 좌석 실시간 변동 스트림(SSE).
  // useSeatData가 초기 조회와 함께 이 스트림을 구독한다. 없으면 404가 나면서
  // 브라우저가 무한 재연결을 시도한다.
  http.get('*/api/v1/events/:eventId/schedules/:scheduleId/seats/stream', ({ params }) => {
    const seats = getMockSeatsForSchedule(String(params.scheduleId));
    const seatLabels = Object.keys(seats);

    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        let closed = false;

        // 2초마다 무작위 좌석 하나의 판매 상태를 뒤집어 실시간 변동을 흉내낸다.
        const timer = setInterval(() => {
          if (closed) return;

          const label = seatLabels[Math.floor(Math.random() * seatLabels.length)];
          const seat = seats[label];
          seat.isAvailable = !seat.isAvailable;

          const payload = {
            sessionSeatIds: [1000 + seatLabels.indexOf(label)],
            saleStatus: seat.isAvailable ? 'AVAILABLE' : 'CONFIRMED',
          };

          try {
            controller.enqueue(encoder.encode('event: seat-update\n'));
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
          } catch {
            closed = true;
            clearInterval(timer);
          }
        }, 2000);
      },
    });

    return new HttpResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  }),

  // 취소표 대기 신청용 좌석 조회.
  // 예매 화면과 응답 형태는 같지만 매진 좌석에 대기 인원(waitingCount)과
  // 신청 가능 여부(waitable)가 실려 온다. 이 값이 없으면 대기 신청 UI가
  // 아무 좌석도 선택할 수 없는 상태로 보인다.
  http.get('*/api/v1/events/:eventId/schedules/:scheduleId/cancellation-wait/seats', async ({ params }) => {
    return HttpResponse.json({
      status: 200,
      code: 'OK',
      message: 'success',
      data: buildSeatMap(String(params.scheduleId), 'WAITLIST'),
    });
  }),

  // 대기 신청 화면의 좌석 변동 스트림.
  // 예매 스트림과 달리 백엔드가 기본 'message' 이벤트로 보내고, 대기 인원도 함께 싣는다.
  http.get('*/api/v1/events/:eventId/schedules/:scheduleId/cancellation-wait/seats/stream', ({ params }) => {
    const seats = getMockSeatsForSchedule(String(params.scheduleId));
    const seatLabels = Object.keys(seats);

    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        let closed = false;

        const timer = setInterval(() => {
          if (closed) return;

          const index = Math.floor(Math.random() * seatLabels.length);
          const seat = seats[seatLabels[index]];

          const payload = {
            sessionSeatId: 1000 + index,
            saleStatus: seat.isAvailable ? 'AVAILABLE' : 'CONFIRMED',
            waitingCount: seat.isAvailable ? 0 : Math.floor(Math.random() * 15),
          };

          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
          } catch {
            closed = true;
            clearInterval(timer);
          }
        }, 2000);
      },
    });

    return new HttpResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  }),

  // 좌석 선점 요청
  http.post('*/api/v1/events/:eventId/schedules/:scheduleId/seats/hold', async () => {
    return HttpResponse.json({
      status: 200,
      code: 'OK',
      message: 'success',
      data: {
        heldSeats: []
      }
    });
  }),

  // 좌석 선점 해제
  http.delete('*/api/v1/events/:eventId/schedules/:scheduleId/seats/hold', async () => {
    return HttpResponse.json({
      status: 200,
      code: 'OK',
      message: 'success',
      data: null
    });
  }),
];
