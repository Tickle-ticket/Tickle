import { useRef, useEffect, useCallback } from 'react';
import { TrialCollector } from './TrialCollector';
import { sendBehaviorEvent } from '@/src/shared/api/behaviorApi';
import type { BehaviorEventType } from '@/src/shared/api/types/behavior.types';
import type { TrialStage, TrialJSON } from '../utils/schema';

interface UseTrialCollectorOptions {
  /** 수집 활성화 여부 */
  enabled: boolean;
  /** 사용자 ID */
  userId?: number | null;
  /** AI Ingest Server 행동 이벤트 전송용 메타데이터 */
  behaviorEvent?: {
    eventId?: number | null;
    scheduleId?: number | null;
    eventDate?: string | null;
  };
}

export const useTrialCollector = ({ enabled, userId, behaviorEvent }: UseTrialCollectorOptions) => {
  const collectorRef = useRef<TrialCollector | null>(null);
  const behaviorEventRef = useRef(behaviorEvent);

  useEffect(() => {
    behaviorEventRef.current = behaviorEvent;
  }, [behaviorEvent]);

  const sendBehaviorEventFromTrial = useCallback((trial: TrialJSON) => {
    const metadata = behaviorEventRef.current;

    let behaviorType: BehaviorEventType | null = null;
    const stage = trial.summary.stage.toLowerCase();
    if (stage === 'detail') behaviorType = 'DETAIL';
    else if (stage === 'captcha') behaviorType = 'CAPTCHA';
    else if (stage === 'booking') behaviorType = 'BOOKING';

    if (!behaviorType) return; // 알 수 없는 stage면 전송 안 함

    void sendBehaviorEvent({
      type: behaviorType,
      eventId: metadata?.eventId ?? undefined,
      scheduleId: metadata?.scheduleId ?? undefined,
      eventDate: metadata?.eventDate ?? undefined,
      features: trial.metrics,
    });
  }, []);

  // 컬렉터 인스턴스 초기화
  useEffect(() => {
    if (!enabled) return;

    const collector = new TrialCollector({ userId });
    collectorRef.current = collector;

    // ── Event Handlers ──────────────────────────────────────
    const handleMousemove = (e: MouseEvent) => {
      collector.addMousemove(e.clientX, e.clientY);
    };

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const trackId = target?.closest('[data-track-id]')?.getAttribute('data-track-id') ?? null;
      const trackedEl = target?.closest('[data-track-id]') as HTMLElement | null;
      collector.addClick(e.clientX, e.clientY, trackId, trackedEl);
    };

    const handleScroll = () => {
      collector.addScroll(window.scrollY);
    };

    const handleKeydown = (e: KeyboardEvent) => {
      collector.addKeydown(e.key, e.code, e.repeat);
    };

    const handleKeyup = (e: KeyboardEvent) => {
      collector.addKeyup(e.key, e.code);
    };

    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      const trackId = target?.closest?.('[data-track-id]')?.getAttribute('data-track-id') ?? null;
      collector.addFocus(trackId);
    };

    const handlePaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      const trackId = target?.closest?.('[data-track-id]')?.getAttribute('data-track-id') ?? null;
      collector.addPaste(trackId);
    };

    // 페이지 이탈 시 전송 시도
    const handleBeforeUnload = () => {
      if (collectorRef.current) {
        const trial = collectorRef.current.finalize();
        if (!trial) return;
        // navigator.sendBeacon for reliability on page unload
        try {
          const blob = new Blob([JSON.stringify(trial)], { type: 'application/json' });
          navigator.sendBeacon('/api/v1/trials', blob);
        } catch {
          console.warn('[TrialCollector] sendBeacon failed');
        }
      }
    };

    // ── Register Listeners ──────────────────────────────────
    window.addEventListener('mousemove', handleMousemove);
    window.addEventListener('click', handleClick, true); // capture phase
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('keydown', handleKeydown);
    window.addEventListener('keyup', handleKeyup);
    document.addEventListener('focusin', handleFocus as EventListener);
    document.addEventListener('paste', handlePaste as EventListener);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('mousemove', handleMousemove);
      window.removeEventListener('click', handleClick, true);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('keydown', handleKeydown);
      window.removeEventListener('keyup', handleKeyup);
      document.removeEventListener('focusin', handleFocus as EventListener);
      document.removeEventListener('paste', handlePaste as EventListener);
      window.removeEventListener('beforeunload', handleBeforeUnload);

      collector.destroy();
      collectorRef.current = null;
    };
  }, [enabled]);

  // ── Stage 변경 (이전 단계 데이터 자동 전송) ────────────────
  const setStage = useCallback(async (stage: TrialStage) => {
    if (!collectorRef.current) return;

    const flushed = collectorRef.current.setStage(stage);
    if (flushed) {
      console.log(`[TrialCollector] Stage "${flushed.sessionId}" flushed:`, flushed);
      console.log(`  → ${flushed.eventRows.length} events, ${flushed.summary.clickCount} clicks in ${flushed.summary.durationMs}ms`);

      // (legacy) submitTrial was removed because the backend doesn't have /api/v1/trials

      sendBehaviorEventFromTrial(flushed);
    }
  }, [sendBehaviorEventFromTrial]);

  // ── 선택 좌석 업데이트 ────────────────────────────────────
  const setSelectedSeats = useCallback((seats: string[]) => {
    collectorRef.current?.setSelectedSeats(seats);
  }, []);

  // ── 세션 종료 및 전송 ─────────────────────────────────────
  const finalize = useCallback(async (): Promise<TrialJSON | null> => {
    if (!collectorRef.current) return null;

    const trial = collectorRef.current.finalize();
    if (!trial) return null; // 이미 finalize된 경우

    sendBehaviorEventFromTrial(trial);

    return trial;
  }, [sendBehaviorEventFromTrial]);

  return { setStage, setSelectedSeats, finalize };
};
