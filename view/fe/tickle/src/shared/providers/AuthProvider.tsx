'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { getAccessToken, restoreSession } from '@/src/shared/api/tokenManager';

/**
 * 인증 상태.
 *
 * <p>{@code loading}과 {@code anonymous}를 반드시 구분해야 합니다. 토큰이 메모리에만
 * 있어 부팅 직후에는 로그인한 사용자도 잠시 토큰이 없습니다. 이때를 비로그인으로
 * 보면 로그인 화면으로 잘못 보내게 됩니다.</p>
 */
export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

type AuthContextValue = {
  status: AuthStatus;
  /** 부팅 복구가 끝났는지. 인증 여부를 판단하기 전에 이것부터 본다. */
  isResolved: boolean;
};

const AuthContext = createContext<AuthContextValue>({
  status: 'loading',
  isResolved: false,
});

/**
 * 부팅 시 로그인 상태를 되살리고, 그 진행 상황을 아래로 내려보냅니다.
 *
 * <p>액세스 토큰은 메모리에만 두므로 새로고침하면 사라집니다. 리프레시 토큰은
 * HttpOnly 쿠키로 남아 있어, 부팅할 때 한 번 재발급하면 로그인이 이어집니다.</p>
 */
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [status, setStatus] = useState<AuthStatus>(() =>
    // 로그인 직후 클라이언트 이동 등으로 이미 토큰이 있으면 복구할 것이 없다.
    getAccessToken() ? 'authenticated' : 'loading',
  );

  useEffect(() => {
    if (status !== 'loading') return;

    let isActive = true;
    restoreSession()
      .then((restored) => {
        if (isActive) setStatus(restored ? 'authenticated' : 'anonymous');
      })
      .catch(() => {
        // 네트워크 실패도 비로그인으로 본다. 화면을 막지 않는 쪽이 낫다.
        if (isActive) setStatus('anonymous');
      });

    return () => {
      isActive = false;
    };
    // 부팅 시 한 번만 돈다. status를 넣으면 복구 후 다시 평가돼 의미가 없다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider value={{ status, isResolved: status !== 'loading' }}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * 인증 상태를 읽습니다.
 *
 * <p>로그인 여부로 분기하기 전에 {@code isResolved}를 먼저 확인해야 합니다.
 * 부팅 중에는 로그인한 사용자도 {@code loading}입니다.</p>
 */
export const useAuth = () => useContext(AuthContext);
