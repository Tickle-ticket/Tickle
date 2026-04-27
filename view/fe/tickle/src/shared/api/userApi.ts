import { apiClient } from './client';
import { ApiResponse } from './types';

export interface MyInfoResponseData {
  userId: number;
  userNo: string;
  email: string;
  phoneNumber: string;
  name: string;
  nickname: string;
  profileImageUrl: string;
  birthDate: string;
}

export interface UpdateMyInfoRequest {
  phoneNumber?: string;
  nickname?: string;
  profileImageUrl?: string;
}

export const fetchMyInfo = async (): Promise<ApiResponse<MyInfoResponseData>> => {
  return apiClient<ApiResponse<MyInfoResponseData>>('/api/v1/users/me');
};

export const updateMyInfo = async (request: UpdateMyInfoRequest): Promise<ApiResponse<MyInfoResponseData>> => {
  return apiClient<ApiResponse<MyInfoResponseData>>('/api/v1/users/me', {
    method: 'PATCH',
    body: request,
  });
};

export const withdrawMyInfo = async (): Promise<ApiResponse<void>> => {
  return apiClient<ApiResponse<void>>('/api/v1/users/me', {
    method: 'DELETE',
  });
};
