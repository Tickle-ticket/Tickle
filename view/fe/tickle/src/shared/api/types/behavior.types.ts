import type { ApiResponse } from '../types';
import type { TrialMetrics, TrialStage } from '@/src/shared/utils/schema';

export type BehaviorEventType = TrialStage | 'booking' | string;

export interface BehaviorEventPayload {
  type: BehaviorEventType;
  schedule_id: string;
  name: string;
  event_date: string;
  createdAt: string;
  features: Partial<TrialMetrics>;
}

export interface SendBehaviorEventInput extends Omit<BehaviorEventPayload, 'createdAt'> {
  createdAt?: string;
  requestId?: string;
}

export type BehaviorEventResponse = ApiResponse<null>;
