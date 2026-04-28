import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Box } from './Box';
import { Button } from './Button';
import { Input } from './Input';
import { UserAuthFrame } from './UserAuthFrame';

const meta = {
  title: 'user/AuthFrame',
  component: UserAuthFrame,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    children: { control: false },
    footer: { control: false },
  },
} satisfies Meta<typeof UserAuthFrame>;

export default meta;
type Story = StoryObj<typeof meta>;

export const LoginLayout: Story = {
  args: {
    activeTab: 'login',
    label: '로그인',
    title: '실제 서비스처럼 바로 로그인할 수 있는 인증 화면',
    children: (
      <form className="space-y-6">
        <div className="grid gap-5">
          <Input label="이메일" type="email" placeholder="you@tickle.kr" fullWidth />
          <Input label="비밀번호" type="password" placeholder="비밀번호를 입력하세요" fullWidth />
        </div>

        <div className="grid gap-3">
          <Button type="submit" display="block">
            로그인
          </Button>
          <Box variant="gray" className="rounded-[24px] bg-slate-50">
            <p className="text-sm font-black text-slate-900">서비스 연결 안내</p>
            <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
              같은 계정으로 예매, 공연 운영, 관리자 모니터링 메뉴에 접근할 수 있습니다.
            </p>
          </Box>
        </div>
      </form>
    ),
    footer: (
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="font-medium text-slate-500">아직 계정이 없나요?</span>
        <a href="/signup" className="font-bold text-blue-600">
          회원가입
        </a>
      </div>
    ),
  },
};
