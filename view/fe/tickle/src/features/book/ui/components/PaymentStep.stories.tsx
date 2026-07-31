import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { http, HttpResponse } from 'msw';
import { PaymentStep } from './PaymentStep';
import { useBookStore } from '../../store/useBookStore';
import { handlers } from '@/src/shared/api/mock/handlers';

/**
 * 결제 단계 스토리입니다.
 *
 * 결제 데이터는 props로 주입하고, 결제 요청 응답은 MSW로 공급한다.
 *
 * 다만 `storyMode`는 남겨둔다 — 카카오페이는 window.open으로 외부 팝업을 띄우는데
 * 이는 네트워크가 아니라서 MSW로 대체할 수 없다. storyMode일 때만 팝업 대신
 * 안내 모달을 보여준다(PaymentStep#handlePayment).
 */

const meta: Meta<typeof PaymentStep> = {
  title: 'user/PaymentStep',
  component: PaymentStep,
  parameters: {
    layout: 'fullscreen',
    nextjs: {
      appDirectory: true,
    },
  },
  decorators: [
    (Story) => {
      const { setBookingStep, setPriceGradeTicketCounts } = useBookStore.getState();

      React.useEffect(() => {
        setBookingStep('PAYMENT');
        setPriceGradeTicketCounts({
          VIP: { 일반: 1 },
          R: { 일반: 1 },
        });
      }, []);

      return (
        <div className="relative w-full h-screen bg-surface-muted overflow-hidden">
          {/* PaymentStep은 헤더 아래에 놓이는 것을 전제로 하므로 자리만 잡아준다. */}
          <div className="h-[73px] bg-surface border-b border-line flex items-center px-6 font-bold">
            Header Mock
          </div>
          <Story />
        </div>
      );
    },
  ],
  args: {
    optionsData: {
      seats: [
        { priceGrade: 'VIP', seatLabel: 'A열 1번' },
        { priceGrade: 'R', seatLabel: 'B열 2번' },
      ] as any,
      totalTicketPriceAmount: 150000,
      totalCount: 2,
    },
    preorderBookingId: 1,
    eventId: '1',
    scheduleId: '1',
    userId: 1,
    userProfile: { name: '홍길동', email: 'test@test.com', phoneNumber: '010-1234-5678' },
    onCancel: () => {},
    onConflictError: () => {},
    onError: () => {},
    // 카카오페이 외부 팝업 대신 안내 모달을 띄운다(위 주석 참고).
    storyMode: true,
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof PaymentStep>;

/** 결제 수단 선택 기본 화면. */
export const Default: Story = {};

export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: 'iphone14' },
    layout: 'fullscreen',
  },
};

export const Tablet: Story = {
  parameters: {
    viewport: { defaultViewport: 'ipad' },
    layout: 'fullscreen',
  },
};

/** 결제 요청이 실패한 상태 — 이미 처리된 결제(409). */
export const AlreadyProcessed: Story = {
  parameters: {
    // parameters.msw는 기본 핸들러를 덮어쓴다. MSW는 먼저 등록된 핸들러가
    // 우선하므로, 이 스토리의 예외를 앞에 두고 앱 핸들러를 뒤에 펼친다.
    msw: [
      http.post('*/api/v1/payments/**', () =>
        HttpResponse.json(
          { status: 409, message: '이미 처리된 결제입니다.', data: null },
          { status: 409 },
        ),
      ),
      ...handlers,
    ],
  },
};
