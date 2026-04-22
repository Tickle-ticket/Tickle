import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { MetricLogItemRow } from './MetricLogItemRow';
import type { MetricLogItem } from './MetricLogItemRow';

const baseLog: MetricLogItem = {
  id: 'log-row-001',
  timestamp: '2026-04-22T14:31:12+09:00',
  metricId: 'p95',
  metricLabel: 'p95 response time',
  level: 'warning',
  status: 'warning',
  value: 318,
  unit: 'ms',
  threshold: 240,
  max: 600,
  message: 'Latency entered the warning band but remained below the critical limit.',
  source: 'k6',
  scenario: 'after-ai',
  testRunId: 'load-test-20260422-002',
  serviceName: 'tickle-api',
};

const meta = {
  title: 'Monitoring/MetricLogItemRow',
  component: MetricLogItemRow,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'white',
      values: [
        { name: 'white', value: '#ffffff' },
        { name: 'soft orange', value: '#fff7ed' },
      ],
    },
  },
  decorators: [
    (Story) => (
      <div className="min-h-screen bg-white p-6">
        <ol className="divide-y divide-slate-200 rounded-md border border-slate-200 px-4">
          <Story />
        </ol>
      </div>
    ),
  ],
  argTypes: {
    panelBackgroundColor: { control: 'color' },
    borderColor: { control: 'color' },
    textColor: { control: 'color' },
    mutedTextColor: { control: 'color' },
  },
} satisfies Meta<typeof MetricLogItemRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Warning: Story = {
  args: {
    log: baseLog,
    panelBackgroundColor: '#fff7ed',
    borderColor: '#e5e7eb',
    textColor: '#111827',
    mutedTextColor: '#64748b',
  },
};

export const Success: Story = {
  args: {
    ...Warning.args,
    log: {
      ...baseLog,
      id: 'log-row-002',
      metricId: 'tps',
      metricLabel: 'TPS',
      level: 'success',
      status: 'normal',
      value: 742,
      unit: '/s',
      threshold: 800,
      message: 'Transaction throughput stayed within the expected operating range.',
      source: 'prometheus',
    },
  },
};

export const Critical: Story = {
  args: {
    ...Warning.args,
    log: {
      ...baseLog,
      id: 'log-row-003',
      level: 'critical',
      status: 'critical',
      value: 542,
      unit: 'ms',
      threshold: 420,
      message: 'Response latency exceeded the critical threshold during the ramp-up stage.',
    },
  },
};
