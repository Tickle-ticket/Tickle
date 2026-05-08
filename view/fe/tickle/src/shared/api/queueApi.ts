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

export const enterQueue = async (sessionId: number | string, scope?: 'BOOKING' | 'CANCELLATION_WAIT'): Promise<ApiResponse<QueueEnterResponseData>> => {
  return apiClient<ApiResponse<QueueEnterResponseData>>(
    `/api/v1/queues/${sessionId}/enter`, 
    { 
      method: 'POST',
      params: scope ? { scope } : undefined
    },
    false,
    createApiResponseSchema(QueueEnterResponseDataSchema)
  );
};

export const getQueueToken = async (sessionId: number | string, requestId: string, scope?: 'BOOKING' | 'CANCELLATION_WAIT'): Promise<ApiResponse<QueueTokenResponseData>> => {
  return apiClient<ApiResponse<QueueTokenResponseData>>(
    `/api/v1/queues/${sessionId}/token`, 
    { 
      method: 'GET',
      params: scope ? { requestId, scope } : { requestId }
    },
    false,
    createApiResponseSchema(QueueTokenResponseDataSchema)
  );
};

export const leaveQueue = async (sessionId: number | string, queueToken: string, scope?: 'BOOKING' | 'CANCELLATION_WAIT'): Promise<ApiResponse<void>> => {
  return apiClient<ApiResponse<void>>(
    `/api/v1/queues/${sessionId}/leave`, 
    { 
      method: 'POST',
      params: scope ? { queueToken, scope } : { queueToken }
    }
  );
};

export const getQueueStatus = async (sessionId: number | string, queueToken: string, scope?: 'BOOKING' | 'CANCELLATION_WAIT'): Promise<ApiResponse<QueueStatusResponseData>> => {
  return apiClient<ApiResponse<QueueStatusResponseData>>(
    `/api/v1/queues/${sessionId}/status`, 
    { 
      method: 'GET',
      params: scope ? { queueToken, scope } : { queueToken }
    },
    false,
    createApiResponseSchema(QueueStatusResponseDataSchema)
  );
};

// SSE stream endpoint URL builder (since SSE uses native EventSource, not apiClient)
export const getQueueStreamUrl = (sessionId: number | string, queueToken: string, scope?: 'BOOKING' | 'CANCELLATION_WAIT'): string => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
  const scopeQuery = scope ? `&scope=${scope}` : '';
  return `${baseUrl}/api/v1/queues/${sessionId}/stream?queueToken=${queueToken}${scopeQuery}`;
};
