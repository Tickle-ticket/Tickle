'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchAgencies } from '@/src/shared/api/agencyApi';

export interface AgencyOption {
  id: string;
  name: string;
}

export function useAgencies(enabled = true) {
  return useQuery({
    queryKey: ['signupAgencies'],
    queryFn: async () => {
      const agencies = await fetchAgencies();
      return agencies.map((agency) => ({
        id: String(agency.agencyId),
        name: agency.agencyName,
      }));
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}
