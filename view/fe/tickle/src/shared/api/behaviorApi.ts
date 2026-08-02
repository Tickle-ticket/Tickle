import { getAccessToken } from './tokenManager';
import type { TrialMetrics } from '@/src/shared/utils/schema';
import { BehaviorEventPayload, SendBehaviorEventInput, BehaviorEventResponse } from './types/behavior.types';

const BEHAVIOR_EVENTS_PATH = '/api/behavior/events';

const buildBehaviorEventsUrl = () => {
  let baseUrl = process.env.NEXT_PUBLIC_AI_PUBLIC_API_URL || '';
  if (baseUrl && !baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
    baseUrl = `http://${baseUrl}`;
  }
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

  // 행동 데이터는 로그인한 사용자만 수집한다. 비회원 수집을 위해 가짜 토큰을
  // 채워 보내면 AI 서버 입장에서는 누구나 쓸 수 있는 인증 우회 값이 되므로,
  // 토큰이 없으면 전송하지 않는다. 익명 수집이 필요해지면 서버가 토큰 없는
  // 요청을 받도록 먼저 합의해야 한다.
  if (!accessToken) {
    console.warn('[BehaviorEvent] skipped: access-token is missing');
    return null;
  }

  const body: BehaviorEventPayload = {
    ...payload,
    createdAt: createdAt ?? toOffsetISOString(new Date()),
  };

  try {
    const behaviorUrl = buildBehaviorEventsUrl();
    const isCrossOrigin = typeof window !== 'undefined' && !behaviorUrl.startsWith(window.location.origin);
    
    const response = await fetch(behaviorUrl, {
      method: 'POST',
      credentials: isCrossOrigin ? 'same-origin' : 'include',
      headers: {
        'Content-Type': 'application/json',
        'access-token': accessToken,
        'X-Request-Id': requestId ?? createRequestId(),
        'X-Internal-Secret': process.env.NEXT_PUBLIC_INTERNAL_SECRET || '',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      console.warn('[BehaviorEvent] submit failed:', response.status, data);
      return null;
    }

    if (process.env.NODE_ENV !== 'production') {
    }

    return data as BehaviorEventResponse;
  } catch (error) {
    // AI 서버가 죽어도 예매를 막지 않는다. 다만 완전히 침묵하면 수집이 끊긴 것을
    // 알 수 없어 로그는 남긴다.
    console.warn('[BehaviorEvent] submit error:', error);
    return null;
  }
};
