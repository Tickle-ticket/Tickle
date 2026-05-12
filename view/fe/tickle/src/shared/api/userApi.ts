import { apiClient } from './client';
import { buildUserApiUrl } from './userConfig';
import { ApiResponse } from './types';
import { createApiResponseSchema } from '../utils/schema';
import { MyInfoResponseData, UpdateMyInfoRequest, MyInfoResponseDataSchema } from './types/user.types';



export const fetchMyInfo = async (): Promise<ApiResponse<MyInfoResponseData>> => {
  return apiClient<ApiResponse<MyInfoResponseData>>(
    buildUserApiUrl('/api/v1/users/me'),
    { params: {}, auth: 'optional' },
    false,
    createApiResponseSchema(MyInfoResponseDataSchema)
  );
};

export const updateMyInfo = async (request: UpdateMyInfoRequest): Promise<ApiResponse<MyInfoResponseData>> => {
  const { nickname, phoneNumber, profileImage } = request;

  const formData = new FormData();
  if (nickname !== undefined) {
    formData.append('nickname', nickname);
  }
  if (phoneNumber !== undefined) {
    formData.append('phoneNumber', phoneNumber);
  }
  if (profileImage) {
    formData.append('profileImage', profileImage);
  }

  return apiClient<ApiResponse<MyInfoResponseData>>(
    buildUserApiUrl('/api/v1/users/me'), 
    {
      method: 'PUT',
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
