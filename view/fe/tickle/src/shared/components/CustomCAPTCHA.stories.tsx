import type { Meta, StoryObj } from '@storybook/react';
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
    <div className="w-full h-[600px] bg-gray-50 flex items-center justify-center p-8 rounded-2xl">
      <CustomCAPTCHA {...args} />
    </div>
  ),
};
