import type { Meta, StoryObj } from '@storybook/react';
import { ErrorView } from './ErrorView';

/**
 * 프로젝트 전반에 사용되는 공통 `ErrorView` (에러 페이지) 컴포넌트입니다.
 * 외부 에셋(이미지 렌더링 지연)을 피하기 위해 인라인 SVG 일러스트레이션을 내장하여 제작되었습니다.
 * 
 * 부모 페이지에서 컴포넌트의 껍데기만 렌더링하며, 클릭 액션(`onAction`)은 부모가 주입합니다.
 */
const meta = {
  title: 'Shared/ErrorView',
  component: ErrorView,
  parameters: {
    // 에러 뷰는 보통 화면 전체나 넓은 영역을 덮으므로 풀스크린을 권장
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'HTTP 에러(404, 500, 401)와 도메인 특화 에러(매진, 결제시간 초과)를 모두 처리하는 다목적 ErrorView입니다.',
      },
    },
  },
  args: {
    onAction: () => alert('Action clicked!'),
  },
  argTypes: {
    type: {
      control: 'select',
      options: ['404', '500', '401', 'timeout', 'soldout'],
      description: '렌더링할 에러 시나리오 타입',
    },
    title: { control: 'text', description: '기본 타이틀 덮어쓰기' },
    description: { control: 'text', description: '기본 설명 덮어쓰기' },
    actionText: { control: 'text', description: '버튼 텍스트 덮어쓰기' },
  },
} satisfies Meta<typeof ErrorView>;

export default meta;
type Story = StoryObj<typeof meta>;

// 1. 404 Not Found
export const NotFound404: Story = {
  args: {
    type: '404',
  },
};

// 2. 500 Server Error
export const ServerError500: Story = {
  args: {
    type: '500',
  },
};

// 3. 401 Unauthorized
export const Unauthorized401: Story = {
  args: {
    type: '401',
  },
};

// 4. Payment Timeout (티켓팅 도메인)
export const PaymentTimeout: Story = {
  args: {
    type: 'timeout',
  },
};

// 5. Sold Out (티켓팅 도메인)
export const SoldOut: Story = {
  args: {
    type: 'soldout',
  },
};

// 커스텀 내용 덮어쓰기 테스트
export const CustomContentOverride: Story = {
  args: {
    type: '404',
    title: '입장 시간 종료',
    description: '공연이 이미 시작되어 입장이 제한되었습니다. 다음에 봬요!',
    actionText: '내 일정 보기',
  },
  parameters: {
    docs: {
      description: {
        story: 'Props로 title, description, actionText를 전달하면 기본 문구를 무시하고 커스텀 문구를 노출합니다.',
      },
    },
  },
};

// 6. Bot Blocked (매크로 봇 차단 화면)
export const BotBlocked: Story = {
  args: {
    type: '401',
    title: '비정상적인 접근 차단',
    description: '자동화된 도구(Bot, Macro)를 통한 비정상적인 클릭이나 접근이 감지되었습니다. 보안 정책에 따라 해당 기기의 접근이 일시적으로 차단되었습니다.',
    actionText: '메인으로 돌아가기',
  },
  parameters: {
    docs: {
      description: {
        story: '매크로 봇(Bot) 감지 시 /blocked 페이지에서 나타나는 차단 화면입니다.',
      },
    },
  },
};
