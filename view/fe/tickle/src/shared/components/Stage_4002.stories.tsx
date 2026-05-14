import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Stage_4002 } from './Stage_4002';

const meta = {
  title: 'Shared/Stage_4002',
  component: Stage_4002,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Stage_4002>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="min-h-screen bg-[#eef1f5] p-6">
      <Stage_4002 />
    </div>
  ),
};
