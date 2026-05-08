import { apiClient } from './client';
import { buildUserApiUrl } from './userConfig';
import { ApiResponse } from './types';
import { createApiResponseSchema } from '../utils/schema';
import { MyInfoResponseData, UpdateMyInfoRequest, MyInfoResponseDataSchema } from './types/user.types';



export const fetchMyInfo = async (): Promise<ApiResponse<MyInfoResponseData>> => {
  return apiClient<ApiResponse<MyInfoResponseData>>(
    buildUserApiUrl('/api/v1/users/me'),
    { params: {} },
    false,
    createApiResponseSchema(MyInfoResponseDataSchema)
  );
};

export const updateMyInfo = async (request: UpdateMyInfoRequest): Promise<ApiResponse<MyInfoResponseData>> => {
  const { nickname, phoneNumber, profileImage } = request;
  
  const params: Record<string, string> = {};
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

export const withdrawMyInfo = async (): Promise<ApiResponse<void>> => {
  return apiClient<ApiResponse<void>>(buildUserApiUrl('/api/v1/users/me'), {
    method: 'DELETE',
    params: {},
  });
};
