import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getAccessToken, setAccessToken } from '@/src/shared/api/tokenManager';
import { authApi } from '@/src/shared/api/authApi';
import { isShadowMode } from '@/src/shared/utils/shadowMode';
import { isMockLoginEvent } from '@/src/shared/config/mockEventConfig';
import { Modal } from '@/src/shared/components/Modal';

interface UseEventFlowStartParams {
  activeEventId: string | null;
  storyMode: boolean;
  continueFlowStart: (state: 'QUEUE' | 'WAITLIST_QUEUE') => void;
  setModalConfig: (config: { isOpen: boolean; title: string; content: string; onConfirm?: () => void; confirmText?: string; showCancelButton?: boolean }) => void;
  finalize: () => Promise<any>;
}

export const useEventFlowStart = ({ activeEventId, storyMode, continueFlowStart, setModalConfig, finalize }: UseEventFlowStartParams) => {
  const queryClient = useQueryClient();
  const [isMockLoginOpen, setIsMockLoginOpen] = useState(false);
  const [mockLoginName, setMockLoginName] = useState('');
  const [mockLoginPhone, setMockLoginPhone] = useState('');
  const [mockLoginError, setMockLoginError] = useState('');
  const [isMockLoginSubmitting, setIsMockLoginSubmitting] = useState(false);
  const [pendingMockLoginFlow, setPendingMockLoginFlow] = useState<'QUEUE' | 'WAITLIST_QUEUE' | null>(null);

  const handleFlowStart = (state: 'QUEUE' | 'WAITLIST_QUEUE') => {
    // 예매하기(또는 예매/대기열 시작) 버튼을 누르면 무조건 지금까지 수집된 DETAIL 데이터를 전송합니다.
    finalize();

    if (!storyMode && !isShadowMode(activeEventId) && state === 'QUEUE' && isMockLoginEvent(activeEventId)) {
      setPendingMockLoginFlow(state);
      setMockLoginError('');
      setIsMockLoginOpen(true);
      return;
    }

    if (!storyMode && !getAccessToken() && !isShadowMode(activeEventId)) {
      setModalConfig({
        isOpen: true,
        title: '로그인 필요',
        content: '로그인이 필요한 서비스입니다.',
        confirmText: '로그인 하기',
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

  const handleMockLoginSubmit = async () => {
    const name = mockLoginName.trim();
    const phoneNumber = mockLoginPhone.replace(/\D/g, '');

    if (!name) {
      setMockLoginError('이름을 입력해주세요.');
      return;
    }

    if (!/^010\d{8}$/.test(phoneNumber)) {
      setMockLoginError('전화번호는 010으로 시작하는 11자리 숫자로 입력해주세요.');
      return;
    }

    try {
      setIsMockLoginSubmitting(true);
      setMockLoginError('');
      const response = await authApi.mockLogin({ name, phoneNumber });
      setAccessToken(response.data.accessToken);
      await queryClient.invalidateQueries({ queryKey: ['userProfile'] });

      const nextFlow = pendingMockLoginFlow;
      setIsMockLoginOpen(false);
      setPendingMockLoginFlow(null);
      setMockLoginName('');
      setMockLoginPhone('');

      if (nextFlow) {
        continueFlowStart(nextFlow);
      }
    } catch (error: any) {
      setMockLoginError(error?.message || '목업 로그인에 실패했습니다.');
    } finally {
      setIsMockLoginSubmitting(false);
    }
  };

  const MockLoginModalElement = (
    <Modal
      isOpen={isMockLoginOpen}
      onClose={() => {
        if (isMockLoginSubmitting) return;
        setIsMockLoginOpen(false);
        setPendingMockLoginFlow(null);
        setMockLoginError('');
      }}
      onConfirm={handleMockLoginSubmit}
      title="이벤트 참여용 로그인"
      description="상품 지급을 위해 이름과 전화번호를 입력해주세요"
      confirmText="계속하기"
      cancelText="취소"
      showCancelButton={true}
      isLoading={isMockLoginSubmitting}
      isConfirmDisabled={isMockLoginSubmitting}
      className="max-w-[360px]"
    >
      <div className="w-full flex flex-col gap-3 mt-2 text-left">
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-content">
          이름
          <input
            value={mockLoginName}
            onChange={(e) => setMockLoginName(e.target.value)}
            className="h-11 rounded-xl border border-line bg-surface px-3 text-[15px] font-medium outline-none focus:border-primary"
            placeholder="김싸피"
            maxLength={12}
            disabled={isMockLoginSubmitting}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-content">
          전화번호
          <input
            value={mockLoginPhone}
            onChange={(e) => setMockLoginPhone(e.target.value)}
            className="h-11 rounded-xl border border-line bg-surface px-3 text-[15px] font-medium outline-none focus:border-primary"
            placeholder="01012345678"
            inputMode="numeric"
            disabled={isMockLoginSubmitting}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleMockLoginSubmit();
              }
            }}
          />
        </label>
        {mockLoginError && (
          <p className="text-sm font-medium text-danger">{mockLoginError}</p>
        )}
      </div>
    </Modal>
  );

  return { handleFlowStart, MockLoginModalElement };
};
