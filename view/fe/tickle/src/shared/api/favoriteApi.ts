import { apiClient } from './client';
import { getUserId } from './tokenManager';
import { buildUserApiUrl } from './userConfig';
import { ApiResponse } from './types';
import { EventListResponseData, EventListResponseDataSchema } from './eventApi';
import { Schema } from 'effect';
import { createApiResponseSchema } from '../utils/schema';

export interface FavoriteCreateResponseData {
  favoriteId: number;
  userId: number;
  eventId: number;
  createdAt: string;
}

export const FavoriteCreateResponseDataSchema = Schema.Struct({
  favoriteId: Schema.Number,
  userId: Schema.Number,
  eventId: Schema.Number,
  createdAt: Schema.String,
});

const resolveUserId = (userId?: number) => userId ?? getUserId() ?? undefined;

export const createFavorite = async (eventId: number | string, userId?: number): Promise<ApiResponse<FavoriteCreateResponseData>> => {
  const resolvedUserId = resolveUserId(userId);
  return apiClient<ApiResponse<FavoriteCreateResponseData>>(
    `/api/v1/events/${eventId}/favorite`, 
    {
      method: 'POST',
      ...(resolvedUserId !== undefined && { params: { userId: resolvedUserId } }),
    },
    false,
    createApiResponseSchema(FavoriteCreateResponseDataSchema)
  );
};

export const deleteFavorite = async (eventId: number | string, userId?: number): Promise<ApiResponse<void>> => {
  const resolvedUserId = resolveUserId(userId);
  return apiClient<ApiResponse<void>>(`/api/v1/events/${eventId}/favorite`, {
    method: 'DELETE',
    ...(resolvedUserId !== undefined && { params: { userId: resolvedUserId } }),
  });
};

export const getFavoriteEvents = async (page: number = 0, size: number = 20, userId?: number): Promise<ApiResponse<EventListResponseData>> => {
  const params: Record<string, string | number | boolean> = { page, size };
  const resolvedUserId = resolveUserId(userId);
  if (resolvedUserId !== undefined) params.userId = resolvedUserId;
  return apiClient<ApiResponse<EventListResponseData>>(
    buildUserApiUrl('/api/v1/users/me/favorites'), 
    {
      method: 'GET',
      params,
    },
    false,
    createApiResponseSchema(EventListResponseDataSchema)
  );
};
