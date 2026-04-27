// src/features/queue/api/queueApi.ts

const API_BASE_URL = '/api/v1';

export interface EnterQueueResponse {
  status: number;
  message: string;
  data: {
    requestId: string;
    status: 'PENDING';
  };
}

export interface GetTokenResponse {
  status: number;
  message: string;
  data: {
    queueToken: string;
    status: 'WAITING' | 'ADMITTED';
  };
}

/**
 * 1. 대기열 진입 요청
 */
export const enterQueue = async (sessionId: string, userId: number = 1001): Promise<EnterQueueResponse> => {
  const response = await fetch(`${API_BASE_URL}/queues/${sessionId}/enter`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId }),
  });
  if (!response.ok) throw new Error('Failed to enter queue');
  return response.json();
};

/**
 * 2. queueToken 발급
 */
export const getQueueToken = async (sessionId: string, requestId: string): Promise<GetTokenResponse> => {
  const response = await fetch(`${API_BASE_URL}/queues/${sessionId}/token?requestId=${requestId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) throw new Error('Failed to get queue token');
  return response.json();
};

/**
 * 6. 명시적 이탈
 */
export const leaveQueue = async (sessionId: string, queueToken: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/queues/${sessionId}/leave?queueToken=${queueToken}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) throw new Error('Failed to leave queue');
};

// stream 연결 url을 생성하는 헬퍼 (EventSource에 직접 넘기기 위해)
export const getStreamUrl = (sessionId: string, queueToken: string) => {
  return `${API_BASE_URL}/queues/${sessionId}/stream?queueToken=${queueToken}`;
};
