import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Toggle } from './Toggle';
import { useState } from 'react';
import React from 'react';

const meta = {
  title: 'Shared/Toggle',
  component: Toggle,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    checked: { control: 'boolean', description: '토글 켜짐 상태' },
    disabled: { control: 'boolean', description: '클릭 방지 활성화 여부' },
    isLoading: { control: 'boolean', description: '로딩 스켈레톤 상태' },
    size: { control: 'radio', options: ['small', 'medium'], description: '토글 크기' },
  },
} satisfies Meta<typeof Toggle>;

export default meta;
type Story = StoryObj<typeof meta>;

// 인터랙티브 클릭용 템플릿
const Template = (args: ComponentProps<typeof Toggle>) => {
  const [checked, setChecked] = useState(args.checked || false);
  return <Toggle {...args} checked={checked} onChange={setChecked} />;
};

export const Default: Story = {
  render: Template,
  args: {
    checked: false,
    size: 'medium',
  },
};

export const Active: Story = {
  render: Template,
  args: {
    checked: true,
    size: 'medium',
  },
};

export const AllSizes: Story = {
  render: () => {
    const [c1, setC1] = useState(true);
    const [c2, setC2] = useState(true);
    return (
      <div className="flex flex-col gap-6 items-start">
        <div className="flex items-center gap-4">
          <span className="w-16 text-sm text-content-tertiary font-bold">Small</span>
          <Toggle checked={c1} onChange={setC1} size="small" />
        </div>
        <div className="flex items-center gap-4">
          <span className="w-16 text-sm text-content-tertiary font-bold">Medium</span>
          <Toggle checked={c2} onChange={setC2} size="medium" />
        </div>
      </div>
    );
  }
};

export const LoadingState: Story = {
  args: {
    isLoading: true,
    size: 'medium',
  },
};

export const DisabledState: Story = {
  render: () => {
    return (
      <div className="flex flex-col gap-4">
        <Toggle checked={true} disabled={true} onChange={() => {}} />
        <Toggle checked={false} disabled={true} onChange={() => {}} />
      </div>
    );
  }
};
