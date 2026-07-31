import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ToastProvider, useToast } from '@/src/shared/providers/ToastProvider';

/**
 * alert을 대체한 전역 토스트. 실제 화면에서 쓰이는 문구로 확인한다.
 */
const ToastDemo = () => {
  const { showToast } = useToast();

  return (
    <div className="flex flex-col gap-3 p-8">
      <button
        className="rounded-lg bg-danger px-4 py-2 text-white"
        onClick={() => showToast('로그아웃 중 오류가 발생했습니다.')}
      >
        error — 로그아웃 실패
      </button>
      <button
        className="rounded-lg bg-primary px-4 py-2 text-white"
        onClick={() => showToast('취소가 완료되었습니다.', 'success')}
      >
        success
      </button>
      <button
        className="rounded-lg bg-surface-inverse px-4 py-2 text-content-inverse"
        onClick={() => showToast('카카오 가입 세션이 만료되었습니다.\n다시 로그인해 주세요.', 'info')}
      >
        info — 줄바꿈 포함
      </button>
      <button
        className="rounded-lg border px-4 py-2"
        onClick={() => {
          // 4개를 연달아 띄우면 오래된 것이 밀려 3개만 남아야 한다
          for (let i = 1; i <= 4; i++) showToast(`연속 알림 ${i}`);
        }}
      >
        4개 연속 (최대 3개만 보임)
      </button>
    </div>
  );
};

const meta = {
  title: 'shared/Toast',
  component: ToastDemo,
  decorators: [
    (Story) => (
      <ToastProvider>
        <Story />
      </ToastProvider>
    ),
  ],
} satisfies Meta<typeof ToastDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
