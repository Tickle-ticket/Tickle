import { LoadMetricGaugePanel } from './LoadMetricGaugePanel';
import { MetricLogList } from './MetricLogList';
import type { ReactNode } from 'react';
import type { MetricLogItem, MetricLogListProps } from './MetricLogList';

type MetricLogListStoryMeta = {
  title: string;
  component: typeof MetricLogList;
  tags: string[];
  parameters: Record<string, unknown>;
  decorators: Array<(Story: () => ReactNode) => ReactNode>;
  argTypes: Record<string, unknown>;
};

type Story = {
  args?: Partial<MetricLogListProps>;
  render?: () => ReactNode;
};

const logs: MetricLogItem[] = [
  {
    id: 'log-001',
    timestamp: '2026-04-22T14:31:12+09:00',
    metricId: 'p95',
    metricLabel: 'p95 response time',
    level: 'critical',
    status: 'critical',
    value: 542,
    unit: 'ms',
    threshold: 420,
    max: 600,
    message: 'Response latency exceeded the critical threshold during the ramp-up stage.',
    source: 'k6',
    scenario: 'before-ai',
    testRunId: 'load-test-20260422-001',
    serviceName: 'tickle-api',
  },
  {
    id: 'log-002',
    timestamp: '2026-04-22T14:30:44+09:00',
    metricId: 'error-rate',
    metricLabel: 'HTTP error rate',
    level: 'warning',
    status: 'warning',
    value: 2.4,
    unit: '%',
    threshold: 1.5,
    max: 5,
    message: 'HTTP 5xx ratio crossed the warning threshold while virtual users increased.',
    source: 'prometheus',
    scenario: 'before-ai',
    testRunId: 'load-test-20260422-001',
    serviceName: 'tickle-api',
  },
  {
    id: 'log-003',
    timestamp: '2026-04-22T14:29:58+09:00',
    metricId: 'tps',
    metricLabel: 'TPS',
    level: 'success',
    status: 'normal',
    value: 742,
    unit: '/s',
    threshold: 800,
    max: 1000,
    message: 'Transaction throughput stayed within the expected operating range.',
    source: 'prometheus',
    scenario: 'after-ai',
    testRunId: 'load-test-20260422-002',
    serviceName: 'tickle-api',
  },
  {
    id: 'log-004',
    timestamp: '2026-04-22T14:28:36+09:00',
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
  },
  {
    id: 'log-005',
    timestamp: '2026-04-22T14:27:03+09:00',
    metricId: 'error-rate',
    metricLabel: 'HTTP error rate',
    level: 'success',
    status: 'recovered',
    value: 0.7,
    unit: '%',
    threshold: 1.5,
    max: 5,
    message: 'Error rate recovered after the retry and caching policy was applied.',
    source: 'backend',
    scenario: 'after-ai',
    testRunId: 'load-test-20260422-002',
    serviceName: 'tickle-api',
  },
  {
    id: 'log-006',
    timestamp: '2026-04-22T14:25:41+09:00',
    metricId: 'tps',
    metricLabel: 'TPS',
    level: 'info',
    status: 'normal',
    value: 524,
    unit: '/s',
    max: 1000,
    message: 'Load test entered the steady stage with 500 virtual users.',
    source: 'k6',
    scenario: 'before-ai',
    testRunId: 'load-test-20260422-001',
    serviceName: 'tickle-api',
  },
];

const meta = {
  title: 'Monitoring/MetricLogList',
  component: MetricLogList,
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
        <Story />
      </div>
    ),
  ],
  argTypes: {
    selectedMetricId: {
      control: 'select',
      options: [undefined, 'tps', 'p95', 'error-rate'],
    },
    backgroundColor: { control: 'color' },
    panelBackgroundColor: { control: 'color' },
    borderColor: { control: 'color' },
    textColor: { control: 'color' },
    mutedTextColor: { control: 'color' },
    maxHeight: { control: { type: 'number', min: 180, max: 720, step: 20 } },
  },
} satisfies MetricLogListStoryMeta;

export default meta;

export const Default: Story = {
  args: {
    logs,
    title: 'Metric event logs',
    subtitle: 'Events captured from k6, Prometheus and backend monitoring APIs',
    backgroundColor: '#ffffff',
    panelBackgroundColor: '#fff7ed',
    borderColor: '#e5e7eb',
    textColor: '#111827',
    mutedTextColor: '#64748b',
    maxHeight: 420,
  },
};

export const P95Only: Story = {
  args: {
    ...Default.args,
    selectedMetricId: 'p95',
  },
};

export const WithGaugePanel: Story = {
  args: {
    logs,
  },
  render: () => (
    <div className="flex flex-col gap-4">
      <LoadMetricGaugePanel
        metrics={[
          { id: 'tps', label: 'TPS', value: 742, unit: '/s', max: 1000, tone: 'green' },
          { id: 'p95', label: 'p95 response time', value: 318, unit: 'ms', max: 600, tone: 'orange' },
          { id: 'error-rate', label: 'HTTP error rate', value: 1.8, unit: '%', max: 5, tone: 'orange', decimals: 1 },
        ]}
      />
      <MetricLogList logs={logs} maxHeight={340} />
    </div>
  ),
};
