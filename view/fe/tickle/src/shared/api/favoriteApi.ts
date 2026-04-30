import { apiClient } from './client';
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

export const createFavorite = async (eventId: number | string, userId?: number): Promise<ApiResponse<FavoriteCreateResponseData>> => {
  return apiClient<ApiResponse<FavoriteCreateResponseData>>(
    `/api/v1/events/${eventId}/favorite`, 
    {
      method: 'POST',
      ...(userId !== undefined && { params: { userId } }),
    },
    false,
    createApiResponseSchema(FavoriteCreateResponseDataSchema)
  );
};

export const deleteFavorite = async (eventId: number | string, userId?: number): Promise<ApiResponse<void>> => {
  return apiClient<ApiResponse<void>>(`/api/v1/events/${eventId}/favorite`, {
    method: 'DELETE',
    ...(userId !== undefined && { params: { userId } }),
  });
};

export const getFavoriteEvents = async (page: number = 0, size: number = 20, userId?: number): Promise<ApiResponse<EventListResponseData>> => {
  const params: Record<string, string | number | boolean> = { page, size };
  if (userId !== undefined) params.userId = userId;
  return apiClient<ApiResponse<EventListResponseData>>(
    '/api/v1/users/me/favorites', 
    {
      method: 'GET',
      params,
    },
    false,
    createApiResponseSchema(EventListResponseDataSchema)
  );
};
