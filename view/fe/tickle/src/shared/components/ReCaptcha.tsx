'use client';

import React, { useState, useCallback } from 'react';
import { Turnstile } from '@marsidev/react-turnstile';
import type { TurnstileInstance } from '@marsidev/react-turnstile';
import { Text } from './Text';
import { Box } from './Box';

export interface ReCaptchaProps {
  /** Cloudflare Turnstile Site Key */
  siteKey: string;
  /** 테마: 'light', 'dark', 'auto' */
  theme?: 'light' | 'dark' | 'auto';
  /** 검증 성공 시 토큰을 반환받는 콜백 */
  onSuccess?: (token: string) => void;
  /** 검증 실패 시 호출되는 콜백 */
  onError?: () => void;
  /** 토큰 만료 시 호출되는 콜백 */
  onExpire?: () => void;
  /** 추가 스타일 클래스명 */
  className?: string;
  /** 제목 텍스트 */
  title?: string;
  /** 설명 텍스트 */
  description?: string;
  /** 인증 완료 후 버튼 텍스트 */
  buttonText?: string;
  /** 인증 완료 후 버튼 클릭 콜백 */
  onConfirm?: (token: string) => void;
  /** 버튼 표시 여부 */
  showButton?: boolean;
}

export const ReCaptcha = ({
  siteKey,
  theme = 'auto',
  onSuccess,
  onError,
  onExpire,
  className = '',
  title = '보안 검증',
  description = '안전한 서비스 이용을 위해 인증을 완료해 주세요.',
  buttonText = '인증 완료 후 다음 단계로',
  onConfirm,
  showButton = true,
}: ReCaptchaProps) => {
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error' | 'expired'>('idle');
  const turnstileRef = React.useRef<TurnstileInstance | null>(null);

  const handleSuccess = useCallback((tkn: string) => {
    setToken(tkn);
    setStatus('success');
    onSuccess?.(tkn);
  }, [onSuccess]);

  const handleError = useCallback(() => {
    setToken(null);
    setStatus('error');
    onError?.();
  }, [onError]);

  const handleExpire = useCallback(() => {
    setToken(null);
    setStatus('expired');
    onExpire?.();
  }, [onExpire]);

  const handleConfirmClick = () => {
    if (token && onConfirm) {
      onConfirm(token);
    }
  };

  return (
    <Box variant="outline" className={`overflow-hidden bg-surface ${className}`}>
      <div className="flex flex-col gap-4 p-5 sm:p-6">
        {/* 헤더 */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-subtle flex items-center justify-center shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <div className="flex flex-col">
            <Text typography="t5" fontWeight="bold" className="text-content">{title}</Text>
            <Text typography="t7" color="secondary" className="mt-1">{description}</Text>
          </div>
        </div>

        {/* 캡챠 위젯 */}
        <div className="flex justify-center py-2">
          <Turnstile
            ref={turnstileRef}
            siteKey={siteKey}
            onSuccess={handleSuccess}
            onError={handleError}
            onExpire={handleExpire}
            options={{
              theme,
              size: 'normal',
            }}
          />
        </div>

        {/* 상태 표시 */}
        {status === 'success' && (
          <div className="flex items-center gap-2 px-3 py-2 bg-success-subtle rounded-lg animate-fade-in">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-success shrink-0">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <Text typography="t7" fontWeight="medium" className="text-success">인증이 완료되었습니다.</Text>
          </div>
        )}

        {status === 'error' && (
          <div className="flex items-center gap-2 px-3 py-2 bg-danger-subtle rounded-lg animate-fade-in">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-danger shrink-0">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <Text typography="t7" fontWeight="medium" className="text-danger">인증에 실패했습니다. 다시 시도해 주세요.</Text>
          </div>
        )}

        {status === 'expired' && (
          <div className="flex items-center gap-2 px-3 py-2 bg-warning-light rounded-lg animate-fade-in">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-warning shrink-0">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <Text typography="t7" fontWeight="medium" className="text-warning">인증이 만료되었습니다. 다시 시도해 주세요.</Text>
          </div>
        )}

        {/* 확인 버튼 */}
        {showButton && (
          <button
            disabled={!token}
            onClick={handleConfirmClick}
            className={`w-full py-3.5 rounded-xl font-bold text-[15px] transition-all duration-200 ${
              token
                ? 'bg-primary hover:bg-primary-hover active:bg-primary-hover text-white shadow-lg shadow-blue-500/20'
                : 'bg-surface-muted text-content-muted cursor-not-allowed'
            }`}
          >
            {token ? buttonText : '위 캡챠를 완료해 주세요'}
          </button>
        )}
      </div>
    </Box>
  );
};
