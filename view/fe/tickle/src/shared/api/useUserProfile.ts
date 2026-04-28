import { useQuery } from '@tanstack/react-query';
import { fetchMyInfo } from '@/src/shared/api/userApi';

export interface UserProfileData {
  avatarUrl: string;
  name: string;
  email?: string;
}

export const useUserProfile = () => {
  return useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const response = await fetchMyInfo();
      const data = response.data;
      return {
        avatarUrl: data.profileImageUrl,
        name: data.nickname || data.name,
        email: data.email,
      } as UserProfileData;
    },
    staleTime: 5 * 60 * 1000,
  });
};
