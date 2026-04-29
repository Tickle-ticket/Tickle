import { apiClient } from './client';
import { ApiResponse } from './types';
import { EventListResponseData } from './eventApi';
import { normalizeImageUrl } from '@/src/shared/utils/imageUrl';

export interface FavoriteCreateResponseData {
  favoriteId: number;
  userId: number;
  eventId: number;
  createdAt: string;
}

export const createFavorite = async (eventId: number | string, userId?: number): Promise<ApiResponse<FavoriteCreateResponseData>> => {
  return apiClient<ApiResponse<FavoriteCreateResponseData>>(`/api/v1/events/${eventId}/favorite`, {
    method: 'POST',
    ...(userId !== undefined && { params: { userId } }),
  });
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
  const response = await apiClient<ApiResponse<EventListResponseData>>('/api/v1/users/me/favorites', {
    method: 'GET',
    params,
  });

  return {
    ...response,
    data: {
      ...response.data,
      items: response.data.items.map((item) => ({
        ...item,
        thumbnailUrl: normalizeImageUrl(item.thumbnailUrl),
      })),
    },
  };
};
