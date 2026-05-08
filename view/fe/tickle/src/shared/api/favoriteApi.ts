import { apiClient } from './client';
import { buildUserApiUrl } from './userConfig';
import { ApiResponse } from './types';
import { createApiResponseSchema } from '../utils/schema';
import { EventListResponseData, EventListResponseDataSchema } from './types/event.types';
import { FavoriteCreateResponseData, FavoriteCreateResponseDataSchema } from './types/favorite.types';

export const createFavorite = async (eventId: number | string): Promise<ApiResponse<FavoriteCreateResponseData>> => {
  return apiClient<ApiResponse<FavoriteCreateResponseData>>(
    `/api/v1/events/${eventId}/favorite`, 
    {
      method: 'POST',
    },
    false,
    createApiResponseSchema(FavoriteCreateResponseDataSchema)
  );
};

export const deleteFavorite = async (eventId: number | string): Promise<ApiResponse<void>> => {
  return apiClient<ApiResponse<void>>(`/api/v1/events/${eventId}/favorite`, {
    method: 'DELETE',
  });
};

export const getFavoriteEvents = async (page: number = 0, size: number = 20): Promise<ApiResponse<EventListResponseData>> => {
  const params: Record<string, string | number | boolean> = { page, size };
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
