'use client';

import React from 'react';
import { ReCaptcha } from '@/src/shared/components/ReCaptcha';

export default function ReCaptchaPage() {
  return (
    <div className="min-h-screen bg-surface-subtle flex items-center justify-center p-4">
      <div className="w-full max-w-[440px]">
        <ReCaptcha
          siteKey="0x4AAAAAADOcVYSwitvl9qep"
          theme="auto"
          title="보안 검증"
          description="안전한 서비스 이용을 위해 인증을 완료해 주세요."
          buttonText="인증 완료"
          onSuccess={(token) => {
            console.log('검증 성공! 토큰:', token);
          }}
          onError={() => {
            console.error('캡챠 검증 실패');
          }}
          onExpire={() => {
            console.warn('캡챠 토큰 만료');
          }}
          onConfirm={(token) => {
            alert(`인증 완료!\n토큰: ${token.substring(0, 20)}...`);
          }}
        />
      </div>
    </div>
  );
}
