import { apiClient } from './client';
import type { ApiResponse } from './types';
import { getAccessToken } from './tokenManager';
import type {
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
