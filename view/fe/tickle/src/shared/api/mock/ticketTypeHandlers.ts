import { http, HttpResponse, delay } from 'msw';

export const ticketTypeHandlers = [
  // 권종(인원 유형) 목록 조회
  http.get('/api/v1/ticket-types', async () => {
    await delay(300);
    return HttpResponse.json({
      data: [
        { id: 'adult', label: '성인', discount: 0 },
        { id: 'child', label: '어린이', discount: 30 },
        { id: 'veteran', label: '국가유공자', discount: 50 },
        { id: 'disabled', label: '장애인', discount: 50 },
      ]
    });
  }),
];
