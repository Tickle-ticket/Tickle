import { apiClient } from './client';
import { buildAuthApiUrl } from './authConfig';
import { ApiResponse } from './types';

import {
  TokenResponse,
  SignUpRequest,
  LoginRequest,
  TokenResponseSchema,
  KakaoLoginRequest,
  KakaoLoginResponse,
  KakaoLoginResponseSchema,
  KakaoSignUpRequest,
  MockLoginRequest,
  PhoneCodeVerifyRequest,
} from './types/auth.types';
import { createApiResponseSchema } from '../utils/schema';

const buildLocalAuthUrl = (path: string) => {
  if (typeof window === 'undefined') {
    return path;
  }

  return `${window.location.origin}${path}`;
};

export const authApi = {
  login: async (request: LoginRequest): Promise<ApiResponse<TokenResponse>> => {
    return apiClient<ApiResponse<TokenResponse>>(
      buildAuthApiUrl('/api/v1/auth/login'),
      {
        method: 'POST',
        body: request,
        credentials: 'include',
      },
      false,
      createApiResponseSchema(TokenResponseSchema)
    );
  },

  mockLogin: async (request: MockLoginRequest): Promise<ApiResponse<TokenResponse>> => {
    return apiClient<ApiResponse<TokenResponse>>(
      buildAuthApiUrl('/api/v1/auth/mock-login'),
      {
        method: 'POST',
        body: request,
        credentials: 'include',
      },
      false,
      createApiResponseSchema(TokenResponseSchema)
    );
  },

  signup: async (request: SignUpRequest): Promise<ApiResponse<TokenResponse>> => {
    return apiClient<ApiResponse<TokenResponse>>(
      buildAuthApiUrl('/api/v1/auth/signup'),
      {
        method: 'POST',
        body: request,
        credentials: 'include',
      },
      false,
      createApiResponseSchema(TokenResponseSchema)
    );
  },

  logout: async (): Promise<ApiResponse<void>> => {
    return apiClient<ApiResponse<void>>(buildAuthApiUrl('/api/v1/auth/logout'), {
      method: 'POST',
      credentials: 'include',
    });
  },

  reissue: async (): Promise<ApiResponse<TokenResponse>> => {
    return apiClient<ApiResponse<TokenResponse>>(
      buildAuthApiUrl('/api/v1/auth/reissue'),
      {
        method: 'POST',
        credentials: 'include',
      },
      false,
      createApiResponseSchema(TokenResponseSchema)
    );
  },

  kakaoLogin: async (request: KakaoLoginRequest): Promise<ApiResponse<KakaoLoginResponse>> => {
    return apiClient<ApiResponse<KakaoLoginResponse>>(
      buildLocalAuthUrl('/oauth/kakao/login'),
      {
        method: 'POST',
        body: request,
        credentials: 'include',
      },
      false,
      createApiResponseSchema(KakaoLoginResponseSchema)
    );
  },

  kakaoSignup: async (request: KakaoSignUpRequest): Promise<ApiResponse<TokenResponse>> => {
    return apiClient<ApiResponse<TokenResponse>>(
      buildAuthApiUrl('/api/v1/auth/kakao/signup'),
      {
        method: 'POST',
        body: request,
        credentials: 'include',
      },
      false,
      createApiResponseSchema(TokenResponseSchema)
    );
  },

  sendPhoneCode: async (request: { phoneNumber: string }): Promise<ApiResponse<void>> => {
    return apiClient<ApiResponse<void>>(buildAuthApiUrl('/api/v1/auth/phone/send'), {
      method: 'POST',
      body: request,
      credentials: 'include',
    });
  },

  verifyPhoneCode: async (request: PhoneCodeVerifyRequest): Promise<ApiResponse<void>> => {
    return apiClient<ApiResponse<void>>(buildAuthApiUrl('/api/v1/auth/phone/verify'), {
      method: 'POST',
      body: request,
      credentials: 'include',
    });
  },
};
