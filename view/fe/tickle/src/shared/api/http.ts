import { apiClient } from './client';
import { RequestOptions } from './types';

export const http = {
  get: <T>(path: string, options?: RequestOptions) =>
    apiClient<T>(path, { ...options, method: 'GET' }),

  post: <T, B = any>(path: string, body?: B, options?: RequestOptions) =>
    apiClient<T>(path, { ...options, method: 'POST', body }),

  put: <T, B = any>(path: string, body?: B, options?: RequestOptions) =>
    apiClient<T>(path, { ...options, method: 'PUT', body }),

  patch: <T, B = any>(path: string, body?: B, options?: RequestOptions) =>
    apiClient<T>(path, { ...options, method: 'PATCH', body }),

  delete: <T>(path: string, options?: RequestOptions) =>
    apiClient<T>(path, { ...options, method: 'DELETE' }),
};
