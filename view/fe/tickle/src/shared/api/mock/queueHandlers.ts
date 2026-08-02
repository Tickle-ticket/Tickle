import { http, HttpResponse, delay } from 'msw';

export const queueHandlers = [
  // 1. Enter Queue
  http.post('*/api/v1/queues/:sessionId/enter', async () => {
    await delay(500);
    return HttpResponse.json({
      status: 200,
      code: 'OK',
      message: 'success',
      data: {
        requestId: 'f6f4c4aa-mock-request-id',
        status: 'PENDING'
      }
    });
  }),
  
  // 2. Get Queue Token
  http.get('*/api/v1/queues/:sessionId/token', async () => {
    await delay(300);
    return HttpResponse.json({
      status: 200,
      code: 'OK',
      message: 'success',
      data: {
        queueToken: 'qt-mock-queue-token',
        status: 'ADMITTED'
      }
    });
  }),
  
  // 6. Leave Queue
  http.post('*/api/v1/queues/:sessionId/leave', async () => {
    await delay(200);
    return HttpResponse.json({
      status: 200,
      code: 'OK',
      message: 'success',
      data: null
    });
  }),
  
  // 3. SSE Stream
  http.get('*/api/v1/queues/:sessionId/stream', () => {
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let isClosed = false;
        
        // Helper to send SSE event
        const sendEvent = (event: string, data: unknown) => {
          if (isClosed) return;
          try {
            controller.enqueue(encoder.encode(`event: ${event}\n`));
            controller.enqueue(encoder.encode(`id: ${Date.now()}\n`));
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          } catch (e) {
            console.error('SSE Enqueue Error', e);
          }
        };
        
        // Initial Waiting Event
        sendEvent('queue-status', {
          queueToken: 'qt-mock-queue-token',
          status: 'WAITING',
          rank: 12,
          waitingCount: 284,
          estimatedWaitSeconds: 24,
          estimatedEntryAt: new Date(Date.now() + 24000).toISOString(),
          admitToken: null
        });

        // Update rank over time (after 2 seconds)
        await new Promise(r => setTimeout(r, 2000));
        sendEvent('queue-status', {
          queueToken: 'qt-mock-queue-token',
          status: 'WAITING',
          rank: 5,
          waitingCount: 277,
          estimatedWaitSeconds: 10,
          estimatedEntryAt: new Date(Date.now() + 10000).toISOString(),
          admitToken: null
        });

        // Admitted Event (after 4 seconds total)
        await new Promise(r => setTimeout(r, 2000));
        sendEvent('queue-status', {
          queueToken: 'qt-mock-queue-token',
          status: 'ADMITTED',
          rank: null,
          waitingCount: null,
          estimatedWaitSeconds: null,
          estimatedEntryAt: null,
          admitToken: 'at-mock-admit-token'
        });
        
        // Cleanup when client disconnects
        return () => {
          isClosed = true;
        };
      }
    });
    
    return new HttpResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    });
  }),
  
  // 4. Get Queue Status
  http.get('*/api/v1/queues/:sessionId/status', async () => {
    await delay(300);
    return HttpResponse.json({
      status: 200,
      code: 'OK',
      message: 'success',
      data: {
        queueToken: 'qt-mock-queue-token',
        status: 'WAITING',
        rank: 12,
        waitingCount: 284,
        estimatedWaitSeconds: 24,
        estimatedEntryAt: new Date(Date.now() + 24000).toISOString(),
        admitToken: null
      }
    });
  }),
];
