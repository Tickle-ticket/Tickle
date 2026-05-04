'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { Box } from './Box';
import { Logo } from './Logo';
import Tab from './Tab';
import { useHomeBanners } from '@/src/features/home/api/useHomeData';
import { BannerPoster } from '@/src/shared/components/BannerPoster';

type AuthTab = 'login' | 'signup';
type FrameSize = 'narrow' | 'wide';

interface UserAuthFrameProps {
  activeTab: AuthTab;
  label?: string;
  title?: string;
  children: ReactNode;
  size?: FrameSize;
  compact?: boolean;
  label?: string;
  title?: string;
  footer?: ReactNode;
}

export function UserAuthFrame({
  activeTab,
  children,
  size = 'narrow',
  compact = false,
}: UserAuthFrameProps) {
  const hasHeading = Boolean(label || title);

  return (
    <div className="flex h-dvh w-full bg-white overflow-hidden">
      {/* 좌측 브랜딩 영역 (데스크탑에서만 노출, 크기는 Home 배너와 동일하지만 이미지는 숨김) */}
      <div className="hidden lg:flex lg:w-2/5 lg:min-w-[40%] h-full shrink-0 flex-col justify-between bg-slate-50 p-12 lg:p-20 border-r border-slate-100">
        <div>
          <Logo variant="black" size="large" />
          <div className="mt-16">
            <h1 className="text-4xl leading-tight font-bold tracking-tight text-slate-900">
              당신의 다음 순간을<br />특별하게 만들어줄 곳
            </h1>
            <p className="mt-4 text-lg text-slate-500">
              티클과 함께 가장 빠르고 편안한<br />예매 경험을 시작해보세요.
            </p>
          </div>
        </div>

        <div className="text-sm font-medium text-slate-400">
          © {new Date().getFullYear()} TICKLE. All rights reserved.
        </div>
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex items-center gap-4">
          <Link href="/" aria-label="홈으로 이동" className="inline-flex items-center">
            <Logo variant="black" size="small" className="!w-24 md:!w-28" />
          </Link>
        </div>

        <main className="w-full flex-1 flex flex-col justify-center max-w-[480px] mx-auto shrink-0 pb-12">
          <Box
            variant="flat"
            padding="none"
            className="w-full bg-white"
          >
            <div className="w-full">
              <div className="flex items-end justify-between gap-4 mb-4 border-b border-slate-200">
                <div className="w-[180px]">
                  <Tab onChange={handleTabChange} size="small" ariaLabel="Auth Tabs">
                    <Tab.Item selected={activeTab === 'login'}>로그인</Tab.Item>
                    <Tab.Item selected={activeTab === 'signup'}>회원가입</Tab.Item>
                  </Tab>
                </div>
              </div>

              {hasHeading ? (
                <div className={compact ? 'mt-4' : 'mt-8'}>
                  {label ? <p className="text-sm font-bold text-blue-600">{label}</p> : null}
                  {title ? (
                    <h1
                      className={`mt-2 font-black leading-[1.1] tracking-[-0.04em] text-slate-950 ${
                        compact ? 'text-[26px] sm:text-[28px]' : 'text-[30px] sm:text-[34px]'
                      }`}
                    >
                      {title}
                    </h1>
                  ) : null}
                </div>
              ) : null}

              <div className={hasHeading ? (compact ? 'mt-5' : 'mt-8') : 'mt-4'}>{children}</div>

              {footer ? (
                <div className={compact ? 'mt-5 border-t border-slate-200 pt-4' : 'mt-8 border-t border-slate-200 pt-6'}>
                  {footer}
                </div>
              ) : null}
            </div>
          </Box>
        </main>
      </div>
    </div>
  );
}

export default UserAuthFrame;
