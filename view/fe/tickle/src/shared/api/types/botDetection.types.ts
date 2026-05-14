import type { ApiResponse } from '../types';

/** SSE captcha 이벤트의 result 값 */
export type CaptchaResult = 'RETRY_CAPTCHA' | 'SUCCESS_CLOSE' | 'DENY_CLOSE';

/** SSE captcha 이벤트 data 페이로드 */
export interface CaptchaEventData {
  result: CaptchaResult;
  recordId?: string;
}

/** CAPTCHA 검증 요청 시 사용하는 플로우 유형 */
export type CaptchaVerifyType = 'BOOKING' | 'DETAIL' | 'CAPTCHA' | 'CAPTCHA_RETRY';

/** POST /api/v1/bot-detection/captcha/verify 요청 바디 */
export interface CaptchaVerifyRequest {
  /** SSE에서 발급받은 Record ID */
  recordId: string;
  /** FE 기준 CAPTCHA 성공 여부 */
  success: boolean;
  /** Cloudflare Turnstile token */
  token: string;
  /** 추론/검증 플로우 유형 */
  type: CaptchaVerifyType;
  /** 이벤트 ID (선택) */
  eventId?: number;
  /** 회차 ID (선택) */
  scheduleId?: number;
  /** 이벤트 날짜 (선택, yyyy-MM-dd) */
  eventDate?: string;
  /** FE 이벤트 생성 시각 (ISO-8601 Instant) */
  createdAt: string;
}

/** POST /api/v1/bot-detection/captcha/verify 성공 응답 data */
export interface CaptchaVerifyResponseData {
  /** Cloudflare 검증 성공 여부 */
  verified: boolean;
  /** 처리 결과 */
  result: 'SUCCESS_CLOSE' | 'DENY_CLOSE';
}

/** POST /api/v1/bot-detection/captcha/verify 전체 응답 */
export type CaptchaVerifyResponse = ApiResponse<CaptchaVerifyResponseData | null>;
