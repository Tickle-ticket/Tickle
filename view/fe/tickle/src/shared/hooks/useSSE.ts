'use client';

import { useEffect, useRef, useState } from 'react';
import { getReconnectDelay, shouldRetry } from '@/src/shared/lib/sseReconnect';

interface UseSSEOptions {
  autoReconnect?: boolean;
  /**
   * 재연결을 포기하기까지의 연속 실패 횟수.
   *
   * 지수 백오프가 적용되므로 8회면 약 2분간 시도한다.
   */
  maxReconnectAttempts?: number;
  eventNames?: string[];
}

export const useSSE = <T = any>(url: string, options: UseSSEOptions = {}) => {
  const { autoReconnect = true, maxReconnectAttempts = 8, eventNames = [] } = options;
  const eventNamesKey = eventNames.join('\u001F');
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Event | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastEventAt, setLastEventAt] = useState<number | null>(null);
  /** 재연결을 모두 소진했는지. 호출부가 에러 화면으로 전환하는 근거다. */
  const [isExhausted, setIsExhausted] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  /** 연속 실패 횟수. 연결에 성공하면 0으로 되돌린다. */
  const attemptRef = useRef(0);

  useEffect(() => {
    // URL이 없으면 연결하지 않음 (지연 연결 지원)
    if (!url) return;
    const subscribedEventNames = eventNamesKey ? eventNamesKey.split('\u001F') : [];

    attemptRef.current = 0;

    const connect = () => {
      // EventSource는 자동으로 브라우저 쿠키를 포함하여 요청합니다. (withCredentials 옵션 지원)
      const eventSource = new EventSource(url, { withCredentials: true });
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setIsConnected(true);
        setError(null);
        // 붙었으면 소진 상태를 푼다. url이 바뀌어 다시 연결된 경우까지 여기서
        // 처리되므로 effect 본문에서 따로 초기화하지 않는다.
        setIsExhausted(false);
        // 한 번이라도 붙었으면 이전 실패는 흘려보낸다. 그러지 않으면 몇 시간에
        // 걸쳐 띄엄띄엄 끊긴 것만으로도 재연결을 포기하게 된다.
        attemptRef.current = 0;
      };

      const handleMessage = (event: MessageEvent) => {
        try {
          const parsedData = JSON.parse(event.data);
          setData(parsedData);
        } catch {
          // JSON 형식이 아닌 순수 텍스트인 경우
          setData(event.data as unknown as T);
        }

        setLastEventAt(Date.now());
      };

      eventSource.onmessage = handleMessage;
      subscribedEventNames.forEach((eventName) => {
        eventSource.addEventListener(eventName, handleMessage as EventListener);
      });

      eventSource.onerror = (err) => {
        setIsConnected(false);
        setError(err);

        // 에러 발생 시 기존 소스 닫기
        eventSource.close();

        if (!autoReconnect) return;

        if (!shouldRetry(attemptRef.current, maxReconnectAttempts)) {
          console.error(`[SSE] ${url} 재연결 포기 (${attemptRef.current}회 실패)`);
          setIsExhausted(true);
          return;
        }

        const delay = getReconnectDelay(attemptRef.current);
        attemptRef.current += 1;
        console.warn(
          `[SSE] ${url} 연결 끊김. ${delay}ms 후 재연결 (${attemptRef.current}/${maxReconnectAttempts})`,
        );
        reconnectTimeoutRef.current = setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      setIsConnected(false);
    };
  }, [url, autoReconnect, maxReconnectAttempts, eventNamesKey]);

  return { data, isConnected, error, lastEventAt, isExhausted };
};
