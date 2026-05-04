import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Box } from './Box';
import { Button } from './Button';
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
    authTabs: { control: false },
  },
} satisfies Meta<typeof UserAuthFrame>;

export default meta;
type Story = StoryObj<typeof meta>;

export const LoginLayout: Story = {
  args: {
    activeTab: 'login',
    label: '관람객 로그인',
    title: '예매에 사용할 계정으로 로그인해 주세요',
    authTabs: [
      { key: 'audience', label: '관람객', active: true },
      { key: 'agency', label: '기획사' },
      { key: 'signup', label: '회원가입' },
    ],
    children: (
      <div className="space-y-5">
        <Box variant="outline" className="rounded-[24px] p-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-slate-500">이메일</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">you@tickle.kr</p>
            </div>
            <div className="border-t border-slate-200 pt-4">
              <p className="text-sm font-medium text-slate-500">비밀번호</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">••••••••</p>
            </div>
          </div>
        </Box>
        <Button type="button" display="block" size="xlarge">
          로그인
        </Button>
      </div>
    ),
    footer: (
      <div className="flex items-center justify-center gap-3 text-sm text-slate-500">
        <span>비밀번호 찾기</span>
        <span>|</span>
        <span>회원가입</span>
      </div>
    ),
  },
};
