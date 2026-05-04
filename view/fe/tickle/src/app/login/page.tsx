import type { Metadata } from 'next';
import LoginPageClient from './LoginPageClient';

export const metadata: Metadata = {
  title: '로그인 | Tikkle',
};

export default function LoginPage() {
  return (
    <UserAuthFrame
      activeTab="login"
      compact
    >
      <form className="space-y-4">
        <div className="grid gap-4">
          <Input
            label="이메일"
            type="email"
            name="email"
            placeholder="you@tickle.kr"
            autoComplete="email"
            fullWidth
            required
            style={{ letterSpacing: '-0.02em' }}
            className="[&_input]:text-[25px] mb-3 mt-3"
          />

          <Input
            label="비밀번호"
            type="password"
            name="password"
            placeholder="비밀번호를 입력하세요"
            autoComplete="current-password"
            fullWidth
            required
            style={{ letterSpacing: '-0.02em' }}
            className="[&_input]:text-[25px] mb-3 mt-3"
          />
        </div>

        <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <label className="inline-flex items-center gap-3 font-medium text-slate-600">
            <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
            로그인 상태 유지
          </label>

          <a href="mailto:help@tickle.kr" className="font-bold text-slate-500 transition hover:text-slate-900">
            아이디/비밀번호 찾기
          </a>
        </div>

        <div className="mt-10 grid gap-3">
          <Button type="submit" display="block" size="large" color = "dark">
            로그인
          </Button>
          <div></div>
          <KakaoLoginButton size="large" />
        </div>
      </form>
    </UserAuthFrame>
  );
}
