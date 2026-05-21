import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchMyInfo, updateMyInfo, withdrawMyInfo } from '@/src/shared/api/userApi';
import { authApi } from '@/src/shared/api/authApi';
import { clearTokens, getAccessToken } from '@/src/shared/api/tokenManager';
import type { UpdateMyInfoRequest } from '@/src/shared/api/types/user.types';
import { ApiError } from './types';

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
      let response;
      try {
        response = await fetchMyInfo();
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          clearTokens();
          return null;
        }
        throw error;
      }
      const data = response.data;
      return {
        userId: data.userId,
        avatarUrl: data.profileImageUrl ?? '',
        name: data.nickname || data.name,
        nickname: data.nickname,
        realName: data.name,
        email: data.email,
        phoneNumber: data.phoneNumber ?? undefined,
      } as UserProfileData;
    },
    staleTime: 0,
    enabled: !!getAccessToken(),
  });
};

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
    onSuccess: async () => {
      await authApi.logout().catch(() => undefined);
      clearTokens();
      queryClient.clear();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    },
  });
};
