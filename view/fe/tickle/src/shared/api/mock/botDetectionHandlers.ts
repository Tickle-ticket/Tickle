import { http, HttpResponse } from 'msw';

const API_BASE_URL = '*/api/v1/bot-detection';

export const botDetectionHandlers = [
  // 봇 판정 결과 스트림(SSE)
  //
  // 서버는 재검증이 필요할 때만 captcha 이벤트를 보낸다. 로컬에서는 아무것도
  // 보내지 않아 예매가 그대로 진행되게 두되, 연결 자체는 열어 둔다. 핸들러가
  // 없으면 404가 나고 화면이 "연결 실패"로 판단한다.
  http.get(`${API_BASE_URL}/stream`, () => {
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        // 주석 프레임 하나로 연결을 확정시킨다. 프록시가 빈 응답을 끊는 것도 막는다.
        controller.enqueue(encoder.encode(': connected\n\n'));
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

  // CAPTCHA 검증 결과 보고
  http.post(`${API_BASE_URL}/captcha/verify`, async () => {
    return HttpResponse.json({
      status: 200,
      code: 'OK',
      message: 'success',
      data: null,
    });
  }),

  // WebDriver 탐지 결과 등록(BotDetector)
  //
  // 서버 간 통신 경로라 X-Internal-Secret을 요구한다. 로컬에서는 값을 검사하지
  // 않는다 — 헤더가 붙는지는 실제 서버에서만 확인할 수 있고, mock이 막으면
  // 차단 화면 확인이 오히려 어려워진다.
  http.post('*/internal/v1/blacklist', async () => {
    return HttpResponse.json(
      {
        status: 201,
        code: 'CREATED',
        message: 'success',
        data: null,
      },
      { status: 201 },
    );
  }),
];
