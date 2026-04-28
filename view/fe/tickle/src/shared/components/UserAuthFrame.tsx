import Link from 'next/link';
import type { ReactNode } from 'react';
import { Box } from './Box';
import { Logo } from './Logo';

type AuthTab = 'login' | 'signup';
type FrameSize = 'narrow' | 'wide';

interface UserAuthFrameProps {
  activeTab: AuthTab;
  label: string;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: FrameSize;
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
  description,
  children,
  footer,
  size = 'narrow',
}: UserAuthFrameProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f4f7fb]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-8%] top-[-14%] h-72 w-72 rounded-full bg-sky-200/70 blur-3xl sm:h-96 sm:w-96" />
        <div className="absolute right-[-6%] top-[12%] h-64 w-64 rounded-full bg-cyan-100/90 blur-3xl sm:h-80 sm:w-80" />
        <div className="absolute bottom-[-12%] left-[18%] h-72 w-72 rounded-full bg-blue-100/80 blur-3xl sm:h-[26rem] sm:w-[26rem]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(248,250,252,0.94)_42%,rgba(244,247,251,0.98))]" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-4">
          <Logo variant="black" size="small" className="!w-24 md:!w-28" />
          <Link
            href="/"
            className="inline-flex h-11 items-center rounded-full border border-slate-200 bg-white/90 px-5 text-sm font-bold text-slate-600 shadow-[0_10px_24px_rgba(15,23,42,0.05)] backdrop-blur-sm transition hover:border-slate-300 hover:text-slate-950"
          >
            홈으로
          </Link>
        </header>

        <main className="flex flex-1 items-center justify-center py-8 sm:py-12">
          <Box
            variant="shadow"
            padding="none"
            className={`w-full ${frameSizeClass[size]} rounded-[32px] border border-white/80 bg-white/92 shadow-[0_36px_120px_rgba(15,23,42,0.12)] backdrop-blur-xl`}
          >
            <div className="px-6 py-6 sm:px-8 sm:py-8">
              <div className="flex items-center justify-between gap-4">
                <div className="inline-flex rounded-full bg-slate-100 p-1">
                  {renderAuthTab(activeTab, 'login')}
                  {renderAuthTab(activeTab, 'signup')}
                </div>
                <span className="hidden text-[11px] font-black tracking-[0.18em] text-slate-400 sm:inline-block">
                  TICKLE ACCOUNT
                </span>
              </div>

              <div className="mt-8">
                <p className="text-sm font-bold text-blue-600">{label}</p>
                <h1 className="mt-2 text-[30px] font-black leading-[1.1] tracking-[-0.04em] text-slate-950 sm:text-[34px]">
                  {title}
                </h1>
                <p className="mt-3 text-sm font-medium leading-6 text-slate-500 sm:text-[15px]">
                  {description}
                </p>
              </div>

              <div className="mt-8">{children}</div>

              {footer ? <div className="mt-8 border-t border-slate-200 pt-6">{footer}</div> : null}
            </div>
          </Box>
        </main>
      </div>
    </div>
  );
}

export default UserAuthFrame;
