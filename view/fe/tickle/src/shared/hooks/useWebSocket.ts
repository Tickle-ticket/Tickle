'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface UseWebSocketOptions {
  autoReconnect?: boolean;
  reconnectInterval?: number;
  onMessage?: (event: MessageEvent) => void;
  onOpen?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
}

export const useWebSocket = (url: string, options: UseWebSocketOptions = {}) => {
  const {
    autoReconnect = true,
    reconnectInterval = 3000,
    onMessage,
    onOpen,
    onClose,
    onError,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isComponentMounted = useRef(true);

  const connect = useCallback(() => {
    if (!url || !isComponentMounted.current) return;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = (event) => {
        setIsConnected(true);
        if (onOpen) onOpen(event);
      };

      ws.onmessage = (event) => {
        if (onMessage) onMessage(event);
      };

      ws.onclose = (event) => {
        setIsConnected(false);
        if (onClose) onClose(event);

        if (autoReconnect && isComponentMounted.current) {
          reconnectTimeoutRef.current = setTimeout(connect, reconnectInterval);
        }
      };

      ws.onerror = (event) => {
        console.error(`[WS] Error on ${url}`, event);
        if (onError) onError(event);
        // 에러 시 close 이벤트가 연달아 발생하므로 재연결은 onclose에서 처리합니다.
      };
    } catch (error) {
      console.error('[WS] Connection failed', error);
    }
  }, [url, autoReconnect, reconnectInterval, onMessage, onOpen, onClose, onError]);

  useEffect(() => {
    isComponentMounted.current = true;
    connect();

    return () => {
      isComponentMounted.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  // 서버로 메시지를 보내는 헬퍼 함수
  const sendMessage = useCallback((data: string | object) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const payload = typeof data === 'string' ? data : JSON.stringify(data);
      wsRef.current.send(payload);
    } else {
      console.warn('[WS] Cannot send message: WebSocket is not open');
    }
  }, []);

  return { isConnected, sendMessage, ws: wsRef.current };
};
