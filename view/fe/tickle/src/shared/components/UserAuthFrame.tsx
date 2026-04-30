import Link from 'next/link';
import type { ReactNode } from 'react';
import { Box } from './Box';
import { Logo } from './Logo';

type AuthTab = 'login' | 'signup';
type FrameSize = 'narrow' | 'wide';

interface UserAuthFrameProps {
  activeTab: AuthTab;
  label?: string;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: FrameSize;
  compact?: boolean;
}

const frameSizeClass: Record<FrameSize, string> = {
  narrow: 'max-w-[540px]',
  wide: 'max-w-[760px]',
};

function renderAuthTab(activeTab: AuthTab, tab: AuthTab) {
  const isActive = activeTab === tab;
  const label = tab === 'login' ? '로그인' : '회원가입';
  const href = tab === 'login' ? '/login' : '/signup';

  if (isActive) {
    return (
      <span className="inline-flex min-w-[96px] items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-black text-slate-950 shadow-[0_8px_20px_rgba(15,23,42,0.08)]">
        {label}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className="inline-flex min-w-[96px] items-center justify-center rounded-full px-4 py-2 text-sm font-bold text-slate-500 transition hover:text-slate-950"
    >
      {label}
    </Link>
  );
}

export function UserAuthFrame({
  activeTab,
  label,
  title,
  children,
  footer,
  size = 'narrow',
  compact = false,
}: UserAuthFrameProps) {
  const hasHeading = Boolean(label || title);

  return (
    <div className="relative h-dvh overflow-y-auto overflow-x-hidden bg-[#f4f7fb] [scrollbar-gutter:stable]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-8%] top-[-14%] h-72 w-72 rounded-full bg-sky-200/70 blur-3xl sm:h-96 sm:w-96" />
        <div className="absolute right-[-6%] top-[12%] h-64 w-64 rounded-full bg-cyan-100/90 blur-3xl sm:h-80 sm:w-80" />
        <div className="absolute bottom-[-12%] left-[18%] h-72 w-72 rounded-full bg-blue-100/80 blur-3xl sm:h-[26rem] sm:w-[26rem]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(248,250,252,0.94)_42%,rgba(244,247,251,0.98))]" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex items-center gap-4">
          <Link href="/" aria-label="홈으로 이동" className="inline-flex items-center">
            <Logo variant="black" size="small" className="!w-24 md:!w-28" />
          </Link>
        </header>

        <main className={`flex flex-1 items-center justify-center ${compact ? 'py-2 sm:py-3' : 'py-8 sm:py-12'}`}>
          <Box
            variant="shadow"
            padding="none"
            className={`w-full ${frameSizeClass[size]} rounded-[32px] border border-white/80 bg-white/92 shadow-[0_36px_120px_rgba(15,23,42,0.12)] backdrop-blur-xl`}
          >
            <div className={compact ? 'px-6 py-4 sm:px-7 sm:py-5' : 'px-6 py-6 sm:px-8 sm:py-8'}>
              <div className="flex items-center justify-between gap-4">
                <div className="inline-flex rounded-full bg-slate-100 p-1">
                  {renderAuthTab(activeTab, 'login')}
                  {renderAuthTab(activeTab, 'signup')}
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
