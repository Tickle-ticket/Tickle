import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Turnstile } from './Turnstile';

const meta = {
  title: 'Shared/Turnstile',
  component: Turnstile,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
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
    onVerify: {
      action: 'verified',
      description: '검증 성공 시 호출되는 콜백 (토큰 반환)',
    },
  },
} satisfies Meta<typeof Turnstile>;

export default meta;
type Story = StoryObj<typeof meta>;

// Cloudflare에서 제공하는 테스트용 더미 키
// 1x00000000000000000000AA: 항상 성공 (Always passes)
// 2x00000000000000000000AB: 항상 실패 (Always fails)
// 3x00000000000000000000FF: 사용자 상호작용 필요 (Forces an interactive challenge)

export const Default: Story = {
  args: {
    siteKey: '1x00000000000000000000AA',
    theme: 'auto',
  },
};

export const AlwaysFails: Story = {
  args: {
    siteKey: '2x00000000000000000000AB',
    theme: 'auto',
  },
};

export const InteractiveChallenge: Story = {
  args: {
    siteKey: '3x00000000000000000000FF',
    theme: 'auto',
  },
};

export const DarkTheme: Story = {
  args: {
    siteKey: '1x00000000000000000000AA',
    theme: 'dark',
  },
  parameters: {
    backgrounds: { default: 'dark' },
  },
};
