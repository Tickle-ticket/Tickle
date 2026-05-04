import { apiClient } from './client';
import { ApiResponse } from './types';

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  userId: number;
}

export interface SignUpRequest {
  email: string;
  password?: string;
  name: string;
  nickname?: string;
  birthDate?: string;
  phoneNumber?: string;
  role?: 'USER' | 'ORGANIZER';
  organizerName?: string;
}

export interface LoginRequest {
  email: string;
  password?: string;
}

export interface ReissueRequest {
  refreshToken: string;
}

export const authApi = {
  login: async (request: LoginRequest): Promise<ApiResponse<TokenResponse>> => {
    return apiClient<ApiResponse<TokenResponse>>('/api/v1/auth/login', {
      method: 'POST',
      body: request,
    });
  },

  signup: async (request: SignUpRequest): Promise<ApiResponse<TokenResponse>> => {
    return apiClient<ApiResponse<TokenResponse>>('/api/v1/auth/signup', {
      method: 'POST',
      body: request,
    });
  },

  logout: async (): Promise<ApiResponse<void>> => {
    return apiClient<ApiResponse<void>>('/api/v1/auth/logout', {
      method: 'POST',
    });
  },

  reissue: async (request: ReissueRequest): Promise<ApiResponse<TokenResponse>> => {
    return apiClient<ApiResponse<TokenResponse>>('/api/v1/auth/reissue', {
      method: 'POST',
      body: request,
    });
  },

  kakaoCallback: async (code: string): Promise<ApiResponse<TokenResponse>> => {
    return apiClient<ApiResponse<TokenResponse>>(`/api/v1/auth/kakao/callback?code=${code}`, {
      method: 'GET',
    });
  },

  sendPhoneCode: async (request: { phoneNumber: string }): Promise<ApiResponse<void>> => {
    return apiClient<ApiResponse<void>>('/api/v1/auth/phone/send', {
      method: 'POST',
      body: request,
    });
  },

  verifyPhoneCode: async (request: { phoneNumber: string; code: string }): Promise<ApiResponse<void>> => {
    return apiClient<ApiResponse<void>>('/api/v1/auth/phone/verify', {
      method: 'POST',
      body: request,
    });
  },
};
