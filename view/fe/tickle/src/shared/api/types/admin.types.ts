export type BlacklistReason =
  | 'BOT_DETECTED'
  | 'MACRO_DETECTED_FE'
  | 'IP_RATE_LIMIT'
  | 'SUSPICIOUS_PATTERN'
  | 'MANUAL_BLOCK';

export interface BlacklistItem {
  blacklistId: number;
  userId: number;
  userName: string;
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

export interface BlacklistDashboardChartData {
  hour: string;
  sectionBlocked: number;
  cumulativeDetected: number;
  bypassCount: number;
  macroCount: number;
  abnormalCount: number;
}

export interface BlacklistDashboardResponse {
  totalConnectionsToday: number;
  botDetectionCount: number;
  blockRate: number;
  blockedCount: number;
  peakTime: string;
  peakDetectionCount: number;
  chartData: BlacklistDashboardChartData[];
}

export interface QueueDashboardChartData {
  time: string;
  waitCount: number;
  inflowCount: number;
  admittedCount: number;
  expectedWaitMinutes: number;
}

export interface QueueDashboardResponse {
  eventId: number;
  eventName: string;
  totalInflowLastHour: number;
  currentWaiting: number;
  waitingDifference: number;
  peakWaiting: number;
  peakTarget: number;
  admissionsPerMinute: number;
  admissionsDifference: number;
  expectedWaitMinutes: number;
  throughputPerMinute: number;
  chartData: QueueDashboardChartData[];
}

export interface QueueEventRankResponse {
  rank: number;
  eventId: number;
  eventName: string;
  date: string;
  waitCount: number;
  expectedWaitMinutes: number;
}

export interface ActiveUserStatsResponse {
  currentCount: number;
  peakCount: number;
  averageCount: number;
  chartData?: Array<{
    time: string;
    currentCount: number;
    averageCount: number;
  }>;
}
