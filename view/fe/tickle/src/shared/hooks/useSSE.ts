'use client';

import { useEffect, useRef, useState } from 'react';

interface UseSSEOptions {
  autoReconnect?: boolean;
  reconnectInterval?: number;
}

export const useSSE = <T = any>(url: string, options: UseSSEOptions = {}) => {
  const { autoReconnect = true, reconnectInterval = 3000 } = options;
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Event | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // URL이 없으면 연결하지 않음 (지연 연결 지원)
    if (!url) return;

    const connect = () => {
      // EventSource는 자동으로 브라우저 쿠키를 포함하여 요청합니다. (withCredentials 옵션 지원)
      const eventSource = new EventSource(url, { withCredentials: true });
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setIsConnected(true);
        setError(null);
      };

      eventSource.onmessage = (event) => {
        try {
          const parsedData = JSON.parse(event.data);
          setData(parsedData);
        } catch {
          // JSON 형식이 아닌 순수 텍스트인 경우
          setData(event.data as unknown as T);
        }
      };

      eventSource.onerror = (err) => {
        setIsConnected(false);
        setError(err);
        console.error(`[SSE] Error connecting to ${url}`, err);

        // 에러 발생 시 기존 소스 닫기
        eventSource.close();

        // 자동 재연결 로직
        if (autoReconnect) {
          reconnectTimeoutRef.current = setTimeout(connect, reconnectInterval);
        }
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
  }, [url, autoReconnect, reconnectInterval]);

  return { data, isConnected, error };
};
