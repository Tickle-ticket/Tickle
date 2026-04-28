import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchMyInfo, updateMyInfo, withdrawMyInfo } from '@/src/shared/api/userApi';

export interface UserProfileData {
  avatarUrl: string;
  name: string; // Used for display, usually nickname or fallback to realName
  nickname: string;
  realName: string;
  email?: string;
  phoneNumber?: string;
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
        nickname: data.nickname,
        realName: data.name,
        email: data.email,
        phoneNumber: data.phoneNumber,
      } as UserProfileData;
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useUpdateUserProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (request: { nickname?: string; profileImageUrl?: string; phoneNumber?: string }) => {
      const response = await updateMyInfo(request);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
    },
  });
};

export const useWithdrawUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await withdrawMyInfo();
    },
    onSuccess: () => {
      queryClient.clear();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    },
  });
};
