import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ReverseCAPTCHA } from './ReverseCAPTCHA';

const meta = {
  title: 'Shared/ReverseCAPTCHA',
  component: ReverseCAPTCHA,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    theme: {
      control: 'radio',
      options: ['light', 'dark'],
      description: '위젯 테마',
    },
    onSuccess: { action: 'botVerified' },
  },
} satisfies Meta<typeof ReverseCAPTCHA>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    theme: 'light',
  },
  render: (args) => (
    <div className="w-[400px] bg-surface p-8 rounded-2xl shadow-xl border border-line-subtle flex flex-col items-center">
      <h2 className="text-xl font-bold mb-4">보안 인증</h2>
      <p className="text-sm text-content-tertiary mb-6 text-center">
        정상적인 접근을 위해 아래 미션을 통과해주세요.
      </p>
      <ReverseCAPTCHA {...args} />
    </div>
  ),
};

export const DarkMode: Story = {
  args: {
    theme: 'dark',
  },
  parameters: {
    backgrounds: { default: 'dark' },
  },
  render: (args) => (
    <div className="w-[400px] bg-surface-inverse p-8 rounded-2xl shadow-xl border border-line-strong flex flex-col items-center text-white">
      <h2 className="text-xl font-bold mb-4">보안 인증</h2>
      <p className="text-sm text-content-muted mb-6 text-center">
        정상적인 접근을 위해 아래 미션을 통과해주세요.
      </p>
      <ReverseCAPTCHA {...args} />
    </div>
  ),
};
