import { apiClient } from './client';
import type { ApiResponse } from './types';
import { getAccessToken } from './tokenManager';
import type {
  ActiveUserStatsResponse,
  AddBlacklistRequest,
  BlacklistDashboardResponse,
  BlacklistPageResponse,
  BotDetectionStatsResponse,
  QueueDashboardResponse,
  QueueEventRankResponse,
  QueueStatsResponse,
} from './types/admin.types';

const getAdminUserIdFromToken = () => {
  const token = getAccessToken();
  const payload = token?.split('.')[1];

  if (!payload || typeof window === 'undefined') {
    return null;
  }

  try {
    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
    const paddedPayload = normalizedPayload.padEnd(
      normalizedPayload.length + ((4 - (normalizedPayload.length % 4)) % 4),
      '=',
    );
    const decoded = JSON.parse(window.atob(paddedPayload)) as { sub?: string };
    const userId = Number(decoded.sub);

    return Number.isFinite(userId) ? userId : null;
  } catch {
    return null;
  }
};

export const getAdminBlacklist = (page = 0, size = 20) => {
  return apiClient<ApiResponse<BlacklistPageResponse>>('/api/v1/admin/blacklist', {
    method: 'GET',
    params: { page, size },
  });
};

const buildAdminStreamUrl = (path: string, params?: Record<string, string | number | null | undefined>) => {
  if (typeof window === 'undefined') {
    return '';
  }

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || window.location.origin;
  const url = new URL(`${baseUrl}${path}/stream`);
  const accessToken = getAccessToken();

  if (accessToken) {
    url.searchParams.set('token', accessToken);
  }

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return url.toString();
};

export const getAdminBlacklistDashboard = () => {
  return apiClient<ApiResponse<BlacklistDashboardResponse>>('/api/v1/admin/blacklist/dashboard', {
    method: 'GET',
  });
};

export const addAdminBlacklist = ({ adminUserId, ...body }: AddBlacklistRequest) => {
  const resolvedAdminUserId = adminUserId ?? getAdminUserIdFromToken();

  if (!resolvedAdminUserId) {
    throw new Error('관리자 ID를 확인할 수 없습니다. 다시 로그인한 뒤 시도해 주세요.');
  }

  return apiClient<ApiResponse<void>>('/api/v1/admin/blacklist', {
    method: 'POST',
    params: { adminUserId: resolvedAdminUserId },
    body,
  });
};

export const removeAdminBlacklist = (blacklistId: number) => {
  return apiClient<ApiResponse<void>>(`/api/v1/admin/blacklist/${blacklistId}`, {
    method: 'DELETE',
  });
};

export const getAdminBotStats = () => {
  return apiClient<ApiResponse<BotDetectionStatsResponse>>('/api/v1/admin/bot/stats', {
    method: 'GET',
  });
};

export const getAdminQueueStats = (scheduleId: number) => {
  return apiClient<ApiResponse<QueueStatsResponse>>(`/api/v1/admin/queues/${scheduleId}/stats`, {
    method: 'GET',
  });
};

export const getAdminQueueEventDashboard = (eventId: number) => {
  return apiClient<ApiResponse<QueueDashboardResponse>>(`/api/v1/admin/queues/events/${eventId}/dashboard`, {
    method: 'GET',
  });
};

export const getAdminTopWaitingEvents = () => {
  return apiClient<ApiResponse<QueueEventRankResponse[]>>('/api/v1/admin/queues/events/top', {
    method: 'GET',
  });
};

export const getAdminUserStats = () => {
  return apiClient<ApiResponse<ActiveUserStatsResponse>>('/api/v1/admin/users/stats', {
    method: 'GET',
  });
};

export const startAdminLoadTest = () => {
  return apiClient<ApiResponse<null>>('/api/v1/admin/load-test/start', {
    method: 'POST',
  });
};

export const getAdminBlacklistStreamUrl = (page = 0, size = 20) =>
  buildAdminStreamUrl('/api/v1/admin/blacklist', { page, size });

export const getAdminBlacklistDashboardStreamUrl = () =>
  buildAdminStreamUrl('/api/v1/admin/blacklist/dashboard');

export const getAdminBotStatsStreamUrl = () =>
  buildAdminStreamUrl('/api/v1/admin/bot/stats');

export const getAdminQueueStatsStreamUrl = (scheduleId: number) =>
  buildAdminStreamUrl(`/api/v1/admin/queues/${scheduleId}/stats`);

export const getAdminQueueEventDashboardStreamUrl = (eventId: number) =>
  buildAdminStreamUrl(`/api/v1/admin/queues/events/${eventId}/dashboard`);

export const getAdminTopWaitingEventsStreamUrl = () =>
  buildAdminStreamUrl('/api/v1/admin/queues/events/top');

export const getAdminUserStatsStreamUrl = () =>
  buildAdminStreamUrl('/api/v1/admin/users/stats');
