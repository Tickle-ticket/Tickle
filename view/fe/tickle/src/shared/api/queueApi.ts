import { apiClient } from './client';
import { ApiResponse } from './types';
import { createApiResponseSchema } from '../utils/schema';
import {
  QueueEnterResponseData,
  QueueTokenResponseData,
  QueueStatusResponseData,
  QueueEnterResponseDataSchema,
  QueueTokenResponseDataSchema,
  QueueStatusResponseDataSchema,
} from './types/queue.types';

export const enterQueue = async (sessionId: number | string, userId: number): Promise<ApiResponse<QueueEnterResponseData>> => {
  return apiClient<ApiResponse<QueueEnterResponseData>>(
    `/api/v1/queues/${sessionId}/enter`, 
    { 
      method: 'POST',
      body: { userId }
    },
    false,
    createApiResponseSchema(QueueEnterResponseDataSchema)
  );
};

export const getQueueToken = async (sessionId: number | string, requestId: string): Promise<ApiResponse<QueueTokenResponseData>> => {
  return apiClient<ApiResponse<QueueTokenResponseData>>(
    `/api/v1/queues/${sessionId}/token`, 
    { 
      method: 'GET',
      params: { requestId }
    },
    false,
    createApiResponseSchema(QueueTokenResponseDataSchema)
  );
};

export const leaveQueue = async (sessionId: number | string, queueToken: string): Promise<ApiResponse<void>> => {
  return apiClient<ApiResponse<void>>(
    `/api/v1/queues/${sessionId}/leave`, 
    { 
      method: 'POST',
      params: { queueToken }
    }
  );
};

export const getQueueStatus = async (sessionId: number | string, queueToken: string): Promise<ApiResponse<QueueStatusResponseData>> => {
  return apiClient<ApiResponse<QueueStatusResponseData>>(
    `/api/v1/queues/${sessionId}/status`, 
    { 
      method: 'GET',
      params: { queueToken }
    },
    false,
    createApiResponseSchema(QueueStatusResponseDataSchema)
  );
};

// SSE stream endpoint URL builder (since SSE uses native EventSource, not apiClient)
export const getQueueStreamUrl = (sessionId: number | string, queueToken: string): string => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
  return `${baseUrl}/api/v1/queues/${sessionId}/stream?queueToken=${queueToken}`;
};
