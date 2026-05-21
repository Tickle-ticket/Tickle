import { getAccessToken } from './tokenManager';
import type { CaptchaVerifyRequest, CaptchaVerifyResponse } from './types/botDetection.types';

// ── URL 빌더 ────────────────────────────────────────────────

const BOT_DETECTION_BASE = '/api/v1/bot-detection';

/**
 * AI 서버의 baseUrl을 반환합니다.
 * behaviorApi.ts의 buildBehaviorEventsUrl과 동일한 환경변수를 사용합니다.
 */
const getAiBaseUrl = (): string => {
  let baseUrl = process.env.NEXT_PUBLIC_AI_PUBLIC_API_URL || '';
  if (baseUrl && !baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
    baseUrl = `http://${baseUrl}`;
  }
  return baseUrl;
};

// ── SSE 스트림 URL 빌더 ──────────────────────────────────────

/**
 * GET /api/v1/bot-detection/stream SSE 연결 URL을 생성합니다.
 *
 * EventSource는 Authorization 헤더를 직접 설정하기 어렵기 때문에
 * accessToken을 query parameter `token`으로 전달합니다.
 *
 * @param tokenOverride accessToken을 명시적으로 지정할 경우 사용 (없으면 localStorage에서 가져옴)
 * @returns 완전한 SSE URL 또는 토큰이 없을 경우 null
 */
export const buildBotDetectionStreamUrl = (tokenOverride?: string): string | null => {
  const accessToken = tokenOverride || getAccessToken();
  if (!accessToken) return null;

  const baseUrl = getAiBaseUrl();
  const url = `${baseUrl}${BOT_DETECTION_BASE}/stream?token=${encodeURIComponent(accessToken)}`;
  return url;
};

// ── CAPTCHA 검증 API ─────────────────────────────────────────

/**
 * POST /api/v1/bot-detection/captcha/verify
 *
 * FE가 Cloudflare CAPTCHA 수행 결과와 Turnstile token을 BE에 전달합니다.
 * - 검증 성공 → blacklist 해제 + SSE에 SUCCESS_CLOSE
 * - 검증 실패 → blacklist 유지 + SSE에 DENY_CLOSE
 */
export const verifyCaptcha = async (body: CaptchaVerifyRequest): Promise<CaptchaVerifyResponse> => {
  const accessToken = getAccessToken();
  if (!accessToken) {
    return {
      status: 401,
      message: '인증 토큰이 없습니다.',
      data: null,
    };
  }

  const baseUrl = getAiBaseUrl();
  const url = `${baseUrl}${BOT_DETECTION_BASE}/captcha/verify`;
  const isCrossOrigin =
    typeof window !== 'undefined' && baseUrl !== '' && !url.startsWith(window.location.origin);

  const response = await fetch(url, {
    method: 'POST',
    credentials: isCrossOrigin ? 'same-origin' : 'include',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'X-Internal-Secret': process.env.NEXT_PUBLIC_INTERNAL_SECRET || '',
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    console.warn('[BotDetection] verifyCaptcha failed:', response.status, data);
    return (
      data ?? {
        status: response.status,
        message: 'CAPTCHA 검증에 실패했습니다.',
        data: null,
      }
    );
  }

  return data as CaptchaVerifyResponse;
};
