'use client';

import React, { useEffect } from 'react';
import Script from 'next/script';

interface TurnstileProps {
  /** Cloudflare Turnstile Site Key */
  siteKey: string;
  /** 추가 스타일 클래스명 */
  className?: string;
  /** 테마: 'light', 'dark', 'auto' */
  theme?: 'light' | 'dark' | 'auto';
  /** 검증 성공 시 토큰을 반환받는 콜백 */
  onVerify?: (token: string) => void;
}

export const Turnstile: React.FC<TurnstileProps> = ({ 
  siteKey, 
  className = '', 
  theme = 'auto',
  onVerify 
}) => {
  useEffect(() => {
    // 자동(implicit) 렌더링에서 콜백을 받기 위한 전역 함수 등록
    if (onVerify) {
      window.onTurnstileSuccess = (token: string) => {
        onVerify(token);
      };
    }

    return () => {
      // 컴포넌트 언마운트 시 전역 콜백 정리
      if (window.onTurnstileSuccess) {
        delete window.onTurnstileSuccess;
      }
    };
  }, [onVerify]);

  return (
    <>
      {/* Cloudflare Turnstile API 스크립트 로드 */}
      <Script 
        src="https://challenges.cloudflare.com/turnstile/v0/api.js" 
        strategy="lazyOnload" 
        async 
        defer 
      />
      {/* 
        class="cf-turnstile" 지정 시 Turnstile 라이브러리가 스크립트 로드 후
        해당 div를 감지하고 자동으로 위젯을 렌더링합니다. 
      */}
      <div 
        className={`cf-turnstile ${className}`}
        data-sitekey={siteKey}
        data-theme={theme}
        data-callback="onTurnstileSuccess"
      ></div>
    </>
  );
};
