import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { CustomCAPTCHA } from './CustomCAPTCHA';

const meta = {
  title: 'Shared/CustomCAPTCHA',
  component: CustomCAPTCHA,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onSuccess: { action: 'captcha-verified' },
  },
} satisfies Meta<typeof CustomCAPTCHA>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onSuccess: (token) => console.log('Captcha Verified!', token),
  },
  render: (args) => (
    <div className="w-full h-[600px] bg-surface-subtle flex items-center justify-center p-8 rounded-2xl">
      <CustomCAPTCHA {...args} />
    </div>
  ),
};

export const Mobile: Story = {
  args: {
    onSuccess: (token) => console.log('Captcha Verified!', token),
  },
  parameters: {
    viewport: { defaultViewport: 'iphone14' },
    layout: 'fullscreen',
  },
  render: (args) => (
    <div className="w-full min-h-screen bg-surface-subtle flex items-center justify-center p-4">
      <CustomCAPTCHA {...args} />
    </div>
  ),
};

export const Tablet: Story = {
  args: {
    onSuccess: (token) => console.log('Captcha Verified!', token),
  },
  parameters: {
    viewport: { defaultViewport: 'ipad' },
    layout: 'fullscreen',
  },
  render: (args) => (
    <div className="w-full min-h-screen bg-surface-subtle flex items-center justify-center p-6">
      <CustomCAPTCHA {...args} />
    </div>
  ),
};
