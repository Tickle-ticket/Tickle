import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { InfoPoster } from './InfoPoster';

const meta = {
  title: 'Shared/InfoPoster',
  component: InfoPoster,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    src: { control: 'text' },
    alt: { control: 'text' },
    width: { control: 'text' },
    height: { control: 'text' },
    disabled: { control: 'boolean' },
    className: { control: 'text' },
  },
} satisfies Meta<typeof InfoPoster>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Active: Story = {
  args: {
    src: 'https://images.unsplash.com/photo-1543807535-eceef0bc6599?q=80&w=1000&auto=format&fit=crop',
    alt: '빌리 엘리어트',
    disabled: false,
  },
};

export const Inactive: Story = {
  args: {
    src: 'https://images.unsplash.com/photo-1543807535-eceef0bc6599?q=80&w=1000&auto=format&fit=crop',
    alt: '빌리 엘리어트',
    disabled: true,
  },
};
