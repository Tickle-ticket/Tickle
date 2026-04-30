import Link from 'next/link';
import { UserAuthFrame } from '@/src/shared/components/UserAuthFrame';
import { getSignupFormHref, signupAccountTypes } from './signupAccountType';

export function SignupPageClient() {
  return (
    <UserAuthFrame
      activeTab="signup"
      size="wide"
      footer={
        <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span className="font-medium text-slate-500">이미 계정이 있나요?</span>
          <Link href="/login" className="font-bold text-blue-600 transition hover:text-blue-700">
            로그인
          </Link>
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {signupAccountTypes.map((accountType) => (
          <Link
            key={accountType.value}
            href={getSignupFormHref(accountType.value)}
            className="group flex min-h-[220px] flex-col justify-between rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-5 text-left shadow-[0_12px_30px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-white hover:shadow-[0_18px_44px_rgba(15,23,42,0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-500"
          >
            <div>
              <div className="flex items-center justify-between gap-3">
              </div>
              <h2 className="mt-5 text-xl font-black text-slate-950">{accountType.label}</h2>
              <p className="mt-3 text-sm font-medium leading-6 text-slate-500">
                {accountType.cardDescription}
              </p>
            </div>
            <span className="mt-8 inline-flex text-sm font-black text-blue-600">가입 정보 입력하기</span>
          </Link>
        ))}
      </div>
    </UserAuthFrame>
  );
}

export default SignupPageClient;
