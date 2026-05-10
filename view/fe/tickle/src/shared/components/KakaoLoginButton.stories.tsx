import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { KakaoLoginButton } from './KakaoLoginButton';

const meta = {
  title: 'Shared/KakaoLoginButton',
  component: KakaoLoginButton,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof KakaoLoginButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="w-[320px]">
      <KakaoLoginButton />
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="w-[320px]">
      <KakaoLoginButton disabled />
    </div>
  ),
};
