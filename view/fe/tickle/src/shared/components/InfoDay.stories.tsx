import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { InfoDay } from './InfoDay';

const meta = {
  title: 'Shared/InfoDay',
  component: InfoDay,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof InfoDay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    day: '2026.04.12 - 2026.07.26',
  },
};
