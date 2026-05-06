import { apiClient } from './client';
import { getUserId } from './tokenManager';
import { buildUserApiUrl } from './userConfig';
import { ApiResponse } from './types';
import { Schema } from 'effect';
import { createApiResponseSchema } from '../utils/schema';

export interface MyInfoResponseData {
  userId: number;
  userNo: string;
  email: string;
  phoneNumber: string;
  name: string;
  nickname: string;
  profileImageUrl: string | null;
  birthDate: string;
}

export interface UpdateMyInfoRequest {
  phoneNumber?: string;
  nickname?: string;
  profileImageUrl?: string;
}

export const MyInfoResponseDataSchema = Schema.Struct({
  userId: Schema.Number,
  userNo: Schema.String,
  email: Schema.String,
  phoneNumber: Schema.String,
  name: Schema.String,
  nickname: Schema.String,
  profileImageUrl: Schema.Union(Schema.String, Schema.Null),
  birthDate: Schema.String,
});

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
  const userId = getRequiredUserId();
  return apiClient<ApiResponse<MyInfoResponseData>>(
    buildUserApiUrl('/api/v1/users/me'), 
    {
      method: 'PATCH',
      params: { userId },
      body: request,
    },
    false,
    createApiResponseSchema(MyInfoResponseDataSchema)
  );
};

export const withdrawMyInfo = async (): Promise<ApiResponse<void>> => {
  const userId = getRequiredUserId();
  return apiClient<ApiResponse<void>>(buildUserApiUrl('/api/v1/users/me'), {
    method: 'DELETE',
    params: { userId },
  });
};
