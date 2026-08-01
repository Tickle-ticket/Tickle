import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ReCaptcha } from './ReCaptcha';

const meta: Meta<typeof ReCaptcha> = {
  title: 'Shared/ReCaptcha',
  component: ReCaptcha,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: '420px', maxWidth: '100%' }}>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    theme: {
      control: 'radio',
      options: ['light', 'dark', 'auto'],
      description: '위젯의 테마를 설정합니다.',
    },
    siteKey: {
      control: 'text',
      description: 'Cloudflare Turnstile Site Key',
    },
    title: {
      control: 'text',
      description: '상단 제목 텍스트',
    },
    description: {
      control: 'text',
      description: '상단 설명 텍스트',
    },
    buttonText: {
      control: 'text',
      description: '인증 완료 후 버튼 텍스트',
    },
    showButton: {
      control: 'boolean',
      description: '하단 버튼 표시 여부',
    },
    onSuccess: {
      action: 'success',
      description: '검증 성공 시 호출되는 콜백 (토큰 반환)',
    },
    onError: {
      action: 'error',
      description: '검증 실패 시 호출되는 콜백',
    },
    onExpire: {
      action: 'expired',
      description: '토큰 만료 시 호출되는 콜백',
    },
    onConfirm: {
      action: 'confirm',
      description: '버튼 클릭 시 호출되는 콜백',
    },
  },
};

export default meta;
type Story = StoryObj<typeof ReCaptcha>;

// Cloudflare에서 제공하는 테스트용 더미 키
// 1x00000000000000000000AA: 항상 성공 (Always passes)
// 2x00000000000000000000AB: 항상 실패 (Always fails)
// 3x00000000000000000000FF: 사용자 상호작용 필요 (Forces an interactive challenge)

/** 실제 사이트 키를 사용한 기본 스토리 */
export const Default: Story = {
  args: {
    siteKey: '0x4AAAAAADOcVdWsj0sJSp-6zYJq06tKUf4',
    theme: 'auto',
  },
};

/** 항상 실패하는 테스트 키 */
export const AlwaysFails: Story = {
  args: {
    siteKey: '2x00000000000000000000AB',
    theme: 'auto',
  },
};

/** 사용자 상호작용이 필요한 테스트 키 */
export const InteractiveChallenge: Story = {
  args: {
    siteKey: '3x00000000000000000000FF',
    theme: 'auto',
  },
};

/** 다크 테마 */
export const DarkTheme: Story = {
  args: {
    siteKey: '1x00000000000000000000AA',
    theme: 'dark',
  },
  parameters: {
    backgrounds: { default: 'dark' },
  },
};

/** 실제 사이트 키 사용 (프로덕션 확인용) */
export const WithRealSiteKey: Story = {
  args: {
    siteKey: '0x4AAAAAADOcVYSwitvl9qep',
    theme: 'auto',
    title: '보안 인증',
    description: '티켓 예매를 위해 본인 인증을 완료해 주세요.',
    buttonText: '예매 진행하기',
  },
};

/** 버튼 없이 캡챠만 표시 */
export const WithoutButton: Story = {
  args: {
    siteKey: '1x00000000000000000000AA',
    theme: 'auto',
    showButton: false,
  },
};
