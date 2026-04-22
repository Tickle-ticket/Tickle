import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { LoadMetricGaugePanel, mapPrometheusInstantToLoadMetrics } from './LoadMetricGaugePanel';
import type { LoadMetricThreshold, PrometheusInstantVectorResponse } from './LoadMetricGaugePanel';

const responseTimeThresholds: LoadMetricThreshold[] = [
  { value: 0, color: '#22c55e' },
  { value: 240, color: '#f97316' },
  { value: 420, color: '#dc2626' },
];

const errorRateThresholds: LoadMetricThreshold[] = [
  { value: 0, color: '#22c55e' },
  { value: 1.5, color: '#f97316' },
  { value: 3, color: '#dc2626' },
];

const tpsThresholds: LoadMetricThreshold[] = [
  { value: 0, color: '#22c55e' },
  { value: 800, color: '#f97316' },
  { value: 950, color: '#dc2626' },
];

const prometheusInstantResponse: PrometheusInstantVectorResponse = {
  status: 'success',
  data: {
    resultType: 'vector',
    result: [
      {
        metric: {
          __name__: 'tickle_load_tps',
          job: 'k6',
          scenario: 'ai-comparison',
        },
        value: [1769002200, '742'],
      },
      {
        metric: {
          __name__: 'tickle_http_req_duration_p95_ms',
          job: 'k6',
          scenario: 'ai-comparison',
        },
        value: [1769002200, '318'],
      },
      {
        metric: {
          __name__: 'tickle_http_error_rate_percent',
          job: 'k6',
          scenario: 'ai-comparison',
        },
        value: [1769002200, '1.8'],
      },
    ],
  },
};

const metrics = mapPrometheusInstantToLoadMetrics(prometheusInstantResponse, [
  {
    id: 'tps',
    prometheusName: 'tickle_load_tps',
    label: 'TPS',
    unit: '/s',
    max: 1000,
    tone: 'green',
    decimals: 0,
    thresholds: tpsThresholds,
  },
  {
    id: 'p95',
    prometheusName: 'tickle_http_req_duration_p95_ms',
    label: 'p95 response time',
    unit: 'ms',
    max: 600,
    tone: 'orange',
    decimals: 0,
    thresholds: responseTimeThresholds,
  },
  {
    id: 'error-rate',
    prometheusName: 'tickle_http_error_rate_percent',
    label: 'HTTP error rate',
    unit: '%',
    max: 5,
    tone: 'orange',
    decimals: 1,
    thresholds: errorRateThresholds,
  },
]);

const meta = {
  title: 'Monitoring/GaugePanel',
  component: LoadMetricGaugePanel,
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
    backgroundColor: { control: 'color' },
    panelBackgroundColor: { control: 'color' },
    textColor: { control: 'color' },
    mutedTextColor: { control: 'color' },
    trackColor: { control: 'color' },
    height: { control: { type: 'number', min: 160, max: 280, step: 10 } },
  },
} satisfies Meta<typeof LoadMetricGaugePanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PrometheusLiveGauges: Story = {
  args: {
    metrics,
    backgroundColor: '#ffffff',
    panelBackgroundColor: '#ffffff',
    textColor: '#111827',
    mutedTextColor: '#64748b',
    trackColor: '#f1f5f9',
    height: 196,
  },
};

export const BeforeAiApply: Story = {
  args: {
    ...PrometheusLiveGauges.args,
    metrics: [
      {
        id: 'tps',
        label: 'TPS',
        value: 524,
        unit: '/s',
        max: 1000,
        tone: 'green',
        thresholds: tpsThresholds,
      },
      {
        id: 'p95',
        label: 'p95 response time',
        value: 542,
        unit: 'ms',
        max: 600,
        tone: 'red',
        thresholds: responseTimeThresholds,
      },
      {
        id: 'error-rate',
        label: 'HTTP error rate',
        value: 4.6,
        unit: '%',
        max: 5,
        tone: 'red',
        decimals: 1,
        thresholds: errorRateThresholds,
      },
    ],
  },
};

export const AfterAiApply: Story = {
  args: {
    ...PrometheusLiveGauges.args,
    metrics: [
      {
        id: 'tps',
        label: 'TPS',
        value: 812,
        unit: '/s',
        max: 1000,
        tone: 'orange',
        thresholds: tpsThresholds,
      },
      {
        id: 'p95',
        label: 'p95 response time',
        value: 238,
        unit: 'ms',
        max: 600,
        tone: 'green',
        thresholds: responseTimeThresholds,
      },
      {
        id: 'error-rate',
        label: 'HTTP error rate',
        value: 0.7,
        unit: '%',
        max: 5,
        tone: 'green',
        decimals: 1,
        thresholds: errorRateThresholds,
      },
    ],
  },
};
