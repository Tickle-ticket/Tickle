import React from 'react';
import { getAccessToken } from '@/src/shared/api/tokenManager';
import { isShadowMode } from '@/src/shared/utils/shadowMode';

interface UseEventFlowStartParams {
  activeEventId: string | null;
  storyMode: boolean;
  continueFlowStart: (state: 'QUEUE' | 'WAITLIST_QUEUE') => void;
  setModalConfig: (config: {
    isOpen: boolean;
    title: string;
    content: string;
    onConfirm?: () => void;
    confirmText?: string;
    showCancelButton?: boolean;
  }) => void;
  finalize: () => Promise<any>;
}

export const useEventFlowStart = ({
  activeEventId,
  storyMode,
  continueFlowStart,
  setModalConfig,
  finalize
}: UseEventFlowStartParams) => {

  const handleFlowStart = (state: 'QUEUE' | 'WAITLIST_QUEUE') => {
    // 예매/대기열 진입 직전에 DETAIL 행동 데이터를 전송합니다.
    finalize();

    if (!storyMode && !getAccessToken() && !isShadowMode(activeEventId)) {
      setModalConfig({
        isOpen: true,
        title: '로그인 필요',
        content: '로그인이 필요한 서비스입니다.',
        confirmText: '로그인하기',
        showCancelButton: true,
        onConfirm: () => {
          const redirectUrl = `/detail?id=${activeEventId}`;
          window.location.href = `/login?redirect=${encodeURIComponent(redirectUrl)}`;
        }
      });
      return;
    }

    continueFlowStart(state);
  };

  const MockLoginInlineElement = null;

  return { handleFlowStart, MockLoginInlineElement };
};

