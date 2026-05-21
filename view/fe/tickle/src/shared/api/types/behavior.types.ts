import type { ApiResponse } from '../types';
import type { TrialMetrics, TrialStage } from '@/src/shared/utils/schema';

export type BehaviorEventType = 'DETAIL' | 'CAPTCHA' | 'BOOKING';

export interface BehaviorEventPayload {
  type: BehaviorEventType;
  scheduleId?: number;
  eventId?: number;
  eventDate?: string;
  createdAt: string;
  features: Partial<TrialMetrics>;
}

export interface SendBehaviorEventInput extends Omit<BehaviorEventPayload, 'createdAt'> {
  createdAt?: string;
  requestId?: string;
}

export type BehaviorEventResponse = ApiResponse<null>;
