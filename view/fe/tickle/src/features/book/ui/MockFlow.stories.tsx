import type { Meta, StoryObj } from '@storybook/react';
import { http, HttpResponse } from 'msw';
import { BookView } from './BookView';
import { MOCK_BOOKING_COMPLETE_EVENT_ID } from '../../../shared/config/mockEventConfig';
import { handlers } from '@/src/shared/api/mock/handlers';

/**
 * 티켓팅 체험 행사(커피 쿠폰) 플로우 스토리입니다.
 *
 * 이전에는 window.fetch를 직접 덮어써서 참여 API 응답을 바꿨는데, MSW가 같은 일을
 * 더 안전하게 한다(요청 매칭·정리까지 애드온이 담당). 이제 핸들러만 갈아끼운다.
 */

const CAMPAIGN_EVENT_ID = MOCK_BOOKING_COMPLETE_EVENT_ID || '6025';

/** 체험 참여 응답을 만든다. win 값에 따라 당첨/미당첨 화면이 갈린다. */
const campaignPreorderHandler = (win: boolean) =>
  http.post('*/api/v1/bookings/preorder/mock', () =>
    HttpResponse.json({
      status: 200,
      code: 'OK',
      message: '성공',
      data: {
        bookingId: 9999,
        bookingNo: 'TEST-MOCK',
        bookingStatus: 'CONFIRMED',
        currencyCode: 'KRW',
        totalPaymentAmount: 90000,
        holdExpiresAt: new Date(Date.now() + 600_000).toISOString(),
        seats: [],
        win,
        winCount: win ? 1 : 0,
      },
    }),
  );

const meta: Meta<typeof BookView> = {
  title: 'Mock/MockFlow',
  component: BookView,
  parameters: {
    layout: 'fullscreen',
    nextjs: {
      appDirectory: true,
    },
  },
  args: {
    onClose: () => {},
    eventId: CAMPAIGN_EVENT_ID,
    mode: 'BOOK',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof BookView>;

// parameters.msw는 기본 핸들러를 덮어쓴다. MSW는 먼저 등록된 핸들러가 우선하므로,
// 이 스토리의 예외를 앞에 두고 나머지는 앱 핸들러가 받도록 뒤에 펼친다.

/** 커피 쿠폰에 당첨된 경우. */
export const SuccessMockFlow: Story = {
  parameters: {
    msw: [campaignPreorderHandler(true), ...handlers],
  },
};

/** 당첨되지 않은 경우. */
export const FailMockFlow: Story = {
  parameters: {
    msw: [campaignPreorderHandler(false), ...handlers],
  },
};
