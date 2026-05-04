import { http, HttpResponse, delay } from 'msw';
import { Schema } from 'effect';
import { TrialJSONSchema } from '../../utils/schema';
import type { TrialJSON } from '../../utils/schema';

export const trialHandlers = [
  http.post('*/api/v1/trials', async ({ request }) => {
    await delay(200);

    const rawTrial = await request.json();
    
    let trial: TrialJSON;
    try {
      // 프론트엔드가 보낸 데이터가 API 스펙(스키마)과 일치하는지 엄격히 검사
      trial = Schema.decodeUnknownSync(TrialJSONSchema)(rawTrial);
    } catch (error) {
      console.error('%c[MSW] Trial 데이터 검증 실패:', 'color: red;', error);
      return HttpResponse.json({
        status: 400,
        message: 'Invalid Trial JSON payload',
        data: null
      }, { status: 400 });
    }

    console.log(
      `%c[MSW] Trial #${trial.trialId} received & validated`,
      'color: #10b981; font-weight: bold;',
    );
    console.log(`  userId: ${trial.userId}`);
    console.log(`  sessionId: ${trial.sessionId}`);
    console.log(`  label: ${trial.label}`);
    console.log(`  stage: ${trial.summary?.stage}`);
    console.log(`  duration: ${trial.summary?.durationMs}ms`);
    console.log(`  clicks: ${trial.summary?.clickCount}`);
    console.log(`  events: ${trial.eventRows?.length}`);
    console.log(`  windows: ${trial.windowRows?.length}`);
    console.log(`  seats: ${trial.summary?.selectedSeats?.join(', ') || 'none'}`);

    return HttpResponse.json({
      status: 201,
      message: 'success',
      data: {
        trialId: trial.trialId,
        receivedAt: new Date().toISOString(),
      },
    });
  }),

  // AI Ingest Server 이벤트 수집 모킹 (CORS 에러 방지용)
  http.post('*/api/behavior/events', async () => {
    await delay(100);
    console.log('%c[MSW] Behavior event sent to AI Ingest Server', 'color: #3b82f6; font-weight: bold;');
    
    return HttpResponse.json({
      status: 200,
      message: 'success',
      data: null
    });
  }),
];
