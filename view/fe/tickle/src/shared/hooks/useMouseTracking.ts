import { useEffect, useRef } from 'react';

export interface TrackingEvent {
  type: 'mousemove' | 'click' | 'mousedown' | 'mouseup';
  x: number;
  y: number;
  timestamp: number;
}

interface UseMouseTrackingProps {
  enabled: boolean;
  sessionId?: string;
  throttleMs?: number;
  batchIntervalMs?: number;
}

export const useMouseTracking = ({
  enabled,
  sessionId,
  throttleMs = 100,
  batchIntervalMs = 3000,
}: UseMouseTrackingProps) => {
  const bufferRef = useRef<TrackingEvent[]>([]);
  const lastMoveTimeRef = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const flushBuffer = () => {
      if (bufferRef.current.length === 0) return;

      const payload = {
        sessionId,
        events: bufferRef.current,
        timestamp: Date.now(),
      };

      // TODO: 백엔드 API 연동 시 실제 fetch 로직으로 대체
      console.log(
        `[Bot Detection] Flushing ${payload.events.length} events for session ${payload.sessionId || 'unknown'}:`,
        payload
      );

      // 버퍼 초기화
      bufferRef.current = [];
    };

    // 마우스 이동 이벤트 핸들러 (Throttling 적용)
    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      if (now - lastMoveTimeRef.current >= throttleMs) {
        bufferRef.current.push({
          type: 'mousemove',
          x: e.clientX,
          y: e.clientY,
          timestamp: now,
        });
        lastMoveTimeRef.current = now;
      }
    };

    // 클릭 등 주요 이벤트 핸들러 (즉시 수집)
    const handleInteraction = (e: MouseEvent) => {
      bufferRef.current.push({
        type: e.type as TrackingEvent['type'],
        x: e.clientX,
        y: e.clientY,
        timestamp: Date.now(),
      });
    };

    // 페이지 이탈 시 남은 버퍼 전송
    const handleBeforeUnload = () => {
      if (bufferRef.current.length > 0) {
        console.log('[Bot Detection] Page unload detected, flushing remaining events...');
        flushBuffer();
      }
    };

    // 리스너 등록
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleInteraction);
    window.addEventListener('mousedown', handleInteraction);
    window.addEventListener('mouseup', handleInteraction);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // 주기적 전송(Flush) 타이머 설정
    intervalRef.current = setInterval(flushBuffer, batchIntervalMs);

    return () => {
      // 컴포넌트 언마운트 혹은 비활성화 시 정리
      flushBuffer(); // 종료 직전에 남은 데이터 한번 출력

      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('mousedown', handleInteraction);
      window.removeEventListener('mouseup', handleInteraction);
      window.removeEventListener('beforeunload', handleBeforeUnload);

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, sessionId, throttleMs, batchIntervalMs]);
};
