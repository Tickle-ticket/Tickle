import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { SidebarButton } from './SidebarButton';

const sampleImage =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%23a7adb7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><rect x="14" y="14" width="6" height="6"/></svg>';

const meta = {
  title: 'Shared/SidebarButton',
  component: SidebarButton,
  tags: ['autodocs'],
  parameters: {
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#2f3033' },
        { name: 'light', value: '#f4f4f5' },
      ],
    },
  },
  argTypes: {
    imageSrc: {
      control: 'text',
      description: 'Button image source',
    },
    imageSize: {
      control: 'text',
      description: 'Image size for both width and height',
    },
    imageWidth: {
      control: 'text',
      description: 'Image width',
    },
    imageHeight: {
      control: 'text',
      description: 'Image height',
    },
    textColor: {
      control: 'color',
      description: 'Default text color',
    },
    activeTextColor: {
      control: 'color',
      description: 'Active text color',
    },
    fontFamily: {
      control: 'text',
      description: 'Button font family',
    },
    fontWeight: {
      control: { type: 'number', min: 100, max: 900, step: 100 },
      description: 'Button font weight',
    },
    fontSize: {
      control: 'text',
      description: 'Text font size. Supports number(px), px, rem, etc.',
    },
    textMargin: {
      control: 'text',
      description: 'Text margin for all sides',
    },
    textMarginX: {
      control: 'text',
      description: 'Text horizontal margin',
    },
    textMarginY: {
      control: 'text',
      description: 'Text vertical margin',
    },
    textMarginTop: {
      control: 'text',
      description: 'Text top margin',
    },
    textMarginRight: {
      control: 'text',
      description: 'Text right margin',
    },
    textMarginBottom: {
      control: 'text',
      description: 'Text bottom margin',
    },
    textMarginLeft: {
      control: 'text',
      description: 'Text left margin',
    },
    marginY: {
      control: 'text',
      description: 'Vertical margin. Supports px, rem, %, etc.',
    },
    activeBackgroundColor: {
      control: 'color',
      description: 'Active background color',
    },
    hoverBackgroundColor: {
      control: 'color',
      description: 'Hover background color for inactive state',
    },
  },
  decorators: [
    (Story) => (
      <div className="w-[220px] bg-[#2f3033] py-3">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SidebarButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: '대시보드',
    imageSrc: sampleImage,
    imageSize: 14,
    textColor: '#a7adb7',
    activeTextColor: '#ffffff',
    activeBackgroundColor: '#2f72f2',
    hoverBackgroundColor: '#292929',
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontWeight: 700,
    fontSize: 11,
    textMarginTop: 0,
    textMarginRight: 0,
    textMarginBottom: 0,
    textMarginLeft: 0,
    marginY: 0,
  },
};

export const Active: Story = {
  args: {
    ...Default.args,
    isActive: true,
  },
};

export const CustomColors: Story = {
  args: {
    ...Default.args,
    textColor: '#f59e0b',
    activeTextColor: '#111827',
    activeBackgroundColor: '#a7f3d0',
    hoverBackgroundColor: '#3f3f46',
    isActive: true,
  },
};
