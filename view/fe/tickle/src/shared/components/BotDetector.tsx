"use client";

import React, { useEffect, useState } from 'react';
import { useUserProfile } from '../api/useUserProfile';
import { apiClient } from '../api/client';
import { navigateToBlocked } from '../utils/blockedNavigation';

export const BotDetector = ({ children }: { children: React.ReactNode }) => {
  const [isBot, setIsBot] = useState(false);
  const { data: userProfile, isLoading } = useUserProfile();

  useEffect(() => {
    // 1. Check for navigator.webdriver
    if (navigator.webdriver) {
      setIsBot(true);
      return;
    }

    // 2. Check for common automation variables injected by WebDriver
    const documentElement = window.document.documentElement;
    if (documentElement.getAttribute('webdriver')) {
      setIsBot(true);
      return;
    }

    // Optional: Additional checks for puppeteer / phantomjs can be added here
    if (window.navigator.userAgent.toLowerCase().includes('headless')) {
      setIsBot(true);
      return;
    }
  }, []);

  useEffect(() => {
    // 봇으로 탐지되었고, 유저 정보 로딩이 끝난 상태라면 (로그인 여부 확인 완료)
    if (isBot && !isLoading) {
      const reportBotAndRedirect = async () => {
        try {
          if (userProfile?.userId) {
            await apiClient('/internal/v1/blacklist', {
              method: 'POST',
              // /internal/** 는 서버 간 통신 경로라 InternalSecretInterceptor가
              // X-Internal-Secret을 요구한다. apiClient는 Authorization만 붙이므로
              // 여기서 직접 넘긴다.
              headers: {
                'X-Internal-Secret': process.env.NEXT_PUBLIC_INTERNAL_SECRET || '',
              },
              body: {
                userId: userProfile.userId,
                reason: "MACRO_DETECTED_FE",
                detail: "WebDriver를 통한 봇사용 감지",
              },
            });
          }
        } catch (error) {
          console.error('[BotDetector] 블랙리스트 API 전송 실패:', error);
        } finally {
          // 전송 성공 여부와 상관없이 무조건 차단 화면으로 이동
          navigateToBlocked();
        }
      };

      reportBotAndRedirect();
    }
  }, [isBot, isLoading, userProfile]);

  if (isBot) {
    // 네트워크 요청을 기다리는 동안 화면을 백지 상태로 렌더링
    return null;
  }

  return <>{children}</>;
};
