import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { clearTokens, getAccessToken, setAccessToken } from '@/src/shared/api/tokenManager';
import { authApi } from '@/src/shared/api/authApi';
import { isShadowMode } from '@/src/shared/utils/shadowMode';
import { isMockLoginEvent } from '@/src/shared/config/mockEventConfig';

const MOCK_LOGIN_USER_STORAGE_KEY = 'mockLoginUser';

type MockLoginUser = {
  name: string;
  phoneNumber: string;
};

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
  const queryClient = useQueryClient();
  const [mockLoginName, setMockLoginName] = useState('');
  const [mockLoginPhone, setMockLoginPhone] = useState('');
  const [mockLoginError, setMockLoginError] = useState('');
  const [isMockLoginSubmitting, setIsMockLoginSubmitting] = useState(false);
  const [isMockLoginDropdownOpen, setIsMockLoginDropdownOpen] = useState(false);
  const [activeMockUser, setActiveMockUser] = useState<MockLoginUser | null>(() => {
    if (typeof window === 'undefined' || !getAccessToken()) {
      return null;
    }

    try {
      const storedMockUser = window.localStorage.getItem(MOCK_LOGIN_USER_STORAGE_KEY);
      return storedMockUser ? (JSON.parse(storedMockUser) as MockLoginUser) : null;
    } catch {
      window.localStorage.removeItem(MOCK_LOGIN_USER_STORAGE_KEY);
      return null;
    }
  });

  const isMockLoginEnabled = !storyMode && !isShadowMode(activeEventId) && isMockLoginEvent(activeEventId);

  React.useEffect(() => {
    if (isMockLoginEnabled && !getAccessToken()) {
      window.localStorage.removeItem(MOCK_LOGIN_USER_STORAGE_KEY);
    }
  }, [isMockLoginEnabled]);

  const handleMockLoginSubmit = async () => {
    if (isMockLoginSubmitting) return;

    const name = mockLoginName.trim();
    const phoneNumber = mockLoginPhone.replace(/\D/g, '');

    if (!name) {
      setIsMockLoginDropdownOpen(true);
      setMockLoginError('이름을 입력해 주세요.');
      return;
    }

    if (!/^010\d{8}$/.test(phoneNumber)) {
      setIsMockLoginDropdownOpen(true);
      setMockLoginError('전화번호는 010으로 시작하는 11자리 숫자로 입력해 주세요.');
      return;
    }

    try {
      setIsMockLoginSubmitting(true);
      setMockLoginError('');
      const response = await authApi.mockLogin({ name, phoneNumber });
      setAccessToken(response.data.accessToken);
      const mockUser = { name, phoneNumber };
      setActiveMockUser(mockUser);
      window.localStorage.setItem(MOCK_LOGIN_USER_STORAGE_KEY, JSON.stringify(mockUser));
      await queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      setIsMockLoginDropdownOpen(false);
    } catch (error: any) {
      setIsMockLoginDropdownOpen(true);
      setMockLoginError(error?.message || '목업 로그인에 실패했습니다.');
    } finally {
      setIsMockLoginSubmitting(false);
    }
  };

  const handleMockLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // 테스트용 로그아웃은 클라이언트 토큰 정리가 우선입니다.
    } finally {
      clearTokens();
      window.localStorage.removeItem(MOCK_LOGIN_USER_STORAGE_KEY);
      setActiveMockUser(null);
      setMockLoginName('');
      setMockLoginPhone('');
      setMockLoginError('');
      setIsMockLoginDropdownOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['userProfile'] });
    }
  };

  const handleFlowStart = (state: 'QUEUE' | 'WAITLIST_QUEUE') => {
    // 예매/대기열 진입 직전에 DETAIL 행동 데이터를 전송합니다.
    finalize();

    if (state === 'QUEUE' && isMockLoginEnabled) {
      if (activeMockUser || getAccessToken()) {
        continueFlowStart(state);
        return;
      }

      setIsMockLoginDropdownOpen(true);
      setMockLoginError('먼저 테스트 로그인을 완료해 주세요.');
      return;
    }

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

  const MockLoginInlineElement = isMockLoginEnabled ? (
    <div className="relative w-full lg:w-auto shrink-0">
      {activeMockUser ? (
        <div className="flex w-full items-center justify-between gap-3 rounded-xl border border-black/10 bg-white px-4 py-3 shadow-sm lg:w-[340px]">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-content">{activeMockUser.name}</p>
            <p className="mt-0.5 text-xs font-medium text-content-tertiary">{activeMockUser.phoneNumber}</p>
          </div>
          <button
            type="button"
            className="h-9 shrink-0 rounded-lg border border-line bg-surface px-3 text-xs font-bold text-content-secondary transition-colors hover:bg-surface-subtle"
            onClick={handleMockLogout}
          >
            로그아웃
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="h-11 w-full lg:w-[120px] rounded-lg bg-content px-4 text-sm font-bold text-white shadow-sm transition-colors hover:bg-surface-inverse disabled:cursor-not-allowed disabled:opacity-70"
          onClick={() => setIsMockLoginDropdownOpen((prev) => !prev)}
          disabled={isMockLoginSubmitting}
          aria-expanded={isMockLoginDropdownOpen}
        >
          로그인
        </button>
      )}

      {!activeMockUser && isMockLoginDropdownOpen && (
        <form
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-full lg:w-[300px] rounded-xl border border-black/10 bg-white px-4 py-3 shadow-lg"
          onSubmit={(e) => {
            e.preventDefault();
            handleMockLoginSubmit();
          }}
        >
          <div className="flex flex-col gap-2">
            <p className="text-[13px] font-bold text-content">테스트 참여 정보</p>
            <input
              value={mockLoginName}
              onChange={(e) => {
                setMockLoginName(e.target.value);
                if (mockLoginError) setMockLoginError('');
              }}
              className="h-10 rounded-lg border border-line bg-surface px-3 text-[14px] font-medium text-content outline-none placeholder:text-content-muted focus:border-primary"
              placeholder="이름"
              maxLength={12}
              disabled={isMockLoginSubmitting}
            />
            <input
              value={mockLoginPhone}
              onChange={(e) => {
                setMockLoginPhone(e.target.value);
                if (mockLoginError) setMockLoginError('');
              }}
              className="h-10 rounded-lg border border-line bg-surface px-3 text-[14px] font-medium text-content outline-none placeholder:text-content-muted focus:border-primary"
              placeholder="01012345678"
              inputMode="numeric"
              disabled={isMockLoginSubmitting}
            />
            {mockLoginError && (
              <p className="text-xs font-medium text-danger">{mockLoginError}</p>
            )}
            {isMockLoginSubmitting && (
              <p className="text-xs font-medium text-content-tertiary">로그인 처리 중입니다.</p>
            )}
            <button
              type="submit"
              className="mt-1 h-10 rounded-lg bg-content text-sm font-bold text-white transition-colors hover:bg-surface-inverse disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isMockLoginSubmitting}
            >
              확인
            </button>
          </div>
        </form>
      )}
    </div>
  ) : null;

  return { handleFlowStart, MockLoginInlineElement };
};
