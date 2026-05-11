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
import { getAccessToken } from './tokenManager';

export const enterQueue = async (eventId: number | string, scope?: 'BOOKING' | 'CANCELLATION_WAIT'): Promise<ApiResponse<QueueEnterResponseData>> => {
  return apiClient<ApiResponse<QueueEnterResponseData>>(
    `/api/v1/queues/${eventId}/enter`,
    {
      method: 'POST',
      params: scope ? { scope } : undefined
    },
    false,
    createApiResponseSchema(QueueEnterResponseDataSchema)
  );
};

export const getQueueToken = async (eventId: number | string, requestId: string, scope?: 'BOOKING' | 'CANCELLATION_WAIT'): Promise<ApiResponse<QueueTokenResponseData>> => {
  return apiClient<ApiResponse<QueueTokenResponseData>>(
    `/api/v1/queues/${eventId}/token`,
    {
      method: 'GET',
      params: scope ? { requestId, scope } : { requestId }
    },
    false,
    createApiResponseSchema(QueueTokenResponseDataSchema)
  );
};

export const leaveQueue = async (eventId: number | string, queueToken: string, scope?: 'BOOKING' | 'CANCELLATION_WAIT'): Promise<ApiResponse<void>> => {
  return apiClient<ApiResponse<void>>(
    `/api/v1/queues/${eventId}/leave`,
    {
      method: 'POST',
      params: scope ? { queueToken, scope } : { queueToken }
    }
  );
};

export const getQueueStatus = async (eventId: number | string, queueToken: string, scope?: 'BOOKING' | 'CANCELLATION_WAIT'): Promise<ApiResponse<QueueStatusResponseData>> => {
  return apiClient<ApiResponse<QueueStatusResponseData>>(
    `/api/v1/queues/${eventId}/status`,
    {
      method: 'GET',
      params: scope ? { queueToken, scope } : { queueToken }
    },
    false,
    createApiResponseSchema(QueueStatusResponseDataSchema)
  );
};

// SSE stream endpoint URL builder (since SSE uses native EventSource, not apiClient)
export const getQueueStreamUrl = (eventId: number | string, queueToken: string, scope?: 'BOOKING' | 'CANCELLATION_WAIT'): string => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  const accessToken = getAccessToken();
  const tokenQuery = accessToken ? `&token=${accessToken}` : '';
  const scopeQuery = scope ? `&scope=${scope}` : '';
  return `${baseUrl}/api/v1/queues/${eventId}/stream?queueToken=${queueToken}${tokenQuery}${scopeQuery}`;
};
