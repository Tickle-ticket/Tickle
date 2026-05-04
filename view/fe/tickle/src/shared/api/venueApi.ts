import { apiClient } from './client';
import { ApiResponse } from './types';
import { VenueListItemResponse, VenueListResponse } from './types/venue.types';

export const fetchVenues = async (): Promise<ApiResponse<VenueListResponse>> => {
  return apiClient<ApiResponse<VenueListResponse>>('/api/v1/venues', {
    method: 'GET',
  });
};
