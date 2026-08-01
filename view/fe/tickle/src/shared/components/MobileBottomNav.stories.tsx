import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { MobileBottomNav } from './MobileBottomNav';

const meta = {
  title: 'Shared/MobileBottomNav',
  component: MobileBottomNav,
  parameters: {
    layout: 'fullscreen',
    viewport: {
      defaultViewport: 'mobile1',
    },
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="relative h-screen bg-surface-subtle flex flex-col justify-end">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MobileBottomNav>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
