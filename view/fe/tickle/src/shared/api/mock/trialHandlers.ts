import { http, HttpResponse, delay } from 'msw';

export const trialHandlers = [
  http.post('*/api/v1/trials', async ({ request }) => {
    await delay(200);

    const trial = await request.json() as any;

    console.log(
      `%c[MSW] Trial #${trial.trialId} received`,
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
];
