'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { buildBotDetectionStreamUrl } from '@/src/shared/api/botDetectionApi';
import type { CaptchaResult, CaptchaEventData } from '@/src/shared/api/types/botDetection.types';
import {
  getReconnectDelay,
  shouldRetry,
  BOT_DETECTION_MAX_RECONNECT_ATTEMPTS,
} from '@/src/shared/lib/sseReconnect';

/** SSE 연결 상태 */
export type BotDetectionSSEStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';

interface UseBotDetectionSSEOptions {
  /** SSE 연결 활성화 여부. false이면 연결하지 않습니다. */
  enabled: boolean;
  /** RETRY_CAPTCHA 수신 시 콜백 (새로운 API 스펙에 따라 recordId 전달) */
  onRetryCaptcha?: (recordId: string) => void;
  /** SUCCESS_CLOSE 수신 시 콜백 */
  onSuccessClose?: () => void;
  /** DENY_CLOSE 수신 시 콜백 */
  onDenyClose?: () => void;
  /** BOT_BLOCKED 수신 시 콜백 (즉시 강제 차단) */
  onBotBlocked?: (recordId?: string) => void;
}

/**
 * AI 봇 탐지 SSE 스트림을 관리하는 훅입니다.
 *
 * 사용 흐름:
 * 1. 예매하기 버튼을 누른 시점에 enabled를 true로 전환
 * 2. SSE `captcha` 이벤트의 result에 따라 콜백이 호출됨
 * 3. 컴포넌트 언마운트 시 자동으로 연결 해제
 * 4. 끊기면 지수 백오프로 재연결합니다(BOT_BLOCKED 수신 후에는 붙지 않습니다).
 */
export const useBotDetectionSSE = ({
  enabled,
  onRetryCaptcha,
  onSuccessClose,
  onDenyClose,
  onBotBlocked,
}: UseBotDetectionSSEOptions) => {
  const [status, setStatus] = useState<BotDetectionSSEStatus>('idle');
  const [lastResult, setLastResult] = useState<CaptchaResult | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);

  // 콜백 refs (최신 값을 유지하되 useEffect 재실행 방지)
  const onRetryCaptchaRef = useRef(onRetryCaptcha);
  const onSuccessCloseRef = useRef(onSuccessClose);
  const onDenyCloseRef = useRef(onDenyClose);
  const onBotBlockedRef = useRef(onBotBlocked);

  useEffect(() => { onRetryCaptchaRef.current = onRetryCaptcha; }, [onRetryCaptcha]);
  useEffect(() => { onSuccessCloseRef.current = onSuccessClose; }, [onSuccessClose]);
  useEffect(() => { onDenyCloseRef.current = onDenyClose; }, [onDenyClose]);
  useEffect(() => { onBotBlockedRef.current = onBotBlocked; }, [onBotBlocked]);

  /** SSE 연결 해제 */
  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setStatus('disconnected');
  }, []);

  useEffect(() => {
    if (!enabled) {
      if (eventSourceRef.current) {
        disconnect();
        setStatus('idle');
      }
      return;
    }

    /** 스트림이 제 할 일을 끝냈는지. 차단 확정 후에는 다시 붙지 않는다. */
    let isFinished = false;
    /** 연속 실패 횟수. 붙으면 0으로 되돌린다. */
    let reconnectAttempt = 0;
    let reconnectTimer: NodeJS.Timeout | null = null;

    const connect = () => {
      const url = buildBotDetectionStreamUrl();
      if (!url) {
        console.warn('[BotDetection SSE] 연결 불가: accessToken이 없습니다.');
        setStatus('error');
        return;
      }

      setStatus('connecting');

      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.onopen = () => {
        // 붙었으면 이전 실패는 흘려보낸다. 예매 화면은 오래 머물러서 누적해두면
        // 띄엄띄엄 끊긴 것만으로 재연결을 포기하게 된다.
        reconnectAttempt = 0;
        setStatus('connected');
      };

      // `captcha` named event 리스너
      es.addEventListener('captcha', (event: MessageEvent) => {
        try {
          const data: CaptchaEventData = JSON.parse(event.data);
          setLastResult(data.result);

          switch (data.result) {
            case 'RETRY_CAPTCHA':
              if (data.recordId) {
                onRetryCaptchaRef.current?.(data.recordId);
              } else {
                console.warn('[BotDetection SSE] RETRY_CAPTCHA received but recordId is missing');
              }
              break;
            case 'SUCCESS_CLOSE':
              onSuccessCloseRef.current?.();
              break;
            case 'DENY_CLOSE':
              onDenyCloseRef.current?.();
              break;
            case 'BOT_BLOCKED':
              console.warn('[BotDetection SSE] 🚫 BOT_BLOCKED 수신 — 즉시 강제 차단');
              onBotBlockedRef.current?.(data.recordId);
              // 차단이 확정됐으므로 더 들을 것이 없다. 재연결도 막는다.
              isFinished = true;
              es.close();
              eventSourceRef.current = null;
              setStatus('disconnected');
              break;
            default:
              console.warn('[BotDetection SSE] 알 수 없는 result:', data.result);
          }
        } catch (e) {
          console.error('[BotDetection SSE] captcha 이벤트 파싱 오류:', e);
        }
      });

      es.onerror = () => {
        es.close();
        eventSourceRef.current = null;

        if (isFinished) {
          return;
        }

        // 끊긴 채로 두면 서버가 재검증을 요구해도 받지 못한다. 봇 판정을 놓치는
        // 쪽이 잠깐 더 두드리는 것보다 나쁘다.
        if (!shouldRetry(reconnectAttempt, BOT_DETECTION_MAX_RECONNECT_ATTEMPTS)) {
          console.error(`[BotDetection SSE] 재연결 포기 (${reconnectAttempt}회 실패)`);
          setStatus('error');
          return;
        }

        const delay = getReconnectDelay(reconnectAttempt);
        reconnectAttempt += 1;
        console.warn(
          `[BotDetection SSE] 연결 끊김. ${delay}ms 후 재연결 (${reconnectAttempt}/${BOT_DETECTION_MAX_RECONNECT_ATTEMPTS})`,
        );
        setStatus('connecting');
        reconnectTimer = setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      isFinished = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      disconnect();
    };
  }, [enabled, disconnect]);

  return {
    /** 현재 SSE 연결 상태 */
    status,
    /** 마지막으로 수신한 captcha result */
    lastResult,
    /** 수동으로 연결을 해제합니다 */
    disconnect,
  };
};