'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { Box } from './Box';
import { Logo } from './Logo';

type AuthTab = 'login' | 'signup';
type FrameSize = 'narrow' | 'wide';

export interface AuthNavigationItem {
  key: string;
  label: string;
  active?: boolean;
  href?: string;
  onClick?: () => void;
}

interface UserAuthFrameProps {
  activeTab: AuthTab;
  label?: string;
  title?: string;
  children: ReactNode;
  size?: FrameSize;
  compact?: boolean;
  footer?: ReactNode;
  authTabs?: AuthNavigationItem[];
}

export function UserAuthFrame({
  activeTab,
  label,
  title,
  children,
  size = 'narrow',
  compact = false,
  footer,
  authTabs,
}: UserAuthFrameProps) {
  const router = useRouter();
  const shouldShowHeading = activeTab === 'signup' && Boolean(label || title);
  const contentWidth = size === 'wide' ? 'max-w-[640px]' : 'max-w-[560px]';
  const mainLayoutClass = 'justify-start pb-12 pt-10 md:pt-12';
  const bodyClass =
    activeTab === 'login'
      ? 'mt-4 flex min-h-[460px] flex-col justify-center'
      : shouldShowHeading
        ? compact
          ? 'mt-5'
          : 'mt-8'
        : 'mt-4';

  const defaultTabs: AuthNavigationItem[] = [
    {
      key: 'login',
      label: '로그인',
      active: activeTab === 'login',
      href: '/login',
    },
    {
      key: 'signup',
      label: '회원가입',
      active: activeTab === 'signup',
      href: '/signup',
    },
  ];

  const tabs = authTabs ?? defaultTabs;

  return (
    <div className="flex min-h-dvh w-full overflow-hidden bg-white">
      <aside className="hidden shrink-0 flex-col justify-between border-r border-slate-100 bg-slate-50 p-12 lg:flex lg:w-[42%] lg:min-w-[480px] xl:p-20">
        <div>
          <Link href="/" aria-label="홈으로 이동" className="inline-flex items-center">
            <Logo variant="black" size="large" />
          </Link>
          <div className="mt-16 max-w-[420px]">
            <div className="mt-16">
              <h1 className="text-4xl leading-tight font-bold tracking-tight text-slate-900">
                당신의 다음 순간을<br />특별하게 만들어줄 곳
              </h1>
              <p className="mt-4 text-lg text-slate-500">
                티클과 함께 가장 빠르고 편안한<br />예매 경험을 시작해보세요.
              </p>
            </div>
          </div>
        </div>

        <p className="text-sm font-medium text-slate-400">© {new Date().getFullYear()} TICKLE. All rights reserved.</p>
      </aside>

      <div className="relative mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <main className={`mx-auto flex w-full flex-1 flex-col ${mainLayoutClass} ${contentWidth}`}>
          <Box variant="flat" padding="none" className="w-full bg-white">
            <div className="w-full">
              <div className="mb-6 rounded-[20px] sm:rounded-[28px] border border-slate-200 bg-slate-100/80 p-1 sm:p-1.5">
                <div className="grid grid-cols-3 gap-1 sm:gap-1.5">
                  {tabs.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        if (item.onClick) {
                          item.onClick();
                          return;
                        }

                        if (item.href) {
                          if (typeof window !== 'undefined' && window.parent !== window) {
                            // Storybook iframe 내에서 실행 중일 경우 URL을 강제로 변경하고 커스텀 이벤트 발생
                            window.history.pushState({}, '', item.href);
                            window.dispatchEvent(new CustomEvent('storybook-auth-nav', { detail: item.href }));
                          }
                          router.push(item.href);
                        }
                      }}
                      className={`min-h-[44px] sm:min-h-[58px] rounded-[16px] sm:rounded-[22px] px-2 sm:px-4 text-[13px] sm:text-base font-bold transition ${
                        item.active
                          ? 'bg-white text-slate-950 shadow-[0_10px_24px_rgba(15,23,42,0.08)]'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                      aria-current={item.active ? 'page' : undefined}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {shouldShowHeading ? (
                <div className={compact ? 'mt-4' : 'mt-8'}>
                  {label ? <p className="text-sm font-bold text-blue-600">{label}</p> : null}
                  {title ? (
                    <h1
                      className={`mt-2 font-black leading-[1.15] text-slate-950 ${
                        compact ? 'text-[26px] sm:text-[28px]' : 'text-[30px] sm:text-[34px]'
                      }`}
                    >
                      {title}
                    </h1>
                  ) : null}
                </div>
              ) : null}

              <div className={bodyClass}>{children}</div>

              {footer ? (
                <div className={compact ? 'mt-6 border-t border-slate-200 pt-4' : 'mt-8 border-t border-slate-200 pt-6'}>
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
