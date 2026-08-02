'use client';

import { useCallback, useState } from 'react';
import { useBotDetectionSSE } from '@/src/shared/hooks/useBotDetectionSSE';
import { verifyCaptcha } from '@/src/shared/api/botDetectionApi';
import { clearTokens } from '@/src/shared/api/tokenManager';
import { navigateToBlocked } from '@/src/shared/utils/blockedNavigation';

/**
 * 봇 탐지 결과에 따라 CAPTCHA 재검증을 띄우고 그 결과를 서버에 알립니다.
 *
 * <p>서버가 SSE로 판정을 밀어 줍니다. 재검증 요구면 오버레이를 띄우고, 통과하면
 * 닫고, 최종 거부면 안내 모달로 넘어갑니다. 봇으로 확정되면 토큰을 지우고
 * 차단 안내 페이지로 보냅니다.</p>
 *
 * @param activeEventId 현재 공연 식별자. 검증 기록에 함께 보낸다
 * @param enabled       예매 흐름이 진행 중인지. 아닐 때는 구독하지 않는다
 * @return 오버레이·거부 표시 여부와 성공·실패 처리, 그리고 SSE 해제 함수
 */
export const useCaptchaGate = ({
  activeEventId,
  enabled,
}: {
  activeEventId: string | null | undefined;
  enabled: boolean;
}) => {
  const [showOverlay, setShowOverlay] = useState(false);
  const [isDenied, setIsDenied] = useState(false);
  const [recordId, setRecordId] = useState<string>('');

  const { disconnect } = useBotDetectionSSE({
    enabled,
    onRetryCaptcha: (nextRecordId: string) => {
      setRecordId(nextRecordId);
      setIsDenied(false);
      setShowOverlay(true);
    },
    onSuccessClose: () => {
      setShowOverlay(false);
      setIsDenied(false);
    },
    onDenyClose: () => {
      setShowOverlay(false);
      setIsDenied(true);
    },
    onBotBlocked: () => {
      // 즉시 강제 로그아웃 (토큰 삭제) 후 차단 안내 페이지로 이동
      clearTokens();
      navigateToBlocked('blacklist');
    },
  });

  /** 검증 결과를 서버에 알린다. 실패해도 화면을 막지 않고 로그만 남긴다. */
  const report = useCallback(
    async (success: boolean, token: string) => {
      try {
        await verifyCaptcha({
          recordId,
          success,
          token,
          type: 'CAPTCHA_RETRY',
          eventId: activeEventId ? Number(activeEventId) : undefined,
          createdAt: new Date().toISOString(),
        });
      } catch (e) {
        console.error('[CAPTCHA] verifyCaptcha 호출 실패:', e);
      }
    },
    [activeEventId, recordId],
  );

  // 성공을 알리면 서버가 SSE로 SUCCESS_CLOSE를 보내 오버레이가 닫힌다.
  const handleSuccess = useCallback((token: string) => report(true, token), [report]);
  const handleFailure = useCallback(() => report(false, 'captcha-failed'), [report]);

  /** 거부 안내를 닫을 때 표시 상태만 정리한다. 예매 흐름 종료는 호출부가 한다. */
  const dismissDenied = useCallback(() => setIsDenied(false), []);

  return { showOverlay, isDenied, handleSuccess, handleFailure, dismissDenied, disconnect };
};
