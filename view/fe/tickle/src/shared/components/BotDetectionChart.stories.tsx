import type { Meta, StoryObj } from '@storybook/react';
import { BotDetectionChart } from './BotDetectionChart';
import type { BotDetectionPoint } from './BotDetectionChart';

const botDetectionData: BotDetectionPoint[] = [
  { time: '00:00', macroAttempts: 8, queueBypassAttempts: 3, abnormalRequests: 12, blockedBots: 21 },
  { time: '02:00', macroAttempts: 6, queueBypassAttempts: 2, abnormalRequests: 9, blockedBots: 15 },
  { time: '04:00', macroAttempts: 5, queueBypassAttempts: 1, abnormalRequests: 7, blockedBots: 12 },
  { time: '06:00', macroAttempts: 11, queueBypassAttempts: 4, abnormalRequests: 16, blockedBots: 29 },
  { time: '08:00', macroAttempts: 34, queueBypassAttempts: 12, abnormalRequests: 28, blockedBots: 70 },
  { time: '10:00', macroAttempts: 58, queueBypassAttempts: 26, abnormalRequests: 43, blockedBots: 121 },
  { time: '12:00', macroAttempts: 72, queueBypassAttempts: 34, abnormalRequests: 51, blockedBots: 149 },
  { time: '14:00', macroAttempts: 94, queueBypassAttempts: 48, abnormalRequests: 67, blockedBots: 201 },
  { time: '16:00', macroAttempts: 86, queueBypassAttempts: 41, abnormalRequests: 62, blockedBots: 180 },
  { time: '18:00', macroAttempts: 132, queueBypassAttempts: 73, abnormalRequests: 96, blockedBots: 289 },
  { time: '20:00', macroAttempts: 116, queueBypassAttempts: 64, abnormalRequests: 78, blockedBots: 248 },
  { time: '22:00', macroAttempts: 48, queueBypassAttempts: 21, abnormalRequests: 39, blockedBots: 103 },
];

const meta = {
  title: 'Admin/BotDetectionChart',
  component: BotDetectionChart,
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
} satisfies Meta<typeof BotDetectionChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    data: botDetectionData,
  },
};

export const AggressiveTraffic: Story = {
  args: {
    data: botDetectionData.map((point, index) => ({
      ...point,
      macroAttempts: point.macroAttempts + index * 8,
      queueBypassAttempts: point.queueBypassAttempts + index * 5,
      abnormalRequests: point.abnormalRequests + index * 6,
      blockedBots: point.blockedBots + index * 16,
    })),
    title: 'Peak-time bot attack trend',
    subtitle: 'Detection volume and blocked bots during the on-sale window',
    targetBlockRate: 98,
  },
};
