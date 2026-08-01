import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Logo } from './Logo';

const meta = {
  title: 'Shared/Logo',
  component: Logo,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'radio', options: ['primary', 'white', 'black'] },
    size: { control: 'radio', options: ['small', 'medium', 'large'] },
  },
} satisfies Meta<typeof Logo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    variant: 'primary',
    size: 'medium',
  },
};

export const LargeBlack: Story = {
  args: {
    variant: 'black',
    size: 'large',
  },
};
