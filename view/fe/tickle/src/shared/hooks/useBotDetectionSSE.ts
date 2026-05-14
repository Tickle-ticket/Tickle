'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { buildBotDetectionStreamUrl } from '@/src/shared/api/botDetectionApi';
import type { CaptchaResult, CaptchaEventData } from '@/src/shared/api/types/botDetection.types';

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
}

/**
 * AI 봇 탐지 SSE 스트림을 관리하는 훅입니다.
 *
 * 사용 흐름:
 * 1. 예매하기 버튼을 누른 시점에 enabled를 true로 전환
 * 2. SSE `captcha` 이벤트의 result에 따라 콜백이 호출됨
 * 3. 컴포넌트 언마운트 시 자동으로 연결 해제
 * 4. 재연결 없이 한 번만 연결합니다.
 */
export const useBotDetectionSSE = ({
  enabled,
  onRetryCaptcha,
  onSuccessClose,
  onDenyClose,
}: UseBotDetectionSSEOptions) => {
  const [status, setStatus] = useState<BotDetectionSSEStatus>('idle');
  const [lastResult, setLastResult] = useState<CaptchaResult | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);

  // 콜백 refs (최신 값을 유지하되 useEffect 재실행 방지)
  const onRetryCaptchaRef = useRef(onRetryCaptcha);
  const onSuccessCloseRef = useRef(onSuccessClose);
  const onDenyCloseRef = useRef(onDenyClose);

  useEffect(() => { onRetryCaptchaRef.current = onRetryCaptcha; }, [onRetryCaptcha]);
  useEffect(() => { onSuccessCloseRef.current = onSuccessClose; }, [onSuccessClose]);
  useEffect(() => { onDenyCloseRef.current = onDenyClose; }, [onDenyClose]);

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
          default:
            console.warn('[BotDetection SSE] 알 수 없는 result:', data.result);
        }
      } catch (e) {
        console.error('[BotDetection SSE] captcha 이벤트 파싱 오류:', e);
      }
    });

    es.onerror = () => {
      console.warn('[BotDetection SSE] ⚠️ 연결 실패 또는 끊김. 재연결하지 않습니다.');
      es.close();
      eventSourceRef.current = null;
      setStatus('error');
    };

    return () => {
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