import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { AgencySidebar } from './AgencySidebar';

const meta = {
  title: 'Agency/Sidebar',
  component: AgencySidebar,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    nextjs: {
      navigation: {
        pathname: '/agency',
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="min-h-screen bg-slate-100 p-6">
        <div className="min-h-[720px] rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-[0_18px_46px_rgba(15,23,42,0.08)]">
          <Story />
        </div>
      </div>
    ),
  ],
} satisfies Meta<typeof AgencySidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    className: '!block',
  },
};

export const PerformancesPage: Story = {
  args: {
    className: '!block',
  },
  parameters: {
    nextjs: {
      navigation: {
        pathname: '/agency/performances',
      },
    },
  },
};

export const SettlementsPage: Story = {
  args: {
    className: '!block',
  },
  parameters: {
    nextjs: {
      navigation: {
        pathname: '/agency/settlements',
      },
    },
  },
};
