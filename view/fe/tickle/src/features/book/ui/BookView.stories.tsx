import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { http, HttpResponse } from 'msw';
import { BookView } from './BookView';
import { useBookStore } from '../store/useBookStore';
import { handlers } from '@/src/shared/api/mock/handlers';

/**
 * CAPTCHA를 통과한 상태로 진입시키는 데코레이터입니다.
 *
 * BookView는 마운트 시 resetStore로 상태를 초기화하므로, 그 이후에 값을 넣어야
 * 덮어써지지 않는다. 좌석·권종·결제 화면을 보려면 이 단계를 건너뛰어야 한다.
 */
const withCaptchaPassed = (Story: React.ComponentType, context: { parameters: { skipCaptcha?: boolean } }) => {
  const skip = context.parameters.skipCaptcha !== false;

  React.useEffect(() => {
    if (!skip) return;
    const timer = setTimeout(() => useBookStore.getState().setIsBotVerified(true), 0);
    return () => clearTimeout(timer);
  }, [skip]);

  return <Story />;
};

/**
 * 좌석 예매 화면 스토리입니다.
 *
 * 좌석·공연 데이터는 storyMode 분기가 아니라 MSW 핸들러로 공급한다. 그래야
 * BookView가 실제 사용자와 같은 경로(fetchSeats → SSE 구독 → 좌석맵 렌더)를
 * 타므로, 스토리에서만 동작하는 우회로가 생기지 않는다.
 */

const meta: Meta<typeof BookView> = {
  title: 'user/BookView',
  component: BookView,
  parameters: {
    layout: 'fullscreen',
    nextjs: {
      appDirectory: true,
    },
  },
  args: {
    onClose: () => {},
    eventId: '1',
    mode: 'BOOK',
  },
  // 대부분의 스토리는 좌석 이후 화면을 보여주므로 CAPTCHA를 통과한 상태로 연다.
  decorators: [withCaptchaPassed],
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof BookView>;

/** 좌석 선택 기본 화면. */
export const Default: Story = {};

/** 예매 진입 시 가장 먼저 만나는 봇 검증 단계. */
export const Captcha: Story = {
  parameters: { skipCaptcha: false },
};

/**
 * 취소표 대기 신청 모드.
 *
 * 대기 신청 좌석 조회는 admitToken을 요구한다(useSeatData). 실제로는 대기열을
 * 통과해야 받는 값이라, 스토리에서는 통과한 뒤의 상태를 재현하기 위해 넣어준다.
 */
export const CancellationWait: Story = {
  args: { mode: 'WAITLIST', admitToken: 'mock-admit-token' },
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

/**
 * 좌석 정보를 찾을 수 없는 상태 — 서버가 404를 내려주는 상황.
 *
 * parameters.msw는 기본 핸들러를 **덮어쓴다**. 바꾸고 싶은 응답만 나열하면
 * 공연 상세·사용자 조회까지 사라져 화면이 통째로 실패하므로, 앱 핸들러를 함께
 * 펼쳐준다. MSW는 먼저 등록된 핸들러가 우선하니 예외를 앞에 둬야 적용된다.
 */
export const NotFound: Story = {
  parameters: {
    msw: [
      http.get('*/api/v1/events/:eventId/schedules/:scheduleId/seats', () =>
        HttpResponse.json(
          { status: 404, message: '존재하지 않는 좌석입니다.', data: null },
          { status: 404 },
        ),
      ),
      ...handlers,
    ],
  },
};

/** 좌석 선점 경합에서 밀린 상태 — 다른 사용자가 먼저 가져간 경우(409). */
export const SeatConflict: Story = {
  parameters: {
    msw: [
      http.post('*/api/v1/events/:eventId/schedules/:scheduleId/seats/hold', () =>
        HttpResponse.json(
          { status: 409, message: '이미 선점된 좌석입니다.', data: null },
          { status: 409 },
        ),
      ),
      ...handlers,
    ],
  },
};
