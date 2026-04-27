import type { Meta, StoryObj } from '@storybook/react';
import { QueueStatusChart } from './QueueStatusChart';
import type { QueueStatusPoint } from './QueueStatusChart';

const queueStatusData: QueueStatusPoint[] = [
  { time: '13:00', waitingUsers: 860, incomingUsers: 132, admittedUsers: 96, estimatedWaitMinutes: 8 },
  { time: '13:05', waitingUsers: 1040, incomingUsers: 168, admittedUsers: 112, estimatedWaitMinutes: 10 },
  { time: '13:10', waitingUsers: 1380, incomingUsers: 214, admittedUsers: 126, estimatedWaitMinutes: 14 },
  { time: '13:15', waitingUsers: 1720, incomingUsers: 238, admittedUsers: 142, estimatedWaitMinutes: 17 },
  { time: '13:20', waitingUsers: 2110, incomingUsers: 286, admittedUsers: 158, estimatedWaitMinutes: 21 },
  { time: '13:25', waitingUsers: 2480, incomingUsers: 304, admittedUsers: 176, estimatedWaitMinutes: 25 },
  { time: '13:30', waitingUsers: 2760, incomingUsers: 296, admittedUsers: 204, estimatedWaitMinutes: 26 },
  { time: '13:35', waitingUsers: 2680, incomingUsers: 218, admittedUsers: 236, estimatedWaitMinutes: 24 },
  { time: '13:40', waitingUsers: 2410, incomingUsers: 192, admittedUsers: 252, estimatedWaitMinutes: 21 },
  { time: '13:45', waitingUsers: 2140, incomingUsers: 174, admittedUsers: 246, estimatedWaitMinutes: 18 },
  { time: '13:50', waitingUsers: 1870, incomingUsers: 156, admittedUsers: 228, estimatedWaitMinutes: 15 },
  { time: '13:55', waitingUsers: 1620, incomingUsers: 142, admittedUsers: 214, estimatedWaitMinutes: 13 },
  { time: '14:00', waitingUsers: 1390, incomingUsers: 128, admittedUsers: 198, estimatedWaitMinutes: 11 },
];

const meta = {
  title: 'Admin/QueueStatusChart',
  component: QueueStatusChart,
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
} satisfies Meta<typeof QueueStatusChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    data: queueStatusData,
    performanceTitle: 'Musical Tickle 19:30',
    performanceMeta: '2026.04.23 19:30 / VIP queue',
    capacityPerMinute: 210,
    targetWaitingUsers: 2400,
  },
};

export const RecoveryTrend: Story = {
  args: {
    data: queueStatusData.map((point, index) => ({
      ...point,
      waitingUsers: Math.max(320, point.waitingUsers - index * 120),
      admittedUsers: point.admittedUsers + 32,
      estimatedWaitMinutes: Math.max(3, point.estimatedWaitMinutes - 1),
    })),
    performanceTitle: 'Developer Meetup Live',
    performanceMeta: '2026.04.24 20:00 / general sale',
    capacityPerMinute: 260,
    targetWaitingUsers: 1200,
  },
};
