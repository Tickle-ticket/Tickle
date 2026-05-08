import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchMyInfo, updateMyInfo, withdrawMyInfo } from '@/src/shared/api/userApi';
import { getAccessToken } from '@/src/shared/api/tokenManager';

export interface UserProfileData {
  userId: number;
  avatarUrl: string;
  name: string;
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
        userId: data.userId,
        avatarUrl: data.profileImageUrl ?? '',
        name: data.nickname || data.name,
        nickname: data.nickname,
        realName: data.name,
        email: data.email,
        phoneNumber: data.phoneNumber,
      } as UserProfileData;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!getAccessToken(),
  });
};

import { UpdateMyInfoRequest } from '@/src/shared/api/types/user.types';

export const useUpdateUserProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (request: UpdateMyInfoRequest) => {
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
