import type { Meta, StoryObj } from '@storybook/react';
import { ServerMonitoringChart } from './ServerMonitoringChart';
import type { ServerMonitoringPoint } from './ServerMonitoringChart';

const serverMonitoringData: ServerMonitoringPoint[] = [
  { time: '13:00', activeUsers: 1260, mtps: 28920, mttrMinutes: 18, p95LatencyMs: 212, errorRatePercent: 0.4 },
  { time: '13:05', activeUsers: 1384, mtps: 31560, mttrMinutes: 17, p95LatencyMs: 238, errorRatePercent: 0.5 },
  { time: '13:10', activeUsers: 1512, mtps: 34440, mttrMinutes: 16, p95LatencyMs: 265, errorRatePercent: 0.7 },
  { time: '13:15', activeUsers: 1698, mtps: 38280, mttrMinutes: 15, p95LatencyMs: 304, errorRatePercent: 1.1 },
  { time: '13:20', activeUsers: 1886, mtps: 42360, mttrMinutes: 14, p95LatencyMs: 342, errorRatePercent: 1.4 },
  { time: '13:25', activeUsers: 2054, mtps: 44520, mttrMinutes: 13, p95LatencyMs: 318, errorRatePercent: 1.2 },
  { time: '13:30', activeUsers: 2188, mtps: 48720, mttrMinutes: 11, p95LatencyMs: 286, errorRatePercent: 0.9 },
  { time: '13:35', activeUsers: 2240, mtps: 50160, mttrMinutes: 10, p95LatencyMs: 292, errorRatePercent: 0.8 },
  { time: '13:40', activeUsers: 2164, mtps: 48240, mttrMinutes: 9, p95LatencyMs: 276, errorRatePercent: 0.6 },
  { time: '13:45', activeUsers: 2036, mtps: 45960, mttrMinutes: 9, p95LatencyMs: 248, errorRatePercent: 0.5 },
  { time: '13:50', activeUsers: 1912, mtps: 43440, mttrMinutes: 8, p95LatencyMs: 232, errorRatePercent: 0.4 },
  { time: '13:55', activeUsers: 1798, mtps: 41400, mttrMinutes: 8, p95LatencyMs: 226, errorRatePercent: 0.4 },
  { time: '14:00', activeUsers: 1726, mtps: 39840, mttrMinutes: 7, p95LatencyMs: 218, errorRatePercent: 0.3 },
];

const meta = {
  title: 'Admin/ServerMonitoringChart',
  component: ServerMonitoringChart,
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
} satisfies Meta<typeof ServerMonitoringChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    data: serverMonitoringData,
  },
};

export const EveningSpike: Story = {
  args: {
    data: serverMonitoringData.map((point, index) => ({
      ...point,
      activeUsers: point.activeUsers + index * 180,
      mtps: point.mtps + index * 4200,
      p95LatencyMs: point.p95LatencyMs + index * 14,
      errorRatePercent: Number((point.errorRatePercent + index * 0.08).toFixed(2)),
    })),
    title: 'Realtime active users',
    subtitle: 'Evening traffic surge after queue release',
  },
};
