import type { Meta, StoryObj } from '@storybook/react';
import { InfoPlace } from './InfoPlace';

const meta = {
  title: 'Shared/InfoPlace',
  component: InfoPlace,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof InfoPlace>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    place: '블루스퀘어 우리은행홀',
  },
};
