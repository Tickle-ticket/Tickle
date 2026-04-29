'use client';

import { useQuery } from '@tanstack/react-query';
import { http } from '@/src/shared/api/http';
import type { ApiResponse } from '@/src/shared/api/types';

export interface VenueSummary {
  venueId: number;
  venueName: string;
}

type VenueApiItem = {
  venueId?: string | number;
  venueName?: string;
};

type VenueApiData =
  | VenueApiItem[]
  | {
      venues?: VenueApiItem[];
      content?: VenueApiItem[];
    };

function normalizeVenueList(data: VenueApiData): VenueSummary[] {
  const list = Array.isArray(data) ? data : data.venues ?? data.content ?? [];

  return list
    .map((venue) => {
      if (venue.venueId === undefined || !venue.venueName) {
        return null;
      }

      return {
        venueId: Number(venue.venueId),
        venueName: venue.venueName,
      };
    })
    .filter((venue): venue is VenueSummary => venue !== null);
}

export function useVenues(enabled = true) {
  return useQuery({
    queryKey: ['venues'],
    queryFn: async () => {
      const response = await http.get<ApiResponse<VenueApiData>>('/api/v1/venues');
      return normalizeVenueList(response.data);
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}
