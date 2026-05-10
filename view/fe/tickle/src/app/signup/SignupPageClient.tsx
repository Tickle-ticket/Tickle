'use client';
import Link from 'next/link';
import { type AuthNavigationItem, UserAuthFrame } from '@/src/shared/components/UserAuthFrame';
import { getSignupFormHref, signupAccountTypes } from './signupAccountType';

const authTabs: AuthNavigationItem[] = [
  { key: 'audience', label: '일반 회원', href: '/login' },
  { key: 'agency', label: '기획사', href: '/login?mode=agency' },
  { key: 'signup', label: '회원가입', href: '/signup', active: true },
];

export function SignupPageClient() {
  return (
    <UserAuthFrame
      activeTab="signup"
      size="wide"
      authTabs={authTabs}
      label="회원가입"
      title="가입할 계정 유형을 선택해 주세요."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {signupAccountTypes.map((accountType) => (
          <Link
            key={accountType.value}
            href={getSignupFormHref(accountType.value)}
            onClick={(e) => {
              if (typeof window !== 'undefined' && window.parent !== window) {
                e.preventDefault();
                const href = getSignupFormHref(accountType.value);
                window.history.pushState({}, '', href);
                window.dispatchEvent(new CustomEvent('storybook-auth-nav', { detail: href }));
              }
            }}
            className="group flex min-h-[220px] flex-col justify-between rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-5 text-left shadow-[0_12px_30px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-white hover:shadow-[0_18px_44px_rgba(15,23,42,0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-500"
          >
            <div>
              <p className="text-sm font-bold text-blue-600">{accountType.label}</p>
              <h2 className="mt-5 text-xl font-black text-slate-950">{accountType.cardTitle}</h2>
              <p className="mt-3 text-sm font-medium leading-6 text-slate-500">{accountType.cardDescription}</p>
            </div>
            <span className="mt-8 inline-flex text-sm font-black text-blue-600">정보 입력하기</span>
          </Link>
        ))}
      </div>
    </UserAuthFrame>
  );
}

export default SignupPageClient;
