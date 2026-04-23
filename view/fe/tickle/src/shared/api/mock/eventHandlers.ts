import { http, HttpResponse, delay } from 'msw';
import { getMockSeatsForSchedule } from './seatHandlers';

const buildRemainingSeats = (date: string, time: string) => {
  const scheduleId = `${date}-${time}`;
  const mockSeats = getMockSeatsForSchedule(scheduleId);
  const counts: Record<string, number> = { VIP: 0, R: 0, S: 0, A: 0 };
  Object.values(mockSeats).forEach(seat => {
    if (seat.isAvailable && counts[seat.grade] !== undefined) {
      counts[seat.grade]++;
    }
  });
  return Object.entries(counts).map(([grade, count]) => ({ grade, count }));
};

export const eventHandlers = [
  // 신규 API 명세에 맞춘 공연 상세 조회
  http.get('/api/v1/events/:eventId', async ({ params }) => {
    // 실제 서버 통신처럼 약간의 지연 시간 추가 (Skeleton 확인용)
    await delay(1000);

    return HttpResponse.json({
      status: 200,
      message: 'success',
      data: {
        eventId: params.eventId,
        title: '오페라의 유령',
        subTitle: 'The Phantom of the Opera',
        imageUrl: 'https://i.namu.wiki/i/u4Jy5i1HH21xCnVvPY0FXyC_jYRlt9rorKH95IMVNFdO5ZiFsd6J8JPuPK-JgRUb2Ngu6M-r6vudsw27aZ8yJJeJRz3SDXYHuM326_zq3LevCttDTg8dujFCCFUE4TMUzD2Waez43-6e2j-DZrf-NA.webp',
        startDate: '2024.07.26',
        endDate: '2024.11.16',
        venue: '샤롯데씨어터',
        venueAddress: '서울특별시 용산구 이태원로 294',
        viewingAge: '만 13세 이상 관람가',
        runningTime: '총 러닝타임 약 150분 (인터미션 15분 포함)',
        ticketNotice: '주차 및 발렛파킹 불가 (대중교통 이용 권장)\n공연 시작 후 입장 제한',
        zonePrices: [
          { grade: 'VIP', price: 170000 },
          { grade: 'R', price: 140000 },
          { grade: 'S', price: 110000 },
          { grade: 'A', price: 80000 },
        ],
        schedules: [
          { 
            date: '2026.04.23', 
            times: [
              { time: '14:00', remainingSeats: buildRemainingSeats('2026.04.23', '14:00') },
              { time: '19:30', remainingSeats: buildRemainingSeats('2026.04.23', '19:30') }
            ]
          },
          { 
            date: '2026.04.24', 
            times: [
              { time: '19:30', remainingSeats: buildRemainingSeats('2026.04.24', '19:30') }
            ]
          },
          { 
            date: '2026.04.25', 
            times: [
              { time: '14:00', remainingSeats: buildRemainingSeats('2026.04.25', '14:00') },
              { time: '18:00', remainingSeats: buildRemainingSeats('2026.04.25', '18:00') }
            ]
          },
          { 
            date: '2026.04.26', 
            times: [
              { time: '14:00', remainingSeats: buildRemainingSeats('2026.04.26', '14:00') }
            ]
          },
          { 
            date: '2026.04.28', 
            times: [
              { time: '19:30', remainingSeats: buildRemainingSeats('2026.04.28', '19:30') }
            ]
          },
          { 
            date: '2026.04.29', 
            times: [
              { time: '14:00', remainingSeats: buildRemainingSeats('2026.04.29', '14:00') },
              { time: '19:30', remainingSeats: buildRemainingSeats('2026.04.29', '19:30') }
            ]
          }
        ],
        refundPolicy: '관람일 1일 전 17시까지 취소 가능',
        detailImageUrl: 'https://tkfile.yes24.com/Upload2/Board/202310/20231018/45927_18.jpg'
      },
    });
  }),
];
