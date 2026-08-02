import React from 'react';
import { getAccessToken } from '@/src/shared/api/tokenManager';
import type { TrialJSON } from '@/src/shared/utils/schema';
import type { DetailFlowPolicy } from '../api/detailFlowPolicy';

interface UseEventFlowStartParams {
  activeEventId: string | null;
  /** 로그인 확인이 필요한 시나리오인지 판단하는 정책(DetailView가 만들어 넘긴다). */
  policy: DetailFlowPolicy;
  continueFlowStart: (state: 'QUEUE' | 'WAITLIST_QUEUE') => void;
  setModalConfig: (config: {
    isOpen: boolean;
    title: string;
    content: string;
    onConfirm?: () => void;
    confirmText?: string;
    showCancelButton?: boolean;
  }) => void;
  finalize: () => Promise<TrialJSON | null>;
}

export const useEventFlowStart = ({
  activeEventId,
  policy,
  continueFlowStart,
  setModalConfig,
  finalize
}: UseEventFlowStartParams) => {

  const handleFlowStart = (state: 'QUEUE' | 'WAITLIST_QUEUE') => {
    // 예매/대기열 진입 직전에 DETAIL 행동 데이터를 전송합니다.
    finalize();

    if (policy.requiresLogin && !getAccessToken()) {
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

