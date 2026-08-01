import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { http, HttpResponse } from 'msw';
import { QueueView } from './QueueView';
import { handlers } from '@/src/shared/api/mock/handlers';

/**
 * 대기열 화면 스토리입니다.
 *
 * storyMode로 대기열 진입을 건너뛰지 않고, MSW의 대기열 핸들러(enter·token·stream)를
 * 그대로 태운다. 그래야 실제 사용자와 같은 흐름 — 진입 요청 → 토큰 수령 →
 * SSE 순번 수신 — 을 확인할 수 있다.
 */

const meta: Meta<typeof QueueView> = {
  title: 'user/QueueView',
  component: QueueView,
  parameters: {
    layout: 'fullscreen',
    nextjs: {
      appDirectory: true,
    },
  },
  args: {
    eventId: '1',
    onAdmitted: (token: string) => console.log('Admitted with token:', token),
    onClose: () => console.log('Queue closed'),
    fastMode: false,
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof QueueView>;

/** 대기열 진입 후 순번을 기다리는 기본 상태. */
export const Default: Story = {};

/** 대기 없이 즉시 입장하는 모드. */
export const FastMode: Story = {
  args: { fastMode: true },
};

/** 취소표 대기 신청 대기열. */
export const CancellationWait: Story = {
  args: { scope: 'CANCELLATION_WAIT' },
};

/** 대기열 진입이 실패한 상태 — 서버가 오류를 내려주는 상황. */
export const ErrorStatus: Story = {
  parameters: {
    // parameters.msw는 기본 핸들러를 덮어쓴다. MSW는 먼저 등록된 핸들러가
    // 우선하므로, 이 스토리의 예외를 앞에 두고 앱 핸들러를 뒤에 펼친다.
    msw: [
      http.post('*/api/v1/queues/:sessionId/enter', () =>
        HttpResponse.json(
          { status: 500, message: '대기열 진입에 실패했습니다.', data: null },
          { status: 500 },
        ),
      ),
      ...handlers,
    ],
  },
};

export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: 'iphone14' },
  },
};

export const Tablet: Story = {
  parameters: {
    viewport: { defaultViewport: 'ipad' },
  },
};
