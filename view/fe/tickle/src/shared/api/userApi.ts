import { apiClient } from './client';
import { getUserId } from './tokenManager';
import { buildUserApiUrl } from './userConfig';
import { ApiResponse } from './types';
import { createApiResponseSchema } from '../utils/schema';
import { MyInfoResponseData, UpdateMyInfoRequest, MyInfoResponseDataSchema } from './types/user.types';

const getRequiredUserId = () => {
  const userId = getUserId();

  if (userId === null) {
    throw new Error('Current userId is missing.');
  }

  return userId;
};

export const fetchMyInfo = async (): Promise<ApiResponse<MyInfoResponseData>> => {
  const userId = getRequiredUserId();
  return apiClient<ApiResponse<MyInfoResponseData>>(
    buildUserApiUrl('/api/v1/users/me'),
    { params: { userId } },
    false,
    createApiResponseSchema(MyInfoResponseDataSchema)
  );
};

export const updateMyInfo = async (request: UpdateMyInfoRequest): Promise<ApiResponse<MyInfoResponseData>> => {
  const { userId, nickname, phoneNumber, profileImage } = request;
  
  const params: Record<string, string> = { userId: String(userId) };
  if (nickname) params.nickname = nickname;
  if (phoneNumber) params.phoneNumber = phoneNumber;

  const formData = new FormData();
  if (profileImage) {
    formData.append('profileImage', profileImage);
  }

  return apiClient<ApiResponse<MyInfoResponseData>>(
    buildUserApiUrl('/api/v1/users/me'), 
    {
      method: 'PATCH',
      params,
      body: formData,
    },
    false,
    createApiResponseSchema(MyInfoResponseDataSchema)
  );
};

export const withdrawMyInfo = async (userId: number): Promise<ApiResponse<void>> => {
  return apiClient<ApiResponse<void>>(buildUserApiUrl('/api/v1/users/me'), {
    method: 'DELETE',
    params: { userId },
  });
};
