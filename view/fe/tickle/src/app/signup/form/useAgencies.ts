'use client';

import { useQuery } from '@tanstack/react-query';
import { http } from '@/src/shared/api/http';
import type { ApiResponse } from '@/src/shared/api/types';

export interface AgencyOption {
  id: string;
  name: string;
}

type AgencyApiItem = {
  id?: string | number;
  agencyId?: string | number;
  organizationId?: string | number;
  name?: string;
  agencyName?: string;
  organizationName?: string;
};

type AgencyApiData = AgencyApiItem[] | {
  agencies?: AgencyApiItem[];
  organizations?: AgencyApiItem[];
  content?: AgencyApiItem[];
};

function normalizeAgencyList(data: AgencyApiData): AgencyOption[] {
  const list = Array.isArray(data) ? data : data.agencies ?? data.organizations ?? data.content ?? [];

  return list
    .map((agency) => {
      const id = agency.agencyId ?? agency.organizationId ?? agency.id;
      const name = agency.agencyName ?? agency.organizationName ?? agency.name;

      if (id === undefined || !name) {
        return null;
      }

      return {
        id: String(id),
        name,
      };
    })
    .filter((agency): agency is AgencyOption => agency !== null);
}

export function useAgencies(enabled = true) {
  return useQuery({
    queryKey: ['signupAgencies'],
    queryFn: async () => {
      const response = await http.get<ApiResponse<AgencyApiData>>('/api/v1/agencies');
      return normalizeAgencyList(response.data);
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}
