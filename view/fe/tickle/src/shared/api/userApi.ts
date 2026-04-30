import { apiClient } from './client';
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
  profileImageUrl: string;
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
  profileImageUrl: Schema.String,
  birthDate: Schema.String,
});

export const fetchMyInfo = async (): Promise<ApiResponse<MyInfoResponseData>> => {
  return apiClient<ApiResponse<MyInfoResponseData>>(
    '/api/v1/users/me',
    {},
    false,
    createApiResponseSchema(MyInfoResponseDataSchema)
  );
};

export const updateMyInfo = async (request: UpdateMyInfoRequest): Promise<ApiResponse<MyInfoResponseData>> => {
  return apiClient<ApiResponse<MyInfoResponseData>>(
    '/api/v1/users/me', 
    {
      method: 'PATCH',
      body: request,
    },
    false,
    createApiResponseSchema(MyInfoResponseDataSchema)
  );
};

export const withdrawMyInfo = async (): Promise<ApiResponse<void>> => {
  return apiClient<ApiResponse<void>>('/api/v1/users/me', {
    method: 'DELETE',
  });
};
