import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { AdminSidebar } from './AdminSidebar';

const meta = {
  title: 'Admin/AdminSidebar',
  component: AdminSidebar,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    nextjs: {
      navigation: {
        pathname: '/admin',
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="min-h-screen bg-surface-muted p-6">
        <div className="min-h-[720px] rounded-3xl border border-line bg-surface-subtle p-4 shadow-[0_18px_46px_rgba(15,23,42,0.08)]">
          <Story />
        </div>
      </div>
    ),
  ],
} satisfies Meta<typeof AdminSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    className: '!block',
  },
};

export const QueuePage: Story = {
  args: {
    className: '!block',
  },
  parameters: {
    nextjs: {
      navigation: {
        pathname: '/admin/queue',
      },
    },
  },
};

export const CustomItems: Story = {
  args: {
    className: '!block',
    brandLabel: 'Operations Center',
    title: 'Admin Console',
    items: [
      { label: 'Overview', href: '/admin' },
      { label: 'Queue', href: '/admin/queue' },
      { label: 'Bots', href: '/admin/bot-detection' },
      { label: 'Audit Logs', href: '/admin/audit' },
    ],
  },
  parameters: {
    nextjs: {
      navigation: {
        pathname: '/admin/audit',
      },
    },
  },
};
