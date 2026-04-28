import { apiClient } from './client';
import { ApiResponse } from './types';

export interface QueueEnterResponseData {
  requestId: string;
  status: 'PENDING' | 'WAITING' | 'ADMITTED';
}

export interface QueueTokenResponseData {
  queueToken: string;
  status: 'WAITING' | 'ADMITTED';
}

export interface QueueStatusResponseData {
  queueToken: string;
  status: 'WAITING' | 'ADMITTED';
  rank: number | null;
  waitingCount: number | null;
  estimatedWaitSeconds: number | null;
  estimatedEntryAt: string | null;
  admitToken: string | null;
}

export const enterQueue = async (sessionId: number | string): Promise<ApiResponse<QueueEnterResponseData>> => {
  return apiClient<ApiResponse<QueueEnterResponseData>>(`/api/v1/queues/${sessionId}/enter`, { method: 'POST' });
};

export const getQueueToken = async (sessionId: number | string): Promise<ApiResponse<QueueTokenResponseData>> => {
  return apiClient<ApiResponse<QueueTokenResponseData>>(`/api/v1/queues/${sessionId}/token`, { method: 'GET' });
};

export const leaveQueue = async (sessionId: number | string): Promise<ApiResponse<void>> => {
  return apiClient<ApiResponse<void>>(`/api/v1/queues/${sessionId}/leave`, { method: 'POST' });
};

export const getQueueStatus = async (sessionId: number | string): Promise<ApiResponse<QueueStatusResponseData>> => {
  return apiClient<ApiResponse<QueueStatusResponseData>>(`/api/v1/queues/${sessionId}/status`, { method: 'GET' });
};

// SSE stream endpoint URL builder (since SSE uses native EventSource, not apiClient)
export const getQueueStreamUrl = (sessionId: number | string): string => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
  return `${baseUrl}/api/v1/queues/${sessionId}/stream`;
};
