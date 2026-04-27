import { useQuery } from '@tanstack/react-query';
import { http } from '@/src/shared/api/http';
import { ApiResponse } from '@/src/shared/api/types';

export interface UserProfileData {
  avatarUrl: string;
  name: string;
  email?: string;
}

export const useUserProfile = () => {
  return useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const response = await http.get<ApiResponse<UserProfileData>>('/api/user/profile');
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
};
