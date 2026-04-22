import type { Meta, StoryObj } from '@storybook/react';
import { InfoTime } from './InfoTime';

const meta = {
  title: 'Shared/InfoTime',
  component: InfoTime,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    targetDate: { control: 'date' },
  },
} satisfies Meta<typeof InfoTime>;

export default meta;
type Story = StoryObj<typeof meta>;

// 몇 시간 남은 형식 (HH:MM:SS)
export const ShortTimeLeft: Story = {
  args: {
    targetDate: new Date(Date.now() + 3 * 3600 * 1000 + 15 * 60 * 1000).getTime(), // 3시간 15분 후
  },
};

// 며칠 남은 형식 (DD:HH:MM:SS)
export const LongDaysLeft: Story = {
  args: {
    targetDate: new Date(Date.now() + 5 * 86400 * 1000 + 4 * 3600 * 1000).getTime(), // 5일 4시간 후
  },
};
