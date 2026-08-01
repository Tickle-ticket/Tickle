import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { InfoTitle } from './InfoTitle';

const meta = {
  title: 'Shared/InfoTitle',
  component: InfoTitle,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof InfoTitle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: '뮤지컬 〈빌리 엘리어트〉',
  },
};
