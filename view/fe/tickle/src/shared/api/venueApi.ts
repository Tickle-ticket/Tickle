import { apiClient } from './client';
import { ApiResponse } from './types';

export interface VenueListItemResponse {
  venueId: number;
  venueName: string;
}

export interface VenueListResponse {
  venues: VenueListItemResponse[];
}

export const fetchVenues = async (): Promise<ApiResponse<VenueListResponse>> => {
  return apiClient<ApiResponse<VenueListResponse>>('/api/v1/venues', {
    method: 'GET',
  });
};
