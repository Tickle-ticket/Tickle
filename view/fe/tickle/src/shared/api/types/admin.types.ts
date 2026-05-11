export type BlacklistReason =
  | 'BOT_DETECTED'
  | 'MACRO_DETECTED_FE'
  | 'IP_RATE_LIMIT'
  | 'SUSPICIOUS_PATTERN'
  | 'MANUAL_BLOCK';

export interface BlacklistItem {
  blacklistId: number;
  userId: number;
  reason: BlacklistReason;
  detail: string | null;
  blockedBy: number | null;
  createdAt: string;
}

export interface BlacklistPageResponse {
  items: BlacklistItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
}

export interface AddBlacklistRequest {
  userId: number;
  reason: BlacklistReason;
  detail?: string;
  adminUserId?: number;
}

export interface ReasonStat {
  reason: BlacklistReason | string;
  count: number;
}

export interface ScoreBucket {
  scoreRange: string;
  count: number;
}

export interface BotDetectionStatsResponse {
  totalBlacklisted: number;
  recentOneHourCount: number;
  blockedIpCount: number;
  byReason: ReasonStat[];
  scoreDistribution: ScoreBucket[];
  recentItems: BlacklistItem[];
}

export interface QueueStatsResponse {
  scheduleId: number;
  totalWaiting: number;
  processingCount: number;
  averageWaitSeconds: number;
  slotLimit: number;
}
