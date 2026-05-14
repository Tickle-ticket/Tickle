import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ConcertHallMockup } from './ConcertHallMockup';

const meta = {
  title: 'Shared/ConcertHallMockup',
  component: ConcertHallMockup,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof ConcertHallMockup>;

export default meta;

type Story = StoryObj<typeof meta>;

export const stage_4002: Story = {
  render: () => (
    <main className="min-h-screen bg-[#eef1f5] p-6">
      <ConcertHallMockup />
    </main>
  ),
};
