import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { mapPrometheusVisitorsToTrendPoints, VisitorTrendChart } from './VisitorTrendChart';
import type { PrometheusQueryRangeResponse, VisitorTrendPoint } from './VisitorTrendChart';

const visitorData: VisitorTrendPoint[] = [
  { time: '14:00', visitors: 82 },
  { time: '14:02', visitors: 96 },
  { time: '14:04', visitors: 111 },
  { time: '14:06', visitors: 104 },
  { time: '14:08', visitors: 138 },
  { time: '14:10', visitors: 157 },
  { time: '14:12', visitors: 149 },
  { time: '14:14', visitors: 183 },
  { time: '14:16', visitors: 214 },
  { time: '14:18', visitors: 231 },
  { time: '14:20', visitors: 226 },
  { time: '14:22', visitors: 254 },
  { time: '14:24', visitors: 289 },
  { time: '14:26', visitors: 317 },
  { time: '14:28', visitors: 301 },
  { time: '14:30', visitors: 342 },
];

const prometheusVisitorResponse: PrometheusQueryRangeResponse = {
  status: 'success',
  data: {
    resultType: 'matrix',
    result: [
      {
        metric: {
          __name__: 'tickle_active_visitors',
          job: 'tickle-api',
          instance: 'api-1:8080',
        },
        values: [
          [1769000400, '84'],
          [1769000520, '93'],
          [1769000640, '117'],
          [1769000760, '126'],
          [1769000880, '155'],
          [1769001000, '181'],
          [1769001120, '206'],
          [1769001240, '244'],
          [1769001360, '279'],
          [1769001480, '318'],
          [1769001600, '352'],
          [1769001720, '391'],
          [1769001840, '438'],
          [1769001960, '481'],
          [1769002080, '522'],
          [1769002200, '568'],
        ],
      },
    ],
  },
};

const prometheusVisitorData = mapPrometheusVisitorsToTrendPoints(prometheusVisitorResponse);

const meta = {
  title: 'Admin/VisitorTrendChart',
  component: VisitorTrendChart,
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
      <div className="min-h-screen bg-surface p-6">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    lineColor: { control: 'color' },
    backgroundColor: { control: 'color' },
    chartBackgroundColor: { control: 'color' },
    textColor: { control: 'color' },
    mutedTextColor: { control: 'color' },
    gridColor: { control: 'color' },
    height: { control: { type: 'number', min: 180, max: 520, step: 20 } },
  },
} satisfies Meta<typeof VisitorTrendChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    data: visitorData,
    title: 'Realtime site visitors',
    subtitle: 'Live active users during k6 load testing',
    currentVisitors: 342,
    peakVisitors: 342,
    unitLabel: 'users',
    lineColor: '#16a34a',
    fillColor: 'gradient',
    backgroundColor: '#ffffff',
    chartBackgroundColor: '#f0fdf4',
    textColor: '#111827',
    mutedTextColor: '#64748b',
    gridColor: '#bbf7d0',
    height: 260,
  },
};

export const PrometheusQueryRange: Story = {
  args: {
    ...Default.args,
    data: prometheusVisitorData,
    currentVisitors: prometheusVisitorData[prometheusVisitorData.length - 1]?.visitors,
    peakVisitors: Math.max(...prometheusVisitorData.map((point) => point.visitors)),
    title: 'Prometheus active visitors',
    subtitle: 'Mapped from Prometheus query_range result',
  },
};

export const HighTraffic: Story = {
  args: {
    ...Default.args,
    data: visitorData.map((point, index) => ({
      ...point,
      visitors: point.visitors + index * 82,
    })),
    currentVisitors: 1572,
    peakVisitors: 1572,
    lineColor: '#f97316',
    chartBackgroundColor: '#fff7ed',
    gridColor: '#fed7aa',
    title: 'Realtime traffic spike',
    subtitle: 'High-traffic segment after AI optimization',
  },
};
