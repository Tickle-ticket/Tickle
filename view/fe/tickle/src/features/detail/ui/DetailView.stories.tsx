import type { Meta, StoryObj } from '@storybook/react';
import { http, HttpResponse } from 'msw';
import { DetailView } from './DetailView';
import { MobileBottomNav } from '@/src/shared/components/MobileBottomNav';
import { handlers } from '@/src/shared/api/mock/handlers';

/**
 * 공연 상세 화면 스토리입니다.
 *
 * 데이터는 storyMode 분기가 아니라 MSW 핸들러로 공급한다. 그래야 DetailView가
 * 실제 사용자와 같은 코드 경로(fetchEventDetail → 응답 변환 → 렌더)를 타므로,
 * 스토리에서는 잘 보이는데 실제로는 깨지는 상황이 생기지 않는다.
 *
 * 기본 핸들러(preview.tsx에 등록한 앱 핸들러)가 상세·사용자 응답을 이미 제공하므로
 * 여기서는 예외 상황만 덮어쓴다.
 */

const meta: Meta<typeof DetailView> = {
  title: 'user/DetailView',
  component: DetailView,
  parameters: {
    layout: 'fullscreen',
    nextjs: {
      appDirectory: true,
      navigation: {
        query: { id: '1' },
      },
    },
  },
  decorators: [
    (Story) => (
      <>
        <Story />
        <MobileBottomNav />
      </>
    ),
  ],
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof DetailView>;

/** 기본 상세 화면. */
export const Default: Story = {};

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

/** 예매 오픈 대기 중인 공연(eventHandlers가 eventId 10을 대기 상태로 응답한다). */
export const WaitlistPending: Story = {
  parameters: {
    nextjs: {
      navigation: { query: { id: '10' } },
    },
  },
};

/** 존재하지 않는 공연 — 서버가 404를 내려주는 상황. */
export const NotFound: Story = {
  parameters: {
    nextjs: {
      navigation: { query: { id: '99999' } },
    },
    // parameters.msw는 기본 핸들러를 덮어쓴다. MSW는 먼저 등록된 핸들러가
    // 우선하므로, 이 스토리의 예외를 앞에 두고 앱 핸들러를 뒤에 펼친다.
    msw: [
      http.get('*/api/v1/events/:eventId', () =>
        HttpResponse.json(
          { status: 404, message: '공연을 찾을 수 없습니다.', data: null },
          { status: 404 },
        ),
      ),
      ...handlers,
    ],
  },
};
