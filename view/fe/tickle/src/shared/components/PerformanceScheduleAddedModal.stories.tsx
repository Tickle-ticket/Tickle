import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { PerformanceScheduleAddedModal } from './PerformanceScheduleAddedModal';

const meta = {
  title: 'Agency/PerformanceScheduleAddedModal',
  component: PerformanceScheduleAddedModal,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div className="min-h-screen bg-slate-100 p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PerformanceScheduleAddedModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    isOpen: true,
    onClose: () => undefined,
    addedTime: '19:30',
    addedDateLabels: ['5월 8일 (목)'],
  },
};

export const MultiDate: Story = {
  args: {
    isOpen: true,
    onClose: () => undefined,
    addedTime: '14:00',
    addedDateLabels: ['5월 8일 (목)', '5월 9일 (금)', '5월 10일 (토)', '5월 11일 (일)'],
  },
};
