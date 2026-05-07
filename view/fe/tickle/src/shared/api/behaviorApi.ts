import { getAccessToken } from './tokenManager';
import type { TrialMetrics } from '@/src/shared/utils/schema';
import { BehaviorEventPayload, SendBehaviorEventInput, BehaviorEventResponse } from './types/behavior.types';

const BEHAVIOR_EVENTS_PATH = '/api/behavior/events';

const buildBehaviorEventsUrl = () => {
  const baseUrl = process.env.NEXT_PUBLIC_AI_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || '';
  return `${baseUrl}${BEHAVIOR_EVENTS_PATH}`;
};

const createRequestId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `behavior-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const toOffsetISOString = (date: Date) => {
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absoluteOffsetMinutes = Math.abs(offsetMinutes);
  const offsetHours = String(Math.floor(absoluteOffsetMinutes / 60)).padStart(2, '0');
  const offsetRemainderMinutes = String(absoluteOffsetMinutes % 60).padStart(2, '0');
  const localTime = new Date(date.getTime() + offsetMinutes * 60_000).toISOString().slice(0, -1);

  return `${localTime}${sign}${offsetHours}:${offsetRemainderMinutes}`;
};

const hasFeatures = (features: Partial<TrialMetrics> | null | undefined) => {
  return Boolean(features && Object.keys(features).length > 0);
};

export const sendBehaviorEvent = async ({
  createdAt,
  requestId,
  ...payload
}: SendBehaviorEventInput): Promise<BehaviorEventResponse | null> => {
  if (!hasFeatures(payload.features)) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[BehaviorEvent] skipped: features is empty');
    }
    return null;
  }

  const accessToken = getAccessToken();
  if (!accessToken) {
    // TODO: 인증 저장소가 localStorage 외 방식으로 변경되면 tokenManager 연동을 갱신합니다.
    console.warn('[BehaviorEvent] skipped: access-token is missing');
    return null;
  }

  const body: BehaviorEventPayload = {
    ...payload,
    createdAt: createdAt ?? toOffsetISOString(new Date()),
  };

  try {
    const response = await fetch(buildBehaviorEventsUrl(), {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'access-token': accessToken,
        'X-Request-Id': requestId ?? createRequestId(),
        ...(process.env.NEXT_PUBLIC_INTERNAL_SECRET && { 'X-Internal-Secret': process.env.NEXT_PUBLIC_INTERNAL_SECRET }),
      },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      console.warn('[BehaviorEvent] submit failed:', response.status, data);
      return null;
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('[BehaviorEvent] accepted:', data);
    }

    return data as BehaviorEventResponse;
  } catch (error) {
    console.warn('[BehaviorEvent] submit failed:', error);
    return null;
  }
};
